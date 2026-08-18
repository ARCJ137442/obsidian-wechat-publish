# 微信公众号发布插件迭代路线图

> 状态：阶段 6 CSS 基础与 CLI 评估完成，多主题/正式 CLI 待后续
> 建立日期：2026-08-18
> 当前基线：v1.3.0

## 目标

把插件从“能够生成并复制微信公众号 HTML”推进为一个**输出可预期、问题可诊断、安装可交付**的桌面端 Markdown 发布工具。

本路线图优先解决发布链路中的可靠性和维护成本，再扩展命令入口与 CLI 能力。

## 不变的边界

- 插件只负责 Markdown → 微信公众号 HTML、浏览器预览和复制 HTML。
- 复制版的本地图片继续使用文本占位符，不将 Base64 图片写入剪贴板。
- 不自动上传图片，不接入微信公众号 API，不保存微信账号凭证。
- 复制提示应当提供信息，但不能用模态框或预检流程阻塞用户。
- CSS 现有输出以稳定为先；除非出现可复现的兼容性问题，不在本轮随意改动排版细节。
- 所有 HTML 输出行为的改动都必须配套真实渲染管线测试或固定样例测试。

## 实施顺序

依赖关系如下：

```text
交付基线（平台/版本/Release/CI）
                ↓
纯渲染核心与真实管线测试
                ↓
输入边界与 LaTeX 稳定性
                ↓
非阻塞发布提示与预览体验
                ↓
主题/CSS、命令入口、CLI 等扩展
```

## 阶段一：交付基线（P0）

### 1.1 明确桌面端支持范围

- [x] 将 `manifest.json` 的 `isDesktopOnly` 改为 `true`。
- [x] README 和安装说明明确当前依赖桌面端 Node/Electron 能力。
- [ ] 后续如果确有移动端需求，另行设计移动端剪贴板和预览适配，不在本阶段混入。

原因：当前实现使用 `fs`、`http`、Electron `shell` 和 Electron 原生剪贴板；继续声明移动端支持会造成安装后才暴露失败。

### 1.2 统一版本并建立 Release 产物

- [x] 将 `package.json`、`manifest.json`、README badge、发布规范和 `versions.json` 统一为 `1.1.0`。
- [x] 增加 GitHub Actions Release workflow。
- [x] 以 tag 触发构建、测试和 lint。
- [x] 将 `main.js`、`manifest.json`、`styles.css`、`mathjax-svg.js` 打包为可直接安装的 zip 并上传到 GitHub Release。
- [x] README 的手动安装入口改为指向 Releases。
- [x] 为 Release 增加产物文件清单和版本一致性检查。

原因：源码仓库忽略编译产物，但当前又缺少 Release 上传流程；用户按照 README 无法直接获得 `main.js`。

### 1.3 将测试纳入 CI

- [x] 在 `package.json` 增加 `npm test`，执行 `vitest run`。
- [x] GitHub Actions 在 build、lint 之外执行 `npm test`。
- [x] 保留 Node 20/22 矩阵，确认测试不依赖本地 Vault、浏览器或未提交文件。
- [x] 发布 workflow 复用同一套检查命令。

验收标准：Pull Request 和 tag 构建都必须同时通过 build、lint、test；失败时不能上传 Release 产物。

## 阶段二：精简核心与真实管线测试（P0/P1）

### 2.1 拆出纯渲染核心

- [x] 从 `src/main.ts` 拆出不依赖 Obsidian API 的 Markdown 渲染核心。
- [x] 将 Obsidian 文件解析、图片读取、metadata 查询、剪贴板和预览服务器作为适配层。
- [x] 统一返回渲染结果和诊断信息，例如：

```ts
{
  html,
  plainText,
  diagnostics: {
    unresolvedImages,
    unresolvedWikilinks,
    latexFallbacks,
    warnings,
  },
}
```

- [x] 保持 Preview 与 Copy 共用同一套 Markdown → HTML 核心逻辑，只在图片和 CSS 输出阶段分叉。

原因：当前 `main.ts` 同时承担渲染、文件系统、预览服务器、剪贴板、设置和主题 CSS；测试只能复制实现，难以证明真实插件没有回归。

### 2.2 让测试调用真实实现

- [x] 删除或改造复制 `main.ts` 逻辑的测试辅助实现。
- [x] 用真实核心渲染器覆盖 Callout、Wikilink、LaTeX、图片和高亮。
- [x] 增加固定 Markdown fixture 与 HTML contract/golden tests。
- [x] 对 Preview 和 Copy 的分叉结果分别做最小集成测试。

