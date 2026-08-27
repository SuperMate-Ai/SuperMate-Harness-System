#!/usr/bin/env python3
"""
MiniMax H3 I2V 图生视频 — 10 秒完整版（逐步日志）

用法：
    python run_i2v_10s_full.py                # 默认首帧图 + 内置提示词
    python run_i2v_10s_full.py --check        # 免费自检（Key + 工作流）
    python run_i2v_10s_full.py --image ... --prompt ... --output-dir ...

实现说明（官方 API 契约）：
    1. POST /openapi/v2/media/upload/binary  上传首帧图 → 拿到服务端 fileName
    2. POST /task/openapi/create              提交工作流（nodeInfoList 为 {nodeId, fieldName, fieldValue}）
    3. POST /openapi/v2/query                 轮询任务状态
    4. 下载结果文件到本地
"""

import argparse
import json
import sys

# GBK 终端兼容：stdout 遇到无法编码的字符时用 '?' 替代，避免 UnicodeEncodeError 崩溃
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from run_workflow_api import DEFAULT_WORKFLOW_ID, RunningHubClient

# 默认首帧图：留空 = 必须用 --image 显式指定（机器通用）
DEFAULT_IMAGE = ""

DEFAULT_PROMPT = (
    "为给定图片中的女性照片生成10秒视频，要求充分展现人物真实情感，"
    "从含情脉脉的静态特写开始，镜头缓缓推进，人物眼神自然流转、嘴角微扬，"
    "随后轻微转身并抬手整理衣领，动作流畅自然不僵硬，"
    "背景保持原图的极简影棚质感，光影柔和，画面稳定无跳帧，超写实人像摄影风格。"
)


def main() -> None:
    parser = argparse.ArgumentParser(description="MiniMax H3 I2V 图生视频 — 10秒完整版")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--workflow-id", default=DEFAULT_WORKFLOW_ID)
    parser.add_argument("--image", default=DEFAULT_IMAGE)
    parser.add_argument("--prompt", default=DEFAULT_PROMPT)
    parser.add_argument("--duration", type=float, default=10)
    parser.add_argument("--output-dir", default="output")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    client = RunningHubClient(api_key=args.api_key)

    if args.check:
        account = client.check_account()
        wf = client.get_workflow_json(args.workflow_id)
        print(f"[OK] Key 有效：余额 ￥{account['balance']}，金币 {account['coins']}")
        print(f"[OK] 工作流 {args.workflow_id} 节点: {', '.join(wf.keys())}")
        return

    print(f"[0/4] 参数确认")
    print(f"      workflow_id = {args.workflow_id}")
    print(f"      image       = {args.image}")
    print(f"      duration    = {args.duration}s")
    print(f"      提示词 {len(args.prompt)} 字: {args.prompt[:50]}…")

    try:
        result = client.run_full(
            workflow_id=args.workflow_id,
            image_path=args.image,
            prompt=args.prompt,
            duration=args.duration,
            output_dir=args.output_dir,
        )
    except Exception as exc:
        print(f"[ERR] 执行失败: {exc}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"\n[DONE] 完成！taskId={result['task_id']}")
        for path in result["files"]:
            print(f"  [FILE] {path}")


if __name__ == "__main__":
    main()