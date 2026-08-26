# Obsidian Mobile 发布出口评估与实施计划

> 状态：2026-08-26 调查后封存，暂不进入近期实现；本文是恢复开发时的实施计划，不是已发布能力说明。
>
> 当前基线：v1.3.2，继续保留 `isDesktopOnly: true`，直到“移动端解禁门槛”全部满足。

## 1. 产品意图

当用户只有手机或平板时，插件至少要把当前笔记稳定转换成可以离开 Obsidian 的微信复制版 HTML。富文本剪贴板可用时直接复制；不可用时仍能保存、复制源码或分享 HTML 文件，不能因为缺少 Electron、Node.js 或桌面浏览器扩展而让整个发布流程失效。

这不是移动端写作的前置条件。当前产品优先级是“先保证记录、同步和文章管理可用，发布可以延后”；纯移动端能否把 HTML 最终送入公众号编辑器仍待真机证明，因此本计划先完整封存，等实际发布阻塞出现后再启动。下文的 P0/P1 只表示**本计划恢复后的内部顺序**，不表示它高于其他插件的移动端写作能力。

首要问题不是“在手机上复刻桌面按钮”，而是建立一个按可靠性逐级降级的发布出口：

```text
渲染一次
   ↓
微信发布制品（正文片段 + 完整 HTML 文档 + 诊断摘要）
   ├─ 保存 HTML 文件             必须成功
   ├─ 复制富文本                 能力允许时
   ├─ 复制 HTML 源码             文本剪贴板允许时
   ├─ 分享 HTML 文件             系统分享允许时
   └─ Obsidian 内预览            移动预览完成后
```

## 2. 用户叙事

### 2.1 只有手机时保存发布制品

我在 Obsidian Mobile 打开文章，执行“保存当前笔记的微信复制版 HTML”。插件沿用桌面 Copy 的渲染规则，把结果写入 Vault 中可配置的目录，并告诉我精确路径、公式回退和图片占位符数量。即使系统不允许富文本剪贴板，我仍然拿到了可以上传、导入或转交其他工具的 HTML 文件。

### 2.2 富文本剪贴板可用时直接复制

我点击结果窗口中的“复制排版内容”。插件只有在真机确认 `ClipboardItem` 和 `text/html` 写入成功后才提示完成；失败时保留已生成制品，并明确提供“复制 HTML 源码”和“保存文件”，不把源码复制伪装成富文本复制成功。

### 2.3 从系统分享面板转交文件

如果当前设备支持分享 `text/html` 文件，我点击“分享 HTML 文件”，从系统分享面板选择浏览器、文件管理器或第三方编辑器。插件先调用 `navigator.canShare()` 验证文件能力；不支持时隐藏或禁用该动作。

### 2.4 桌面端保持原工作流

桌面端现有“复制到微信”和浏览器预览继续工作，HTML 输出不得因移动端改造发生无关变化。保存 HTML 同时成为桌面端的备用出口。

## 3. 已确认的当前事实

### 3.1 真正的移动端阻塞点

桌面专属调用集中在 `src/desktop-runtime.ts`：

| API | 当前用途 | 移动端现状 |
|---|---|---|
| Node `fs` | 读取 Callout Manager 设置和独立 MathJax 模块 | 不能调用 |
| 运行时 `require(path)` | 加载 `mathjax-svg.js` | 不能调用 |
| Node `http.createServer` | 浏览器预览 | 不能调用 |
| Electron `shell.openExternal` | 打开本地预览 URL | 不能调用 |
| Electron `clipboard.write` | 同时写入 `text/html` 与纯文本 | 不能调用 |
| Node `Buffer` | 图片二进制转 Base64 | 不能调用 |

旧评估中“首次公式渲染必然崩溃”的描述不准确。当前代码在移动端拿不到 Vault 桌面路径时会跳过 `require()`，随后退回 `【公式：LaTeX 源码】`；它不会因此崩溃，但输出能力降级。真正会执行失败的是 Copy 的 Electron 剪贴板、Preview 的 HTTP／Shell，以及含图片预览中的 Node `Buffer`。

### 3.2 已有的可复用基础

