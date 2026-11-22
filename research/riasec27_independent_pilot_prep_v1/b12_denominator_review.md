# ĐỐI SOÁT CÁC MẪU SỐ VÀ LÝ DO LOẠI TRỪ CHỒNG LẤN TRONG BÁO CÁO B-12

Tài liệu này phân tích chi tiết cơ chế phân loại hồ sơ, nguồn gốc các con số thống kê và hiện tượng lý do loại trừ chồng lấn (overlapping non-exclusive reasons) trong báo cáo đánh giá của công cụ B-12 ([research/riasec27_top3_validation_v1/](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_top3_validation_v1)).

---

## 1. BẢNG TỔNG HỢP 13 HỒ SƠ GIẢ LẬP TRONG BỘ FIXTURE B-12

Tệp dữ liệu `synthetic_fixture.json` được thiết kế có chủ đích với 13 hồ sơ kiểm thử biên:

| Dòng | Hợp lệ cú pháp (`valid`) | Số nhãn thiếu | Trạng thái P0 | Trạng thái P2 | Trạng thái đánh giá (`evaluation_status`) | Các lý do loại trừ ghi nhận (`not_evaluable_reasons`) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| 1 | `True` | 0 | `SUCCESS` | `SUCCESS` | `EVALUABLE_COMPLETE_21` | Không có (Đủ điều kiện paired) |
| 2 | `True` | 0 | `SUCCESS` | `SUCCESS` | `EVALUABLE_COMPLETE_21` | Không có (Đủ điều kiện paired) |
| 3 | `True` | 1 | `SUCCESS` | `SUCCESS` | `NOT_EVALUABLE` | `['INSUFFICIENT_LABELS']` |
| 4 | `True` | 1 | `SUCCESS` | `SUCCESS` | `NOT_EVALUABLE` | `['INSUFFICIENT_LABELS']` |
| 5 | `True` | 0 | `SUCCESS` | `SUCCESS` | `EVALUABLE_COMPLETE_21` | Không có (Đủ điều kiện paired, IDCG@3=0) |
| 6 | `True` | 0 | `ABSTAIN` | `ABSTAIN` | `NOT_EVALUABLE` | `['NON_SUCCESS']` |
| 7 | `False` | 0 | `NOT_RUN` | `NOT_RUN` | `NOT_EVALUABLE` | `['INVALID_INPUT']` (Nhãn = -1) |
| 8 | `False` | 0 | `NOT_RUN` | `NOT_RUN` | `NOT_EVALUABLE` | `['INVALID_INPUT']` (Nhãn = 4) |
| 9 | `False` | 1 | `NOT_RUN` | `NOT_RUN` | `NOT_EVALUABLE` | `['INVALID_INPUT', 'INSUFFICIENT_LABELS']` |
| 10 | `False` | 0 | `NOT_RUN` | `NOT_RUN` | `NOT_EVALUABLE` | `['INVALID_INPUT']` (Thiếu câu R1) |
| 11 | `False` | 0 | `NOT_RUN` | `NOT_RUN` | `NOT_EVALUABLE` | `['INVALID_INPUT']` (Điểm R1 = 6) |
| 12 | `True` | 0 | `SUCCESS` | `SUCCESS` | `EVALUABLE_COMPLETE_21` | Không có (Đủ điều kiện paired) |
| 13 | `True` | 0 | `SUCCESS` | `SUCCESS` | `EVALUABLE_COMPLETE_21` | Không có (Đủ điều kiện paired) |

---

## 2. PHÂN TÍCH CHI TIẾT CÁCH ĐẾM TỪNG MẪU SỐ

1. **Tổng số hồ sơ (`total_profiles = 13`)**:
   - Toàn bộ các bản ghi trong tệp đầu vào, bao gồm cả các hồ sơ bị lỗi định dạng cố ý.
2. **Hồ sơ hợp lệ cú pháp (`valid_profiles = 8`)**:
   - Gồm các dòng: 1, 2, 3, 4, 5, 6, 12, 13.
   - Thỏa mãn toàn bộ quy tắc JSON Schema (UUIDv4 hợp lệ, đủ 27 câu Likert 1–5, đủ 21 khóa ngành READY với giá trị trong $\{0, 1, 2, 3, \text{null}\}$).
3. **Hồ sơ không hợp lệ cú pháp (`invalid_profiles = 5`)**:
   - Gồm các dòng: 7, 8, 9, 10, 11.
   - Do kiểm thử biên chủ động chèn lỗi (nhãn ngoài khoảng, thiếu khóa, câu trả lời sai khoảng Likert).
4. **Hồ sơ có nhãn bị khuyết (`missing_label_profiles = 3`)**:
   - Gồm các dòng: 3, 4, 9 (mỗi dòng đều có ít nhất 1 nhãn mang giá trị `null` hoặc bị xóa).
5. **Hồ sơ hợp lệ và đủ 21 nhãn (`complete_label_valid_profiles = 6`)**:
   - Là giao của tập hợp hợp lệ (8 dòng) và tập không khuyết nhãn (10 dòng): các dòng 1, 2, 5, 6, 12, 13 ($8 - 2 = 6$).
