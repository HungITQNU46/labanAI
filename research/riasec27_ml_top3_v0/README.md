# LabanAI — Direction B: ML Top-3 Research Ranker (Prototype v0)

**Trạng thái nghiên cứu:** `RESEARCH_ONLY — TOP3_NOT_VALIDATED`  
**Giai đoạn:** B-03-R2  
**Mục đích:** Cung cấp implementation nghiên cứu độc lập cho phương án xếp hạng Hướng B (P2), kết nối 27 câu RIASEC $\rightarrow$ 6 mô hình ML Q5 $\rightarrow$ Chuẩn hóa P2 Z-score $\rightarrow$ Tương quan Pearson với O*NET OI $\rightarrow$ Top-3.  
**Cảnh báo:** Đây là nguyên mẫu nghiên cứu kỹ thuật, **KHÔNG ĐƯỢC PHÉP** tích hợp vào website, API thương mại hoặc sử dụng làm công cụ tư vấn hướng nghiệp chính thức khi chưa có dữ liệu nghiệm thu thực tế.

---

## 1. Kiến trúc luồng suy luận (Inference Pipeline)

```
[27 Câu trả lời (1-5)]
         │
         ▼
[1. Kiểm tra tính hợp lệ & Chuẩn hóa thứ tự câu] (CODEBOOK_33)
         │
         ▼
[2. Flat Profile Guard] ──(Var(6 means) < 1e-12)──► [ABSTAIN_FLAT_PROFILE]
         │ (Đạt độ phân hóa)
         ▼
[3. Sáu Artifact ML Q5 (LogisticRegression / XGBoost)] ──► [6 Xác suất thô p_hat]
         │
         ▼
[4. Chuẩn hóa P2 Z-Score Cố định] (z_d = (p_hat_d - mu_d) / sigma_d)
         │
         ▼
[5. Tương quan Pearson r với 21 ngành READY_FOR_PROTOTYPE] (O*NET 30.2)
         │
         ▼
[6. Kiểm tra Hòa điểm Biên] (Độ chính xác 32 * ulp(1.0))
   ├── Có hòa ranh giới 3–4 ──► [TIED_BOUNDARY (top3 = [])]
   └── Phân biệt rõ ràng    ──► [SUCCESS (Top-3 Ngành)]
```

---

## 2. Hợp đồng dữ liệu đầu vào (Input Contract)

1. **Định dạng chấp nhận:**
   - `dict`: Ánh xạ đúng 27 mã câu hỏi, ví dụ `{"R1": 4, "I1": 3, ..., "C4": 2}`. Cho phép thứ tự key tùy ý (Ranker tự sắp xếp lại theo `CODEBOOK_33`).
   - `list`: Danh sách 27 số nguyên có thứ tự khớp chính xác với `QUESTION_ORDER`.
   - `list[dict]`: Danh sách 27 object `{"id": "R1", "value": 4}`.
2. **Quy tắc kiểm tra kiểu:**
   - Mỗi câu trả lời bắt buộc là số nguyên (`int`), thuộc khoảng đóng $[1, 5]$.
   - Nghiêm cấm kiểu dữ liệu: `bool` (kể cả `True/False`), `float`, `str`, `None`.
3. **Thứ tự câu hỏi chuẩn (CODEBOOK_33):**
   ```python
   QUESTION_ORDER = [
       "R1", "I1", "A1", "R2", "I2", "A2", "S1", "S2", "R3", "A3",
       "S3", "E1", "R4", "S4", "E2", "R5", "I3", "A4", "E3", "I4",
       "A5", "E4", "C1", "E5", "C2", "C3", "C4"
   ]
   ```

---

## 3. Chính sách an toàn cho Hồ sơ phẳng (Flat Profile Guard)

- **Nguyên lý:** Khi sinh viên trả lời tất cả các câu hỏi như nhau (hoặc các câu hỏi khác nhau nhưng trung bình 6 chiều RIASEC triệt tiêu bằng nhau), học sinh không bộc lộ bất kỳ xu hướng nghề nghiệp cá nhân nào.
- **Biện pháp kỹ thuật số học chính xác (Exact Rational Identity):**
  Tính tổng điểm nguyên các câu hỏi cho từng lĩnh vực theo `CODEBOOK_33`:
  - $S_R = \sum_{j \in \{0, 3, 8, 12, 15\}} x_j$ (5 câu)
  - $S_I = \sum_{j \in \{1, 4, 16, 19\}} x_j$ (4 câu)
  - $S_A = \sum_{j \in \{2, 5, 9, 17, 20\}} x_j$ (5 câu)
  - $S_S = \sum_{j \in \{6, 7, 10, 13\}} x_j$ (4 câu)
  - $S_E = \sum_{j \in \{11, 14, 18, 21, 23\}} x_j$ (5 câu)
  - $S_C = \sum_{j \in \{22, 24, 25, 26\}} x_j$ (4 câu)

  Điều kiện để 6 trung bình $\bar{R} = \frac{S_R}{5}, \bar{I} = \frac{S_I}{4}, \bar{A} = \frac{S_A}{5}, \bar{S} = \frac{S_S}{4}, \bar{E} = \frac{S_E}{5}, \bar{C} = \frac{S_C}{4}$ bằng nhau tuyệt đối được kiểm tra bằng số nguyên:
  $$(S_R = S_A = S_E) \quad \text{và} \quad (S_I = S_S = S_C) \quad \text{và} \quad (4 \times S_R = 5 \times S_I)$$
  Nếu điều kiện trên thỏa mãn (hoặc phương sai thực $\text{Var}(u) < 10^{-12}$):
  Hệ thống lập tức trả về `status: "ABSTAIN_FLAT_PROFILE"`, `top3: []`, và **không gọi các mô hình ML**.
