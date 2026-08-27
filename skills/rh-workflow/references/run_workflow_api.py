#!/usr/bin/env python3
"""
RunningHub 工作流 API 客户端库（ComfyUI 工作流）

基于 RunningHub 官方 API 文档（2026-04 版）核对过的真实契约：

  POST https://www.runninghub.cn/task/openapi/create         提交 ComfyUI 工作流任务（发起ComfyUI任务2-高级）
  POST https://www.runninghub.cn/openapi/v2/query            查询任务状态/结果（查询任务生成结果 V2）
  POST https://www.runninghub.cn/openapi/v2/media/upload/binary  上传本地文件（文件上传）
  POST https://www.runninghub.cn/uc/openapi/accountStatus    查询余额/Key 有效性

重要差异（相对旧版/错误写法）：
  * 提交端点不是 /openapi/v2/run/workflow/{id}，而是 /task/openapi/create，
    workflowId 放在请求体里。
  * nodeInfoList 的每一项是 {"nodeId", "fieldName", "fieldValue"}，
    不是 {"nodeId", "inputs": {...}}。
  * 上传返回 data.fileName（服务端路径，填给 LoadImage 类节点）与
    data.download_url（外链，仅用于下载回传）。

用法（命令行入口见 run_i2v_workflow.py）：
    from run_workflow_api import RunningHubClient
    client = RunningHubClient()                      # 自动读取 Api_key.txt / 环境变量
    print(client.check_account())
    client.run_full(workflow_id="2085953821150367746",
                    image_path="./input.png",
                    prompt="10秒视频，人物转身微笑",
                    duration=10,
                    output_dir="./output")
"""

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

API_HOST = "https://www.runninghub.cn"
SUBMIT_URL = f"{API_HOST}/task/openapi/create"
QUERY_URL = f"{API_HOST}/openapi/v2/query"
MEDIA_UPLOAD_URL = f"{API_HOST}/openapi/v2/media/upload/binary"
ACCOUNT_STATUS_URL = f"{API_HOST}/uc/openapi/accountStatus"

# 默认工作流：MiniMax H3 I2V 图生视频 1280分辨率加速
DEFAULT_WORKFLOW_ID = "2085953821150367746"

# 本工作流的可修改节点映射（已通过 getJsonApiFormat 接口核对）
NODE_PROMPT = "43"    # Text 提示词
NODE_DURATION = "20"  # PrimitiveFloat 时长（秒）
NODE_IMAGE = "47"     # LoadImage 首帧图


def _resolve_api_key(api_key: Optional[str] = None) -> str:
    """按优先级解析 API Key：参数 > 环境变量 > Local_LLM/Api_key.txt > RH CLI 配置。"""
    if api_key:
        return api_key.strip()
    env = os.environ.get("RUNNINGHUB_API_KEY", "").strip()
    if env:
        return env

    # 本文件位于 Local_LLM/RH_Workflow_Api/ 下，Api_key.txt 在上一级
    candidates = [
        Path(__file__).resolve().parent.parent / "Api_key.txt",
        Path.cwd() / "Api_key.txt",
        Path.home() / ".config" / "rh" / "config.toml",
    ]
    for path in candidates:
        if path.exists():
            try:
                if path.suffix == ".toml":
                    text = path.read_text(encoding="utf-8")
                    for line in text.splitlines():
                        line = line.strip()
                        if line.startswith(("api_key", "api-key")) and "=" in line:
                            return line.split("=", 1)[1].strip().strip('"').strip("'")
                else:
                    key = path.read_text(encoding="utf-8").strip()
                    if key:
                        return key
            except (OSError, UnicodeDecodeError):
                continue
    raise ValueError(
        "未找到 RunningHub API Key。请通过 --api-key 传入，或设置 RUNNINGHUB_API_KEY 环境变量，"
        "或在 Local_LLM/Api_key.txt 中填写。"
    )


