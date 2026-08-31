# 千问侧栏读图代理补丁 — 文件说明

本目录是「dsh-im-wecom」的**增强补丁包**：让企业微信图片消息改走**夸克千问侧栏**分析，纯文本模型也能"看图"，且模型请求中不出现任何图片。

## 文件清单

| 文件 | 功能说明 |
|---|---|
| `wecom-qwen-proxy.mjs` | **代理核心模块（新增文件）**。导出 `qwenVisionContentForMessage(message, {signal, logger})`：下载企微图片（SDK 解密）→ 写临时文件 → 调 `qwen-vision.js`（CDP 粘贴图片到夸克千问对话页 + 提问）→ 轮询回复 → 返回纯文本 content blocks。内置：全局串行队列（千问页面是共享单例）、超时（120s）、临时目录自动清理。不依赖任何凭据（Secret 由 DSH 凭据存储管理） |
| `apply-patch.ps1` | **一键应用脚本**。对「插件源码副本」执行：① 拷贝代理模块到 `src/channels/wecom/`；② 对 `wecom-bridge.mjs` 做两处精确文本替换（见 `bridge-change.md`）；③ 重新构建 host bundle（esbuild）；④ `link:` 安装到指定 profile；⑤ 提示重启 dsh web。幂等（重复执行安全） |
| `bridge-change.md` | **改动说明**。逐处列出 `wecom-bridge.mjs` 的修改点（import 与图片 content 构造）、为什么这样改、如何回滚 |

## 工作原理

```
wecom-bridge.mjs #process（收到图片消息）
  └─ DSH_WECOM_QWEN_VISION != '0'
       └─ qwenVisionContentForMessage()          ← 补丁注入
            ├─ source.load() 下载图片（aeskey 解密）
            ├─ 写临时文件（png/jpg/webp）
            ├─ spawn node qwen-vision.js <图> <问题>   ← 夸克千问侧栏 CDP
            ├─ 解析 "[4/4] ===== 千问视觉回复 =====" 之后的文本
            └─ 返回 [{type:'text', text:'[千问侧栏视觉分析 N]\n…'}]
  失败 → 回退原 promptContentForMessage()（模型图片路径，纯文本模型会报"不支持图片"）
```

## 安装

前置：夸克浏览器调试模式（`--remote-debugging-port=9222`）+ 千问对话页已打开 + 本机有 `quark-qwen-vision` skill。

```powershell
cd <本仓库>
powershell -ExecutionPolicy Bypass -File patch\apply-patch.ps1
# 可选参数：-Profile <profile名>  -SkipInstall（只打补丁重建，不安装）
```

完成后**重启 dsh web**，刷新页面，在企业微信发一张图验证。

## 配置（环境变量）

| 变量 | 默认 | 说明 |
|---|---|---|
| `DSH_WECOM_QWEN_VISION` | 未设=启用 | `0` 关闭代理，回退原插件图片逻辑 |
| `DSH_WECOM_QWEN_VISION_SCRIPT` | `$DSH_HOME/skills/quark-qwen-vision/scripts/qwen-vision.js` | 千问看图脚本路径 |
| `DSH_WECOM_QWEN_TMP` | 系统临时目录 | 图片临时存放目录 |

## 验证与排错

```powershell
# 单独验证千问看图链路（不经过企微）
node "$env:DSH_HOME\skills\quark-qwen-vision\scripts\qwen-vision.js" <图片> "这张图是什么？"
```

- 代理生效：企微发图 → 回复千问分析结果（模型为纯文本也能答）
- 发图仍报"当前模型不支持图片" = 代理异常回退：检查 9222、千问对话页、脚本路径
- 插件升级/重装后：重新执行 `apply-patch.ps1`

## 安全

- 补丁代码不含任何真实 Bot ID / Secret；Secret 由 DSH 凭据存储管理（`$DSH_HOME/.credentials.yaml`）
- 临时图片目录使用后自动删除
