# LabanAI — Nguyên mẫu Nghiên cứu Pearson 1–1 Độc lập (8.5a-R1)

## 1. Giới thiệu & Mục tiêu
Thư mục `research/riasec27_top3_b1_v0/` chứa mã nguồn và dữ liệu của nguyên mẫu nghiên cứu thuật toán xếp hạng ngành học Pearson 1–1 (B1).
Đây là module nghiên cứu độc lập, tách biệt hoàn toàn khỏi ứng dụng website LabanAI (`server.js`, web controllers, routes, views, models).

Nguyên mẫu này nhằm mục đích:
1. Hiện thực hóa chính xác thuật toán tương quan Pearson 1–1 giữa hồ sơ thí sinh (27 câu trắc nghiệm RIASEC) và vector sở thích nghề nghiệp O*NET 30.2 (Occupational Interests - OI).
2. Xử lý triệt để các ca biên: hồ sơ phẳng (`ABSTAIN_FLAT_PROFILE`), đồng điểm tại ranh giới Top-3 (`TIED_BOUNDARY`), loại trừ cắt lát ngẫu nhiên/tùy tiện.
3. Giữ nguyên danh mục ngành của 8.5a, truy nguyên SOC/OI về O*NET 30.2 và ghi rõ giới hạn bằng chứng ánh xạ ngành–nghề. Lần sửa này không xác nhận lại danh mục ngành pháp lý hiện hành.

---

## 2. Cấu trúc Thư mục (Tối đa 4 file)
```
research/riasec27_top3_b1_v0/
├── reference.json       # Danh mục tham chiếu 33 ngành (21 READY, 10 CONDITIONAL, 2 UNRESOLVED)
├── prototype.py         # Hàm tính toán xếp hạng Pearson 1–1 độc lập
├── test_prototype.py    # 15 mục đích kiểm thử cũ + 22 ca hồi quy độc lập
└── README.md            # Tài liệu kỹ thuật và hướng dẫn sử dụng
```

---

## 3. Quy cách Dữ liệu (Data Contract)

### 3.1. Input Contract
- **Định dạng**: `list` hoặc `tuple` gồm đúng 27 số nguyên; không nhận bool.
- **Miền giá trị**: Mỗi giá trị trong khoảng $[1, 5]$ (thang đo Likert 5 mức).
- **Thứ tự xen kẽ chuẩn**, đã đối chiếu `CODEBOOK_33` của `dataLabanAI.xlsx` và `question_columns` trong Notebook 00–02:
  `R1, I1, A1, R2, I2, A2, S1, S2, R3, A3, S3, E1, R4, S4, E2, R5, I3, A4, E3, I4, A5, E4, C1, E5, C2, C3, C4`.
- **Chỉ số Python (bắt đầu từ 0)**:
  - R: `[0, 3, 8, 12, 15]`
  - I: `[1, 4, 16, 19]`
  - A: `[2, 5, 9, 17, 20]`
  - S: `[6, 7, 10, 13]`
  - E: `[11, 14, 18, 21, 23]`
  - C: `[22, 24, 25, 26]`
- Không gộp sáu đoạn liên tiếp. Nguyên mẫu lấy trung bình đáp án gốc theo hợp đồng trên; điều này không xác nhận giá trị tâm trắc hoặc tính khoảng của thang Likert.

### 3.2. Output Contract
Hàm `rank_majors(answers, ...)` trả về một từ điển (`dict`) có cấu trúc:
- `status`:
  - `"SUCCESS"`: Ranh giới Top-3 khác nhau ở độ chính xác số học, chưa chứng minh khác biệt có ý nghĩa hướng nghiệp.
  - `"ABSTAIN_FLAT_PROFILE"`: Hồ sơ người dùng có phương sai $\approx 0$, từ chối tính Pearson.
  - `"TIED_BOUNDARY"`: Nhóm đồng điểm/chưa phân biệt về số học cắt qua vị trí 3; trả toàn bộ nhóm, không ép cắt Top-3. Xem chính sách số học bên dưới.
  - `"INVALID_INPUT"`: Đầu vào sai quy cách (thiếu/thừa câu hỏi, sai kiểu dữ liệu, ngoài khoảng $[1, 5]$).
  - `"INVALID_REFERENCE"`: Thiếu/không đọc được JSON hoặc sai cấu trúc tham chiếu, chiều R/I/A/S/E/C, phiên bản, ID hay OI.
  - `"INSUFFICIENT_CANDIDATES"`: Không đủ ứng viên hợp lệ để xếp hạng Top-3 (< 3 ngành).
