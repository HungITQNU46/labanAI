# Biên bản Kiểm toán Kỹ thuật & Đối soát Số liệu (Giai đoạn B-08-R2)
## File: audit_b08_r2.md — Module: research/riasec27_evaluation_protocol_v1/
## Ngày lập: 21/11/2026 — Trạng thái: COMPLETED

---

### I. ĐỐI SOÁT CUỐI SÁU NHÃN MỤC TIÊU Q5 (ƯU TIÊN SỐ 1)

Nhóm nghiên cứu đã thực hiện đối soát độc lập trực tiếp từ:
1. Dữ liệu Train đã khóa (3.963 dòng từ `dataLabanAI.xlsx` qua `load_and_split_data`).
2. Artifact metadata: `research/riasec27_q5_models_v1/models_manifest.json`.
3. Script huấn luyện: `research/riasec27_q5_models_v1/train_models.py`.
4. Báo cáo gốc B-02 và Báo cáo B-08-R1.

#### Bảng Tổng hợp Đối soát Mẫu Huấn luyện Q5:

| Miền | Tên Biến Mục tiêu | Tổng Mẫu Train | Nhãn 1/2 (Dislike=0) | Nhãn 3 (Bị Loại) | Nhãn 4/5 (Like=1) | Tổng Eligible Thực tế | Số ghi trong Manifest | Báo cáo B-02 | Báo cáo B-08-R1 | Trạng thái Đối soát |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **R** | `Q5_LikeRe` | 3.963 | 2.055 | 1.103 | 805 | **2.860** | 2.860 | 2.860 | 2.860 | **KHỚP 100%** |
| **I** | `Q5_LikeIn` | 3.963 | 1.720 | 1.079 | 1.164 | **2.884** | 2.884 | 2.884 | 2.884 | **KHỚP 100%** |
| **A** | `Q5_LikeAr` | 3.963 | 1.481 | 1.068 | 1.414 | **2.895** | 2.895 | 2.895 | 2.894 | Sai khác 1 mẫu trong báo cáo B-08-R1 |
| **S** | `Q5_LikeSo` | 3.963 | 1.564 | 1.179 | 1.220 | **2.784** | 2.784 | 2.784 | 3.109 | Sai lệch văn bản trong báo cáo B-08-R1 |
| **E** | `Q5_LikeEn` | 3.963 | 1.542 | 1.134 | 1.287 | **2.829** | 2.829 | 2.829 | 3.036 | Sai lệch văn bản trong báo cáo B-08-R1 |
| **C** | `Q5_LikeCo` | 3.963 | 1.761 | 1.089 | 1.113 | **2.874** | 2.874 | 2.874 | 2.946 | Sai lệch văn bản trong báo cáo B-08-R1 |

#### Nguyên nhân Sai khác và Kết luận Kỹ thuật:
- **Dữ liệu thực tế và Artifact:** Sáu mô hình ML Q5 đã đóng gói, file `models_manifest.json`, script `train_models.py` và dữ liệu Train gốc **hoàn toàn chính xác 100%**, khớp tuyệt đối với số liệu đã khóa từ B-02.
- **Nguồn gốc sai lệch ở B-08-R1:** Các con số (A: 2894, S: 3109, E: 3036, C: 2946) xuất hiện thuần túy do lỗi đánh máy/chép nhầm số liệu trong phần lời văn báo cáo của lượt trước. Trong thư mục `research/riasec27_evaluation_protocol_v1/`, các tài liệu protocol không chứa các con số sai lệch này.
- **Kết luận:** **Mô hình và Manifest hoàn toàn toàn vẹn**, không bị lỗi kỹ thuật, không có căn cứ để coi mô hình bị lỗi (không bị BLOCKED).

---

### II. CÁC ĐIỂM ĐÃ KHÓA TRONG GIAI ĐOẠN B-08-R2

1. **Khóa Quy tắc NDCG@3 với Dữ liệu Thiếu:**
   - Hồ sơ chỉ được đưa vào phân tích chính khi cả P0 và P2 đều `SUCCESS` và toàn bộ các ngành trong Top-3 đều có nhãn quan sát được ($rel \in \{0, 1, 2, 3\}$).
   - Tuyệt đối không coi nhãn "Chưa biết đủ thông tin" là $rel = 0$.
   - Không tự giả định thiếu là MAR (Missing at Random) trong phân tích chính; MNAR được kiểm tra qua phân tích độ nhạy (Sensitivity Analyses).
   - Nếu không đủ nhãn hợp lệ, bắt buộc đánh dấu mã `NOT_EVALUABLE_INSUFFICIENT_LABELS`, tuyệt đối không tự điền số.
   - Báo cáo Coverage độc lập với NDCG@3 có điều kiện.
2. **Khóa Bản chất Phương pháp luận & Ranh giới RCT:**
   - Thiết kế chính xác: **Blinded within-subject paired algorithm comparison with randomized presentation order**.
   - Phân biệt rõ: Nghiên cứu này không phải RCT vì không có can thiệp hành vi giáo dục đối đầu với nhóm chứng; việc ngẫu nhiên hóa thứ tự Alpha/Beta chỉ kiểm soát thiên lệch thứ tự trình bày trong cảm nhận người học, không tự chứng minh tác động hướng nghiệp nhân quả của P2.
   - Giả định kiểm định hoán vị: Tính khả hoán (Exchangeability) của cặp P0 vs P2 dưới $H_0$.
   - Cấp độ Clustered Bootstrap: Lấy mẫu lại ở cấp độ trường học (Cluster level) để bảo toàn tương quan nội cụm.
   - Cỡ mẫu 600–800 chỉ là kịch bản sơ bộ minh họa, cần hiệu chỉnh sau Giai đoạn 2 (Pilot).
3. **Khóa Kế hoạch Quyền riêng tư & Bảo vệ Dữ liệu:**
   - Thời hạn lưu 3 năm được đánh dấu là `PROPOSED_RETENTION_PERIOD`, cần đối chiếu Nghị định 13/2023/NĐ-CP và hướng dẫn IRB trước khi chốt.
   - Cơ chế bảo vệ liên kết tối thiểu: Bảng ánh xạ giữa `Withdrawal Code` và UUIDv4 được mã hóa AES-256 lưu trữ ngoại tuyến, tiêu hủy vĩnh viễn (Key shredding) khi chốt sổ dữ liệu.
   - Khẳng định dữ liệu là Pseudonymized, không tự tuyên bố là Fully Anonymous hay Zero-PII.
4. **Khóa Trạng thái Ngữ liệu 21 Ngành:**
   - Tiếp tục giữ trạng thái **`MATERIALS_NOT_READY`**.
   - Chưa có bộ mô tả 21 ngành trung lập, có nguồn kiểm chứng; đây là nhiệm vụ trọng tâm bắt buộc của giai đoạn tiếp theo.

---

### III. QUYẾT ĐỊNH NGHIỆM THU

$$\mathbf{EVALUATION\_PROTOCOL\_READY\_FOR\_ETHICS\_PREPARATION}$$

Đề cương nghiên cứu phiên bản 1.2.0 đã được đối soát toàn diện, đồng bộ hóa tuyệt đối giữa lý thuyết và dữ liệu thực tế, đủ điều kiện để chuẩn bị hồ sơ đệ trình Hội đồng Đạo đức (IRB). Tuyệt đối chưa được phép tuyển người tham gia hay tiến hành khảo sát thực địa.
