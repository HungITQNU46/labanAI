# RIASEC27 TOP-3 OFFLINE VALIDATION TOOL V1 (PHASE B-12)

Phiên bản: **1.0.0**  
Giai đoạn: **B-12**  
Nhãn trạng thái công cụ: `SYNTHETIC_DEMO_ONLY — NOT_SCIENTIFIC_VALIDATION`  
Trạng thái khoa học tổng thể: `RESEARCH_ONLY — TOP3_NOT_VALIDATED`  

---

## 1. MỤC TIÊU VÀ PHẠM VI

Thư mục này chứa công cụ đánh giá ngoại tuyến (offline evaluation tool) chất lượng gợi ý Top-3 ngành học giữa hai phương pháp:
- **Baseline P0**: Tính điểm trung bình miền RIASEC và khoảng cách tương quan Pearson với hồ sơ O*NET.
- **Mô hình P2**: Sáu xác suất ML Q5 chuẩn hóa Z-score và tương quan Pearson với hồ sơ O*NET.

Công cụ nhận vào vector 27 câu trả lời RIASEC và tập nhãn sở thích/mức độ quan tâm tự đánh giá độc lập của người học đối với đúng 21 ngành `READY_FOR_PROTOTYPE`, sau đó tính toán và so sánh theo cặp (paired comparison) các chỉ số xếp hạng thông dụng ($NDCG@3$, $Precision@3$, $Hit@3$).

> [!IMPORTANT]
> **Giới hạn nghiên cứu bắt buộc**:
> - B-12 **chỉ xây dựng và kiểm thử công cụ** trên dữ liệu giả lập (`SYNTHETIC_DEMO_ONLY`).
> - Tuyệt đối **không thu thập dữ liệu học sinh thật**, không mở website công khai, không sử dụng tập dữ liệu Test 947.
> - Tuyệt đối **không tuyên bố P2 tốt hơn P0** khi chưa có dữ liệu thực nghiệm độc lập được thu thập theo đề cương B-08/B-09 đã qua hội đồng thẩm định đạo đức nghiên cứu.

---

## 2. CẤU TRÚC SẢN PHẨM

```
research/riasec27_top3_validation_v1/
├── README.md                      # Tài liệu thuyết minh công cụ và quy tắc đánh giá
├── evaluation_schema.json         # JSON Schema kiểm soát chặt chẽ cấu trúc đầu vào
├── contracts.py                   # Xác thực khóa hợp đồng (hash config, reference, manifest)
├── validate_input.py              # Bộ kiểm định dữ liệu đầu vào không phản xạ dữ liệu cá nhân
├── metrics.py                     # Hàm tính toán NDCG@3, Precision@3, Hit@3 có xử lý hòa điểm
├── evaluate_top3.py               # Module và CLI đánh giá ngoại tuyến so sánh theo cặp P0 vs P2
├── generate_fixture.py            # Script sinh dữ liệu giả lập kiểm thử biên (13 records)
├── synthetic_fixture.json         # Bộ dữ liệu giả lập mẫu chuẩn
├── synthetic_demo_results.json    # Kết quả JSON đầy đủ sau khi chạy evaluate_top3 trên fixture
├── synthetic_demo_report.md       # Báo cáo kết quả dạng Markdown của bản chạy mẫu
└── test_validation.py             # Bộ 31 unit tests kiểm thử toàn diện các kịch bản
```

---

## 3. CẤU TRÚC DỮ LIỆU ĐÁNH GIÁ ĐỘC LẬP

