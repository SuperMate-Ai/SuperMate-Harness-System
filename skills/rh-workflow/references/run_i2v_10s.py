#!/usr/bin/env python3
"""
MiniMax H3 I2V 图生视频 — 10 秒版本（简化示例）

用默认首帧图（天宫人物图）跑 10 秒视频：
    python run_i2v_10s.py
    python run_i2v_10s.py --image D:/其他图.png --prompt "自定义提示词" --json

完整参数见 run_i2v_workflow.py --help。
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
    parser = argparse.ArgumentParser(description="MiniMax H3 I2V 图生视频 — 10秒版")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--workflow-id", default=DEFAULT_WORKFLOW_ID)
    parser.add_argument("--image", default=DEFAULT_IMAGE, help="首帧图路径")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="提示词")
    parser.add_argument("--output-dir", default="output")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    client = RunningHubClient(api_key=args.api_key)
    try:
        result = client.run_full(
            workflow_id=args.workflow_id,
            image_path=args.image,
            prompt=args.prompt,
            duration=10,
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