- Markdown → HTML 核心已经独立，并由真实生产路径测试覆盖。
- Preview 与 Copy 在共享核心之后只在图片处理和 CSS 输出处分叉。
- Copy 已经生成经过 Juice 内联化的 `inlinedHtml`，这正是新的发布制品正文片段。
- 现有 `src/mathjax-svg.ts` 已由 Rollup 打成浏览器目标的 CJS。2026-08-26 在一个没有 `require`、`process` 和 `__dirname` 的隔离沙箱中，现有 2,627,563 字节构建仍能导出 `tex2svg()` 并生成自包含 SVG；移动端问题来自“运行时从磁盘 `require()`”，不是 MathJax 渲染逻辑本身。
- 公式路线确定为保留现有 MathJax SVG 语义，把浏览器安全构建内联进插件包，并让桌面与移动端调用同一实现。Obsidian `renderMath()` 不作为替换方案，避免桌面输出、微信兼容性和 fixture 同时漂移。
- `app.vault.read()`、`readBinary()`、`adapter.exists()`、`adapter.read()`、`create()` 与 `modify()` 可提供 Vault 相对路径下的跨平台读写边界。

## 4. “最后一公里”方案评估

| 方案 | 桌面端 | 移动端现状 | 本插件定位 |
|---|---|---|---|
| 浏览器扩展注入 | 可作为半自动出口 | 标准 Android Chrome 不支持；Edge Android 已出现 Beta 扩展目录，官方 API 表也列出 Android 的 `scripting`、`tabs`、`runtime` 与 `storage`，但候选公众号扩展仍标记“未验证” | 可做有限真机试点，不作为移动基线 |
| 本地 CLI | Node 环境可用 | Obsidian Mobile 内无 Node 运行时 | 不在插件内实现；远程 CLI 属于独立安全方案 |
| 微信官方 API | 取决于账号权限 | 与操作系统无关 | 排除；个人主体发布接口权限已被回收，且插件不保存 AppSecret |
| 第三方编辑器导入 | 需要逐个验证 | 可能通过浏览器或 App 使用 | 保存／分享 HTML 为其提供通用输入，但不承诺任一第三方兼容 |
| 富文本剪贴板 | Electron 路径已稳定 | 取决于 Obsidian WebView、权限与用户激活 | 真机 spike 后增强，不作为唯一出口 |
| 保存 HTML 文件 | 可实现 | 可通过 Vault API 实现 | 第一优先级、可靠基线 |

微信官方文档确认 `/cgi-bin/draft/add` 用于新增草稿、`/cgi-bin/freepublish/submit` 用于提交发布；同时注明从 2025 年 7 月起，个人主体、未认证企业主体和不支持认证的账号被回收发布接口权限。因此本插件继续不接入微信 API。

### 4.1 Edge Android 扩展调查结论

用户截图证明当前 Edge Android 的“扩展 Beta”页面可以检索并获取公众号相关扩展；微软官方文档进一步证明 Android 扩展运行时已经开放多项脚本与标签 API。二者合起来只说明“具备试验条件”，还不能证明截图里的任一扩展能完成发布。

这里需要的扩展能力必须严格收窄成一个薄适配层：读取用户主动交付的 `fragmentHtml`，在已登录的微信公众号编辑页面中切换到源码／HTML 导入通道并注入。它不负责 Markdown 渲染、MathJax 计算、主题 CSS 生成、图片上传、登录管理或账号凭证；这些要么已由 Obsidian 插件生成，要么继续由用户在公众号后台处理。自包含 MathJax SVG 只要求注入过程不额外破坏或过滤，不要求浏览器扩展再次渲染公式。

恢复本计划后，Edge 路线只做一次限时 spike：

1. 先从现有候选中只选择一个声明支持“HTML 源码导入／注入”、权限最小且来源可审计的 MV3 扩展；“未验证”扩展默认不授予所有网站访问权。
2. 确认安装后能启用、重启后仍保留，并能仅在 `mp.weixin.qq.com` 获得所需权限。
3. 用固定 HTML fixture 验证普通段落、内联样式、Callout、高亮、行内／块级 MathJax SVG 和图片占位符。
4. 区分“源码进入编辑器”“编辑器正确渲染”“保存草稿后仍正确”三个阶段，不用第一步成功代替最终验收。
5. 记录 Edge 版本、扩展版本、权限、失败阶段和脱敏错误；不记录公众号 Cookie、正文或账号凭证。

如果现成扩展不存在、spike 失败或安全性不可接受，就回到“保存 HTML，等待桌面发布”；不为适配某个未验证扩展改写核心 HTML 契约。自行开发 Edge 扩展还会引入扩展开发、权限与安全测试、商店审核、上架、手机安装和长期维护，当前收益不足以支持这条支线，因此不在本计划中启动。

