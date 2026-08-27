#!/usr/bin/env python3
"""
MiniMax H3 I2V 图生视频 — RunningHub 工作流执行脚本（主入口）

用法：
    # 只校验 Key 与工作流（免费，不花钱）
    python run_i2v_workflow.py --check

    # 用默认首帧图 + 工作流自带提示词，生成 10 秒视频
    python run_i2v_workflow.py

    # 指定图片 / 提示词 / 时长 / 输出目录
    python run_i2v_workflow.py \
        --image D:/照片/人物.png \
        --prompt "10秒视频，人物从静态转向镜头，自然微笑" \
        --duration 10 \
        --output-dir ./output

    # 提示词很长时可用文件传入
    python run_i2v_workflow.py --prompt-file ./prompt.txt --duration 15

    # 机器可读输出（方便 qwen3.6 等本地模型/脚本解析）
    python run_i2v_workflow.py --json

工作流：MiniMax H3 I2V 图生视频 1280分辨率加速（workflow 2085953821150367746）
  Node 43 (Text)          → 提示词
  Node 20 (PrimitiveFloat)→ 时长（秒）
  Node 47 (LoadImage)     → 首帧图

API 契约（官方文档核对）：
  POST /task/openapi/create       提交任务（nodeInfoList 用 {nodeId, fieldName, fieldValue}）
  POST /openapi/v2/query          轮询状态/结果
  POST /openapi/v2/media/upload/binary  上传首帧图
"""

import argparse
import json
import os
import sys

# GBK 终端兼容：stdout 遇到无法编码的字符时用 '?' 替代，避免 UnicodeEncodeError 崩溃
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

from pathlib import Path

# 允许直接以脚本方式运行（不要求安装包）
sys.path.insert(0, str(Path(__file__).resolve().parent))

from run_workflow_api import DEFAULT_WORKFLOW_ID, RunningHubClient

# 默认首帧图：留空 = 必须用 --image 显式指定（机器通用，不绑定任何本机路径）
DEFAULT_IMAGE = ""


def main() -> None:
    parser = argparse.ArgumentParser(
        description="MiniMax H3 I2V 图生视频 — RunningHub 工作流",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--api-key", default=None, help="RunningHub API Key（缺省自动读取 Api_key.txt / 环境变量）")
    parser.add_argument("--workflow-id", default=DEFAULT_WORKFLOW_ID, help="工作流 ID")
    parser.add_argument("--image", default=DEFAULT_IMAGE, help="首帧图路径（缺省用天宫人物图）")
    parser.add_argument("--image-name", default=None,
                        help="复用 RunningHub 已上传的图片 fileName（如 openapi/xxx.png），跳过上传（图片在库中保留约1天）")
    parser.add_argument("--prompt", default="", help="提示词；不传则保留工作流内置提示词")
    parser.add_argument("--prompt-file", default=None, help="从文件读取提示词（覆盖 --prompt）")
    parser.add_argument("--duration", type=float, default=10, help="视频时长（秒）")
    parser.add_argument("--resize-max", type=int, default=0,
                        help="上传前把图片最长边缩放到该像素（如 1280，对齐视频生成最长边，省 CLIP token；0=不缩放不裁剪）")
    parser.add_argument("--output-dir", default="output", help="结果保存目录")
    parser.add_argument("--instance-type", default=None, help="实例类型（如 plus，48G 显存）")
    parser.add_argument("--use-url", action="store_true", help="图片节点改用 download_url 外链")
    parser.add_argument("--poll-interval", type=int, default=5, help="轮询间隔（秒）")
    parser.add_argument("--max-wait", type=int, default=1200, help="最大等待时间（秒）")
    parser.add_argument("--check", action="store_true", help="只校验 Key 与工作流，不提交任务（免费）")
    parser.add_argument("--json", action="store_true", help="输出 JSON（机器可读）")
    args = parser.parse_args()

    client = RunningHubClient(api_key=args.api_key)

    # ---------- 免费自检 ----------
    if args.check:
        try:
            account = client.check_account()
            wf = client.get_workflow_json(args.workflow_id)
        except Exception as exc:
            print(f"[ERR] 自检失败: {exc}", file=sys.stderr)
            sys.exit(1)
        nodes = {k: v.get("class_type") for k, v in wf.items()}
        result = {
            "ok": True,
            "account": account,
            "workflow_id": args.workflow_id,
            "workflow_nodes": nodes,
            "expect_nodes": {"43": "Text", "20": "PrimitiveFloat", "47": "LoadImage"},
        }
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"[OK] Key 有效：余额 ￥{account['balance']}，金币 {account['coins']}，类型 {account['api_type']}")
            print(f"[OK] 工作流 {args.workflow_id} 可访问，节点 {len(nodes)} 个")
            print(f"   Node 43={nodes.get('43')}   Node 20={nodes.get('20')}   Node 47={nodes.get('47')}")
        return

    # ---------- 参数校验 ----------
    if args.image_name:
        if not str(args.image_name).startswith(("openapi/", "api/")):
            print(f"[WARN] 提示: --image-name 应为 RunningHub 上传返回的 fileName（如 openapi/xxx.png）", file=sys.stderr)
        image_path = None
    elif not args.image or not Path(args.image).exists():
        print(f"[ERR] 首帧图不存在: {args.image}", file=sys.stderr)
        sys.exit(1)
    else:
        image_path = args.image

    if image_path and args.resize_max > 0:
        try:
            from PIL import Image as PILImage
        except ImportError:
            print("[ERR] 需要 Pillow 才能使用 --resize-max：pip install Pillow", file=sys.stderr)
            sys.exit(1)
        im = PILImage.open(image_path)
        w, h = im.size
        scale = args.resize_max / max(w, h)
        if scale < 1.0:
            nw, nh = round(w * scale), round(h * scale)
            im = im.resize((nw, nh), PILImage.LANCZOS)
            out = Path(args.output_dir) / "first_frame_resized.png"
            out.parent.mkdir(parents=True, exist_ok=True)
            im.save(out)
            print(f"> 图片已缩放: {w}x{h} -> {nw}x{nh}（最长边 {args.resize_max}px，不裁剪）")
            image_path = str(out)
        else:
            print(f"> 图片最长边 {max(w, h)}px ≤ {args.resize_max}px，无需缩放")

    prompt = args.prompt
    if args.prompt_file:
        prompt = Path(args.prompt_file).read_text(encoding="utf-8")

    print(f"> 工作流: {args.workflow_id}")
    print(f"> 首帧图: {args.image}")
    print(f"> 时长: {args.duration}s")
    if prompt:
        print(f"> 提示词({len(prompt)}字): {prompt[:60]}{'…' if len(prompt) > 60 else ''}")

    try:
        result = client.run_full(
            workflow_id=args.workflow_id,
            image_path=image_path,
            image_name=args.image_name,
            prompt=prompt,
            duration=args.duration,
            output_dir=args.output_dir,
            poll_interval=args.poll_interval,
            max_wait_time=args.max_wait,
            instance_type=args.instance_type,
            use_url=args.use_url,
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