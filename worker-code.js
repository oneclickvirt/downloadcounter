export default {
  async fetch(request) {
    return handleRequest(request);
  },
};

const API_ENDPOINTS = [
  'https://api.github.com',
  'https://githubapi.spiritlhl.workers.dev',
  'https://githubapi.spiritlhl.top'
];

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter((part) => part);
  if (pathParts.length === 0) {
    return serveBadgeGeneratorPage();
  }
  if (url.pathname === '/example.svg') {
    const customColor = url.searchParams.get("color") || '#007ec6';
    const customLabel = url.searchParams.get("label") || 'Downloads';
    const style = url.searchParams.get("style") || "flat";
    const svg = generateBadgeSVG(customLabel, "1.2K", customColor, style);
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache'
      }
    });
  }
  const customColor = url.searchParams.get("color");
  const customLabel = url.searchParams.get("label");
  const style = url.searchParams.get("style") || "flat";
  if (pathParts.length < 2 || pathParts.length > 3) {
    const errorSvg = generateBadgeSVG("Downloads", "invalid path", "#e05d44");
    return new Response(errorSvg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
  const [owner, repo, tag] = pathParts;
  try {
    let githubPath;
    if (tag) {
      if (tag.toLowerCase() === "latest") {
        githubPath = `/repos/${owner}/${repo}/releases/latest`;
      } else {
        githubPath = `/repos/${owner}/${repo}/releases/tags/${tag}`;
      }
    } else {
      githubPath = `/repos/${owner}/${repo}/releases?per_page=100`;
    }
    const data = await fetchWithFallback(githubPath);
    let totalDownloads = 0;
    let actualTag = tag;
    if (tag) {
      if (data.assets && Array.isArray(data.assets)) {
        data.assets.forEach((asset) => {
          totalDownloads += asset.download_count || 0;
        });
      }
      if (tag.toLowerCase() === "latest" && data.tag_name) {
        actualTag = data.tag_name;
      }
    } else {
      if (Array.isArray(data)) {
        let page = 1;
        let allReleases = data;
        while (data.length === 100) {
          page++;
          const nextPagePath = `/repos/${owner}/${repo}/releases?per_page=100&page=${page}`;
          try {
            const nextPageData = await fetchWithFallback(nextPagePath);
            if (Array.isArray(nextPageData) && nextPageData.length > 0) {
              allReleases = allReleases.concat(nextPageData);
              data.length = nextPageData.length;
            } else {
              break;
            }
          } catch (error) {
            break;
          }
        }
        allReleases.forEach((release) => {
          if (release.assets && Array.isArray(release.assets)) {
            release.assets.forEach((asset) => {
              totalDownloads += asset.download_count || 0;
            });
          }
        });
      }
    }
    const formattedCount = formatDownloadCount(totalDownloads);
    let color;
    if (customColor) {
      color = parseColor(customColor);
    } else {
      if (totalDownloads < 100) {
        color = "#97ca00";
      } else if (totalDownloads < 1000) {
        color = "#4c1";
      } else if (totalDownloads < 10000) {
        color = "#007ec6";
      } else {
        color = "#e05d44";
      }
    }
    let label;
    if (customLabel) {
      label = customLabel;
    } else {
      if (tag) {
        if (tag.toLowerCase() === "latest") {
          label = `${actualTag} Downloads`;
        } else {
          label = `${tag} Downloads`;
        }
      } else {
        label = "Downloads";
      }
    }
    const svg = generateBadgeSVG(label, formattedCount, color, style);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    const errorSvg = generateBadgeSVG("Downloads", "error", "#e05d44");
    return new Response(errorSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
      },
    });
  }
}

async function fetchWithFallback(path) {
  for (const endpoint of API_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${endpoint}${path}`, {
        headers: {
          "User-Agent": "GitHub-Downloads-Badge/1.0",
          Accept: "application/vnd.github.v3+json",
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (endpoint === API_ENDPOINTS[API_ENDPOINTS.length - 1]) {
        throw error;
      }
      continue;
    }
  }
  throw new Error('All API endpoints failed');
}

function formatDownloadCount(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + "M";
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + "K";
  }
  return count.toString();
}

function parseColor(colorParam) {
  const predefinedColors = {
    red: "#e05d44",
    green: "#4c1",
    blue: "#007ec6",
    yellow: "#dfb317",
    orange: "#fe7d37",
    purple: "#9f9f9f",
    pink: "#ff69b4",
    gray: "#9f9f9f",
    grey: "#9f9f9f",
    brightgreen: "#4c1",
    lightgrey: "#9f9f9f",
    success: "#4c1",
    important: "#fe7d37",
    critical: "#e05d44",
    informational: "#007ec6",
    inactive: "#9f9f9f",
  };
  if (predefinedColors[colorParam.toLowerCase()]) {
    return predefinedColors[colorParam.toLowerCase()];
  }
  if (/^[0-9a-fA-F]{6}$/.test(colorParam)) {
    return `#${colorParam}`;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(colorParam)) {
    return colorParam;
  }
  if (/^[0-9a-fA-F]{3}$/.test(colorParam)) {
    return `#${colorParam[0]}${colorParam[0]}${colorParam[1]}${colorParam[1]}${colorParam[2]}${colorParam[2]}`;
  }
  return "#4c1";
}