## 5. 发布制品契约

渲染动作只执行一次，返回纯数据对象：

```ts
type WechatPublishArtifact = {
  fragmentHtml: string;
  documentHtml: string;
  plainText: string;
  suggestedFilename: string;
  diagnostics: {
    paragraphCount: number;
    formulaCount: number;
    imagePlaceholderCount: number;
    latexFallbackCount: number;
    unresolvedWikilinkCount: number;
  };
};
```

- `fragmentHtml`：与现有 Electron Copy 写入的富文本 HTML 保持同一契约，供富文本剪贴板和“复制源码”使用。
- `documentHtml`：UTF-8 完整 HTML 文档，正文只包裹 `fragmentHtml`；不额外改写排版语义，供保存、分享和预览。
- `plainText`：继续作为剪贴板纯文本回退。
- 本地图片继续转换为 `【图片：路径】`，不写入 Base64 Copy HTML；保存动作必须明确报告占位符数量。
- 正常公式必须为自包含 SVG。若移动端公式适配尚未完成，允许 beta 阶段保存带公式源码回退的 HTML，但 Notice 必须明确数量；正式移动端稳定版不接受固定测试公式发生回退。

## 6. 保存 HTML 的产品规则

新增设置：

- `微信 HTML 输出目录`：Vault 相对路径，默认 `publish/wechat/output`。
- `微信 HTML 文件名模板`：默认 `{source}.wechat.html`。
- 支持 `{source}`、`{title}`、`{date}`、`{timestamp}`；替换结果必须经过跨平台文件名清理。

默认不带时间戳，因此同一文章再次导出会更新同一制品，减少重复文件；用户在模板中加入 `{timestamp}` 后才保留多个版本。

保存事务：

1. 生成并校验目标 Vault 相对路径，拒绝绝对路径、`..` 越界和空文件名。
2. 递归创建缺失的输出目录。
3. 目标不存在则 `create()`，已存在则 `modify()`。
4. 成功 Notice 显示精确路径和诊断摘要，并提供“打开／分享／复制源码”等后续动作。
5. 写入失败不得破坏已有文件；如采用临时文件原子替换，失败时清理本次临时文件。

不自动把生成的 HTML 加回文章 Frontmatter，不修改原 Markdown，不自动提交 Git。

## 7. 剪贴板与分享能力 spike

浏览器兼容表不能替代 Obsidian Mobile 真机。先增加仅在用户主动执行时运行的能力报告，记录布尔值与错误类型，不读取剪贴板内容：

- `Platform.isMobileApp`、Obsidian 版本和插件版本；
- `window.isSecureContext`；
- `navigator.clipboard`、`writeText`、`write` 与全局 `ClipboardItem` 是否存在；
- `navigator.share`、`navigator.canShare` 是否存在；
- 点击瞬间 `navigator.userActivation.isActive`；
- `text/plain`、`text/html` 和 `File(type="text/html")` 的实际写入／分享结果；
- 异常名和截断消息，不记录 HTML、文章正文、剪贴板内容或文件内容。

富文本复制和系统分享都必须由结果窗口里的真实按钮直接触发。渲染可以预先完成并缓存为当前模态框的内存制品，避免异步渲染耗尽短暂用户激活窗口。

移动端动作按以下顺序独立呈现，不静默混淆：

1. `复制排版内容`：写入 `text/html` + `text/plain`；失败就报告失败。
2. `复制 HTML 源码`：通过 `writeText(fragmentHtml)` 写入纯文本，便于源代码编辑器。
3. `分享 HTML 文件`：构造 `File([documentHtml], name, { type: "text/html" })`，先通过 `canShare({ files })`。
4. `保存 HTML`：始终使用 Vault API，是前三者均不可用时的可靠出口。

不使用已经弃用的 `document.execCommand("copy")` 作为正式主路径；只有真机证明 WebView 缺少标准 API、且该回退确实稳定时才另行评估。

## 8. 跨平台运行时架构

不要在 `main.ts` 继续堆叠平台判断。建议边界：

