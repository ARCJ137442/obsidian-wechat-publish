# obsidian-wechat-publish

[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-9654b5)](https://obsidian.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.6-blue)](https://github.com/ARCJ137442/obsidian-wechat-publish)

将 Obsidian Markdown 文章一键复制到微信公众号，支持"简约日记风"排版主题。

> Forked from [tinyking/obsidian-wechat-publish](https://github.com/tinyking/obsidian-wechat-publish)，在此基础上进行了功能增强和样式重写。

本仓库只包含通用的 Markdown → 微信公众号 HTML 渲染、预览和复制功能。个人写作工作流（例如按 frontmatter 模板重命名文件）已移至独立的私有插件，不属于本项目。

---

## 效果预览

![Callout 预览效果](https://raw.githubusercontent.com/ARCJ137442/obsidian-wechat-publish/main/assets/preview.png)

Callout 内部支持完整的 markdown 语法：**粗体**、*斜体*、`行内代码`、列表等。

---

## Features

- **一键复制** — `Ctrl+P` → `Copy to WeChat` → 粘贴到微信编辑器
- **8 种 Callout 类型** — note、tip、warning、danger、question、example、quote、info，全部带 lucide SVG 图标
- **Callout 内部 Markdown** — 粗体、斜体、高亮、列表、代码块、表格、链接
- **自定义 Callout** — 通过 `callout-manager.json` 添加自定义类型和颜色
- **LaTeX 公式** — 预览和复制共用 MathJax SVG（`<path>` 字形，无字体依赖）
- **暗色模式** — 支持系统偏好和手动切换
- **Wikilinks 转换** — `[[note]]` 自动转换为微信链接
- **预览功能** — 浏览器中预览渲染效果

---

## Installation

### 手动安装

1. 下载 `main.js`、`manifest.json`、`styles.css`、`mathjax-svg.js`
2. 复制到 Obsidian vault 的 `.obsidian/plugins/obsidian-wechat-publish/` 目录
3. 重启 Obsidian，启用插件

### 开发者安装

```bash
git clone https://github.com/ARCJ137442/obsidian-wechat-publish.git
cd obsidian-wechat-publish
npm install
npm run build
```

---

## Usage

### 基本用法

1. 在 Obsidian 中打开文章
2. `Ctrl+P` → 输入 `Copy to WeChat`
3. 粘贴到微信公众号编辑器

### 从旧版本升级

如果曾使用旧版本中的 `Quick Template Rename`，请将该功能迁移到自己的工作流插件；它已从本项目移除，以保持公开插件与个人写作规则解耦。

### Callout 语法

```markdown
> [!note] 标题
> 正文内容，支持 **粗体**、*斜体*、`代码` 等

> [!tip] 提示
> - 列表项 1
> - 列表项 2
```

### 支持的 Markdown 语法

| 语法 | 效果 |
|------|------|
| `**粗体**` | **粗体** |
| `*斜体*` | *斜体* |
| `==高亮==` | ==高亮== |
| `` `代码` `` | `代码` |
| `[链接](url)` | [链接](url) |
| `- 列表` | 列表 |
| `> 引用` | 引用 |

---

## Fork 致谢

本项目 fork 自 [tinyking/obsidian-wechat-publish](https://github.com/tinyking/obsidian-wechat-publish)，原作者 TinyKing 提供了基础的 Obsidian → 微信复制功能。

在此基础上，我们进行了以下增强：

| 功能 | 原版 | 本 Fork |
|------|------|---------|
| CSS 样式 | 橙色主题 | 简约日记风（无色装饰） |
| Callout 支持 | 基础 CSS | 8 种类型 + SVG 图标 + 内部 Markdown |
| LaTeX | ❌ | ✅ |
| 暗色模式 | ❌ | ✅ |
| Wikilinks | ❌ | ✅ |
| 预览功能 | ❌ | ✅ |
| 测试 | ❌ | vitest 测试套件 |

感谢 TinyKing 的原创工作。

---

## Development

```bash
npm run dev          # 开发模式（监听文件变化）
npm run build        # 生产构建
npm run lint         # 代码检查
npm run deploy -- <vault-root>  # 部署到 vault
```

### 测试

```bash
npx vitest run       # 运行所有测试
```

### 项目结构

```
src/
  main.ts            # 插件主入口
  callout-plugin.ts  # Callout 预处理和后处理
tests/               # vitest 测试用例
```

---

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/)
- [markdown-it](https://github.com/markdown-it/markdown-it) — Markdown 解析
- [juice](https://github.com/Automattic/juice) — CSS 内联
- [MathJax](https://www.mathjax.org/) — LaTeX SVG 渲染
- [lucide-static](https://github.com/lucide-icons/lucide) — SVG 图标
- [vitest](https://vitest.dev/) — 测试框架

---

## License

[MIT](LICENSE) — Copyright (c) 2024 TinyKing
