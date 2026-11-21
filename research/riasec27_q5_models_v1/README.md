# LabanAI — Sáu Mô Hình Học Máy Q5 Đóng Gói (Giai đoạn B-02)

## 1. Giới thiệu & Mục tiêu
Thư mục `research/riasec27_q5_models_v1/` chứa toàn bộ 6 mô hình Machine Learning nhị phân đã được huấn luyện chính thức trên tập dữ liệu Train của dự án LabanAI.
Các mô hình này phục vụ dự đoán sở thích tự báo cáo của học sinh trên 6 miền RIASEC (`Q5_LikeRe`, `Q5_LikeIn`, `Q5_LikeAr`, `Q5_LikeSo`, `Q5_LikeEn`, `Q5_LikeCo`).

> [!IMPORTANT]
> **Giới hạn phạm vi Giai đoạn B-02:**
> 1. Đây CHỈ LÀ các artifact dự đoán sở thích nhị phân Q5 độc lập.
> 2. Các mô hình này **CHƯA ĐƯỢC PHÊ DUYỆT ĐỂ CHẤM ĐIỂM NGÀNH HAY TÍCH HỢP WEBSITE**.
> 3. Tuyệt đối không sử dụng xác suất thô từ các mô hình này làm "xác suất phù hợp ngành đại học".

---

## 2. Cấu trúc Thư mục
```
research/riasec27_q5_models_v1/
├── train_models.py       # Script huấn luyện tái lập và sinh artifact
├── test_artifacts.py     # Bộ kiểm thử tự động 14 ca kiểm tra chất lượng
├── models_manifest.json  # Metadata chi tiết, OOF diagnostics và mã băm SHA-256
├── model_q5_re.joblib    # Mô hình LR_std cho miền Thực tế (R)
├── model_q5_in.joblib    # Mô hình XGB_d2 cho miền Nghiên cứu (I)
├── model_q5_ar.joblib    # Mô hình LR_std cho miền Nghệ thuật (A)
├── model_q5_so.joblib    # Mô hình XGB_d2 cho miền Xã hội (S)
├── model_q5_en.joblib    # Mô hình LR_std cho miền Quản lý (E)
├── model_q5_co.joblib    # Mô hình XGB_d2 cho miền Nghiệp vụ (C)
└── README.md             # Tài liệu kỹ thuật
```

---

## 3. Cấu hình Kỹ thuật Đã Khóa

| Miền | File Artifact | Thuật toán | Tiền xử lý | Siêu tham số chính | Cỡ mẫu Fit ($N_{train}$) |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **R** | `model_q5_re.joblib` | `LogisticRegression` | `StandardScaler` | $C=1.0$, `solver='lbfgs'`, `max_iter=10000`, `tol=1e-4`, `random_state=42` | 2.860 |
| **I** | `model_q5_in.joblib` | `XGBClassifier` | Passthrough (Raw27) | `n_estimators=160`, `max_depth=2`, `learning_rate=0.05`, `subsample=0.85`, `colsample=0.85`, `reg_lambda=4.0` | 2.884 |
| **A** | `model_q5_ar.joblib` | `LogisticRegression` | `StandardScaler` | $C=1.0$, `solver='lbfgs'`, `max_iter=10000`, `tol=1e-4`, `random_state=42` | 2.895 |
| **S** | `model_q5_so.joblib` | `XGBClassifier` | Passthrough (Raw27) | `n_estimators=160`, `max_depth=2`, `learning_rate=0.05`, `subsample=0.85`, `colsample=0.85`, `reg_lambda=4.0` | 2.784 |
| **E** | `model_q5_en.joblib` | `LogisticRegression` | `StandardScaler` | $C=1.0$, `solver='lbfgs'`, `max_iter=10000`, `tol=1e-4`, `random_state=42` | 2.829 |
| **C** | `model_q5_co.joblib` | `XGBClassifier` | Passthrough (Raw27) | `n_estimators=160`, `max_depth=2`, `learning_rate=0.05`, `subsample=0.85`, `colsample=0.85`, `reg_lambda=4.0` | 2.874 |

---

## 4. Hướng dẫn Kiểm thử

Để thực thi bộ 14 ca kiểm thử bắt buộc (đòi hỏi Python 3.14 có sẵn môi trường `xgboost` và `scikit-learn`):
```bash
py -3.14 -m unittest research/riasec27_q5_models_v1/test_artifacts.py -v
```

---

## 5. Cảnh báo Hiệu chuẩn Xác suất (Calibration Warning)
- Trạng thái hiệu chuẩn: **`NOT_APPROVED`**.
- Xác suất thô từ các mô hình Logistic Regression và XGBoost phản ánh tỷ lệ mẫu nhãn dương tiên nghiệm trong tập Train (từ 28.15% ở miền R đến 48.84% ở miền A).
- **Tuyệt đối không so sánh trực tiếp các xác suất thô giữa các miền** khi chưa được hiệu chuẩn qua phương pháp đã nghiệm thu.
