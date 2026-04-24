import json
import asyncio
import subprocess
import tempfile
from pathlib import Path
from statistics import mean
from typing import Optional

import cv2
from collections import Counter
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends, Depends
from fastapi.responses import StreamingResponse
import asyncio

from app.config import settings
from app.services.model_loader import get_model, get_class_names
from app.services.file_utils import (
    get_upload_path,
    get_result_path,
    allowed_image,
    allowed_video,
)
from app.schemas.detect import DetectionResponse, VideoTaskResponse, DamageItem
from app.utils.helpers import classify_severity, generate_task_id
from app.core.database import get_db
from app.models.detection import DetectionRecord, DamageOccurrence
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/detect", tags=["Detection"])

video_tasks: dict[str, dict] = {}


def summarize_result(result, class_names: list[str], img_h: int, img_w: int):
    counter: Counter = Counter()
    confs: list[float] = []
    damages: list[DamageItem] = []
    boxes = getattr(result, "boxes", None)
    if boxes is None or boxes.cls is None:
        return counter, confs, damages

    img_area = img_h * img_w
    cls_ids = boxes.cls.tolist()
    score_ids = boxes.conf.tolist() if boxes.conf is not None else []
    bboxes = boxes.xywhn.tolist() if boxes.xywhn is not None else []

    for idx, cls_id in enumerate(cls_ids):
        cls_index = int(cls_id)
        cls_name = class_names[cls_index] if cls_index < len(class_names) else f"class_{cls_index}"
        counter[cls_name] += 1

        conf = float(score_ids[idx]) if idx < len(score_ids) else 0.0
        confs.append(conf)

        bbox_norm = bboxes[idx] if idx < len(bboxes) else [0, 0, 0, 0]
        bw, bh = bbox_norm[2], bbox_norm[3]
        bbox_area = bw * bh * img_area

        damages.append(DamageItem(
            class_name=cls_name,
            class_code=cls_name,
            confidence=conf,
            severity=classify_severity(bbox_area, img_area),
            bbox_x=bbox_norm[0],
            bbox_y=bbox_norm[1],
            bbox_w=bbox_norm[2],
            bbox_h=bbox_norm[3],
        ))

    return counter, confs, damages


async def save_detection_record(
    db: AsyncSession,
    filename: str,
    file_type: str,
    original_path: str,
    result_path: str,
    thumbnail_path: Optional[str],
    confidence: float,
    iou_threshold: float,
    total_count: int,
    avg_confidence: float,
    frame_count: Optional[int],
    detection_data: dict,
    damages: list[DamageItem],
) -> int:
    record = DetectionRecord(
        filename=filename,
        file_type=file_type,
        original_path=original_path,
        result_path=result_path,
        thumbnail_path=thumbnail_path,
        confidence=confidence,
        iou_threshold=iou_threshold,
        total_count=total_count,
        detection_data=json.dumps(detection_data),
        avg_confidence=avg_confidence,
        frame_count=frame_count,
    )
    db.add(record)
    await db.flush()

    for d in damages:
        occurrence = DamageOccurrence(
            record_id=record.id,
            class_name=d.class_name,
            class_code=d.class_code,
            confidence=d.confidence,
            severity=d.severity,
            bbox_x=d.bbox_x,
            bbox_y=d.bbox_y,
            bbox_w=d.bbox_w,
            bbox_h=d.bbox_h,
            frame_index=d.frame_index,
        )
        db.add(occurrence)

    await db.commit()
    return record.id


