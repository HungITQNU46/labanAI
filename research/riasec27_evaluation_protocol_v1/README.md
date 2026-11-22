# LabanAI — Protocol Đánh giá Chất lượng Gợi ý Ngành Hướng B
## Phiên bản: 1.2.0 (Phase B-08-R2) — Trạng thái: EVALUATION_PROTOCOL_READY_FOR_ETHICS_PREPARATION

---

### 1. Giới thiệu & Mục tiêu Giai đoạn B-08-R2

Tài liệu này xác lập quy chuẩn phương pháp luận nghiên cứu độc lập (Study Protocol) hoàn chỉnh nhằm chuẩn bị hồ sơ đệ trình **Hội đồng Đạo đức Nghiên cứu Độc lập (Institutional Review Board - IRB / Research Ethics Committee)** để đánh giá chất lượng gợi ý Top-3 ngành học của dự án **LabanAI — Hướng B**.

Trạng thái hiện tại được xác định chuẩn xác: **`EVALUATION_PROTOCOL_READY_FOR_ETHICS_PREPARATION`**.  
*Ý nghĩa:* Đề cương đã đạt tính nhất quán khoa học và sẵn sàng về mặt phương pháp để lập hồ sơ xin phê duyệt đạo đức. **TUYỆT ĐỐI CHƯA ĐƯỢC PHÉP** tuyển người tham gia hoặc tiến hành khảo sát thực địa.

---

### 2. Tóm tắt Hệ thống Hướng B & Các Artifact Đã Khóa

1. **Bộ câu hỏi:** 27 nhận định trắc nghiệm sở thích RIASEC (thang Likert 1–5).
2. **Sáu mô hình ML Q5 đã đóng gói:** Dự đoán sở thích nhóm nghề nhị phân tự khai báo (`Q5_LikeRe` .. `Q5_LikeCo`):
   - LogisticRegression + StandardScaler cho Realistic ($R = 2.860$ mẫu Train), Artistic ($A = 2.895$ mẫu Train), Enterprising ($E = 2.829$ mẫu Train).
   - XGBClassifier (Raw27) cho Investigative ($I = 2.884$ mẫu Train), Social ($S = 2.784$ mẫu Train), Conventional ($C = 2.874$ mẫu Train).
   - *(Đã đối soát 100% khớp tuyệt đối giữa Train data thực tế, `models_manifest.json`, `train_models.py` và báo cáo B-02).*
3. **Bộ xếp hạng thuật toán P2:** Chuẩn hóa Z-score cố định và tương quan Pearson $r$ với hồ sơ O*NET 30.2 trên 21 ngành `READY_FOR_PROTOTYPE`.
4. **Baseline P0:** Trung bình cộng điểm câu hỏi RIASEC và tương quan Pearson $r$ với O*NET trên 21 ngành `READY_FOR_PROTOTYPE`.
5. **Danh mục ngành:** 21 ngành `READY_FOR_PROTOTYPE` tham gia xếp hạng tự động; 10 ngành `CONDITIONAL` và 2 ngành `UNRESOLVED` chỉ mở qua tra cứu định tính.
6. **Tình trạng ngữ liệu 21 ngành:** Khóa cố định ở trạng thái **`MATERIALS_NOT_READY`** — Chưa có bộ mô tả ngành trung lập, có nguồn kiểm chứng để học sinh chấm mức độ quan tâm; đây là nhiệm vụ trọng tâm của giai đoạn tiếp theo.

---

### 3. Cấu trúc Nghiên cứu Hai Phần (Two-Part Design)

- **PHẦN A — Đánh giá Thuật toán Offline trên Nhãn Độc lập:**
  - Nhãn mức độ quan tâm ngành tự đánh giá (0–3 kèm tùy chọn "Chưa biết đủ thông tin") được thu thập trên 21 ngành READY **TRƯỚC KHI** học sinh nhìn thấy bất kỳ gợi ý nào.
  - Khóa nhãn độc lập. Chạy ngầm P0 và P2 trên cùng 27 câu đầu vào và cùng tập ứng viên 21 ngành.
  - Tính toán Primary Endpoint ($\Delta_{\text{NDCG}} = \text{NDCG}@3(P2) - \text{NDCG}@3(P0)$) với quy tắc xử lý nhãn thiếu nghiêm ngặt (không gán nhãn thiếu = 0, đánh dấu `NOT_EVALUABLE_INSUFFICIENT_LABELS`).
- **PHẦN B — Đánh giá Trải nghiệm Người học Mù đôi (Blinded UX):**
  - Hiển thị danh sách gợi ý dưới nhãn Phương án Alpha vs Phương án Beta với thứ tự ngẫu nhiên $50/50$.
  - Đánh giá cảm nhận: Dễ hiểu, Hữu ích, Tự chủ. Lựa chọn không ép buộc: Ưa thích Alpha, Ưa thích Beta, Tương đương nhau, hoặc Chưa chắc chắn.

---

### 4. Danh mục Tài liệu Protocol trong Thư mục

- [study_protocol.md](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_evaluation_protocol_v1/study_protocol.md): Thiết kế nghiên cứu so sánh theo cặp có làm mù, phân định 5 khái niệm Ground Truth, ranh giới RCT, và lộ trình 3 giai đoạn.
- [evaluation_metrics.md](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_evaluation_protocol_v1/evaluation_metrics.md): Đặc tả toán học hoàn chỉnh của NDCG@3/IDCG@3, quy tắc xử lý nhãn thiếu, phân tích Coverage độc lập, và điều kiện độ nhạy (Sensitivity Analyses).
- [data_dictionary.json](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_evaluation_protocol_v1/data_dictionary.json): Từ điển dữ liệu JSON Schema chuẩn hóa cho dữ liệu Pseudonymized, bổ sung mã kiểm soát đánh giá và biến Q5 đề xuất tương lai.
- [questionnaire_review.md](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_evaluation_protocol_v1/questionnaire_review.md): Kế hoạch Think-Aloud, phỏng vấn nhận thức và tiêu chí kiểm soát chất lượng phản hồi có kiểm toán.
- [consent_and_privacy_plan.md](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_evaluation_protocol_v1/consent_and_privacy_plan.md): Kế hoạch đạo đức nghiên cứu hai cấp, bảo vệ liên kết Withdrawal Code, và xác định `PROPOSED_RETENTION_PERIOD`.
- [analysis_plan.md](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_evaluation_protocol_v1/analysis_plan.md): Kế hoạch phân tích thống kê (SAP), kiểm định hoán vị cặp có giả định trao đổi, Clustered Bootstrap, và kịch bản cỡ mẫu sơ bộ.
- [risks_and_limitations.md](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_evaluation_protocol_v1/risks_and_limitations.md): Phân tích 9 rủi ro phương pháp luận và điều lệ nghiêm cấm diễn giải Pearson $r$ thành phần trăm phù hợp.
- [audit_b08_r2.md](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_evaluation_protocol_v1/audit_b08_r2.md): Biên bản đối soát số mẫu Q5, nguyên nhân sai khác và biên bản khóa kỹ thuật B-08-R2.