function generateBadgeSVG(label, value, color, style = "flat") {
  const getTextWidth = (text) => {
    let width = 0;
    for (let char of text) {
      if (/[a-zA-Z0-9]/.test(char)) {
        width += 6;
      } else if (/[\u4e00-\u9fff]/.test(char)) {
        width += 11;
      } else {
        width += 4;
      }
    }
    return width;
  };
  const labelWidth = Math.max(getTextWidth(label) + 10, 40);
  const valueWidth = Math.max(getTextWidth(value) + 10, 40);
  const totalWidth = labelWidth + valueWidth;
  let rx = 3;
  let gradientOpacity = 0.1;
  if (style === "flat-square") {
    rx = 0;
  } else if (style === "plastic") {
    gradientOpacity = 0.2;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity="${gradientOpacity}"/>
      <stop offset="1" stop-opacity="${gradientOpacity}"/>
    </linearGradient>
    <clipPath id="a">
      <rect width="${totalWidth}" height="20" rx="${rx}" fill="#fff"/>
    </clipPath>
    <g clip-path="url(#a)">
      <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
      <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
      <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
      <text x="${(labelWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${label}</text>
      <text x="${(labelWidth / 2) * 10}" y="140" transform="scale(.1)">${label}</text>
      <text x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${value}</text>
      <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)">${value}</text>
    </g>
  </svg>`;
}

function serveBadgeGeneratorPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Downloads Badge Generator</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      flex: 1;
    }
    h1 {
      text-align: center;
      color: #2c3e50;
      font-size: 32px;
      margin-bottom: 30px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: #546e7a;
    }
    input, select {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
      font-size: 16px;
    }
    input:focus, select:focus {
      border-color: #2196F3;
      outline: none;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }
    small {
      display: block;
      color: #757575;
      margin-top: 5px;
    }
    .color-input {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .color-input input[type="color"] {
      width: 50px;
      height: 40px;
      padding: 2px;
    }
    .color-input input[type="text"] {
      flex: 1;
    }
    button {
      background: #2196F3;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: background 0.3s;
      width: 100%;
    }
    button:hover {
      background: #1976D2;
    }
    .copy-btn {
      background: #607D8B;
      margin-top: 8px;
      font-size: 14px;
      width: auto;
    }
    .copy-btn:hover {
      background: #455A64;
    }
    .result {
      margin-top: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 4px;
      display: none;
    }
    .preview {
      margin: 20px 0;
      padding: 15px;
      border-radius: 4px;
      text-align: center;
    }
    code {
      display: block;
      padding: 15px;
      background: #263238;
      color: #fff;
      border-radius: 4px;
      margin: 10px 0;
      word-break: break-all;
      font-family: monospace;
    }
    .preview-badge {
      margin: 20px 0;
      background: #fff;
      padding: 20px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }
    .section-title {
      color: #2c3e50;
      border-bottom: 2px solid #eee;
      padding-bottom: 8px;
      margin-top: 30px;
    }
    .footer {
      margin-top: 40px;
      padding: 20px 0;
      border-top: 1px solid #eee;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .footer a {
      color: #2196F3;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .github-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #24292e;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      transition: background 0.2s;
      margin-top: 10px;
    }
    .github-link:hover {
      background: #1c2126;
      color: white;
      text-decoration: none;
    }
    .github-icon {
      width: 16px;
      height: 16px;
    }
    @media (min-width: 768px) {
      button {
        width: auto;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>GitHub Releases Downloads Badge Generator</h1>
    <div class="form-group">
      <label for="owner">Repository Owner</label>
      <input type="text" id="owner" placeholder="octocat" required>
    </div>
    <div class="form-group">
      <label for="repo">Repository Name</label>
      <input type="text" id="repo" placeholder="Hello-World" required>
    </div>
    <div class="form-group">
      <label for="tag">Tag/Version (Optional)</label>
      <input type="text" id="tag" placeholder="latest or v1.0.0 or leave empty">
      <small>Leave empty for total downloads across all releases</small>
    </div>
    <div class="form-group">
      <label for="style">Badge Style</label>
      <select id="style" onchange="updatePreview()">
        <option value="flat">Flat</option>
        <option value="flat-square">Flat Square</option>
        <option value="plastic">Plastic</option>
      </select>
    </div>
    <div class="form-group">
      <label for="customLabel">Custom Label (Optional)</label>
      <input type="text" id="customLabel" placeholder="Downloads" onchange="updatePreview()">
    </div>
    <div class="form-group">
      <label for="customColor">Custom Color (Optional)</label>
      <div class="color-input">
        <input type="color" id="colorPicker" value="#007ec6" onchange="updatePreview()">
        <input type="text" id="customColor" placeholder="blue, #007ec6, or 007ec6" onchange="updatePreview()">
      </div>
    </div>
    <div class="preview-badge">
      <img id="previewImg" src="/example.svg" alt="Preview Badge">
    </div>
    <button onclick="generateBadge()">Generate Badge</button>
    <div id="result" class="result">
      <h3 class="section-title">Badge URL</h3>
      <code id="badgeUrl"></code>
      <button class="copy-btn" onclick="copyCode('badgeUrl')">Copy URL</button>
      <h3 class="section-title">Markdown</h3>
      <code id="markdownCode"></code>
      <button class="copy-btn" onclick="copyCode('markdownCode')">Copy Markdown</button>
      <h3 class="section-title">HTML</h3>
      <code id="htmlCode"></code>
      <button class="copy-btn" onclick="copyCode('htmlCode')">Copy HTML</button>
      <div class="preview">
        <h4>Live Preview:</h4>
        <div id="livePreview"></div>
      </div>
      <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 4px;">
        <h4>Usage Examples:</h4>
        <ul>
          <li><strong>Total downloads:</strong> /owner/repo</li>
          <li><strong>Latest release:</strong> /owner/repo/latest</li>
          <li><strong>Specific version:</strong> /owner/repo/v1.0.0</li>
        </ul>
        <h4>Query Parameters:</h4>
        <ul>
          <li><strong>color:</strong> Custom color (hex without #, or predefined colors)</li>
          <li><strong>label:</strong> Custom label text</li>
          <li><strong>style:</strong> Badge style (flat, flat-square, plastic)</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p style="margin-top: 15px; font-size: 13px;">
        This project is open source at 
        <a href="https://github.com/oneclickvirt/downloadcounter" target="_blank" rel="noopener noreferrer">
          https://github.com/oneclickvirt/downloadcounter
        </a>
      </p>
    </div>
  </div>

  <script>
    function updatePreview() {
      const style = document.getElementById('style').value;
      const label = document.getElementById('customLabel').value || 'Downloads';
      const color = document.getElementById('customColor').value || document.getElementById('colorPicker').value;
      const params = new URLSearchParams({
        style: style,
        label: label,
        color: color.replace('#', '')
      });
      document.getElementById('previewImg').src = '/example.svg?' + params.toString();
    }
    document.getElementById('colorPicker').addEventListener('input', function(e) {
      document.getElementById('customColor').value = e.target.value;
      updatePreview();
    });
    function generateBadge() {
      const owner = document.getElementById('owner').value.trim();
      const repo = document.getElementById('repo').value.trim();
      const tag = document.getElementById('tag').value.trim();
      const style = document.getElementById('style').value;
      const customLabel = document.getElementById('customLabel').value.trim();
      const customColor = document.getElementById('customColor').value.trim();
      if (!owner || !repo) {
        alert('Please enter both owner and repository name');
        return;
      }
      const domain = window.location.host;
      let path = '/' + owner + '/' + repo;
      if (tag) {
        path += '/' + tag;
      }
      const params = new URLSearchParams();
      if (style !== 'flat') params.set('style', style);
      if (customLabel) params.set('label', customLabel);
      if (customColor) params.set('color', customColor.replace('#', ''));
      const queryString = params.toString();
      const fullUrl = 'https://' + domain + path + (queryString ? '?' + queryString : '');
      document.getElementById('badgeUrl').textContent = fullUrl;
      document.getElementById('markdownCode').textContent = '[![Downloads](' + fullUrl + ')](https://github.com/' + owner + '/' + repo + '/releases)';
      document.getElementById('htmlCode').textContent = '<a href="https://github.com/' + owner + '/' + repo + '/releases"><img src="' + fullUrl + '" alt="Downloads"></a>';
      document.getElementById('livePreview').innerHTML = '<img src="' + fullUrl + '" alt="Downloads Badge">';
      document.getElementById('result').style.display = 'block';
    }
    function copyCode(elementId) {
      const el = document.getElementById(elementId);
      const text = el.textContent;
      navigator.clipboard.writeText(text).then(function() {
        const btn = el.nextElementSibling;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      });
    }
    updatePreview();
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}
