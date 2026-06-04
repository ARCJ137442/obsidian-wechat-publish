# Agent Context

> 本文件由 Agent 维护，记录插件的当前状态、已解决的问题、待解决的问题和待推进的功能。
> 供后续 Agent 快速了解项目背景，避免重复调研。

---

## 项目概况

- **项目名称**：obsidian-wechat-publish
- **版本**：v1.0.7
- **许可证**：MIT
- **测试**：162 个 vitest 测试（TDD 驱动）
- **定位**：将 Obsidian Markdown 文章一键复制到微信公众号，支持"简约日记风"主题

---

## 当前状态

### 已完成功能

| 功能 | 状态 | 说明 |
|------|------|------|
| Preview in Browser | ✅ 完成 | 浏览器预览，支持暗色模式切换 |
| Copy to WeChat | ✅ 完成 | 复制到微信公众号编辑器，juice 内联 CSS |
| Callout 支持 | ✅ 完成 | 8 种内置类型 + 自定义类型，lucide SVG 图标 |
| LaTeX 渲染 | ✅ 部分完成 | 预览版 KaTeX 渲染，复制版文本占位符 |
| 暗色模式 | ✅ 完成 | 预览版 @media，复制版内联 !important |
| Wikilinks 转换 | ✅ 完成 | `[[note]]` → 微信链接或蓝色下划线占位 |
| 图片处理 | ✅ 完成 | 预览版 Base64，复制版占位符 |
| 代码块保护 | ✅ 完成 | 防止反引号内的 wikilinks 被误转换 |

### 已知问题

| 问题 | 严重度 | 说明 |
|------|--------|------|
| LaTeX 复制版已验证 | ✅ 已解决 | rollup + mathjax-full SVG 模块已实现并验证通过（2026-06-04） |
| Callout 暗色模式不支持 | 低 | Bug 2: wechat-theme.css 缺少暗色模式规则（**已决定暂不修复**，半透明效果已适配） |
| `<mark>` 暗色模式不支持 | 低 | Bug 3: 高亮文字暗色模式下不可见 |

---

## LaTeX 渲染详细分析（2026-06-03 调查）

### 问题根因

**为什么 Callout SVG 能在微信显示，但 LaTeX SVG 不能？**

| SVG 类型 | 绘制方式 | 字体依赖 | 微信兼容性 |
|----------|----------|----------|------------|
| Callout Lucide | `<path>` 矢量路径 | 无 | ✅ 正常显示 |
| LaTeX codecogs | `<text>` 文本填充 | Avenir-Black | ❌ 内容消失 |

**结论**：微信编辑器会剥离 SVG 中的字体依赖，导致基于文本的 SVG 失效。

### 尝试的解决方案

| 方案 | 结果 | 失败原因 |
|------|------|----------|
| MathJax SVG（动态 import） | ❌ 失败 | `handlers` 未定义，esbuild 打包后全局状态丢失 |
| MathJax SVG（静态 import） | ❌ 失败 | 插件加载时尝试加载不存在的模块 |
| KaTeX HTML + juice 内联 CSS | ⚠️ 部分成功 | CSS 定位规则复杂，juice 无法正确内联 |
| KaTeX 预览 + 文本占位符复制 | ✅ 旧方案 | 可用但不理想 |
| Obsidian `renderMath()` API | ❌ 复制版不可行 | 输出 CHTML（HTML+自定义字体），微信无 MathJax 字体 |
| **rollup + mathjax-full SVG** | ✅ **当前方案** | rollup `commonjs()` 保留全局状态；`@rollup/plugin-replace` 消除 `eval('require')` |

### 当前方案（2026-06-03 实现）

- **预览版**：KaTeX 渲染 HTML（系统字体，效果好）
- **复制版**：MathJax SVG（rollup 打包，输出 `<path>` 自包含 SVG）

**构建管线**：
1. esbuild: `src/main.ts` → `main.js`（排除 `mathjax-full`）
2. esbuild (transpile only): `src/mathjax-svg.ts` → `.mathjax-svg-temp.js`
3. rollup: `.mathjax-svg-temp.js` + `commonjs()` + `replace(PACKAGE_VERSION)` → `mathjax-svg.js` (2.5MB CJS)
4. 运行时: `require(vaultBase + '/.obsidian/plugins/obsidian-wechat-publish/mathjax-svg.js')`

**关键修复**：
- `@rollup/plugin-replace` 替换 `PACKAGE_VERSION` → 常量 `"3.2.1"`，防止 MathJax 的 `eval('require')` 在 Electron 中执行
- `require()` 使用绝对路径（vault base path），因为 Electron 的 `__dirname` 指向 Obsidian 安装目录

**Node.js 验证**：
```
tex2svg('E = mc^2', false) → SVG 3705 bytes, <path> ✅, <text> ❌
tex2svg('ax^2 + bx + c = 0', true) → SVG 4938 bytes, <path> ✅
```

### 渲染方案（已验证）

- **预览版**：KaTeX 渲染 HTML（CSS 完整，效果好）
- **复制版**：MathJax SVG（`<path>` 内联，微信兼容，2026-06-04 验证通过）

### 技术细节

**KaTeX 输出结构**：
```html
<span class="katex">
  <span class="katex-mathml">MathML（无障碍访问）</span>
  <span class="katex-html">视觉渲染（CSS 定位）</span>
</span>
```

