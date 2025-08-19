# downloadcounters

downloadcounters 一个基于 Cloudflare Workers 轻量级Release下载计数器

## 部署步骤

1. 创建Workers
   导航至 ```Workers & Pages``` > ```Create application``` > ```Create Worker``` > ```"Hello World" Worker``` ，新建后重命名为 ```ghdownload``` ，复制 ```worker-code.js``` 代码到Worker编辑器中的```worker.js```应用部署。

2. 配置域名
   - 在Worker的 ```Domains & Routes``` - ```Add``` - ```Custom domain``` 中添加你的计数器域名

部署完成后，访问你配置的域名即可看到计数器生成器页面，按照页面提示创建和使用计数器。

## 示例

[![Downloads](https://ghdownload.spiritlhl.net/oneclickvirt/downloadcounters?label=Downloads)](https://github.com/oneclickvirt/downloadcounters/releases)

## Thanks

感谢 https://github.com/bestk/github-release-download-badges 本项目受此启发诞生