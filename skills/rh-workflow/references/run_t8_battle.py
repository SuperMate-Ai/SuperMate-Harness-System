#!/usr/bin/env python3
"""
run_t8_battle.py — MiniMax H3 T8 高级工作流（stable_4v4a）智子战斗测试
工作流: 2089691196661780481
节点: 13=首帧图(image)  14=时长(value)  53=LLM指令(value)  58=RH_LLMAPI(自动生成H3提示词)
轮询/下载复用 run_workflow_api.RunningHubClient（不手写轮询）。
"""

import argparse
import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_workflow_api import RunningHubClient

WORKFLOW_ID = "2089691196661780481"
# 复用已上传的智子 resize 图（1280x720，1天内存活）
IMAGE_NAME = "openapi/c7f8a9fa5785b63672201a1c946e54a3c23ffd6c95cb9bdcdf1770df2c91cd78.png"

INSTRUCTION = (
    "参考图是主角智子：白色流线型机甲机械少女，蓝色能量纹路，黑发蓝眼。"
    "生成10秒高燃战斗视频：智子在废墟战场被巨型机械兽围攻陷入绝境，单膝跪地后猛然觉醒变身——"
    "装甲蜕变为战斗形态，背后展开蓝色能量光翼，凝聚能量光刃连斩击溃机械兽，"
    "镜头低角度跟拍，动作流畅连贯、残影少、全程无停顿，开场即动态，画面不得出现参考图版面或文字。"
)


def main() -> None:
    parser = argparse.ArgumentParser(description="T8 工作流智子战斗测试")
    parser.add_argument("--check", action="store_true", help="免费自检（Key+工作流节点）")
    parser.add_argument("--duration", type=float, default=10)
    parser.add_argument("--output-dir", default="output_t8")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    client = RunningHubClient(api_key=args.api_key)

    if args.check:
        account = client.check_account()
        wf = client.get_workflow_json(WORKFLOW_ID)
        nodes = {k: v.get("class_type") for k, v in wf.items()}
        print(f"[OK] Key 有效 余额={account['balance']} 金币={account['coins']}")
        print(f"[OK] 工作流 {WORKFLOW_ID} 节点 {len(nodes)} 个")
        print(f"    13={nodes.get('13')}  14={nodes.get('14')}  53={nodes.get('53')}  58={nodes.get('58')}")
        return

    node_info_list = [
        {"nodeId": "13", "fieldName": "image", "fieldValue": IMAGE_NAME},
        {"nodeId": "14", "fieldName": "value", "fieldValue": float(args.duration)},
        {"nodeId": "53", "fieldName": "value", "fieldValue": INSTRUCTION},
    ]

    print(f"[1/4] 提交工作流 {WORKFLOW_ID} 时长={args.duration}s")
    task_data = client.submit_workflow(WORKFLOW_ID, node_info_list)
    task_id = task_data["taskId"]
    print(f"      taskId: {task_id}  状态: {task_data.get('taskStatus', 'QUEUED')}")

    print("[2/4] 轮询...")
    final = client.wait_for_completion(
        task_id,
        poll_interval=5,
        max_wait_time=1200,
        on_tick=lambda e, s: print(f"      [{int(e//60)}:{int(e%60):02d}] {s}"),
    )

    results = final.get("results") or []
    print(f"[3/4] 成功，结果 {len(results)} 个文件")
    files = client.download_results(results, args.output_dir)
    for p in files:
        print(f"      已保存: {p}")

    out = {
        "task_id": task_id,
        "status": final.get("status"),
        "files": files,
        "usage": final.get("usage"),
    }
    if args.json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    print("[4/4] DONE")


if __name__ == "__main__":
    main()
