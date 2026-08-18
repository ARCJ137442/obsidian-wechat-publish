# 独立 CLI 能力评估

> 结论：暂不把 CLI 纳入 1.3.0；保留为后续独立工具，继续复用纯渲染核心。

## 可复用部分

CLI 可以直接调用 `src/markdown-core.ts`，获得与插件相同的 Markdown、Callout、LaTeX 和 Wikilink contract。MathJax SVG 也可以复用构建后的 `mathjax-svg.js`。

## 必须显式注入的能力

| 能力 | Obsidian 插件 | CLI 方案 |
|---|---|---|
| 当前文件与相对路径 | Vault / `TFile` | 命令行输入文件的绝对路径和工作目录 |
| Wikilink | Metadata cache + `link-wechat-mp` | `--link-map` 或明确的 JSON 映射；没有映射时输出未解析诊断 |
| Callout Manager | 自动读取插件 `data.json` | `--callout-config <path>`，缺省只使用内置类型 |
| Preview 图片 | Vault 读取并转 Base64 | 不默认写 Base64；可以输出本地 HTML 或占位符 |
| Copy 图片 | 微信安全边界要求占位符 | 默认沿用 `【图片：路径】`，不自动上传 |
| CSS | 插件设置中的用户层 | `--css <path>`，默认使用内置主题 |

## 建议的最小命令模型

```text
wechat-publish render article.md --output article.html
wechat-publish copy article.md --output clipboard
```

初版不应模拟 Obsidian workspace、读取任意 Vault 私有配置或接入微信公众号 API。`copy` 的图片和 Wikilink 行为必须在参数和输出报告中明确，不能静默假设存在 Vault 能力。

## 暂缓原因

当前插件的真实高价值路径仍是 Obsidian 内的 Preview/Copy；CLI 会新增参数设计、资产路径处理、链接映射和跨平台剪贴板适配。先保持纯渲染核心稳定，并在用户确实需要批量转换或 CI 生成文章时再启动 CLI 项目。
