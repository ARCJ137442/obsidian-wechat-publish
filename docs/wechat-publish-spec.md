# 微信公众号排版发布规范

> 版本: 1.0.7 | 最后更新: 2026-06-03 | 适用: life-series 生活记录

## 工具链

```
Obsidian MD → obsidian-wechat-publish 插件 → 微信格式化 HTML → 粘贴到公众号后台
```

- **插件**: `tinyking/obsidian-wechat-publish` v1.0.6 (MIT)
- **核心技术**: markdown-it 渲染 + juice CSS 内联
- **安装路径**: `.obsidian/plugins/obsidian-wechat-publish/`
- **触发方式**: `Ctrl/Cmd+P` → `Copy to WeChat`

## 排版风格: 简约日记风

### 设计原则

1. **让文字说话** — 颜色只用黑/白/灰三阶，不对标题、加粗施加彩色装饰
2. **呼吸感大于装饰感** — 用留白建立节奏，而非线条、色块分割
3. **引用块退后一步** — 左侧细线 + 稍小字号 + 半透明灰色
4. **图片不加戏** — 居中、全宽、无边框圆角阴影
5. **链接不打断** — 正文链接淡蓝协调，参考链接用小字号

### 核心参数

| 参数 | 值 |
|------|-----|
| 正文字体 | PingFang SC > system-ui > … |
| 正文字号 | 17px |
| 字体颜色 | rgba(0,0,0,0.9) |
| 行高 | 1.75 |
| 字间距 | 0.544px |
| 段间间距 | 12px (p margin-bottom) |
| 段内间距 | ~0.7 行高 (br 收紧 30%) |
| 对齐方式 | justify |
| 页面边距 | 0 (靠边) |

### 各元素规范

| 元素 | 字号 | 颜色 | 其他 |
|------|------|------|------|
| H1 | 22px/600 | #1a1a1a | 无装饰 |
| H2 | 19px/600 | #1a1a1a | 无装饰 |
| H3 | 17px/600 | #333 | 无装饰 |
| 加粗 | — | 继承 | font-weight:600 即可 |
| 斜体 | — | 继承 | 不额外着色 |
| 高亮 | — | — | 极淡底层色条 |
| 引用 | 15px | rgba(0,0,0,0.5) | 左侧3px #dbdbdb |
| 链接 | — | #576b95 | 半透明下划线 |
| 代码 | 14px | #444 | #f3f3f3 浅灰底 |
| 图片说明 | 14px | rgba(0,0,0,0.4) | letter-spacing:0.8px |

### 参考标杆

- 之乎者野记（牧之野）— 极简克制风
- 宇空新辰 — 散文体留白节奏

### CSS 文件

主题 CSS 源文件: [wechat-theme.css](../wechat-theme.css)

## 发布流程（当前: 2步）

1. Obsidian 打开目标 `.md` 文件
2. `Ctrl+P` → `Copy to WeChat` → 在公众号后台 `Ctrl+V` 粘贴

### 后续优化方向

- Obsidian Shell Commands 绑定快捷键
- 提取为独立 CLI 脚本（`convert.js article.md`）
- 接入微信公众号 API 实现全自动草稿发布