- `user_vector`: Dictionary chứa 6 giá trị trung bình miền: `{'R': float, 'I': float, 'A': float, 'S': float, 'E': float, 'C': float}`.
- `user_vector_variance`: Phương sai của vector người dùng.
- `top3_distinct`: Giá trị Boolean (`True` khi Top-3 phân biệt hoàn toàn khỏi hạng 4 trở đi; `False` khi hòa hoặc lỗi).
- `top3`: Danh sách các ngành trong Top-3 (mỗi phần tử chứa: `rank`, `major_id`, `major_name_vi`, `moet_code`, `soc_code`, `ih_code`, `pearson_r`, `onet_oi_vector`, `curriculum_evidence`).
- `tied_majors`: Danh sách toàn bộ các ngành cùng đạt điểm tại ranh giới khi có `TIED_BOUNDARY`.
- `all_rankings`: Các ngành READY có OI hợp lệ, sắp giảm dần theo Pearson chưa làm tròn (danh mục hiện tại: 21).
- `metadata`: Ghi thứ tự đầu vào, thiếu OI, nguồn CTĐT chưa xác minh và chính sách đồng hạng. Nạp JSON không đồng nghĩa xác minh nội dung nguồn.

---

## 4. Phạm vi Danh mục Tham chiếu (33 Ngành)
- **21 ngành READY_FOR_PROTOTYPE**: Giữ trạng thái ứng viên chạy nguyên mẫu, SOC đại diện riêng biệt và OI từ danh mục 8.5a. Đã đối chiếu SOC/tên nghề/IH/6 OI với O*NET 30.2. **Chưa xác minh CTĐT trực tiếp cho cả 21 ngành**: URL hiện chỉ là trang chủ trường. READY không chứng nhận đầy đủ quan hệ ngành–nghề hoặc phù hợp nghề nghiệp.
- **10 ngành CONDITIONAL**: Đã xác định được nghề tương quan nhưng bị trùng mã SOC/OI (7 ngành Sư phạm chia sẻ mã `25-2031.00`, CNTT trùng Phần mềm `15-1252.00`, Đông phương học trùng Ngôn ngữ Anh `27-3091.00`, Việt Nam học bị lệch bản chất sang Hướng dẫn viên du lịch `39-7011.00`). Bị loại khỏi tính điểm gợi ý cho đến khi có cơ chế phân tách chuyên sâu.
- **2 ngành UNRESOLVED**: `quan_ly_du_lich_lu_hanh` (bằng chứng cấp C, chưa có nghề O*NET tương thích) và `quan_ly_nha_nuoc` (bằng chứng cấp B nhưng phân mảnh giữa 4 mã SOC). Bị loại khỏi tính điểm gợi ý.

---

## 5. Hướng dẫn Chạy Unit Test
Từ thư mục gốc repository, dùng Python 3.14 hiện có và tránh tạo bytecode:
```bash
py -3.14 -B -m unittest discover -s research/riasec27_top3_b1_v0 -p test_prototype.py -v
```

Kết quả kiểm toán 2026-11-21, Python 3.14.7:
- Trước sửa: 15/15 ca cũ PASS, nhưng các fixture chia khối lặp lại giả định sai; hồ sơ hằng không phát hiện hoán vị.
- Sau thêm 10 ca độc lập và trước sửa production: 25 ca chạy, 9 FAIL (`test_16`–`test_24`), `test_25` Pearson trực tiếp vẫn PASS. Đây là bằng chứng lỗi ánh xạ, không phải lỗi công thức Pearson trực tiếp.
- Sau sửa: **37/37 PASS**; giữ 15 mục đích cũ, sửa fixture theo mã câu hỏi ở test 01, 06, 11, 12, 14, 15; thêm 22 ca (`test_16`–`test_37`).
- Expected độc lập: literal thứ tự codebook + mã R1…C4, không lấy `DOMAIN_INDICES` của production để dựng đáp án; Pearson đối chiếu bằng Decimal 60 chữ số với công thức tổng tích/tổng bình phương, khác cách tính hiệp phương sai ở production.
- Bao phủ sáu nhóm nổi bật, sáu trung bình khác nhau, 27 đáp án không đồng nhất nhưng sáu trung bình bằng nhau, cả hai ví dụ chính xác của chủ dự án, thứ hạng đủ 21 ứng viên, hòa điểm/sai số/điểm gần nhau, thiếu và sai tham chiếu.

---

