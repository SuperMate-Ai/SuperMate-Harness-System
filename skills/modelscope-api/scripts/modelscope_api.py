#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ModelScope（魔塔）免费 API 客户端 —— SuperMate 本地通道（跨机器版）
===================================================================
零第三方依赖（仅标准库 urllib），任何 Python 3.8+ 可直接运行。

三大能力（OpenAI 协议，国内默认 https://api-inference.modelscope.cn/v1）：
  chat   : 文本对话（Qwen3-235B / DeepSeek-V4-Flash / GLM-4.7-Flash ...）
  vision : 图片理解（Qwen3-VL-235B-A22B-Instruct 等）
  image  : 文生图（Tongyi-MAI/Z-Image-Turbo / Qwen-Image-2512 / FLUX.2-klein-9B ...）

API Key 解析优先级：--api-key > 环境变量 MODELSCOPE_API_KEY >
    Api_key_modelscope.txt（脚本同目录或上一级目录）> Api_key.txt 中 MODELSCOPE_API_KEY= 前缀行

🔒 铁律：本脚本与密钥文件均为本地使用，密钥绝不写入/上传任何 GitHub 仓库
（仓库 .gitignore 已忽略 Api_key*.txt）。

用法示例：
  python modelscope_api.py chat "用一句话介绍你自己" --model Qwen/Qwen3-235B-A22B
  python modelscope_api.py vision D:/download/tv.png "翻译图中文字，重点讲 tv bot"
  python modelscope_api.py image "赛博朋克城市夜景，霓虹灯" --size 1024x1024 -o out.png
  python modelscope_api.py models                  # 列出可用模型
