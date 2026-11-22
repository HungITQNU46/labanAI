# Báo cáo Kiểm toán Phương pháp luận Protocol Đánh giá (Giai đoạn B-08-R1)
## File: audit_b08_r1.md — Module: research/riasec27_evaluation_protocol_v1/
## Ngày lập: 21/11/2026 — Trạng thái: COMPLETED

---

### I. TỔNG HỢP CÁC ĐIỂM KIỂM TOÁN VÀ ĐỒNG BỘ ĐÃ HOÀN TẤT

Sau khi tiếp thu ý kiến thẩm định của Chủ dự án đối với B-08, toàn bộ 8 tài liệu trong `research/riasec27_evaluation_protocol_v1/` đã được rà soát và điều chỉnh triệt để theo các yêu cầu phương pháp luận:

1. **Chuẩn hóa Thuật ngữ Thiết kế:**
   - Đã loại bỏ hoàn toàn việc gọi thiết kế thực nghiệm hiện tại là "Double-Blind Randomized Controlled Trial (RCT)".
   - Định danh chính xác theo chuẩn phương pháp luận quốc tế: **"Blinded within-subject paired algorithm comparison with randomized presentation order"** (So sánh thuật toán theo cặp trong từng đối tượng có làm mù và ngẫu nhiên hóa thứ tự hiển thị).
   - Phân biệt rõ giữa việc tuân thủ các nguyên tắc minh bạch của hướng dẫn báo cáo (STROBE / CONSORT-AI) với việc đạt chứng nhận chất lượng nghiên cứu từ tổ chức bên ngoài.

2. **Tách biệt và Sửa Định nghĩa Ground Truth:**
   - Phân biệt rõ ràng 5 khái niệm đo lường độc lập:
     * (1) Mức độ quan tâm ngành tự đánh giá (Self-reported major interest).
     * (2) Mức độ nhận thấy ngành phù hợp (Subjective perceived fit).
     * (3) Nguyện vọng lựa chọn ngành (Stated aspiration / choice preference).
     * (4) Năng lực học tập khách quan (Assessed academic competence).
     * (5) Giá trị hướng nghiệp sau gợi ý (Post-recommendation pedagogical utility).
   - Nghiêm cấm gộp 5 khái niệm này thành một điểm số hỗn hợp duy nhất.
   - Xác định nhãn chính cho Phần A: **Mức độ quan tâm ngành tự đánh giá** (thang đo 0–3 kèm tùy chọn "Chưa biết đủ thông tin về ngành"), **được thu thập độc lập TRƯỚC KHI người học nhìn thấy bất kỳ kết quả gợi ý nào**.
   - Tuyệt đối không tự gọi thang đo sở thích này là "độ phù hợp nghề nghiệp khách quan".

3. **Thiết kế Đánh giá Hai Phần Độc lập (Two-Part Design):**
   - **Phần A (Offline Algorithmic Evaluation):** Đánh giá thuật toán P0 và P2 trên nhãn độc lập đã khóa, tính NDCG@3, Precision@3, Hit@3, Coverage, Jaccard.
   - **Phần B (Blinded Student Experience Evaluation):** Đánh giá trải nghiệm người học mù đôi (Phương án Alpha vs Beta). Cung cấp các lựa chọn không ép buộc: Ưa thích Alpha, Ưa thích Beta, Hai phương án tương đương nhau, hoặc Chưa chắc chắn/Không rõ.

4. **Xử lý Không gian 21 Ngành READY, Nhãn Thiếu và IDCG@3:**
   - Khẳng định không gian ứng viên xếp hạng tự động là 21 ngành `READY_FOR_PROTOTYPE`.
   - Nhãn "Chưa biết đủ thông tin về ngành" không được phép ép chấm 0 (không coi chưa quen thuộc là không phù hợp).
   - Không tính NDCG@3 bằng cách ngầm gán nhãn thiếu bằng 0.
   - Xác định rõ tập ứng viên tính IDCG@3: Lấy 3 điểm cao nhất trong các ngành có nhãn hợp lệ của tập 21 ứng viên.
   - Nếu thực hiện đánh giá giới hạn trên tập hợp nhất $P0 \cup P2$, bắt buộc phải ghi rõ là **Pooled Evaluation**, thừa nhận rủi ro Selection Bias và không tuyên bố tương đương đánh giá toàn diện 21 ngành.
   - Xử lý tường minh các trường hợp biên: toàn bộ relevance bằng 0, không đủ nhãn hợp lệ, P0/P2 ABSTAIN hoặc TIED.

