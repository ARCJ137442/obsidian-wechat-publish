# 微信原生图片剪贴板调查

## 观测样本

2026-10-01 在 Windows 剪贴板中读取了从微信公众号编辑器复制出的 `HTML Format`。样本包含标准 Clipboard HTML 头：

```text
Version:0.9
StartHTML:...
EndHTML:...
StartFragment:...
EndFragment:...
```

图片片段的结构为：

```html
<section style="text-align: center;" nodeleaf data-pm-slice="0 0 []">
  <img
    src="https://mmbiz.qpic.cn/.../0?wx_fmt=png&amp;from=appmsg"
    data-src="https://mmbiz.qpic.cn/.../0?wx_fmt=png&amp;from=appmsg"
    class="rich_pages wxw-img"
    data-ratio="0.6666666666666666"
    data-w="3048"
    type="block"
  >
</section>
<p style="...text-align: center; color: #999; ...">
  <span>图片说明</span>
</p>
```

实际样本中的 `src` 和 `data-src` 都是已经上传到微信 CDN 的 `mmbiz.qpic.cn` 地址；剪贴板没有携带本地图片字节。图注是图片后面的独立段落，不是 `img alt`。

## 后续剪贴板复核

随后再次读取 Windows `ClipboardDataObject` 时，当前剪贴板已经不是上述微信文章样本，而是 PixPin 一类截图工具写入的图像剪贴板。可用格式为：

| 格式 | 类型 | 观测值 |
| --- | --- | --- |
| `PixPinData` | `MemoryStream` | 79 bytes，JSON 风格的截图元数据 |
| `DeviceIndependentBitmap` | `MemoryStream` | 2,059,796 bytes，40-byte DIB 头，约 764x674 的 32-bit 像素数据 |
| `Format17` | `MemoryStream` | 2,059,868 bytes，应用自定义／注册格式 |

没有 `HTML Format`、`UnicodeText`、`Text`、`FileDrop` 或可识别的文件路径。DIB／自定义格式只携带栅格图像，不携带与文章图注对应的 HTML 结构；它们不能单独复现微信文章的“图片 + 图注”粘贴。

2026-10-01 的动态只读采样另有一组限制：采样脚本每 10 秒调用一次
`ClipboardDataObject.GetDataObject()`，连续 6 次都收到 Windows 的
`Requested Clipboard operation did not succeed`，`GetText()` 也同样失败。该状态表示剪贴板被其他进程暂时占用或系统拒绝访问，不能解释为空剪贴板，也不能据此推断格式缺失。采样脚本没有调用任何写入 API。

## 结论

微信编辑器能够在再次粘贴时显示图片，是因为源 HTML 引用了微信服务器上可访问的远程图片。插件不能把本地 Vault 图片安全地伪装成相同格式：

- Copy 管道没有微信图片上传接口和账号授权；
- 把本地图片转成 Base64 会显著放大剪贴板内容，并曾导致公众号编辑器卡死；
- 仅复制 `mmbiz.qpic.cn` 结构而不拥有对应资源，粘贴后会得到失效图片。

因此当前 Copy 边界继续保持：本地图片输出 `【图片：...】` 占位符，不上传图片、不写 Base64；外部图片 URL 仍可保留。若未来要自动上传，应作为单独的、明确确认的上传流程，并在获得微信官方可用接口后再设计。

现有插件的最小富文本剪贴板是 `text/html` + `text/plain`。Electron 原生适配器和移动端 `ClipboardItem` 都只写这两种 MIME；它们没有本地图片二进制，也没有微信 CDN URL。向系统剪贴板额外写入 DIB 需要读取本地附件、增加平台专用适配，并不能保证公众号编辑器把 DIB 与 HTML 图注配对，反而可能绕过现有的图片安全边界。因此本轮不兼容 DIB／`Format17` 写入。

## 图注处理

Obsidian 图片 wikilink 的图注语法是：

```markdown
![[图片链接|图注文本]]
```

Markdown 渲染后图注位于 `img[alt]`。Copy 现在保留文件名，并在有图注时追加第二行：

```text
【图片：attachments/Pasted image 1.png】
图注文本
```

无图注时继续使用解码后的图片路径／文件名：

```text
【图片：attachments/Pasted image 1.png】
```

这保持了 Preview/Copy 分叉、公式渲染和安全图片边界不变。

文件名行使用 `#FF0000`、粗体和 `14px` 内联样式；图注行使用相同字号和原有灰色。占位符复用 Markdown 已生成的段落，不再嵌套额外 `<p>`。这样用户可以在公众号编辑器中三击第一行复制文件名，再手动上传对应图片，图注仍留在第二行可见。

## 图片工作流评估

### 方案 A：可恢复的两行占位符（当前实现）

每张本地图都输出文件名行和可选图注行。它只依赖现有 `text/html` + `text/plain` 剪贴板，不改变图片占位符安全边界，也不占用或覆盖用户后续的系统剪贴板。用户可逐张处理、跳过或重新上传，失败时不会留下插件内部状态。

### 方案 B：附图顺序状态机（暂不实现）

状态机需要维护文章图片顺序、当前索引、已上传／待上传状态、跳过和回退；同时要处理用户在公众号编辑器中手动粘贴、另一个窗口覆盖系统剪贴板、撤销后重试、文章切换和移动端 WebView 用户激活限制。插件无法观察公众号实际上传结果，因而容易出现“插件认为已粘贴、编辑器实际跳过”的不可恢复分叉。

后续若有真实需求，可抽象只读队列会话接口：

```ts
type CopyImageSequenceSession = {
  current(): { sourcePath: string; caption?: string } | undefined;
  next(): void;
  previous(): void;
  skip(): void;
  cancel(): void;
};
```

该接口应先服务于可见的顺序提示和回退，不直接写入 Vault 或伪造上传成功；在确认公众号端有稳定的可观察反馈前，不启用自动状态机。