- `src/publish-artifact.ts`：生成 `WechatPublishArtifact` 的纯逻辑。
- `src/html-export.ts`：文件名模板、路径校验、完整文档包装和 Vault 写入计划。
- `src/clipboard-runtime.ts`：桌面 Electron 与移动 Web Clipboard 两种适配器。
- `src/preview-runtime.ts`：保留桌面 HTTP 预览；移动端使用 Obsidian 内部 View／Modal 的 `iframe.srcdoc` 或经过验证的 Blob URL。
- `src/latex-runtime.ts`：装配内联的浏览器安全 MathJax SVG；桌面与移动端共用同一渲染器和回退语义。
- `src/mobile-capability.ts`：纯能力判定、脱敏报告与动作可用性。
- `src/main.ts`：只负责命令注册、文件读取、Notice 和适配器装配。

Callout Manager 配置改用 `${app.vault.configDir}/plugins/callout-manager/data.json` 的 Vault 相对路径与 Adapter 读取，不再依赖 Vault 本机绝对路径。

图片 Base64 预览改用浏览器安全的分块 `Uint8Array` 编码或 `Blob`／`FileReader`；不得对大数组直接展开到 `String.fromCharCode(...bytes)`，避免手机栈溢出和长时间卡顿。

## 9. 分阶段实施

### 阶段 A：抽取发布制品与保存命令（P0）

- 把 `processAndCopy()` 中的 Juice 内联化、纯文本和诊断组装抽成可测试的制品服务。
- 新增“保存当前笔记的微信复制版 HTML”。
- 编辑器当前内容、阅读模式当前文件和文件菜单入口复用同一服务。
- 增加输出目录与文件名模板设置。
- 桌面原 Copy 输出做 byte／DOM contract 对比，确保没有无关变化。
- 本阶段可在仍保留 `isDesktopOnly: true` 时完成和验证基础重构。

### 阶段 B：移动安全加载与公式／Callout 适配（P0）

- 所有 Node／Electron 调用移入桌面适配器，移动路径永不触达。
- 用 Vault Adapter 读取 Callout Manager 配置。
- 保留 `src/mathjax-svg.ts` 与 Rollup 的状态保真构建，把生成模块作为构建输入内联到 `main.js`，删除运行时文件路径、`fs` 和 `require(path)` 依赖；不得手工编辑编译产物。
- 桌面与移动端同时改用同一个内联模块；用现有固定公式 fixture 做 byte／DOM contract 比较，确认 SVG、自包含样式、中文和 display／inline 契约不变。
- 记录内联前后的 `main.js` 体积、插件加载时间、首次公式初始化时间和移动端内存峰值。MathJax 初始化继续惰性执行；若体积或启动回归不可接受，优化构建与加载边界，不更换渲染器。
- 移动端不支持的旧 Preview／Copy 动作显示可解释状态或不注册，不能抛异常。

### 阶段 C：真机剪贴板、分享与内部预览（P1）

- 先发布带能力报告的测试构建，在 Android 手机和平板读取真实 API 形状。
- 实现富文本复制、源码复制和 HTML 文件分享的独立动作。
- 优先实现 Obsidian 内部预览，避免 `data:` 长度限制和外部浏览器对 Blob URL 的平台差异。
- 预览关闭时释放 Blob URL、事件监听和临时 DOM；没有打开预览时无常驻服务器或定时器。

### 阶段 D：有限解禁与稳定版（P1）

- 只有保存 HTML、移动安全加载、公式契约和至少一种移动后续出口通过真机后，才删除 `isDesktopOnly: true`。
- 首个移动版 Release Notes 必须逐项写明：保存、富文本复制、源码复制、分享、预览分别是稳定、受限还是不可用。
- Android 手机和平板通过后可以发布 beta；iOS 未验证时必须明确标注，而不是由 Android 结果推断。

### 阶段 E：远期出口（P3）

只有保存 HTML 的真实使用仍反复受阻时才评估：

- HTML + 图片清单／附件目录的可移植导出包；
- 用户自选的第三方编辑器适配说明；
- 由用户自建、显式保存凭证的远程 CLI／服务。

不把第三方服务、公众号凭证或上传逻辑提前塞进本地插件。

## 10. 测试矩阵

### 纯逻辑与文件

- fragment 与当前 Copy 的契约一致；document 只增加规定的文档外壳。
- 中文标题、特殊字符、重名、空字段、非法路径和模板占位符。
- create／modify、目录创建、写入失败和临时文件清理。
- 0／多张图片占位符、0／多条公式、公式回退与未解析 Wikilink。
- 同一来源重复导出覆盖；含 `{timestamp}` 时生成新文件。