class RunningHubClient:
    """RunningHub ComfyUI 工作流 API 客户端。"""

    def __init__(self, api_key: Optional[str] = None, timeout: float = 60.0):
        self.api_key = _resolve_api_key(api_key)
        self.timeout = timeout
        self.session = requests.Session()
        # 注意：不要在这里设置 Host 头。requests 会自动按 URL 设置 Host
        # （对 www.runninghub.cn 的 API 请求即 www.runninghub.cn），
        # 但下载结果文件时 URL 是 COS 对象存储（rh-images-xxx.cos.xxx），
        # 带错 Host 会被 COS 拒绝（400 Bad Request）。
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
        })

    # ---------- 免费检查 ----------

    def check_account(self) -> Dict[str, Any]:
        """校验 Key 并返回余额信息（免费）。"""
        resp = self.session.post(
            ACCOUNT_STATUS_URL,
            json={"apikey": self.api_key},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"Key 校验失败: {data.get('msg') or data}")
        info = data.get("data", {})
        return {
            "status": "ready",
            "key_prefix": self.api_key[:4] + "****",
            "balance": info.get("remainMoney"),
            "currency": info.get("currency", "CNY"),
            "coins": info.get("remainCoins"),
            "running_tasks": info.get("currentTaskCounts"),
            "api_type": info.get("apiType"),
        }

    def get_workflow_json(self, workflow_id: str) -> Dict[str, Any]:
        """获取工作流当前节点结构（免费，用于核对可修改节点）。"""
        resp = self.session.post(
            f"{API_HOST}/api/openapi/getJsonApiFormat",
            json={"apiKey": self.api_key, "workflowId": workflow_id},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"获取工作流失败: {data.get('msg') or data}")
        return json.loads(data["data"]["prompt"])

    # ---------- 文件上传 ----------

    def upload_file(self, file_path: str, timeout: int = 120) -> Dict[str, str]:
        """上传本地文件，返回 {fileName, download_url}。"""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")
        with open(path, "rb") as f:
            resp = self.session.post(
                MEDIA_UPLOAD_URL,
                files={"file": (path.name, f)},
                timeout=timeout,
            )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"上传失败: {data.get('message') or data.get('msg') or data}")
        info = data.get("data", {})
        if "fileName" not in info and "download_url" not in info:
            raise RuntimeError(f"上传响应缺少 fileName/download_url: {data}")
        return {
            "fileName": str(info.get("fileName", "")),
            "download_url": str(info.get("download_url", "")),
        }

    # ---------- 提交 / 轮询 / 下载 ----------

    def build_node_info_list(
        self,
        prompt: str = "",
        image_value: str = "",
        duration: Optional[float] = None,
        use_url: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        为本工作流构造 nodeInfoList。

        节点映射（已核对）：
            Node 43 (Text)          fieldName=text    → 提示词
            Node 20 (PrimitiveFloat) fieldName=value  → 视频时长（秒）
            Node 47 (LoadImage)     fieldName=image   → 上传返回的 fileName（或 download_url）
        """
        nodes: List[Dict[str, Any]] = []
        if prompt:
            nodes.append({"nodeId": NODE_PROMPT, "fieldName": "text", "fieldValue": prompt})
        if duration is not None:
            nodes.append({"nodeId": NODE_DURATION, "fieldName": "value", "fieldValue": float(duration)})
        if image_value:
            nodes.append({"nodeId": NODE_IMAGE, "fieldName": "image", "fieldValue": image_value})
        if not nodes:
            raise ValueError("nodeInfoList 为空：请至少提供 prompt / duration / image 之一。")
        return nodes

    def submit_workflow(
        self,
        workflow_id: str,
        node_info_list: List[Dict[str, Any]],
        add_metadata: bool = True,
        instance_type: Optional[str] = None,
        use_personal_queue: Optional[bool] = None,
        retain_seconds: Optional[int] = None,
    ) -> Dict[str, Any]:
        """提交工作流任务，返回任务信息（含 taskId）。"""
        payload: Dict[str, Any] = {
            "apiKey": self.api_key,
            "workflowId": workflow_id,
            "nodeInfoList": node_info_list,
            "addMetadata": add_metadata,
        }
        if instance_type and instance_type != "default":
            payload["instanceType"] = instance_type
        if use_personal_queue is not None:
            payload["usePersonalQueue"] = use_personal_queue
        if retain_seconds is not None:
            payload["retainSeconds"] = retain_seconds

        resp = self.session.post(SUBMIT_URL, json=payload, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"提交任务失败: {data.get('msg') or data}")

        task_data = data.get("data", {})
        task_id = task_data.get("taskId")
        if not task_id:
            raise RuntimeError(f"提交成功但响应中没有 taskId: {data}")

        # promptTips 里带有节点校验信息（node_errors）
        tips = task_data.get("promptTips")
        if isinstance(tips, str) and "node_errors" in tips:
            try:
                parsed = json.loads(tips)
                node_errors = parsed.get("node_errors") or {}
                if node_errors:
                    raise RuntimeError(f"工作流节点校验失败: {node_errors}")
            except json.JSONDecodeError:
                pass
        return task_data

    def query_task(self, task_id: str) -> Dict[str, Any]:
        """查询任务状态。"""
        resp = self.session.post(QUERY_URL, json={"taskId": task_id}, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def wait_for_completion(
        self,
        task_id: str,
        poll_interval: int = 5,
        max_wait_time: int = 1200,
        on_tick: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """轮询直到任务结束（SUCCESS/FAILED）或超时。"""
        start = time.time()
        while True:
            elapsed = time.time() - start
            if elapsed > max_wait_time:
                raise TimeoutError(f"任务 {task_id} 超过 {max_wait_time}s 未完成")

            result = self.query_task(task_id)
            status = result.get("status", "UNKNOWN")
            if on_tick:
                on_tick(elapsed, status)

            if status == "SUCCESS":
                return result
            if status == "FAILED":
                raise RuntimeError(
                    f"任务 {task_id} 失败: [{result.get('errorCode', '')}] "
                    f"{result.get('errorMessage') or result.get('msg') or '未知错误'}"
                )
            time.sleep(poll_interval)

    def download_results(self, results: List[Dict[str, Any]], output_dir: str = "output") -> List[str]:
        """下载任务结果文件到本地，返回本地路径列表。"""
        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)

        downloaded: List[str] = []
        for i, item in enumerate(results, start=1):
            url = item.get("url") or item.get("outputUrl") or item.get("fileUrl")
            if not url:
                continue
            ext = item.get("outputType") or item.get("fileType") or "mp4"
            ext = ext.lstrip(".").lower()
            filename = item.get("fileName") or f"result_{i}.{ext}"
            filepath = out / filename
            if filepath.suffix.lower() != f".{ext}":
                filepath = out / f"{filepath.stem}.{ext}"

            # 结果文件在 COS 上，用干净请求下载（不带 Authorization/Host 头）
            resp = requests.get(url, stream=True, timeout=300)
            resp.raise_for_status()
            with open(filepath, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            downloaded.append(str(filepath))
        return downloaded

    # ---------- 一键流程 ----------

    def run_full(
        self,
        workflow_id: str = DEFAULT_WORKFLOW_ID,
        image_path: Optional[str] = None,
        image_name: Optional[str] = None,
        prompt: str = "",
        duration: Optional[float] = 10,
        output_dir: str = "output",
        poll_interval: int = 5,
        max_wait_time: int = 1200,
        instance_type: Optional[str] = None,
        use_url: bool = False,
        verbose: bool = True,
    ) -> Dict[str, Any]:
        """上传 → 提交 → 轮询 → 下载 全流程，返回结构化结果。

        image_path: 本地图片路径（需上传）
        image_name: RunningHub 已上传文件的 fileName（如 openapi/xxx.png），
                    直接复用，跳过上传（图片在库里保留约 1 天）
        """
        log = print if verbose else lambda *_: None

        image_value = ""
        if image_name:
            image_value = image_name
            log(f"[1/4] 复用已上传图片: {image_name}")
        elif image_path:
            log(f"[1/4] 上传图片 {image_path} ...")
            uploaded = self.upload_file(image_path)
            image_value = uploaded["download_url"] if use_url else uploaded["fileName"]
            log(f"      上传成功 → {image_value}")

        nodes = self.build_node_info_list(
            prompt=prompt,
            image_value=image_value,
            duration=duration,
        )
        log(f"[2/4] 提交工作流 {workflow_id} ...")
        task_data = self.submit_workflow(workflow_id, nodes, instance_type=instance_type)
        task_id = task_data["taskId"]
        log(f"      taskId: {task_id}  状态: {task_data.get('taskStatus', 'QUEUED')}")

        log("[3/4] 轮询任务状态 ...")
        final = self.wait_for_completion(
            task_id,
            poll_interval=poll_interval,
            max_wait_time=max_wait_time,
            on_tick=lambda elapsed, status: log(
                f"      [{int(elapsed // 60)}:{int(elapsed % 60):02d}] {status}"
            ),
        )

        results = final.get("results") or []
        log(f"[4/4] 任务成功，结果 {len(results)} 个文件")
        files = self.download_results(results, output_dir)
        for path in files:
            log(f"      已保存: {path}")

        return {
            "task_id": task_id,
            "status": final.get("status", "SUCCESS"),
            "files": files,
            "results": results,
        }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="RunningHub ComfyUI 工作流 API 客户端")
    parser.add_argument("--api-key", default=None, help="RunningHub API Key（缺省自动读取）")
    parser.add_argument("--workflow-id", default=DEFAULT_WORKFLOW_ID, help="工作流 ID")
    parser.add_argument("--image", default=None, help="本地图片路径（首帧图）")
    parser.add_argument("--prompt", default="", help="提示词")
    parser.add_argument("--duration", type=float, default=10, help="视频时长（秒）")
    parser.add_argument("--output-dir", default="output", help="结果保存目录")
    parser.add_argument("--instance-type", default=None, help="实例类型（如 plus）")
    parser.add_argument("--use-url", action="store_true", help="图片节点使用 download_url 而非 fileName")
    parser.add_argument("--check", action="store_true", help="只校验 Key 与工作流，不提交任务")
    parser.add_argument("--json", action="store_true", help="输出 JSON")
    args = parser.parse_args()

    client = RunningHubClient(api_key=args.api_key)

    if args.check:
        result = client.check_account()
        print(json.dumps(result, ensure_ascii=False, indent=2) if args.json else result)
        wf = client.get_workflow_json(args.workflow_id)
        print("工作流节点:", ", ".join(wf.keys()))
        return

    result = client.run_full(
        workflow_id=args.workflow_id,
        image_path=args.image,
        prompt=args.prompt,
        duration=args.duration,
        output_dir=args.output_dir,
        instance_type=args.instance_type,
        use_url=args.use_url,
    )
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("\n完成！")
        for path in result["files"]:
            print(f"  - {path}")


if __name__ == "__main__":
    main()