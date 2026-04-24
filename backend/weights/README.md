# YOLO Model Weights

## Required Files

Please download/copy your trained YOLO model file to this directory:

```
backend/weights/best.pt
```

## Model Information

This project uses a YOLO11n model trained on the RDD2022 (Road Damage Detection 2022) dataset.

### Expected Model Specifications

- **Model Format**: YOLO11n (PyTorch)
- **Classes**: 7 damage types (D00, D01, D10, D11, D20, D40, D43, D44, D50)
- **Input Size**: 640x640
- **Expected Performance**: mAP@0.5 ≈ 0.50

### Model Download Options

1. **If you trained the model yourself**: Copy your `best.pt` file here
2. **From training output**: Usually located at `yolo11n_rdd2022/weights/best.pt`
3. **From Ultralytics Hub**: Download from your Ultralytics account

## File Structure

```
backend/weights/
└── best.pt    # ← Place your model here
```

## Configuration

After placing the model, ensure your `.env` file has the correct path:

```env
WEIGHTS_PATH=./weights/best.pt
```

Or use the absolute path:

```env
WEIGHTS_PATH=C:\path\to\your\best.pt
```

## Model Classes

| Class ID | Code  | Name (CN)      | Name (EN)          |
|----------|-------|----------------|---------------------|
| 0        | D00   | 纵向裂缝       | Longitudinal Crack  |
| 1        | D01   | 纵向裂缝       | Longitudinal Crack  |
| 2        | D10   | 横向裂缝       | Transverse Crack   |
| 3        | D11   | 横向裂缝       | Transverse Crack   |
| 4        | D20   | 龟裂/网裂      | Alligator Crack    |
| 5        | D40   | 块裂/坑洞      | Block/Pothole       |
| 6        | D43   | 井盖沉降       | Manhole Settlement |
| 7        | D44   | 车辙           | Rutting             |
| 8        | D50   | 障碍物         | Object              |
