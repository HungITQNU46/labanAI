# Phân tích Rủi ro Phương pháp luận & Giới hạn Khoa học Cốt lõi
## File: risks_and_limitations.md — Module: research/riasec27_evaluation_protocol_v1/
## Phiên bản: 1.1.0 (Phase B-08-R1) — Trạng thái: EVALUATION_PROTOCOL_READY_FOR_ETHICS_REVIEW

---

### TỔNG QUAN

Tài liệu này hệ thống hóa 9 rủi ro phương pháp luận và ranh giới khoa học cốt lõi mà mọi nghiên cứu viên, kỹ sư ML, hội đồng đạo đức và người thẩm định cần nắm vững trước khi diễn giải bất kỳ kết quả thực nghiệm nào của LabanAI Hướng B.

---

### HỆ THỐNG 9 RỦI RO PHƯƠNG PHÁP LUẬN CỐT LÕI

#### 1. Lệch Quần thể Huấn luyện so với Quần thể Mục tiêu (Population Shift)
- **Thực tế:** Tập dữ liệu huấn luyện sáu mô hình Q5 (`dataLabanAI.xlsx`) được thu thập từ học sinh cuối cấp THCS (Lớp 9, độ tuổi 14–15). Trong khi đó, người dùng mục tiêu của hệ thống định hướng ngành đại học là học sinh THPT (Lớp 10–12, độ tuổi 15–18).
- **Rủi ro phương pháp luận:** Sở thích nghề nghiệp ở lứa tuổi 14 thường mang tính tưởng tượng và chưa ổn định so với lứa tuổi 17–18.
- **Ranh giới đo lường trong Protocol hiện tại:** Do protocol này không thu thập 6 câu hỏi Q5 độc lập trên mẫu THPT, nghiên cứu **chỉ đo lường sự dịch chuyển phân phối đầu vào 27 câu và đầu ra thuật toán (Covariate Shift)**. Nghiên cứu **KHÔNG TUYÊN BỐ** đo lường được sự suy giảm Accuracy hoặc Calibration của 6 mô hình ML Q5 nếu chưa có biến Q5 độc lập (đã đưa vào mục biến đề xuất trong `data_dictionary.json`). Nghiên cứu cũng không tiên nghiệm giả định mô hình chắc chắn bị suy giảm hiệu năng mà để dữ liệu thực chứng trả lời.

#### 2. Tính Hợp lệ Khái niệm của Nhãn Q5 (Construct Validity of Q5 Labels)
- **Thực tế:** Sáu nhãn mục tiêu Q5 (`Q5_LikeRe` .. `Q5_LikeCo`) nguyên văn hỏi về: *"Bạn thích nhóm nghề nào sau đây?"* trên thang Likert 1–5.
- **Rủi ro phương pháp luận:** Đây là **sở thích nhóm nghề tự khai báo (self-reported vocational preference)**, tuyệt đối **KHÔNG PHẢI là thước đo năng lực học tập khách quan** hay sự phù hợp thành công trong chương trình đào tạo đại học. Không được dùng thuật ngữ "năng lực" hay "độ phù hợp nghề nghiệp khách quan" khi nói về đầu ra của 6 mô hình này.

#### 3. Bản chất Hình học của Chuẩn hóa Z-score Cố định
- **Thực tế:** Phương pháp P2 chuẩn hóa 6 xác suất ML theo công thức $z_d = \frac{p_d - \mu_d}{\sigma_d}$ với $\mu_d, \sigma_d$ lấy từ phân phối OOF tập Train.
- **Rủi ro phương pháp luận:** Phép tính Z-score giúp cân bằng biên độ giữa các chiều RIASEC có xác suất nền chênh lệch. Tuy nhiên, đây **chỉ là một phép biến đổi vị trí tương đối**, tuyệt đối **không biến Z-score thành xác suất đã hiệu chuẩn** và không thể hiện xác suất thực nghiệm của một cá nhân ngoài mẫu chuẩn.

#### 4. Khác biệt Văn hóa và Thị trường Lao động của Dữ liệu O*NET
- **Thực tế:** Hồ sơ nghề nghiệp tham chiếu được trích xuất từ cơ sở dữ liệu O*NET 30.2 của Bộ Lao động Hoa Kỳ.
- **Rủi ro phương pháp luận:** Yêu cầu kỹ năng, tính chất công việc và cấu trúc ngành nghề tại Việt Nam có những khác biệt đáng kể so với thị trường Mỹ. Việc sử dụng trực tiếp O*NET mà chưa được chuẩn hóa bản địa hóa tại Việt Nam là một giả định chuyển giao (Transfer Assumption) cần được thẩm định thực nghiệm cẩn trọng.