验收标准：核心渲染逻辑只存在一份；测试失败时能定位到实际生产代码，而不是测试副本。

## 阶段三：输入边界和 LaTeX 稳定性（P1）

### 3.1 统一读取 frontmatter

- [x] 使用 Obsidian metadata cache 或正式 YAML 解析方式统一读取 frontmatter。
- [x] 统一处理 BOM、空白、多行字段、数组和嵌套值。
- [x] 规定标题、作者、日期的回退规则，并为预览和复制共用。

### 3.2 谨慎修复 LaTeX 提取顺序

- [x] 先保护 fenced code、inline code 和需要保留的 HTML，再识别 LaTeX。
- [x] 明确处理 `\\$`、货币符号、跨行公式和连续公式。
- [x] 增加代码块中的 `$not a formula$`、转义美元符号和复杂公式回归测试。
- [x] 保持 MathJax SVG 为唯一正常公式输出；失败时返回诊断信息，而不是静默伪装成成功。

实施结果：新增 `tests/latex-input-boundaries.test.ts`，以真实 `renderMarkdownCore()` 覆盖 fenced/inline code、HTML、货币金额、转义美元符号、数字美元片段、空白边界、跨行 display 和连续 inline 公式；实现采用保护片段 + 扫描提取，未扩大到 Markdown 解析器重写。行内公式按 Obsidian 的定界符规则处理：两端贴非空白字符即可配对，成对的纯数字 `$...$` 按公式处理，未闭合的 `$100` 等货币文本保持原样，单美元行内公式严格限制在同一行，`$$...$$` display 公式允许跨行，连续 `$$` 保留 display 定界符语义。另修复 Wikilink 适配层恢复代码块时对 `$'`、`$$` 等替换标记的误解释，并让含行内三反引号的 fenced code 在 LaTeX 提取前保持完整。

注意：这一项不做大范围正则替换，必须先建立 fixture，再逐步改动并比较 HTML 输出。

### 3.3 Callout 输入边界纳入测试

- [x] 增加空行、列表、嵌套 Markdown、折叠标记和未知类型的 fixture。
- [x] 只有出现可复现的兼容性问题时，才调整 Callout 输出结构或颜色。

实施结果：新增 `tests/callout-boundaries.test.ts`，以真实 `renderMarkdownCore()` 覆盖空行段落、列表与嵌套 Markdown、`+/-` 折叠标记、未知类型回退和空 Callout；现有输出已满足契约，本阶段不改动 Callout HTML 或颜色。

## 阶段四：非阻塞发布提示（P1）

### 4.1 优化复制后的 Notice

- [x] 复制动作仍然立即执行，不增加模态框或强制预检步骤。
- [x] 将固定的“已复制”提示改为包含摘要的信息提示，例如：

```text
已复制到剪贴板：12 个段落，8 个公式。
本地图片已替换为 3 个占位符；1 个公式使用了文本回退。
```

- [x] 只有真正发生异常时才显示错误级别提示。
- [x] 详细诊断保留在 console/debug 信息中，避免 Notice 过长。

实施结果：新增 `src/copy-notice.ts` 和 `tests/copy-notice.test.ts`。复制成功后按真实渲染结果报告段落、公式、图片占位符、公式文本回退和未解析公众号链接；无异常项不显示冗余警告，复制动作不被提示阻塞。

### 4.2 保持图片复制边界

- [x] Copy 模式继续禁止 Base64 图片。
- [x] 本阶段不做自动图片上传、资产清单或图片管理面板。
- [x] 只统计本地图片占位符数量，并在提示中说明需要手动处理。

## 阶段五：预览体验与安全议题（P1/P2）

### 5.1 预览服务器按请求续期

- [x] 预览页每次收到请求时刷新过期计时器。
- [x] 保持“下一次预览或插件卸载时关闭服务器”的清理策略。
- [x] 增加刷新、服务器关闭和端口异常的错误提示。

实施结果：新增 `src/preview-timeout.ts` 和 `tests/preview-timeout.test.ts`；预览服务器在每次 HTTP 请求时从新的请求时间重新计时，下一次预览和插件卸载仍清理旧服务器。监听失败、运行中服务器错误和关闭回调错误均进入用户可见 Notice，正常超时关闭不打扰用户。

### 5.2 预览 HTML 安全性单独立项

