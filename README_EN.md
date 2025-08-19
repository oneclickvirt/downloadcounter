# downloadcounters

A lightweight **GitHub Release download counter** based on **Cloudflare Workers**.

## Deployment Guide

1. **Create a Worker**  
   Go to **Cloudflare Dashboard** → **Workers & Pages** → **Create application** → **Create Worker** → choose **"Hello World" Worker**.  
   Rename it to `downloadcounters`, then copy the code from `worker-code.js` into the Worker editor (`worker.js`). Deploy it.

2. **Configure Domain**  
   - In **Domains & Routes** → **Add** → **Custom domain**, bind your custom domain for the counter.

Once deployed, visit your configured domain to access the counter generator page and follow the instructions to create and use counters.

## Example

[![Downloads](https://ghdownload.spiritlhl.net/oneclickvirt/downloadcounters?label=Downloads)](https://github.com/oneclickvirt/downloadcounters/releases)

## Thanks

Thanks to [bestk/github-release-download-badges](https://github.com/bestk/github-release-download-badges), which inspired this project.