- **Ý nghĩa:** Loại bỏ hoàn toàn sự phụ thuộc vào epsilon số thực, triệt tiêu hiện tượng "ảo giác xếp hạng" (Spurious Top-3) khi mô hình ML tự ý sinh ra Top-3 cho các hồ sơ All 1, All 2, All 3, All 4, All 5 chỉ vì sự chênh lệch cấu trúc của các thuật toán.

---

## 4. Tham số chuẩn hóa P2 Cố định (Inference Standardization Parameters)

Bộ tham số được trích xuất trực tiếp từ quần thể đầy đủ (`full_train_population`, $N=3.963$) được lưu trữ có thẩm tra trong `models_manifest.json`:

| Chiều | Thuật toán mô hình | Trung bình OOF ($\mu$) | Độ lệch chuẩn OOF ($\sigma$) |
| :---: | :---: | :---: | :---: |
| **R** | LogisticRegression | 0.2960 | 0.2279 |
| **I** | XGBClassifier | 0.4128 | 0.2546 |
| **A** | LogisticRegression | 0.4904 | 0.2665 |
| **S** | XGBClassifier | 0.4474 | 0.2306 |
| **E** | LogisticRegression | 0.4670 | 0.2338 |
| **C** | XGBClassifier | 0.3994 | 0.2359 |

**Lý do lựa chọn quần thể `full_train_population` thay vì `labeled_population`:**
- `labeled_population` ($N \approx 2.800$) loại bỏ các hồ sơ có $Q5 = 3$ (Trung lập).
- Người dùng mới trên website không có nhãn $Q5$ được phân định trước; do đó quần thể toàn diện ($N=3.963$) phản ánh trung thực phân phối thực tế của học sinh.

---

## 5. Phạm vi danh mục ngành và Giới hạn 21/33 Ngành

Ranker chỉ chấm điểm **21 ngành** thuộc trạng thái `READY_FOR_PROTOTYPE`.  
**12 ngành còn lại** bị loại trừ tuyệt đối khỏi quá trình xếp hạng:
1. **7 ngành Sư phạm chuyên môn** (`su_pham_toan_hoc`, `su_pham_ngu_van`, `su_pham_tieng_anh`, `su_pham_tin_hoc`, `su_pham_hoa_hoc`, `su_pham_dia_ly`, `giao_duc_chinh_tri`): Trùng SOC `25-2031.00` và trùng vector OI. Không gian 6 chiều không thể phân biệt các ngành này.
2. **Công nghệ thông tin**: Trùng SOC `15-1252.00` với Kỹ thuật phần mềm.
3. **Đông phương học**: Trùng SOC `27-3091.00` với Ngôn ngữ Anh (chuyên gia phân tích là khu vực học, không phải biên phiên dịch thuần túy).
4. **Việt Nam học**: Lệch định hướng học thuật khi ánh xạ sang Hướng dẫn viên du lịch (SOC `39-7011.00`).
5. **Quản trị dịch vụ du lịch & lữ hành**: Chưa có mã SOC 1-1 đại diện tương ứng (`UNRESOLVED`).
6. **Quản lý nhà nước**: Phân mảnh giữa nhiều mã hành chính, chưa thống nhất mã đại diện (`UNRESOLVED`).

---

## 6. Quy tắc xử lý hòa điểm (Tie-breaking Policy)

- Sử dụng dung sai số học dấu phẩy động IEEE-754:
  $$\text{tolerance} = 32 \times \text{ulp}(1.0) \approx 7.1054 \times 10^{-15}$$
- Tuyệt đối **không phá hòa** bằng tên ngành, mã ngành hoặc thứ tự file JSON.
- Nếu xuất hiện hòa điểm tại ranh giới vị trí 3 và 4 (tức là không thể tách biệt ngành thứ 3 và thứ 4 một cách khách quan):
  Hệ thống chuyển trạng thái sang `TIED_BOUNDARY`, trả về `top3: []`, và báo danh sách các ngành bị hòa trong `tied_majors`.

---

## 7. Các giới hạn khoa học đã biết (Known Limitations)

1. **Không có nhãn kiểm chứng thực tế (No Ground Truth Labels):** Dự án không có dữ liệu về sự thành công hay mức độ hài lòng của sinh viên theo học từng ngành. Sự khác biệt giữa P2 và P0 phản ánh độ nhạy thuật toán, không phản ánh độ chính xác hướng nghiệp.
2. **Tương quan Pearson không phải xác suất trúng tuyển hay phù hợp:** Điểm tương quan $r \in [-1, 1]$ chỉ đo lường sự tương đồng về hình dạng trắc diện sở thích, không được phiên giải thành phần trăm cơ hội nghề nghiệp.
3. **Độ nhạy chuẩn hóa:** Sai lệch nhỏ ($\Delta \mu \approx 0.002$) có thể làm dịch chuyển khoảng 5% danh sách Top-3 ở các trường hợp điểm số sít sao.

---

## 8. Hướng dẫn chạy kiểm thử

Chạy toàn bộ 10 unit test của module:
```bash
py -3.14 -B -m unittest discover -s research/riasec27_ml_top3_v0 -p "test_*.py"
```

Chạy toàn bộ test suites của cả dự án:
```bash
py -3.14 -B -m unittest discover -s research/riasec27_q5_models_v1 -p "test_*.py"
py -3.14 -B -m unittest discover -s research/riasec27_top3_b1_v0 -p "test_*.py"
py -3.14 -B -m unittest discover -s research/riasec27_ml_top3_v0 -p "test_*.py"
```
