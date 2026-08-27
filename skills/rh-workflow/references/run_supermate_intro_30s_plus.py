#!/usr/bin/env python3
"""
run_supermate_intro_30s_plus.py — SuperMate Harness System 30s 介绍短视频（RunningHub Director 工作流）
工作流: 2091717015529672706（MiniMax H3 导演模式 r2v，参考主体=水晶）
要点:
  - 保留水晶全局参数（人设/赛博主播间背景/声线参考/固定机位）不动，只替换 3×10s 台词
  - 台词已按 秋芝2046 科技口播风格润色（语速快、松弛、带小得意）
  - 默认实例即可（根因=放大器像素太高，已降 1280x720/megapixels 1.0；不用 plus——plus 队列少会排队）
  - ⚠️ 放大器像素太高会中断（[805]，2026-08-26 确认：DirectorRefine 1920x1088 / megapixels 2 过高）
    → 默认降为 1280x720 / megapixels 1.0，可用 --refine-width/--refine-height/--refine-megapixels 调
运行: python run_supermate_intro_30s_plus.py [--api-key xxx] [--refine-width 1280] [--refine-height 720] [--refine-megapixels 1.0]
  API Key: --api-key > 环境变量 RUNNINGHUB_API_KEY > 同目录/上级 Api_key.txt > ~/.config/rh/config.toml
  建议: 在 Local_LLM 下运行（自动读 Local_LLM/Api_key.txt），或设置环境变量
"""
import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(errors="replace", line_buffering=True)
except Exception:
    pass

# 优先用本目录自带的客户端库（仓库 references/ 内有 run_workflow_api.py）
sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_workflow_api import RunningHubClient

WORKFLOW_ID = "2091717015529672706"
INSTANCE = "default"   # 默认实例即可（根因是放大器像素太高，已降 megapixels 1.0；plus 队列少会排队）
FPS = 24
DUR = 30
TOTAL = DUR * FPS   # 720

# ---- 3 段台词（秋芝2046 科技口播风，每段 10s）----
SEGMENTS = [
    (0, 10, "哈喽各位！我又来啦！这次把 SuperMate Harness System 彻底盘通了——从启动器到夸克浏览器再到千问侧栏，一条龙全流程！直接给大家演示一下！",
     "右手轻轻抬起对着镜头挥了挥做打招呼手势，语气欢快有感染力，动作舒缓流畅，画面全程稳定。"),
    (10, 20, "看到没？这演示是不是丝滑到飞起？我就说 Harness 系统就是好用！国产模型，不用科学上网，功能完全不输 Codex！来，先看个炫酷的影片——智子变身！",
     "表情带着小得意，轻轻挑眉，右手比了个赞的手势，语气上扬，说到智子变身时眼睛发亮、身体微微前倾。"),
    (20, 30, "对吧？那 Harness 怎么联动 RunningHub 呢？咱们下期再聊！哈粉们，一起把国内 Harness 生态搞起来！",
     "微笑着看向镜头，右手在胸前画了个圈表示下期再聊，最后挥手示意，语气亲切。"),
]


def build_segment(start_s, dur_s, text, action):
    s = start_s; e = start_s + dur_s
    return {
        "id": f"seg_{s}_{e}",
        "start": s * FPS,
        "length": dur_s * FPS,
        "frameCount": dur_s * FPS,
        "durationSec": dur_s,
        "prompt": (
            f"{s}-{e}s：水晶身体放松坐在桌前，对着镜头露出明媚的微笑，自然开口完整清晰说出\n\n"
            f"「{text}」\n"
            f"{action}\n"
            "音效：桌面轻底噪，轻快活泼纯器乐BGM开口时自动压低，不覆盖人声，台词说完后BGM自然回升。\n"
            "反向提示词：五官漂移换脸、背景元素消失、口型台词不匹配、肢体畸形动作崩坏、画面跳变卡顿。"
        ),
        "negativePrompt": "",
        "taskType": "",
        "refs": [],
        "refAudios": [],
        "refVideos": [],
        "genImage": {"imageFile": "", "fileName": ""},
        "continuityFromPrev": False,
    }