### 运行时适配

- 桌面剪贴板继续同时写 HTML 和纯文本。
- 移动适配器缺 API、权限拒绝、用户激活丢失、MIME 不支持和写入成功。
- 分享 API 缺失、`canShare` 拒绝、用户取消和分享成功。
- Callout 配置不存在、无权限、非法 JSON 和正常读取。
- 内联 MathJax 的 inline、display、中文、复杂公式与失败回退；构建产物扫描不得重新出现运行时 `require()`、`process` 或 `__dirname`。
- 桌面旧构建与内联构建对同一公式 fixture 的 SVG DOM 契约一致。
- 大图片编码不展开超大参数列表，不阻塞事件循环过久。

### 真机验收

- Android 手机和平板加载插件无启动错误。
- 无剪贴板权限时仍能保存 HTML。
- 保存文件可从 Vault 找到、打开并分享；中文不乱码。
- 富文本复制若被报告成功，粘贴到实际目标后必须保留段落、样式、Callout、公式和高亮。
- 源码复制粘贴到纯文本编辑器后与 `fragmentHtml` 一致。
- 含本地图片的文件明确显示占位符，不把 Base64 注入微信编辑器。
- 应用切后台、恢复、取消分享和关闭预览后无残留任务或内存 URL。

## 11. ICE 与工期

ICE = 影响 × 信心 × 易实施度 ÷ 10。

| 工作包 | 影响 | 信心 | 易实施度 | ICE | 保守工期 |
|---|---:|---:|---:|---:|---:|
| 发布制品抽取 + 保存 HTML | 10 | 9 | 8 | 72.0 | 2–4 天 |
| 移动安全加载 + Adapter 读取 | 9 | 8 | 6 | 43.2 | 2–4 天 |
| MathJax SVG 内联并保持两端等价 | 9 | 9 | 5 | 40.5 | 2–4 天 |
| HTML 源码复制 | 8 | 8 | 7 | 44.8 | 1–2 天 |
| 富文本剪贴板 | 9 | 6 | 4 | 21.6 | spike 1 天，实施 2–4 天 |
| HTML 文件分享 | 7 | 6 | 6 | 25.2 | spike 1 天，实施 1–2 天 |
| Obsidian 内部移动预览 | 7 | 7 | 4 | 19.6 | 3–5 天 |
| Edge Android 扩展真机 spike | 5 | 5 | 6 | 15.0 | 0.5–1 天 |
| 官方 API／自动发布 | 2 | 2 | 1 | 0.4 | 排除 |

两周内可信目标是完成 A、B，并根据真机证据完成 C 的一部分；不承诺同时交付所有移动出口。

## 12. 明确不做

- 不接入 `/cgi-bin/draft/add` 或 `/cgi-bin/freepublish/submit`。
- 不保存 AppID、AppSecret、access token、浏览器 Cookie 或公众号登录态。
- 不在 Obsidian Mobile 中启动本地 Node CLI 或 HTTP 服务。
- 不自动上传图片，不把 Base64 图片写入 Copy HTML。
- 不把 Android 第三方浏览器的扩展能力当作标准 Chrome 能力。
- 不宣称任一第三方编辑器兼容，除非有对应版本的真实导入证据。
- 不在完整验收前删除 `isDesktopOnly`。

## 13. 完成证据

- 新增测试、全量 `npm test`、`npm run lint`、`npm run build` 和版本校验通过。
- GitHub Actions 通过。
- 桌面真实 Preview／Copy 回归通过。
- Android 手机和平板按阶段 C 的矩阵形成脱敏能力报告和实际粘贴／分享结果。
- 用户确认移动能力边界后才更新 README、manifest、版本和 Release。

## 14. 一手资料

- [微信服务号文档：草稿箱](https://developers.weixin.qq.com/doc/offiaccount/Draft_Box/Add_draft.html)
- [微信服务号文档：发布能力](https://developers.weixin.qq.com/doc/offiaccount/Publish/Publish.html)
- [Google Chrome：移动设备不能安装扩展与主题](https://support.google.com/chrome_webstore/answer/1698338)
- [Microsoft Edge：扩展 API 与 Android 平台支持表](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support)
- [Microsoft Edge：扩展架构与权限模型](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/architecture)
- [MDN：Clipboard API 的权限与用户激活约束](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [MDN：Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
