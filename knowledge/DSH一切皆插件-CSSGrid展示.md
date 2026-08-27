# DSH 一切皆插件 · CSS Grid 展示（说明）

> 工业级 CSS Grid 排版的可视化页面，复现 DeepSeek Harness"一切皆插件"架构。
> 文件：`DSH一切皆插件-CSSGrid展示.html`（同目录）

## 📖 打开方式（二选一）

**方式 A：Obsidian 内直接打开**
1. 设置 → 文件与链接 → 打开 **"检测所有文件扩展名"**
2. 文件树里即可看到 `DSH一切皆插件-CSSGrid展示.html`
3. 点击它 → 用默认应用（浏览器）打开渲染

**方式 B：直接浏览器打开**
```
D:\AI\Harness_Obsidian\Harness\02-记忆\知识库\DSH一切皆插件-CSSGrid展示.html
```
（复制路径到浏览器地址栏即可）

## 🎨 页面内容

深色工业风仪表盘布局（CSS Grid 九宫格骨架）：

```
┌──────────────┬────────────────┬─────────────┐
│   顶栏 Topbar（品牌/搜索/状态）        │
├──────────────┼────────────────┼─────────────┤
│ 侧栏         │  主区：5 层插件树      │  信息栏     │
│ 插件清单      │  0 Cordis 框架       │  三概念     │
│ 补丁千层饼    │  1 组合包            │  轮次流程   │
│              │  2 核心服务          │  数据层     │
│              │  3 能力 Seam        │            │
│              │  4 Skill/自研扩展   │            │
├──────────────┴────────────────┴─────────────┤
│             页脚 Footer                     │
└─────────────────────────────────────────────┘
```

## 🔧 工业级 CSS Grid 要点（可复用）

| 技巧 | 代码 |
|---|---|
| 设计令牌 | `:root` CSS 变量（色板/间距 4-32px/圆角/阴影）|
| 应用骨架 | `display:grid; grid-template-areas:"topbar topbar topbar" "sidebar main aside" "footer footer footer"` |
| 响应式卡片 | `grid-template-columns: repeat(auto-fit, minmax(170px, 1fr))` |
| 窄屏降级 | `@media (max-width:1100px)` → 单列布局 |
| 微交互 | hover 上浮 + 边框高亮 + 阴影 |

## 📎 相关

- 架构图（Mermaid 版）：[[DSH架构图]]
- 源码：`D:\AI\deepseek-harness-master`
