# BẢNG KIỂM VẬN HÀNH THU THẬP DỮ LIỆU ĐÁNH GIÁ (DATA COLLECTION CHECKLIST)

Bảng kiểm này dành cho điều phối viên và nghiên cứu viên thực địa nhằm bảo đảm 100% tính khoa học, an toàn dữ liệu và tuân thủ nguyên tắc độc lập khi triển khai thu thập nhãn trong tương lai.

---

## I. GIAI ĐOẠN TRƯỚC KHI THU THẬP (PRE-COLLECTION)

- [ ] **1. Phê duyệt đạo đức và quyền riêng tư**:
  - Đã có văn bản chấp thuận của hội đồng khoa học / đơn vị chủ quản có thẩm quyền.
  - Có mẫu đồng thuận tham gia nghiên cứu (Assent form) cho học sinh THPT và mẫu đồng thuận của phụ huynh/người giám hộ (Consent form) đối với học sinh dưới 18 tuổi.
- [ ] **2. Ẩn danh hóa hoàn toàn (Zero PII)**:
  - Hệ thống cấp phát mã định danh ngẫu nhiên chuẩn UUIDv4 (`participant_id`).
  - Tuyệt đối không có trường dữ liệu ghi nhận họ tên, email, số điện thoại, tài khoản mạng xã hội, tên trường, lớp học hay kết quả học bạ.
- [ ] **3. Cân bằng thứ tự hiển thị (Counterbalancing / Randomization)**:
  - Đã chuẩn bị kịch bản ngẫu nhiên hóa hoặc xoay vòng thứ tự xuất hiện của 21 ngành READY cho từng người học để triệt tiêu thiên lệch vị trí (order bias) và mệt mỏi nhận thức.
- [ ] **4. Tài liệu giới thiệu ngành chuẩn hóa**:
  - Bản mô tả 21 ngành trích xuất từ B-09 được in hoặc hiển thị dưới dạng trung lập (DRAFT), độ dài cân bằng, không có logo trường, không có từ ngữ quảng cáo hay hứa hẹn thu nhập/việc làm.

---

## II. GIAI ĐOẠN TRONG KHI THU THẬP (DURING COLLECTION)

- [ ] **5. Tuân thủ nghiêm ngặt trình tự 6 bước**:
  - Người học hoàn thành 27 câu RIASEC $\to$ đọc mô tả ngành và chấm mức độ quan tâm (0, 1, 2, 3 hoặc Chưa biết) $\to$ hệ thống khóa bản ghi.
- [ ] **6. Cô lập hoàn toàn thuật toán (Strict Algorithm Isolation)**:
  - Trong suốt quá trình người học chấm nhãn 21 ngành, hệ thống **tuyệt đối không chạy suy luận P0/P2 ngầm** và **không hiển thị bất kỳ gợi ý Top-3 nào**.
  - Nghiên cứu viên và điều phối viên không can thiệp, không giải thích theo cảm quan cá nhân và không gợi ý học sinh nên chọn ngành nào.
- [ ] **7. Tôn trọng quyền không đánh giá (No Forced Choice)**:
  - Người học được quyền chọn nút "Chưa biết đủ thông tin" (null) đối với bất kỳ ngành nào chưa hiểu rõ mà không gặp bất kỳ trở ngại hay cảnh báo tiêu cực nào.

---

## III. GIAI ĐOẠN SAU KHI THU THẬP (POST-COLLECTION)

- [ ] **8. Khóa dữ liệu và kiểm định cấu trúc (Data Freezing & Validation)**:
  - Bản ghi được niêm phong dấu thời gian và lưu trữ ở trạng thái chỉ đọc theo đúng cấu trúc chuẩn đối tượng record (`participant_id`, `answers`, `major_interest_labels`).
  - *Lưu ý công cụ B-12*: Công cụ kiểm định `validate_input.py` của B-12 hiện tại được khóa cứng chỉ dành cho dữ liệu giả lập (`SYNTHETIC_DEMO_ONLY`). Khi triển khai thực tế, việc kiểm định dữ liệu pilot thật sẽ được thực hiện qua công cụ nghiên cứu chính thức được cấp phép riêng.
- [ ] **9. Thống kê tỷ lệ khuyết nhãn (Missingness Tracking)**:
  - Đếm chính xác số hồ sơ đủ 21 nhãn hợp lệ vs số hồ sơ có ít nhất 1 nhãn `null`.
  - Tuyệt đối không tự ý gán nhãn `null` thành 0 và không tự giả định MAR.
- [ ] **10. Quy trình đánh giá ngoại tuyến chính thức**:
  - Phân tích đánh giá áp dụng công thức $NDCG@3$, $Precision@3$, $Hit@3$ và $\Delta \text{NDCG@3}$ theo đúng nguyên tắc phương pháp luận của B-12.
  - Ghi nhận riêng nhóm hồ sơ có $\text{IDCG@3} = 0$.
  - **Quy tắc bảo vệ dữ liệu**: Tuyệt đối không đưa tệp dữ liệu học sinh thật vào công cụ kiểm thử B-12 và không được dán nhãn giả mạo `SYNTHETIC_DEMO_ONLY` lên dữ liệu thật.
- [ ] **11. Phân lập dữ liệu trải nghiệm (nếu có thực hiện Bước 6)**:
  - Dữ liệu khảo sát trải nghiệm sau gợi ý (tính dễ hiểu, mức độ hữu ích, ưu tiên) được lưu trữ độc lập trong một tệp/bảng riêng, tuyệt đối không hòa lẫn vào tập nhãn ban đầu.
