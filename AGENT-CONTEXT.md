# Agent Context

> 本文件由 Agent 维护，记录插件的当前状态、已解决的问题、待解决的问题和待推进的功能。
> 供后续 Agent 快速了解项目背景，避免重复调研。

---

## 项目概况

- **项目名称**：obsidian-wechat-publish
- **版本**：v1.0.6
- **许可证**：MIT
- **测试**：127 + 16 = 143 个 vitest 测试（TDD 驱动）
- **定位**：将 Obsidian Markdown 文章一键复制到微信公众号，支持"简约日记风"主题

---

## 当前状态

### 已完成功能

| 功能 | 状态 | 说明 |
|------|------|------|
| Preview in Browser | ✅ 完成 | 浏览器预览，支持暗色模式切换 |
| Copy to WeChat | ✅ 完成 | 复制到微信公众号编辑器，juice 内联 CSS |
| Callout 支持 | ✅ 完成 | 8 种内置类型 + 自定义类型，lucide SVG 图标 |
| LaTeX 渲染 | ✅ 部分完成 | 预览版 SVG 渲染，复制版文本占位符 |
| 暗色模式 | ✅ 完成 | 预览版 @media，复制版内联 !important |
| Wikilinks 转换 | ✅ 完成 | `[[note]]` → 微信链接或蓝色下划线占位 |
| 图片处理 | ✅ 完成 | 预览版 Base64，复制版占位符 |
| 代码块保护 | ✅ 完成 | 防止反引号内的 wikilinks 被误转换 |

### 已知问题

| 问题 | 严重度 | 说明 |
|------|--------|------|
| LaTeX SVG 渲染失败 | 中 | Bug 1: `$E=mc^2$` 未渲染为 SVG（remaining-bugs.test.ts） |
| Callout 暗色模式不支持 | 低 | Bug 2: wechat-theme.css 缺少暗色模式规则 |
| `<mark>` 暗色模式不支持 | 低 | Bug 3: 高亮文字暗色模式下不可见 |

> 以上问题在 `tests/remaining-bugs.test.ts` 中有记录，已有缓解方式。

---

## 待推进的功能

### 高优先级

- [ ] **Callout 暗色模式修复**：在 wechat-theme.css 中添加 `@media (prefers-color-scheme: dark)` 规则
- [ ] **`<mark>` 暗色模式修复**：确保高亮文字在暗色模式下可见

### 中优先级

- [ ] **LaTeX 渲染优化**：调查 codecogs API 渲染失败的原因
- [ ] **更多 Callout 类型**：根据用户需求扩展内置类型

### 低优先级

- [ ] **图片链接优化**：支持 `![[image.png|200]]` 语法的尺寸控制
- [ ] **表格样式增强**：优化微信公众号中的表格显示

---

## 关键架构

### 渲染管线

```
Obsidian MD (.md)
  ↓ parseFrontmatter()       — 剥离 YAML
  ↓ convertWikiLinks()       — ![[img]] → ![](img) + [[note]] → 链接/占位
  ↓ mdUnescape()             — 反斜杠转义 → 占位符
  ↓ LaTeX $...$              — 占位符
  ↓ preprocessCallouts()     — > [!TYPE] → <table> with lucide SVG
  ↓ markdown-it (+mark)      — MD → HTML
  ↓ restoreEscapes()         — 占位符 → 字面字符
  ↓ renderLatexSvg()         — LaTeX → SVG（仅预览）
  ↓
  ├── forCopy=true  → replaceImages + 占位符 + juice 内联
  └── forCopy=false → Base64 图片 + SVG LaTeX + <style> 块
```

### 关键文件

| 文件 | 用途 |
|------|------|
| `src/main.ts` | 插件主逻辑，所有渲染管线 |
| `wechat-theme.css` | 独立的微信主题 CSS（207 行） |
| `tests/*.test.ts` | 143 个 vitest 测试 |
| `docs/preview-vs-copy.md` | 预览版 vs 复制版对比文档 |

### CSS 策略

- **预览版**：`getRenderCSS()` 返回完整 CSS，包含 `@media` 暗色模式
- **复制版**：`getCopyCSS()` 截断 `@media`，删除独立 `color:` 声明，保留内联样式
- **WeChat 抗覆盖**：内联 `style="...!important"` 是对抗微信编辑器 CSS 覆盖的终极手段

---

## 历史问题与解决方案

### 微信编辑器粘贴卡死

- **根因**：Base64 大图片内嵌 → 浏览器渲染进程内存超限 → `RESULT_CODE_HUNG`
- **污染范围**：Cookie → 浏览器进程 → 浏览器缓存（全浏览器级，清 cookie 不恢复）
- **恢复手段**：换浏览器（Edge ↔ Chrome）
- **已修复**：Copy 路径改用图片占位符，不再内嵌 Base64
- **已修复**：剪贴板改用 Electron 原生 `clipboard.write()`

### Wikilinks 转换

- **问题**：`[[note]]` 原样输出，发布到微信后不美观且无法点击
- **方案**：frontmatter 中的 `link-wechat-mp` 属性建立笔记 → 微信文章映射
- **实现**：`resolveNoteLink()` 读取 frontmatter，`convertWikiLinks()` 转换语法
- **测试**：16 个单元测试覆盖各种场景

---

## 开发规范

### 测试

- 使用 vitest 框架
- TDD 驱动开发
- 测试文件命名：`*.test.ts`
- 运行测试：`npx vitest run`

### 构建与部署

```bash
npm install          # 安装依赖
npm run build        # 构建
npm run deploy -- <vault-root>  # 部署到 Obsidian 仓库
```

### Git 规范

- 提交信息格式：`<type>(<scope>): <description>`
- 类型：feat / fix / style / refactor / test / chore
- 范围：callout / wikilink / latex / image / css 等

---

## 相关资源

- **GitHub**：https://github.com/ARCJ137442/obsidian-wechat-publish
- **Obsidian 文档**：https://docs.obsidian.md/Plugins/Releasing
- **markdown-it**：https://github.com/markdown-it/markdown-it
- **juice**：https://github.com/Automattic/juice
- **lucide-static**：https://github.com/lucide-icons/lucide

---

## 更新日志

### 2026-05-27

- ✅ 完成 Wikilinks → 微信链接转换功能
- ✅ 新增 `resolveNoteLink()` 方法
- ✅ 扩展 `convertWikiLinks()` 支持笔记链接
- ✅ 添加代码块保护机制
- ✅ 添加 `.wechat-note-link` CSS 样式
- ✅ 新增 16 个单元测试
- ✅ 推送到 GitHub