## 6. Giới hạn Khoa học & Khuyến cáo Kỹ thuật
1. **Bản chất mô tả (Descriptive Baseline)**: Thuật toán Pearson 1–1 chỉ đo mức độ tương đồng hình học giữa vector sở thích cá nhân và vector nghề nghiệp O*NET. Đây không phải mô hình phân loại xác suất và chưa được hiệu chuẩn tâm trắc học trên học sinh Việt Nam.
2. **Nguồn gốc O*NET**: Thang đo O*NET được chuẩn hóa theo thị trường lao động Hoa Kỳ (thang 1.0–7.0). Việc ánh xạ sang ngành đào tạo Việt Nam dựa trên chuẩn đầu ra chương trình đào tạo là giả định kỹ thuật cần được kiểm chứng thực nghiệm.
3. **Phân tách với nhánh ML**: Sáu mô hình ML đã khóa của LabanAI phục vụ việc phân loại nhị phân sở thích Q5 độc lập. Thuật toán Pearson 1–1 không sử dụng hay thay thế các trọng số ML đó.

## 7. Kiểm toán hai ví dụ 8.5a-R1

Chạy trực tiếp `rank_majors` với đúng hai mảng do chủ dự án cung cấp, không qua mô hình ML, không dùng Train/Test. Thứ tự vector sáu chiều luôn là R, I, A, S, E, C.

**Ví dụ 1 — Kỹ thuật/Công nghệ**:
```text
[5, 5, 2, 5, 5, 1, 1, 2, 4, 2, 1, 2, 5, 2, 2, 4, 4, 1, 3, 5, 2, 2, 4, 2, 4, 5, 4]
```
Trung bình: `[4.60, 4.75, 1.60, 1.50, 2.20, 4.25]`; trạng thái `SUCCESS`.

| Vị trí | Ngành | Pearson r |
| --- | --- | --- |
| 1 | Công nghệ kỹ thuật hóa học | 0.977695641815 |
| 2 | Kỹ thuật điện | 0.976382219903 |
| 3 | Kỹ thuật điện tử - viễn thông | 0.969320125724 |
| 4 | Quản lý đất đai | 0.965321096769 |
| 5 | Công nghệ kỹ thuật xây dựng | 0.957987642137 |

Chênh lệch vị trí 3–4: `0.003999028955158579`.

**Ví dụ 2 — Xã hội/Sư phạm**:
```text
[1, 2, 5, 2, 3, 4, 5, 5, 1, 5, 5, 3, 2, 5, 2, 1, 2, 4, 3, 3, 5, 2, 2, 3, 3, 2, 3]
```
Trung bình: `[1.40, 2.50, 4.60, 5.00, 2.60, 2.50]`; trạng thái `SUCCESS`.

| Vị trí | Ngành | Pearson r |
| --- | --- | --- |
| 1 | Giáo dục Tiểu học | 0.796959757025 |
| 2 | Giáo dục Mầm non | 0.793473960269 |
| 3 | Công tác xã hội | 0.730777338938 |
| 4 | Tâm lý học giáo dục | 0.679113702039 |

Chênh lệch vị trí 3–4: `0.051663636899279775`. Sai lệch tuyệt đối tối đa giữa production và Decimal trên toàn bộ 21 điểm của mỗi ví dụ: `2.220446049250313e-16`. Bảng chỉ làm tròn để hiển thị, không dùng điểm đã làm tròn để xếp hạng.

**Chênh lệch Xây dựng**: OI trong JSON đúng `[6.43, 5.15, 2.21, 1.69, 2.66, 4.61]`, thứ tự chiều đúng R/I/A/S/E/C. Với vector ví dụ 1, cả Pearson trực tiếp lẫn oracle Decimal cho `0.957987642137`, không phải `0.9669`. Xây dựng là vị trí 5, không phải vị trí 4. Không có log thực thi lịch sử để xác định số `0.9669` trước đây do chép nhầm ngành, hồ sơ khác hay bước báo cáo nào; không quy kết nguyên nhân khi thiếu chứng cứ. Lỗi ánh xạ 27 câu được chứng minh riêng bằng phản ví dụ.

**Phản ví dụ bắt buộc**: R1–R5=5, các câu khác=1; kết quả sau sửa `[5, 1, 1, 1, 1, 1]`. Trước sửa trả `[2.6, 2.0, 1.8, 2.0, 1.0, 1.0]`.

**Hồ sơ phẳng dù câu trả lời không đồng nhất**:
```text
[1, 1, 1, 2, 2, 2, 1, 2, 3, 3, 4, 1, 4, 5, 2, 5, 4, 4, 3, 5, 5, 4, 1, 5, 2, 4, 5]
```
Cả sáu trung bình bằng 3; trả `ABSTAIN_FLAT_PROFILE`, Top-3 rỗng.