def main():
    import argparse
    parser = argparse.ArgumentParser(description="SuperMate Harness 30s 介绍（Director 工作流, plus 实例）")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--output-dir", default="output")
    parser.add_argument("--refine-width", type=int, default=1280, help="放大器输出宽（默认 1280，像素太高会中断）")
    parser.add_argument("--refine-height", type=int, default=720, help="放大器输出高（默认 720）")
    parser.add_argument("--refine-megapixels", type=float, default=1.0, help="放大器 megapixels（默认 1.0，工作流原值 2.0 过高）")
    args = parser.parse_args()

    client = RunningHubClient(api_key=args.api_key)
    wf = client.get_workflow_json(WORKFLOW_ID)
    node12 = wf.get("12", {}).get("inputs", {})
    timeline = json.loads(node12.get("timeline_data", "{}"))

    # ---- 保留水晶全局参数（人设/背景/声线/机位）----
    print("全局 prompt 保留（水晶人设锁死）", flush=True)
    print("参考图 refs:", len(timeline.get("global", {}).get("refs", [])), "张；声线参考 refAudios:", len(timeline.get("global", {}).get("refAudios", [])), "个", flush=True)

    # ---- 重建 timeline：3×10s，清模板残留 keyframes/shots ----
    timeline["totalFrames"] = TOTAL
    timeline["durationSec"] = DUR
    timeline["segments"] = [build_segment(s, d, t, a) for (s, d, t, a) in SEGMENTS]
    timeline["keyframes"] = []
    timeline["shots"] = []
    if "gen" in timeline:
        timeline["gen"]["defaultFrameCount"] = TOTAL
    bw = timeline.get("batchWorkspaces", {}).get("r2v", {})
    if bw:
        bw["segments"] = timeline["segments"]
        bw["runSelectEnabled"] = False
        bw["runSelection"] = []

    node_info_list = [
        {"nodeId": "12", "fieldName": "timeline_data", "fieldValue": json.dumps(timeline, ensure_ascii=False)},
        {"nodeId": "12", "fieldName": "total_frames", "fieldValue": TOTAL},  # 必须 int
        # 放大器降像素：DirectorRefine 默认 1920x1088/megapixels 2 太高会中断([805])——2026-08-26 确认
        {"nodeId": "18", "fieldName": "width", "fieldValue": args.refine_width},
        {"nodeId": "18", "fieldName": "height", "fieldValue": args.refine_height},
        {"nodeId": "18", "fieldName": "megapixels", "fieldValue": args.refine_megapixels},
    ]
    print(f"[1/4] 提交工作流 {WORKFLOW_ID}（instance={INSTANCE}）...", flush=True)
    task_data = client.submit_workflow(WORKFLOW_ID, node_info_list, instance_type=INSTANCE)
    task_id = task_data["taskId"]
    print(f"      taskId: {task_id}  状态: {task_data.get('taskStatus', 'QUEUED')}", flush=True)

    print(f"[2/4] 轮询（30s 视频 plus 实例预计 10-20 分钟）...", flush=True)
    final = client.wait_for_completion(
        task_id, poll_interval=15, max_wait_time=3600,
        on_tick=lambda e, s: print(f"      [{int(e//60)}:{int(e%60):02d}] {s}", flush=True),
    )
    print(f"[3/4] 状态: {final.get('status')}", flush=True)
    if final.get("status") != "SUCCESS":
        print("任务失败:", json.dumps(final, ensure_ascii=False)[:800], flush=True)
        sys.exit(1)

    results = final.get("results") or []
    files = client.download_results(results, args.output_dir)
    for p in files:
        print(f"[4/4] 已保存: {p}", flush=True)


if __name__ == "__main__":
    main()