- [x] 记录原始 HTML、脚本、事件属性和危险 URL 的现状与使用需求。
- [x] 比较最小化的 CSP、标签 allowlist 和 sandbox iframe 方案。
- [x] 在有实际威胁模型和兼容性样例前，不贸然引入复杂 sanitizer 或改变 Markdown HTML 支持。

研究记录：见 `docs/wechat-publish-security-research.md`。本阶段不改变 HTML 输出行为。

## 阶段六：主题与 CSS 架构（独立计划）

当前 CSS 只要能稳定工作就不主动重构；本阶段单独排期。

- [x] 明确一个默认内置主题 CSS 来源。
- [x] 将默认主题与用户自定义 CSS 分层合并，而不是用字符串是否包含 `.wechat-callout` 判断主题完整性。
- [x] 只移除 Copy 模式真正不兼容的 `prefers-color-scheme` 规则，保留其他 media 规则。
- [x] 增加 CSS 组合结果的快照/contract 测试。
- [ ] 后续再考虑多个内置主题或主题切换。

实施结果：`DEFAULT_CSS` 作为插件内置主题基础层，`src/theme-css.ts` 负责拼接用户覆盖层；`src/copy-css.ts` 只移除 `prefers-color-scheme` media block；`tests/theme-css.test.ts` 和 `tests/copy-css.test.ts` 覆盖组合与 media contract。此次只修复可复现的 CSS 截断问题，不改变默认排版细节。

触发条件：出现可复现的 CSS 丢失、用户自定义 CSS 被截断、或 Preview/Copy 输出不一致时，提前启动本阶段。

## 阶段七：后续命令和 CLI 扩展（P2）

- [x] 增加“复制当前笔记”命令，支持阅读模式和文件菜单入口。
- [x] 增加“复制选中内容”命令。
- [x] 增加预览当前笔记和右键菜单入口。
- [x] 在纯渲染核心稳定后，评估独立 CLI；CLI 必须明确图片、Wikilink 和 Callout Manager 的能力边界。

评估记录：见 `docs/wechat-publish-cli-assessment.md`。结论是暂不把 CLI 纳入 1.3.0，未来复用纯渲染核心并通过显式参数注入 Vault 外部能力。

实施结果：在 `src/main.ts` 增加当前笔记、选区和文件菜单命令；当前笔记命令读取 TFile 内容，因此不依赖编辑器是否处于 Live Preview/Reading view。CLI 继续作为独立的后续评估，不阻塞 Obsidian 插件使用。

这些属于使用入口扩展，不应阻塞核心渲染和发布链路稳定化。

## 明确不做

- 不接入微信公众号 API。
- 不自动登录、保存或管理微信账号凭证。
- 不在 Copy 模式写入 Base64 图片。
- 不为了“可能以后需要”提前构建图片上传系统、资产管理面板或复杂发布状态系统。

## 优先级参考（ICE）

ICE = 影响 × 信心 × 易实施度 ÷ 10，仅用于排序，不代替实际验证。

| 事项 | 影响 | 信心 | 易实施度 | ICE | 建议 |
|---|---:|---:|---:|---:|---|
| 桌面端声明、版本统一、Release、CI 测试 | 9 | 9 | 8 | 64.8 | 立即做 |
| 非阻塞复制提示 | 8 | 9 | 8 | 57.6 | 第一轮做 |
| 统一 frontmatter 读取 | 7 | 9 | 7 | 44.1 | 第一轮做 |
| 预览服务器按请求续期 | 6 | 9 | 8 | 43.2 | 第一轮做 |
| 纯渲染核心与真实管线测试 | 9 | 9 | 4 | 32.4 | 作为基础重构 |
| LaTeX 输入边界修复 | 8 | 8 | 5 | 32.0 | 谨慎推进 |
| 默认 CSS 与自定义 CSS 分层 | 7 | 8 | 4 | 22.4 | 独立计划 |
| 阅读模式、选区和右键命令 | 6 | 7 | 5 | 21.0 | 后续扩展 |
| CLI | 5 | 6 | 3 | 9.0 | 核心稳定后再评估 |

## 每阶段通用验收

- [x] 不改变未涉及功能的既有 HTML 输出。
- [x] 测试覆盖真实生产路径，而不是复制实现。
- [x] `npm run build`、`npm run lint`、`npm test` 全部通过。
- [x] 若涉及用户可见输出，更新对应 fixture 和文档。
- [x] 确认没有引入微信 API、账号凭证或 Base64 Copy 图片。
