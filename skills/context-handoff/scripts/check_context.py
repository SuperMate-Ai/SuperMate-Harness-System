# -*- coding: utf-8 -*-
"""context 用量检查（供 context-handoff 自动模式使用）
读 DSH_SESSION_JSONL（或参数路径）→ 估算已用 token / 轮数 → 输出建议动作
估算口径：CJK 字符≈1 token/字，其他字符≈1 token/4字（混合中文会话的实用近似）
用法：python check_context.py [--window 131072] [--session <路径>]
"""
import argparse
import json
import os
import re

import zstandard as zstd

CJK = re.compile(r"[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]")


def load_text(path):
    dctx = zstd.ZstdDecompressor()
    with open(path, "rb") as f:
        with dctx.stream_reader(f) as r:
            return r.read().decode("utf-8", "ignore")


def estimate(text):
    cjk = len(CJK.findall(text))
    other = len(text) - cjk
    return int(cjk * 1.0 + other / 4.0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--window", type=int, default=131072, help="模型 contextWindow（qwen3.6=131072）")
    ap.add_argument("--session", default=os.environ.get("DSH_SESSION_JSONL", ""))
    args = ap.parse_args()
    if not args.session or not os.path.exists(args.session):
        print("CONTEXT: session 文件不存在（可能在新会话且尚无记录）| used=0 | rounds=0 | action=OK")
        return 0
    text = load_text(args.session)
    used = estimate(text)
    # 轮数：user 消息（嵌套结构里 role=user 或 source.kind=user 两种写法都数）
    rounds = sum(1 for l in text.splitlines() if l.strip()
                 and ('"role": "user"' in l or '"role":"user"' in l or '"kind": "user"' in l))
    pct = used / args.window * 100
    if rounds >= 100 or pct >= 90:
        action = "HANDOFF_NOW"
    elif rounds >= 80 or pct >= 80:
        action = "FINISH_THEN_HANDOFF"
    elif pct >= 70:
        action = "WARN"
    else:
        action = "OK"
    print(f"CONTEXT: used≈{used} tokens (窗口{args.window}) = {pct:.1f}%(上限近似) | 轮数={rounds} | action={action}")
    print("触发: 轮数>=100或用量>=90% → 立即交接 | 轮数>=80或用量>=80% → 任务完成后交接 | >=70% → 预警")
    print("注: 会话文件=全量档案，token 估算为上限近似；轮数触发最可靠（80轮≈90-100k 为实测规律）。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