Mỗi hồ sơ đánh giá trong mảng `records` tuân thủ nghiêm ngặt định dạng:
1. `participant_id`: Chuỗi định danh ngẫu nhiên chuẩn UUIDv4 (`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`). Không chứa bất kỳ thông tin định danh cá nhân (PII) nào như tên, email, số điện thoại, trường học hay học bạ.
2. `answers`: Đối tượng chứa đúng 27 câu trả lời Likert 1–5 theo khóa câu hỏi chuẩn `R1...C4` (khóa thứ tự `FEATURE_ORDER_27`).
3. `major_interest_labels`: Đối tượng chứa nhãn mức độ quan tâm đối với đúng 21 ngành `READY_FOR_PROTOTYPE`:
   - `0`: Không quan tâm
   - `1`: Ít quan tâm
   - `2`: Quan tâm (ngưỡng xác định nhị phân có quan tâm)
   - `3`: Rất quan tâm
   - `null`: Chưa biết đủ thông tin / không thể đánh giá

### Bản chất của nhãn:
- Đây là **nhãn mức độ quan tâm tự đánh giá** (self-reported interest label) từ người học sau khi đọc bản mô tả trung lập (B-09), thu thập độc lập **trước khi** người học nhìn thấy kết quả gợi ý Top-3.
- Không gọi là "độ phù hợp nghề nghiệp khách quan" và không gọi là "xác suất thành công khi học đại học".
- Không gộp nhãn này vào xác suất mô hình Q5.

---

## 4. CÔNG THỨC VÀ QUY TẮC TÍNH TOÁN CHỈ SỐ

### 4.1. NDCG@3 (Normalized Discounted Cumulative Gain tại Top-3)
- **Hàm độ lợi (Gain)**: $\text{gain}(\text{rel}) = 2^{\text{rel}} - 1$ với $\text{rel} \in \{0, 1, 2, 3\}$.
- **Hàm giảm trừ vị trí (Discount)**: $\text{discount}(\text{pos}) = \frac{1}{\log_2(\text{pos} + 1)}$ với vị trí $\text{pos} \in \{1, 2, 3\}$.
- **Độ lợi tích lũy giảm trừ (DCG@3)**:
  $$\text{DCG@3} = \sum_{k=1}^3 \frac{2^{\text{rel}_k} - 1}{\log_2(k + 1)}$$
  *(Trường hợp hòa điểm thứ hạng tự nhiên trong Top-3: tính độ lợi trung bình kỳ vọng trên các hoán vị trong nhóm hòa điểm, không phá hòa tùy tiện bằng ID)*.
- **Độ lợi lý tưởng (IDCG@3)**:
  - Lấy từ 3 mức độ quan tâm lớn nhất trên toàn bộ tập 21 ngành READY:
  $$\text{IDCG@3} = \sum_{k=1}^3 \frac{2^{\text{rel}^*_k} - 1}{\log_2(k + 1)}$$
  - Bắt buộc lấy trên toàn bộ 21 ngành quan sát được, không chỉ lấy trên Top-3 hoặc hợp của Top-3.
- **Chuẩn hóa**: $\text{NDCG@3} = \frac{\text{DCG@3}}{\text{IDCG@3}}$.
  - Nếu $\text{IDCG@3} = 0$ (người học đánh giá tất cả 21 ngành là 0): $\text{NDCG@3} = 0.0$, giữ trong mẫu số tính trung bình paired và báo cáo riêng số lượng hồ sơ.

### 4.2. Precision@3 và Hit@3
- **Quy ước nhị phân**: Mức độ quan tâm $\text{rel} \ge 2$ (Quan tâm hoặc Rất quan tâm) được xem là ngành có quan tâm (`relevant`).
- **Precision@3**: Tỷ lệ số ngành có quan tâm trong Top-3:
  $$\text{Precision@3} = \frac{\sum_{k=1}^3 \mathbb{I}(\text{rel}_k \ge 2)}{3}$$
- **Hit@3**: Đạt giá trị $1$ nếu có ít nhất một ngành trong Top-3 có $\text{rel} \ge 2$, ngược lại bằng $0$:
  $$\text{Hit@3} = \mathbb{I}\left(\sum_{k=1}^3 \mathbb{I}(\text{rel}_k \ge 2) > 0\right)$$

