---
name: supermate-code-review
description: SuperMate 项目专属代码审查与交付规范。用于：改动 ComfyUI 节点包/工作流/发布物之前的自我审查、完成改动后的独立复核、以及交付前的验证。确保命名一一对应、无回归、资源安全、输出质量达标。
---

# SuperMate Code Review（审查与交付规范）

适用于本项目（ComfyUI 节点包、工作流、发布物）的**动手前 / 改完后 / 交付前**三阶段规范。

## 一、动手前（Think Before Coding）

1. 明确本次改动的**目标与验收标准**（改什么、怎么算改好）。
2. 列出会影响到的**所有相关位置**（尤其：字段改名会影响 ① 节点 INPUT_TYPES ② generate 签名 ③ create_chat_completion 调用点 ④ API 工作流文件 ⑤ UI 工作流 widgets ⑥ 文档）。
3. **严禁全局替换/批量 replace**：`replace_all` 会误伤同名不同义的位置（教训：max_tokens→文本长度 曾误伤 llama API 调用点）。只做**定向、逐处**修改，并 grep 验证所有引用点。
4. 保持简单：不做需求之外的扩展。

## 二、改完后（Self-Verify Before Asking）

每处改动必须**定向回归**，全部改完必须**全量复验**：

1. **导入测试**：`python -c "import ..."` 加载节点包，确认无语法/导入错误，节点数正确。
2. **调用点检查**：grep 确认所有 llama API 调用点用正确参数名（`max_tokens=` 等），无被改名误伤的残留。
3. **签名一致性**：每个节点的 `INPUT_TYPES` 字段名 == `generate()` 参数名（含中文），必填/可选对应。
4. **命名一一对应**：连接两端端口同名同型（模型↔模型 LLM_MODEL / IMAGE↔IMAGE / text↔text），参考规范节点。
5. **工作流结构**：links 索引有效、widgets_values 与 schema 顺序对齐（防参数错位→INT 收到字符串报错）。
6. **单元测试**：纯逻辑函数（_final_answer/_strip_thinking/比例计算等）跑单测。
7. **端到端测试**：通过 API 提交工作流实际跑通；关键节点（看图/反推）用单进程直连打印输出，验证：非空、无思考痕迹（思考/分析/草稿）、包含预期要素（分镜/转场/比例/时长）。

## 三、资源纪律（必须遵守）

RTX 5080 16GB：显存 ≤15.5GB、共享内存 ≤13.5GB、合计 ≤29GB、保留 3GB 给系统。
- 大显存操作前先 `nvidia-smi` 查余量，**一次只允许一个加载大模型的进程**（≈12-13GB）；
- 换参数/换模型必须卸载旧实例（本项目 _LLM_CACHE 已保证只留一个）；
- Ollama 视觉模型用完立即 `ollama stop`；
- 资源不足先停下问用户，绝不硬来。

## 四、独立复核（Requesting Code Review）

重要改动交付前，**派独立 reviewer 子代理**复核（给它完整自包含的任务，不共享本会话上下文）：
1. 静态审查清单（命名/签名/调用点/工作流结构/widgets 对齐/显存安全）；
2. 动态实测（停 ComfyUI 释放显存 → 单进程跑节点 → 输出质量校验）；
3. 输出结构化报告：问题编号 | 严重度 | 位置 | 描述 | 建议修复。

## 五、交付前（Verification Before Completion）

- 用「Assumption / Changed / Verified / Remaining risk」四段式汇报；
- 未验证的项要明说"未验证"及原因；
- 只有全部 PASS 才能宣称"可交付"；任何 FAIL 必须先修复并回归。