**为什么 juice 内联失败**：
- KaTeX 使用复杂 CSS 定位（`strut`、`vlist`、`pstrut`）
- 依赖 `position: relative` + `top` 偏移
- `juice` 无法正确处理这些定位规则

**MathJax 失败原因**：
- esbuild 打包破坏了 MathJax 的全局状态
- `RegisterHTMLHandler` 需要访问 `mathjax.handlers`
- 动态/静态导入都无法正确初始化

---

## 待推进的功能

### 高优先级

- [x] **LaTeX 复制版 Obsidian 验证**：2026-06-04 在微信公众号后台验证通过，所有公式清晰显示
- [ ] **`<mark>` 暗色模式修复**：确保高亮文字在暗色模式下可见

### 中优先级

- [ ] **图片链接优化**：支持 `![[image.png|200]]` 语法的尺寸控制
- [ ] **表格样式增强**：优化微信公众号中的表格显示

### 已决定暂不修复

- [ ] ~~**Callout 暗色模式修复**~~：当前使用半透明效果已能很好地适配深浅模式，黑白一致效果良好，无需额外添加 `@media` 规则
- [ ] ~~**更多 Callout 类型**~~：插件已支持读取 `callout-manager.json` 自定义配置，用户可自行扩展类型和主题色，无需内置更多类型

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
  ↓
  ├── forCopy=true  → MathJax SVG (<path> glyphs) + replaceImages + juice 内联
  └── forCopy=false → KaTeX HTML + Base64 图片 + <style> 块
```

### 关键文件

| 文件 | 用途 |
|------|------|
| `src/main.ts` | 插件主逻辑，所有渲染管线 |
| `wechat-theme.css` | 独立的微信主题 CSS（207 行） |
| `tests/*.test.ts` | 162 个 vitest 测试 |
| `docs/preview-vs-copy.md` | 预览版 vs 复制版对比文档 |

### CSS 策略

- **预览版**：`getRenderCSS()` 返回完整 CSS，包含 `@media` 暗色模式
- **复制版**：`getCopyCSS()` 截断 `@media`，删除独立 `color:` 声明，保留内联样式
- **WeChat 抗覆盖**：内联 `style="...!important"` 是对抗微信编辑器 CSS 覆盖的终极手段

---

## 历史问题与解决方案

### 更多 Callout 类型决策

- **问题**：是否需要内置更多 Callout 类型（如 abstract、todo、success、bug、reference）
- **评估**：插件已支持从 `callout-manager.json` 读取自定义配置，用户可自行定义类型、颜色、图标
- **决策**：暂不添加更多内置类型，因为：
  1. `callout-manager` 已提供完整的自定义能力
  2. 用户可根据需求灵活扩展，无需等待插件更新
  3. 避免内置类型过多导致维护负担
- **时间**：2026-05-27

### Callout 暗色模式决策

- **问题**：`wechat-theme.css` 缺少 `@media (prefers-color-scheme: dark)` 规则
- **评估**：当前 Callout 使用半透明背景色（`rgba()` 格式），在深浅模式下都能自动适配
- **决策**：暂不修复，因为：
  1. 半透明效果已能很好地适配深浅模式
  2. 黑白一致的视觉效果已达到预期
  3. 避免引入额外的 CSS 复杂度
- **时间**：2026-05-27

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

### 2026-06-03

- ✅ **LaTeX 复制版 SVG 渲染**：rollup + mathjax-full 生成 path-based SVG
  - 混合构建：esbuild（主插件）+ rollup（mathjax-svg.js，2.5MB）
  - `@rollup/plugin-replace` 消除 `eval('require')`，防止 Electron 环境报错
  - `tex2svg()` 输出自包含 `<path>` SVG，Node.js 测试通过
  - 运行时 `require()` 使用 vault 绝对路径（Electron `__dirname` 指向 Obsidian 安装目录）
- ✅ **Obsidian `renderMath()` API 调查**：输出 CHTML（依赖 MathJax 字体），不适用于微信复制版
- ✅ **CI 修复**：ESLint 错误从 65 → 0，CI 现在全部通过
  - 放宽 `no-console` 规则，保留调试日志（Obsidian DevTools 需要）
  - ESLint 配置：为 `main.ts` 启用 Node.js globals，允许 `require` 调用
  - 修复类型：`http.Server`、`setTimeout`、`electron.shell`、`electron.clipboard`
  - 修复类型：callout replace 回调参数、`template-fill` 字符串处理
  - 移除未使用的 `metaBlock` 和 `tempResult` 变量
  - Prettier 格式化所有源文件
- ✅ **Quick Template Rename 改进**：改用 `fileManager.renameFile`（Obsidian 官方推荐）
- ✅ **工程止血**：`.gitignore` 添加 `*.stackdump`，`.npmrc` 固定 peer 策略
- ✅ **LaTeX 渲染改进**：预览版改用 KaTeX（本地渲染，不依赖网络）
- ⚠️ **LaTeX 复制版调查**：MathJax SVG 在 esbuild 打包环境中无法工作，暂时使用文本占位符

### 2026-05-27

- ✅ 完成 Wikilinks → 微信链接转换功能
- ✅ 新增 `resolveNoteLink()` 方法
- ✅ 扩展 `convertWikiLinks()` 支持笔记链接
- ✅ 添加代码块保护机制
- ✅ 添加 `.wechat-note-link` CSS 样式
- ✅ 新增 16 个单元测试
- ✅ 推送到 GitHub