6. **Hồ sơ đủ điều kiện so sánh theo cặp (`paired_evaluable_profiles = 5`)**:
   - Từ 6 hồ sơ hợp lệ và đủ nhãn, trừ đi dòng 6 vì thuật toán trả về `ABSTAIN_FLAT_PROFILE` (hồ sơ phẳng, tất cả câu hỏi đều bằng 3) nên không có danh sách Top-3 để chấm điểm.
   - Còn lại đúng **5 hồ sơ**: các dòng 1, 2, 5, 12, 13.

---

## 3. HIỆN TƯỢNG LÝ DO LOẠI TRỪ CHỒNG LẤN (OVERLAPPING REASONS)

Trong thống kê của B-12:
- `not_evaluable_profiles`: **8 hồ sơ** ($13 - 5 = 8$).
- Tuy nhiên, từ điển `not_evaluable_reasons_nonexclusive` lại ghi nhận:
  * `INVALID_INPUT`: 5
  * `INSUFFICIENT_LABELS`: 3
  * `NON_SUCCESS`: 1
  * **Tổng số lượng lý do**: $5 + 3 + 1 = 9 \ne 8$.

### Nguyên nhân chồng lấn:
- **Dòng 9** vừa bị lỗi cú pháp (`INVALID_INPUT`: nhãn ngoài pool và thừa khóa lạ), vừa bị thiếu nhãn của một ngành READY (`INSUFFICIENT_LABELS`).
- Vì vậy, một hồ sơ có thể kích hoạt nhiều lý do loại trừ đồng thời. Đây là các lý do **không loại trừ lẫn nhau (non-exclusive)**. Khi lập báo cáo hoặc vẽ biểu đồ dòng chảy dữ liệu (CONSORT flow diagram) trong nghiên cứu thực tế, không được cộng gộp số đếm của các lý do này thành tổng số hồ sơ loại trừ.

---

## 4. PHÂN BIỆT RÕ RÀNG HAI TỶ LỆ COVERAGE TRÊN DỮ LIỆU GIẢ LẬP

Công cụ B-12 báo cáo hai chỉ số coverage:
1. `coverage_all_profiles`:
   $$\text{Rate} = \frac{7}{13} \approx 53.85\%$$
   - Mẫu số là toàn bộ 13 hồ sơ trong tệp, **kể cả 5 hồ sơ sai cú pháp cố ý**.
   - **Lưu ý phương pháp luận**: Tuyệt đối không sử dụng con số $53.85\%$ này làm độ bao phủ của thuật toán P0 hay P2 trong đời thực, vì nó bị kéo giảm bởi các trường hợp thử nghiệm kiểm thử phần mềm.
2. `coverage_valid_profiles`:
   $$\text{Rate} = \frac{7}{8} = 87.50\%$$
   - Mẫu số là 8 hồ sơ hợp lệ về mặt kỹ thuật trong tệp fixture.
   - Trong 8 hồ sơ này, có 7 hồ sơ P0 và P2 đưa ra gợi ý thành công (`SUCCESS`), 1 hồ sơ từ chối gợi ý chính xác do người học chọn toàn điểm 3 (`ABSTAIN_FLAT_PROFILE`).
   - **Lưu ý phương pháp luận quan trọng**: Đây là tỷ lệ SUCCESS tính riêng trên 8 hồ sơ hợp lệ của **bộ fixture giả lập kiểm thử B-12** (được thiết kế có chủ đích gồm 7 hồ sơ ngẫu nhiên và 1 hồ sơ phẳng để kiểm thử cơ chế ABSTAIN). Con số $7/8 = 87.50\%$ này **hoàn toàn không đại diện cho độ bao phủ, tỷ lệ thành công hay năng lực xử lý của hệ thống trên tập người dùng thực tế**.

---

## 5. NHÓM ĐẶC THÙ: $\text{IDCG@3} = 0$ (DÒNG SỐ 5)

- **Đặc điểm**: Tại dòng số 5, người học đánh giá toàn bộ 21 ngành READY đều ở mức `0` (Không quan tâm).
- **Hệ quả toán học**:
  - Độ lợi lý tưởng $\text{IDCG@3} = 0.0$.
  - Bất kể thuật toán gợi ý ngành nào, người học cũng không quan tâm ($\text{DCG@3} = 0.0$).
  - Theo quy tắc khóa từ B-08, trường hợp này được gán $\text{NDCG@3} = 0.0$.
- **Xử lý thống kê**:
  - Dòng 5 **vẫn được tính vào mẫu số** của các chỉ số trung bình paired (mẫu số = 5 hồ sơ).
  - Đồng thời được hệ thống đếm riêng trong trường `idcg_zero_paired_profiles = 1`.
  - Trong nghiên cứu thực tế với học sinh, nhóm này phản ánh những người học hoàn toàn xa lạ hoặc không có hứng thú với danh mục ngành hiện tại. Cần được phân tích độ nhạy (sensitivity analysis) riêng biệt để xem xét ảnh hưởng của nhóm này đến mức chênh lệch trung bình giữa P2 và P0.