### 4.3. Chênh lệch theo cặp (Paired Difference)
- Với mỗi hồ sơ đủ điều kiện đánh giá đồng thời cả hai phương pháp:
  $$\Delta \text{NDCG@3} = \text{NDCG@3}(P2) - \text{NDCG@3}(P0)$$

---

## 5. QUY TẮC XỬ LÝ DỮ LIỆU KHUYẾT THIẾU VÀ TRẠNG THÁI KHÔNG THÀNH CÔNG

1. **Điều kiện đủ nhãn**:
   - Để tính toán hợp lệ trong phân tích chính trên 21 ngành, hồ sơ bắt buộc phải có đủ 21 nhãn quan tâm quan sát được (không có nhãn nào mang giá trị `null`).
   - Nếu thiếu dù chỉ 1 nhãn (kể cả ngoài Top-3), hồ sơ bị đánh dấu `INSUFFICIENT_LABELS` và chuyển trạng thái `NOT_EVALUABLE`.
   - **Tuyệt đối không gán nhãn null bằng 0** và không tự ý giả định dữ liệu khuyết thiếu ngẫu nhiên (MAR).
2. **Nguyên tắc đồng nhất nhãn**:
   - Cùng một học sinh và cùng một ngành học chỉ có duy nhất một nhãn quan tâm, áp dụng đồng nhất cho cả P0 và P2.
3. **Trạng thái không thành công (Non-Success)**:
   - Nếu P0 hoặc P2 trả về `ABSTAIN_FLAT_PROFILE` hoặc `TIED_BOUNDARY`, hồ sơ được đánh dấu `NON_SUCCESS` và chuyển `NOT_EVALUABLE`.
   - Tuyệt đối không tự bịa đặt danh sách Top-3 giả để tính điểm khi thuật toán từ chối đưa ra kết quả.
4. **Báo cáo độ bao phủ (Coverage)**:
   - Thống kê tỷ lệ thành công trên toàn bộ hồ sơ (`coverage_all_profiles`) và trên tập hồ sơ hợp lệ cú pháp (`coverage_valid_profiles`).
   - Các hồ sơ bất lợi, hồ sơ thiếu nhãn, hoặc hồ sơ từ chối gợi ý vẫn được giữ nguyên trong mẫu số tổng, không bị loại trừ tùy tiện.

---

## 6. HƯỚNG DẪN THỰC THI VÀ KIỂM THỬ

### 6.1. Chạy đánh giá ngoại tuyến
```powershell
py -3.14 -B research/riasec27_top3_validation_v1/evaluate_top3.py
```
Hoặc chỉ định file dữ liệu tùy chọn:
```powershell
py -3.14 -B research/riasec27_top3_validation_v1/evaluate_top3.py --input path/to/fixture.json
```

### 6.2. Sinh lại bộ fixture giả lập và schema
```powershell
py -3.14 -B research/riasec27_top3_validation_v1/generate_fixture.py
```

### 6.3. Chạy bộ unit tests
```powershell
py -3.14 -B -m unittest discover -s research/riasec27_top3_validation_v1 -p "test_*.py"
```

---

## 7. RÀNG BUỘC KHOA HỌC VÀ ĐẠO ĐỨC NGHIÊN CỨU

- Khi có dữ liệu độc lập thực sự trong tương lai:
  1. Phải khóa nhãn trước khi cho người học xem gợi ý.
  2. Đăng ký trước đề cương phân tích (pre-registered plan) và tiêu chí loại trừ.
  3. Khi tính khoảng tin cậy (CI) hoặc kiểm định giả thuyết theo cặp (paired t-test / Wilcoxon), bắt buộc phải kiểm soát hiệu ứng cụm (trường, lớp, khu vực) và các vector trả lời trùng lặp.
  4. Bộ schema B-12 hiện tại chưa thiết kế trường mã cụm (cluster ID); việc quản trị dữ liệu phục vụ suy luận thống kê phải được thiết kế riêng biệt trong hồ sơ đạo đức nghiên cứu.
