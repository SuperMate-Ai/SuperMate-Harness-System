# context-handoff-auto 插件（自研 · 已开源）

> 状态：✅ 已上线并验证（2026-09-02）
> 定位：**在 DSH compaction（80% 摘要压缩）之前，先把完整上下文与工作区状态备份到文件**
> —— DSH 官方 compaction 管"续命不中断"（摘要化，丢细节），本插件管"备份不丢细节"（全量存档）。

## 解决的问题

本地小上下文模型（如 Qwen3.6-35B-IQ3_S，`contextWindow=131072`/128k）在长对话中
上下文接近满载：DSH 的 compaction-basic（默认 auto=true，压力≥80% 触发）会把旧内容
压成摘要续命——但摘要化会丢失中间细节。本插件在 compaction 之前先做**完整备份**。

## 机制

```
用量 ≥70%  → WARN（提醒精简，预告备份）
用量 ≥75%  → BACKUP（完整备份到 $DSH_HOME/handoff-backups/{工作区}/{时间戳}/）
用量 ≥80%  → 交给 DSH compaction-basic 接管（摘要续命）
```

- 用量来源：`skills/context-handoff/scripts/check_context.py`（读 `$env:DSH_SESSION_JSONL` 估算）
- 轮数参考：128k 模型约 80 轮 ≈ 80% 压力；≥60 轮开始关注
- 大窗口（262k+/1M）模型会话：规则仅参考，不执行

## 安装（任选一个 DeepSeek Harness 实例）

1. 把 `context-handoff-auto.ts` 放入 `$DSH_HOME/plugins/`
2. 把 `../skills/context-handoff/`（SKILL.md + scripts/check_context.py）放入 `$DSH_HOME/skills/`
3. 在 `$DSH_HOME/cordis.patch.yml` 注册插件（**HMR 热生效，无需重启**）：

```yaml
- insert:
    - id: context-handoff-auto
      name: 'file:///<你的DSH_HOME绝对路径>/plugins/context-handoff-auto.ts'
```

4. 验证：新会话问"系统提示里有【自动备份 · 对齐 DSH compaction 机制】吗？"

## 验证方法

```powershell
python "$env:DSH_HOME\skills\context-handoff\scripts\check_context.py" --window 131072
# 输出 CONTEXT: used=... | 轮数=... | action=OK/WARN/FINISH_THEN_HANDOFF/HANDOFF_NOW
```

## 自定义

| 想改什么 | 改哪里 |
|---------|--------|
| 触发阈值/轮数 | 插件 `ruleText` 中的 70%/75%/80%、60/80 轮 |
| 备份目录 | 插件 `ruleText` 中的 `handoff-backups` 路径约定 |
| 模型范围 | 规则文本写明"仅 ≤131072 窗口模型执行；大窗口仅参考" |

## 关联

- `skills/context-handoff/`（上下文迁移/任务交接技能 + check_context.py 检查器）
- DSH 官方 `@deepseek-ai/dsh-compaction-basic`（底层自动压缩，本插件与其互补）