## 8. Đồng điểm và số học

Loại bỏ dung sai `1e-6` vốn có thể nhập hai điểm khác nhau. Sắp xếp trên float đầy đủ, không làm tròn 8 chữ số và không dùng ID/tên làm khóa phá hòa. Dùng `math.fsum` cho tổng độ lệch/bình phương/tích để hạn chế sai số.

Giới hạn so sánh số học hiện là `32 * math.ulp(1.0)` ≈ `7.105427357601002e-15`, một quy ước kỹ thuật bảo thủ cho phép tính sáu chiều, không phải chứng minh sai số tuyệt đối cho mọi đầu vào hay ngưỡng có ý nghĩa hướng nghiệp. Không đặt ngưỡng khoa học mới để từ chối gợi ý. Nhóm điểm được neo vào điểm cao nhất, tránh gộp dây chuyền theo khoảng cách giữa hai hàng kề nhau.

- Cùng OI/cùng điểm tính toán: cùng hạng; tại ranh giới trả `EXACT_SCORE_TIE`.
- Điểm khác nhau trong giới hạn số học: tại ranh giới trả `NUMERICALLY_UNRESOLVED`, không khẳng định hòa thực về toán học.
- Điểm gần nhưng ngoài giới hạn số học: giữ thứ tự; test chênh `5e-7` và `1e-9` chứng minh không gộp theo `1e-6` hoặc làm tròn. Chênh nhỏ không chứng minh khác biệt hướng nghiệp.
- Nếu nhóm cắt qua vị trí 3: `TIED_BOUNDARY`, `top3=[]`, trả toàn bộ nhóm qua `tied_majors`. Thứ tự hiển thị nội bộ nhóm không phải ưu tiên; không dùng thứ tự mảng để chọn thành viên.

Thiếu file/JSON lỗi trả `INVALID_REFERENCE`. Thiếu OI được đếm và bỏ khỏi tính điểm, không tự tạo vector; dưới ba ứng viên hợp lệ trả `INSUFFICIENT_CANDIDATES`. Thiếu bằng chứng CTĐT không bị giấu: ghi `curriculum_unverified_ids` và cảnh báo nguồn, giữ nguyên trạng thái nghiên cứu đã được yêu cầu.

## 9. Kiểm toán nguồn (2026-11-21)

Nguồn cố định phiên bản 30.2, không trộn hồ sơ đang cập nhật trên O*NET Online:
- [Occupation Data 30.2 — mã SOC và tên nghề](https://www.onetcenter.org/dl_files/database/db_30_2_text/Occupation%20Data.txt).
- [Interests 30.2 — IH và sáu OI](https://www.onetcenter.org/dl_files/database/db_30_2_text/Interests.txt).

Đối chiếu đủ **21/21 READY** khớp SOC, tên nghề, IH và OI; giữ nguyên giá trị. Mỗi mục có `onet_evidence` ghi URL, phiên bản, trường đã đối chiếu, ngày rà soát, ngày dữ liệu và Domain Source. Ngày dữ liệu nguồn có thể khác nhau trong cùng một bản phát hành; không thay ngày dữ liệu bằng ngày kiểm tra.

**21/21 URL CTĐT chỉ là trang chủ**, 0/21 bằng chứng chương trình trực tiếp được xác minh trong lần này. Metadata ghi `HOMEPAGE_ONLY`; không coi sự tồn tại URL hoặc test PASS là xác minh CTĐT. Không tự tạo URL thay thế, không tuyên bố đã kiểm tra nội dung từng chương trình.

Phát hiện ngoài READY cần chủ dự án xem xét: IH của bảy ngành CONDITIONAL dùng `25-2031.00` đang ghi `SA`, nguồn 30.2 ghi `S`; Việt Nam học dùng `39-7011.00` ghi `EAS`, nguồn ghi `SE`. Chỉ ghi nhận trong audit, không sửa mã/vector/trạng thái các ngành này hoặc mở rộng khẳng định đã kiểm toán toàn bộ dữ liệu CONDITIONAL.

Giữ nguyên **33 ngành: 21 READY / 10 CONDITIONAL / 2 UNRESOLVED**. Chỉ thay đổi bốn file hiện hữu của thư mục nghiên cứu; không tạo file phụ/bytecode, không huấn luyện, không dùng 3.963 Train hay 947 Test, không sửa runtime/notebook/workbook. Dừng ở 8.5a-R1, chưa thực hiện 8.5b.