"""
import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_BASE = "https://api-inference.modelscope.cn/v1"  # 国内；国外换 https://api-inference.modelscope.ai/v1
DEFAULT_CHAT = "Qwen/Qwen3-235B-A22B"
DEFAULT_VISION = "Qwen/Qwen3-VL-235B-A22B-Instruct"
DEFAULT_IMAGE = "Tongyi-MAI/Z-Image-Turbo"

_HERE = Path(__file__).resolve().parent
KEY_CANDIDATES = [
    _HERE / "Api_key_modelscope.txt",        # 脚本同目录
    _HERE.parent / "Api_key_modelscope.txt",  # 上一级（skill 根 / Local_LLM）
    _HERE.parent / "Api_key.txt",             # 兼容 Local_LLM/Api_key.txt 中的 MODELSCOPE_API_KEY= 行
]


def resolve_key(explicit: str = "") -> str:
    if explicit and explicit.strip():
        return explicit.strip()
    env = os.environ.get("MODELSCOPE_API_KEY", "").strip()
    if env:
        return env
    for path in KEY_CANDIDATES:
        if not path.exists():
            continue
        try:
            for line in path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                if "=" in line:
                    k, _, v = line.partition("=")
                    if k.strip().upper() == "MODELSCOPE_API_KEY":
                        return v.strip().strip('"').strip("'")
                elif line.startswith("ms-"):
                    return line
        except (OSError, UnicodeDecodeError):
            continue
    raise SystemExit("[key] 未找到 ModelScope API Key：请设 MODELSCOPE_API_KEY 环境变量，"
                     "或在 Api_key_modelscope.txt（脚本同目录/上一级）写入，勿提交 git")


def http_json(url: str, payload: dict, api_key: str, timeout: int = 120):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"[http {e.code}] {e.read().decode('utf-8', 'replace')[:800]}")
    except urllib.error.URLError as e:
        raise SystemExit(f"[net] {e.reason}")


def cmd_chat(args):
    key = resolve_key(args.api_key)
    payload = {
        "model": args.model,
        "messages": [{"role": "user", "content": args.text}],
        "temperature": args.temperature,
        "max_tokens": args.max_tokens,
    }
    data = http_json(f"{args.base_url}/chat/completions", payload, key, args.timeout)
    try:
        print(data["choices"][0]["message"]["content"])
    except (KeyError, IndexError):
        print(json.dumps(data, ensure_ascii=False, indent=2))


def cmd_vision(args):
    key = resolve_key(args.api_key)
    img = Path(args.image)
    if not img.exists():
        raise SystemExit(f"[file] 不存在: {img}")
    mime = mimetypes.guess_type(str(img))[0] or "image/png"
    b64 = base64.b64encode(img.read_bytes()).decode("ascii")
    payload = {
        "model": args.model,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": args.text},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ],
        }],
        "max_tokens": args.max_tokens,
    }
    data = http_json(f"{args.base_url}/chat/completions", payload, key, args.timeout)
    try:
        print(data["choices"][0]["message"]["content"])
    except (KeyError, IndexError):
        print(json.dumps(data, ensure_ascii=False, indent=2))


def cmd_image(args):
    key = resolve_key(args.api_key)
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
        "X-ModelScope-Async-Mode": "true",  # 明确异步模式，返回 task_id
    }
    payload = {
        "model": args.model,
        "prompt": args.prompt,
        "n": 1,
    }
    if args.size:
        w, _, h = args.size.lower().partition("x")
        if w.isdigit() and h.isdigit():
            payload["width"] = int(w)
            payload["height"] = int(h)
        payload["size"] = args.size
    url = f"{args.base_url}/images/generations"
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=args.timeout) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"[http {e.code}] {e.read().decode('utf-8', 'replace')[:800]}")

    task_id = raw.get("task_id") if isinstance(raw, dict) else None
    if not task_id:
        item = (raw.get("data") or [{}])[0] if isinstance(raw, dict) else {}
        if item.get("b64_json") or item.get("url"):
            return _save_image(item, args)
        raise SystemExit(f"[response] 未返回 task_id 或图片：{str(raw)[:400]}")

    # 异步任务轮询：/tasks/{task_id} 必须带 X-ModelScope-Task-Type header
    poll_headers = {**headers, "X-ModelScope-Task-Type": "image_generation"}
    deadline = time.time() + args.timeout
    last = raw
    while time.time() < deadline:
        time.sleep(3)
        try:
            req = urllib.request.Request(f"{args.base_url}/tasks/{task_id}", headers=poll_headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                last = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise SystemExit(f"[poll http {e.code}] {e.read().decode('utf-8', 'replace')[:400]}")
        status = str(last.get("task_status") or "").upper()
        if status == "SUCCEED":
            images = last.get("output_images") or []
            if not images:
                raise SystemExit(f"[response] 任务成功但无图片：{str(last)[:400]}")
            return _save_image({"url": images[0]}, args)
        if status in {"FAILED", "FAIL", "ERROR", "CANCELED", "CANCELLED", "TIMEOUT", "REVOKED"}:
            detail = last.get("error_info") or last.get("message") or last.get("detail") or str(last)
            raise SystemExit(f"[task {status}] {detail}")
    raise SystemExit(f"[timeout] 等待 {args.timeout}s 未完成：{str(last)[:400]}")


def _save_image(item: dict, args):
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = Path(args.out) if args.out else out_dir / f"ms_{args.model.split('/')[-1]}_{int(time.time())}.png"
    if item.get("b64_json"):
        out.write_bytes(base64.b64decode(item["b64_json"]))
        print(f"[ok] saved -> {out}")
    elif item.get("url"):
        urllib.request.urlretrieve(item["url"], str(out))
        print(f"[ok] saved -> {out}")
    else:
        raise SystemExit(f"[response] 无 b64_json/url：{str(item)[:400]}")
    return out


def cmd_models(args):
    key = resolve_key(args.api_key)
    req = urllib.request.Request(
        f"{args.base_url}/models",
        headers={"Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=args.timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"[http {e.code}] {e.read().decode('utf-8','replace')[:400]}")
    ids = sorted(m.get("id", "") for m in data.get("data", []) if m.get("id"))
    print(f"共 {len(ids)} 个模型：")
    print("\n".join(ids))


def main():
    p = argparse.ArgumentParser(description="ModelScope 免费 API 客户端（chat/vision/image/models）")
    p.add_argument("--api-key", default="", help="直接传 Key（默认自动解析，勿上传公网）")
    p.add_argument("--base-url", default=DEFAULT_BASE, help=f"请求地址（默认 {DEFAULT_BASE}）")
    p.add_argument("--timeout", type=int, default=120)
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("chat", help="文本对话")
    c.add_argument("text")
    c.add_argument("--model", default=DEFAULT_CHAT)
    c.add_argument("--temperature", type=float, default=0.7)
    c.add_argument("--max-tokens", type=int, default=2048)
    c.set_defaults(fn=cmd_chat)

    v = sub.add_parser("vision", help="图片理解")
    v.add_argument("image")
    v.add_argument("text", nargs="?", default="请详细描述这张图片")
    v.add_argument("--model", default=DEFAULT_VISION)
    v.add_argument("--max-tokens", type=int, default=2048)
    v.set_defaults(fn=cmd_vision)

    i = sub.add_parser("image", help="文生图")
    i.add_argument("prompt")
    i.add_argument("--model", default=DEFAULT_IMAGE)
    i.add_argument("--size", default="1024x1024", help="如 1024x1024 / 1280x720")
    i.add_argument("-o", "--out", default="", help="输出文件路径")
    i.add_argument("--out-dir", default="modelscope-out")
    i.set_defaults(fn=cmd_image)

    m = sub.add_parser("models", help="列出可用模型")
    m.set_defaults(fn=cmd_models)

    args = p.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