async def process_video_task(
    task_id: str,
    file_path: str,
    conf: float,
    iou: float,
    db_url: str,
):
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    engine = create_async_engine(db_url)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    try:
        video_tasks[task_id]["status"] = "processing"

        model = get_model()
        class_names = get_class_names()
        input_path = Path(file_path)
        output_path = get_result_path(f"{input_path.stem}_detected.mp4")

        cap = cv2.VideoCapture(str(input_path))
        if not cap.isOpened():
            video_tasks[task_id]["status"] = "failed"
            video_tasks[task_id]["error"] = "Cannot open video file"
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0

        fourcc = cv2.VideoWriter_fourcc(*"H264")
        # 尝试使用 H264，如果失败则尝试 avc1
        try:
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
            if not writer.isOpened():
                fourcc = cv2.VideoWriter_fourcc(*"avc1")
                writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
        except Exception:
            fourcc = cv2.VideoWriter_fourcc(*"avc1")
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

        frame_count = 0
        total_counter: Counter = Counter()
        conf_values: list[float] = []
        all_damages: list[dict] = []
        preview_frame = None
        skip = max(1, settings.video_frame_skip)

        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                break

            if frame_count % skip == 0:
                results = model.predict(frame, conf=conf, iou=iou, verbose=False)
                result = results[0]
                annotated = result.plot()
                counter, scores, damages = summarize_result(result, class_names, height, width)
                total_counter.update(counter)
                conf_values.extend(scores)
                for d in damages:
                    d_dict = d.model_dump()
                    d_dict["frame_index"] = frame_count
                    all_damages.append(d_dict)
                preview_frame = annotated
            else:
                annotated = preview_frame if preview_frame is not None else frame

            writer.write(annotated)
            frame_count += 1

            if total_frames > 0:
                progress = int(frame_count * 100 / total_frames)
                video_tasks[task_id]["progress"] = progress

        cap.release()
        writer.release()

        # 转换视频为浏览器兼容的 H.264 格式
        temp_output = output_path.with_suffix('.temp.mp4')
        try:
            # 使用 ffmpeg 转换为 H.264 编码的 MP4
            ffmpeg_cmd = [
                'ffmpeg', '-y', '-i', str(output_path),
                '-vcodec', 'libx264', '-crf', '23', '-preset', 'medium',
                '-acodec', 'aac', '-b:a', '128k',
                str(temp_output)
            ]
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=300)
            if result.returncode == 0 and temp_output.exists():
                # 替换原文件
                output_path.unlink()
                temp_output.rename(output_path)
                print(f"Video converted to H.264: {output_path}")
            else:
                print(f"FFmpeg conversion failed: {result.stderr}")
        except FileNotFoundError:
            print("FFmpeg not found, using original video")
        except subprocess.TimeoutExpired:
            print("FFmpeg conversion timed out")
        except Exception as e:
            print(f"FFmpeg conversion error: {e}")

        async with async_session() as session:
            await save_detection_record(
                session,
                input_path.name,
                "video",
                str(input_path),
                str(output_path),
                None,
                conf,
                iou,
                sum(total_counter.values()),
                mean(conf_values) if conf_values else 0.0,
                frame_count,
                dict(total_counter),
                [DamageItem(**d) for d in all_damages],
            )

        video_tasks[task_id]["status"] = "completed"
        video_tasks[task_id]["result_path"] = str(output_path)
        video_tasks[task_id]["frame_count"] = frame_count
        video_tasks[task_id]["counter"] = dict(total_counter)
        video_tasks[task_id]["avg_conf"] = mean(conf_values) if conf_values else 0.0
        video_tasks[task_id]["damages"] = all_damages

    except Exception as exc:
        video_tasks[task_id]["status"] = "failed"
        video_tasks[task_id]["error"] = str(exc)
    finally:
        await engine.dispose()