5. **Làm rõ Ranh giới và Vai trò của Hội đồng Chuyên gia:**
   - Chuyên gia tuyệt đối không được biết ngành do P0/P2 đề xuất, điểm số, thứ hạng hay nhãn Alpha/Beta.
   - Thiết lập nguyên tắc chống suy luận vòng quanh (Anti-Circularity): Không cung cấp 6 điểm RIASEC hay xác suất Q5 cho chuyên gia làm căn cứ duy nhất để chấm ngành.
   - Đánh giá độ tin cậy bằng hệ số phù hợp với dữ liệu thứ bậc (Krippendorff's Alpha với ordinal metric hoặc Weighted Kappa).
   - Ngưỡng 0.70 là định hướng mong muốn, không dùng làm rào cản tự động hủy bỏ nghiên cứu.
   - Điểm chuyên gia được phân tích thành tập kiểm chứng riêng biệt (Expert-assessed Benchmark), **tuyệt đối không cộng gộp với điểm tự đánh giá của học sinh**.

6. **Xác minh Cấu trúc Sáu Nhãn Q5 từ CODEBOOK và Manifest:**
   - Câu hỏi gốc: *"Bạn thích nhóm nghề nào sau đây? [Tên nhóm nghề kèm ví dụ ngành nghề]"* trên thang Likert 1–5.
   - Bản chất: **Sở thích nhóm nghề tự khai báo** (Self-reported vocational preference), KHÔNG PHẢI là năng lực học thuật khách quan.
   - Quy tắc mã hóa nhị phân: 1, 2 $\to$ 0 (Dislike); 4, 5 $\to$ 1 (Like); mức 3 (Neutral) bị loại bỏ khỏi từng bài toán riêng biệt (`3 -> dropped per target`).
   - Sáu biến mục tiêu: `Q5_LikeRe`, `Q5_LikeIn`, `Q5_LikeAr`, `Q5_LikeSo`, `Q5_LikeEn`, `Q5_LikeCo`.
   - Do mẫu THPT trong protocol không thu thập 6 câu Q5, nghiên cứu chỉ đo lường Covariate Shift (phân phối đầu vào/đầu ra), KHÔNG tuyên bố đo lường sự suy giảm Accuracy/Calibration của 6 mô hình. Biến Q5 được đưa vào `data_dictionary.json` dưới dạng `PROPOSED_FUTURE_RESEARCH`.

7. **Hoàn thiện Kế hoạch Thống kê và Cỡ mẫu (SAP):**
   - Đăng ký trước 1 Primary Endpoint duy nhất: Paired difference $\Delta_{\text{NDCG}} = \text{NDCG}@3(P2) - \text{NDCG}@3(P0)$ trên nhãn độc lập thu trước gợi ý.
   - Kiểm định 2 phía ($\alpha = 0.05$), kiểm soát sai số FDR bằng Benjamini-Hochberg cho các biến phụ.
   - Sử dụng Paired Permutation Test và Wilcoxon Signed-Rank Test có hiệu chỉnh Pratt cho các cặp chênh lệch bằng 0.
   - Ước lượng khoảng tin cậy $95\%$ BCa có tính đến tương quan cụm trường học (Clustered Bootstrap).
   - Công thức phân tích năng lực thống kê phân biệt giữa paired t-test và Wilcoxon (ARE $\approx 0.864$), bổ sung hiệu ứng thiết kế do cụm trường học ($DEFF \approx 1.58$) và tỷ lệ dự phòng mất mẫu.
   - Ghi nhận con số 600–800 học sinh là khuyến nghị hoạt động tạm thời, cần hiệu chỉnh sau Giai đoạn 2 (Pilot).
   - Các hạn ngạch phân tầng được gắn nhãn `ILLUSTRATIVE_QUOTA_NOT_POPULATION_BENCHMARK`.

8. **Bảo vệ Quyền Riêng tư, Đạo đức và Quản trị Dữ liệu:**
   - Phân biệt chính xác giữa dữ liệu ẩn danh có mã định danh (Pseudonymized) với dữ liệu hoàn toàn vô danh (Fully Anonymous) hay Zero-PII.
   - Nhận diện các biến định danh gián tiếp (Quasi-identifiers).
   - Tách biệt tuyệt đối hồ sơ đồng ý (chứa tên thật và chữ ký) khỏi dữ liệu khảo sát.
   - Thiết lập quy trình rút lui thông qua mã biên nhận ngẫu nhiên (Withdrawal Code).
   - Căn cứ thời hạn lưu trữ: 3 năm sau công bố phục vụ kiểm chứng khoa học; tiêu hủy an toàn bằng xóa bảo mật đa lớp / hủy khóa mật mã (Cryptographic Key Shredding).
   - Khẳng định nghiên cứu cần được phê duyệt bởi Hội đồng Đạo đức (IRB); hiện trạng protocol là ĐỀ XUẤT (PROPOSED), chưa được phê duyệt.

9. **Tình trạng Dữ liệu Ngành:**
   - Đánh dấu **`MATERIALS_NOT_READY`** đối với bộ tài liệu giới thiệu 21 ngành; khẳng định chưa có chuẩn đầu ra CTĐT trực tiếp nào được nghiệm thu đầy đủ. Yêu cầu biên soạn và thẩm định bộ ngữ liệu trung lập trước khi triển khai thực địa.

---

### II. DANH SÁCH 8 TỆP TÀI LIỆU ĐÃ ĐỒNG BỘ HOÀN TOÀN

1. `README.md`: Cập nhật phiên bản 1.1.0, trạng thái `EVALUATION_PROTOCOL_READY_FOR_ETHICS_REVIEW`, công bố phạm vi Two-Part Design và nhãn `MATERIALS_NOT_READY`.
2. `study_protocol.md`: Cấu trúc lại toàn bộ đề cương, phân biệt 5 khái niệm Ground Truth, quy trình thu thập 5 bước, vai trò hội đồng chuyên gia, và lộ trình 3 giai đoạn.
3. `evaluation_metrics.md`: Định nghĩa toán học chặt chẽ của NDCG@3, IDCG@3 theo từng không gian ứng viên, quy tắc xử lý nhãn thiếu, hòa điểm và hồ sơ phẳng.
4. `data_dictionary.json`: JSON Schema chuẩn hóa cho dữ liệu Pseudonymized, tách biệt Phần A và Phần B, đưa biến Q5 vào mục đề xuất tương lai. Đã kiểm tra cú pháp hợp lệ bằng Python `json.load`.
5. `questionnaire_review.md`: Kế hoạch thử nghiệm nhận thức Think-Aloud, quy trình phỏng vấn chuyên sâu, và tiêu chí kiểm soát chất lượng phản hồi có kiểm toán.
6. `consent_and_privacy_plan.md`: Khung đạo đức hai cấp (Parental Consent + Student Assent), phân định dữ liệu Pseudonymized vs Quasi-identifiers, quản trị dữ liệu và cơ chế rút lui.
7. `analysis_plan.md`: Kế hoạch phân tích thống kê (SAP), Primary endpoint duy nhất, kiểm định cặp hoán vị/Wilcoxon Pratt, Clustered Bootstrap, công thức cỡ mẫu có ARE và DEFF, nhãn `ILLUSTRATIVE_QUOTA_NOT_POPULATION_BENCHMARK`.
8. `risks_and_limitations.md`: Phân tích sâu sắc 9 rủi ro phương pháp luận và điều lệ nghiêm cấm diễn giải Pearson $r$ thành phần trăm phù hợp.