#### 5. Quan hệ "Một Ngành — Nhiều Nghề" (One-to-Many Mappings)
- **Thực tế:** Mỗi ngành đào tạo đại học có thể dẫn đến hàng chục vị trí việc làm khác nhau với hồ sơ RIASEC đa dạng. Trong nghiên cứu hiện tại, mỗi ngành READY chỉ được đại diện bằng một hoặc một vài mã SOC/OI.
- **Rủi ro phương pháp luận:** Điểm trung bình đại diện có thể làm lu mờ tính đa dạng của ngành, khiến học sinh phù hợp với một nhánh chuyên sâu của ngành nhưng lại bị thuật toán chấm điểm tương quan thấp.

#### 6. Thu hẹp Không gian Ứng viên (21 Ngành READY trên 33 Ngành)
- **Thực tế:** Thuật toán Top-3 chỉ chạy trên 21 ngành `READY_FOR_PROTOTYPE`. Mười ngành `CONDITIONAL` và hai ngành `UNRESOLVED` chỉ mở qua tra cứu định tính.
- **Rủi ro phương pháp luận:** Nếu một học sinh có đam mê thực sự với các ngành chưa đủ điều kiện xếp hạng (ví dụ: *Công nghệ thông tin*, *Sư phạm Toán học*), hệ thống không thể đưa các ngành này vào Top-3 tự động. Báo cáo đánh giá bắt buộc phải nêu rõ giới hạn không gian ứng viên này để tránh ngộ nhận rằng thuật toán bỏ sót ngành của thí sinh.

#### 7. Tính Định tính Thuần túy của Tầng Khám phá Tier 2
- **Thực tế:** Module Tier 2 gồm 5 chủ đề chuyên sâu được thiết kế hoàn toàn mang tính định tính sư phạm; câu trả lời của học sinh không làm thay đổi điểm số hay thứ tự Top-3 của Tier 1.
- **Rủi ro phương pháp luận:** Không thể tính toán các chỉ số định lượng như NDCG hay Hit@3 cho Tier 2. Hiệu quả của Tier 2 chỉ có thể đo lường qua sự hài lòng sư phạm và phản hồi mở của người học.

#### 8. Thiếu Dữ liệu Kiểm chứng Chuẩn đầu ra Chương trình Đào tạo (CTĐT)
- **Thực tế:** Hiện trạng B-04-R1 xác nhận dự án chưa hoàn tất việc thẩm định trực tiếp đề cương chi tiết và chuẩn đầu ra chính thức từ các trường đại học tại Việt Nam cho 33 ngành.
- **Rủi ro phương pháp luận:** Tình trạng tài liệu hiện tại được đánh dấu **`MATERIALS_NOT_READY`**. Nếu chưa có bộ tài liệu mô tả 21 ngành trung lập, công bằng và có căn cứ đào tạo, việc yêu cầu học sinh chấm điểm 21 ngành có nguy cơ phản ánh định kiến xã hội hoặc mức độ nổi tiếng của tên gọi ngành thay vì bản chất đào tạo.

#### 9. Khoảng cách giữa Đánh giá Mô hình (Cross-Validation) và Đánh giá Top-3 Độc lập
- **Thực tế:** Các chỉ số OOF F1 hay Log Loss trong các giai đoạn trước chỉ phản ánh năng lực khớp toán học trên dữ liệu khảo sát cũ.
- **Rủi ro phương pháp luận:** Đạt F1 cao trên 6 bài toán Q5 **hoàn toàn không chứng minh rằng các gợi ý Top-3 sẽ hữu ích và chính xác đối với học sinh THPT**. Chỉ có nghiên cứu độc lập với nhãn quan tâm thu thập trước gợi ý mới có giá trị khẳng định khoa học.

---

### QUY TẮC BÁO CÁO KHOA HỌC BẮT BUỘC

> [!CAUTION]
> **Nghiêm cấm Tuyệt đối Diễn giải Hệ số Tương quan Pearson $r$ thành "Phần trăm Phù hợp" (% fit):**
> Hệ số tương quan Pearson $r \in [-1.0, +1.0]$ là chỉ số đo lường mức độ đồng phương hình học giữa hai vector trong không gian 6 chiều RIASEC. 
> Một kết quả $r = 0.65$ **không có nghĩa là học sinh có $65\%$ mức độ phù hợp hay $65\%$ cơ hội thành công trong ngành học**. 
> Trong mọi tài liệu, báo cáo học thuật và giao diện người dùng, hệ số này chỉ được gọi là **"Chỉ số Tương đồng Hồ sơ Tương đối" (Relative Profile Similarity Index)**, nghiêm cấm tuyệt đối việc nhân với 100 để hiển thị ký hiệu `%`.