@router.post("/image", response_model=DetectionResponse)
async def detect_image(
    file: UploadFile = File(...),
    confidence: float = Form(default=0.25),
    iou: float = Form(default=0.45),
    db: AsyncSession = Depends(get_db),
):
    if not allowed_image(file.filename):
        raise HTTPException(400, "Unsupported image format")

    upload_path = get_upload_path(file.filename)
    content = await file.read()
    with open(upload_path, "wb") as f:
        f.write(content)

    model = get_model()
    class_names = get_class_names()

    image = cv2.imread(str(upload_path))
    if image is None:
        raise HTTPException(400, "Cannot read image file")

    img_h, img_w = image.shape[:2]
    results = model.predict(image, conf=confidence, iou=iou, verbose=False)
    result = results[0]
    annotated = result.plot()

    output_filename = f"{Path(file.filename).stem}_detected.jpg"
    output_path = get_result_path(output_filename)
    cv2.imwrite(str(output_path), annotated)

    counter, conf_values, damages = summarize_result(result, class_names, img_h, img_w)
    avg_conf = mean(conf_values) if conf_values else 0.0

    record_id = await save_detection_record(
        db,
        file.filename,
        "image",
        str(upload_path),
        str(output_path),
        str(output_path),
        confidence,
        iou,
        sum(counter.values()),
        avg_conf,
        None,
        dict(counter),
        damages,
    )

    return DetectionResponse(
        record_id=record_id,
        filename=file.filename,
        file_type="image",
        result_path=f"/static/results/{output_filename}",
        thumbnail_path=f"/static/results/{output_filename}",
        total_count=sum(counter.values()),
        avg_confidence=avg_conf,
        detection_data=dict(counter),
        damages=damages,
        created_at="",
    )


@router.post("/video", response_model=VideoTaskResponse)
async def detect_video(
    file: UploadFile = File(...),
    confidence: float = Form(default=0.25),
    iou: float = Form(default=0.45),
):
    if not allowed_video(file.filename):
        raise HTTPException(400, "Unsupported video format")

    upload_path = get_upload_path(file.filename)
    content = await file.read()
    with open(upload_path, "wb") as f:
        f.write(content)

    task_id = generate_task_id()
    video_tasks[task_id] = {
        "status": "queued",
        "progress": 0,
        "file_path": str(upload_path),
        "filename": file.filename,
        "confidence": confidence,
        "iou": iou,
    }

    asyncio.create_task(
        process_video_task(task_id, str(upload_path), confidence, iou, settings.database_url)
    )

    return VideoTaskResponse(
        task_id=task_id,
        status="queued",
        message="Video processing started",
    )


@router.get("/stream/{task_id}")
async def stream_video_progress(task_id: str):
    async def event_generator():
        last_progress = -1
        while True:
            task = video_tasks.get(task_id)
            if task is None:
                yield f"data: {json.dumps({'status': 'not_found'})}\n\n"
                break

            status = task.get("status", "unknown")
            progress = task.get("progress", 0)

            if status == "completed":
                result_path = task.get("result_path", "")
                # Convert full path to relative URL path
                if result_path:
                    filename = Path(result_path).name
                    result_path = f"/static/results/{filename}"
                yield f"data: {json.dumps({'status': 'completed', 'progress': 100, 'result_path': result_path, 'frame_count': task.get('frame_count'), 'counter': task.get('counter'), 'avg_conf': task.get('avg_conf')})}\n\n"
                break
            elif status == "failed":
                yield f"data: {json.dumps({'status': 'failed', 'error': task.get('error')})}\n\n"
                break
            elif progress != last_progress:
                yield f"data: {json.dumps({'status': status, 'progress': progress})}\n\n"
                last_progress = progress

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/result/{task_id}")
async def get_video_result(task_id: str):
    task = video_tasks.get(task_id)
    if task is None:
        raise HTTPException(404, "Task not found")

    if task.get("status") != "completed":
        raise HTTPException(400, "Task not completed yet")

    return {
        "status": "completed",
        "result_path": f"/static/results/{Path(task['result_path']).name}",
        "frame_count": task.get("frame_count"),
        "counter": task.get("counter"),
        "avg_conf": task.get("avg_conf"),
        "damages": task.get("damages"),
    }


@router.get("/classes")
async def get_classes():
    class_names = get_class_names()
    return {"classes": class_names}
