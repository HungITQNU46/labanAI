# Kế hoạch Phân tích Thống kê (Statistical Analysis Plan - SAP)
## File: analysis_plan.md — Module: research/riasec27_evaluation_protocol_v1/
## Phiên bản: 1.2.0 (Phase B-08-R2) — Trạng thái: EVALUATION_PROTOCOL_READY_FOR_ETHICS_PREPARATION

---

### I. NGUYÊN TẮC TIÊN NGHIỆM VÀ PHÒNG NGỪA THIÊN LỆCH

Kế hoạch phân tích thống kê (SAP) này được hoàn thiện và đóng băng tiên nghiệm (a priori) trước khi tiến hành bất kỳ hoạt động thu thập dữ liệu nào nhằm:
1. **Chống p-hacking:** Khóa chặt chỉ số chính, tiêu chí loại trừ, và các kiểm định thống kê; không thay đổi sau khi quan sát dữ liệu.
2. **Chống HARKing:** Mọi giả thuyết chính và phụ đều được xác định trước.
3. **Phân tích mù (Blinded Analysis):** Chuyên viên phân tích xử lý dữ liệu với mã ẩn danh (Phương án Alpha vs Phương án Beta). Khóa giải mù chỉ được kích hoạt sau khi các bảng kết quả thô đã được kết xuất đầy đủ.

---

### II. BẢN CHẤT THIẾT KẾ & RANH GIỚI PHƯƠNG PHÁP LUẬN

- **Tên gọi thiết kế:** **So sánh thuật toán theo cặp trong từng đối tượng có làm mù và ngẫu nhiên hóa thứ tự hiển thị** (*Blinded within-subject paired algorithm comparison with randomized presentation order*).
- **Làm rõ về thuật ngữ Thử nghiệm Ngẫu nhiên Có đối chứng (RCT):**
  - Mặc dù trong y sinh học và một số lĩnh vực thực nghiệm, một RCT không nhất thiết phải có phân nhóm giữa các đối tượng (between-subject) hay kết quả dài hạn (ví dụ các thử nghiệm chéo - crossover trials), trong bối cảnh đo lường giáo dục và hướng nghiệp hiện tại, **việc gọi thiết kế này là RCT là không chuẩn xác**.
  - Nghiên cứu hiện tại không có một can thiệp hành vi giáo dục thực tế đối đầu với nhóm chứng (placebo hay standard-of-care).
  - Việc ngẫu nhiên hóa thứ tự trình bày (Alpha/Beta) trong Phần B chỉ có tác dụng kiểm soát thiên lệch thứ tự hiển thị (Order/Presentation bias) trong đánh giá cảm nhận chủ quan của người học; **hoàn toàn không tự chứng minh tác động hướng nghiệp nhân quả của thuật toán P2**.

---

### III. HỆ THỐNG ENDPOINTS VÀ GIẢ THUYẾT THỐNG KÊ

#### 1. Chỉ số Chính Duy nhất (Single Primary Endpoint)
- **Primary Endpoint:** Điểm chênh lệch theo cặp về NDCG@3 giữa P2 và P0 trên nhãn mức độ quan tâm ngành tự đánh giá độc lập (thu thập trước khi gợi ý):
  $$\Delta_{\text{NDCG}}^{(i)} = \text{NDCG}@3^{(i)}(P2) - \text{NDCG}@3^{(i)}(P0)$$
- **Tập Phân tích Hợp lệ ($N_{\text{valid}}$):**  
  Chỉ tính trên các hồ sơ thỏa mãn: (1) Đủ 27 câu Likert; (2) Cả P0 và P2 đều trả `SUCCESS`; (3) Toàn bộ các ngành trong Top-3 của cả hai thuật toán đều có nhãn quan sát được hợp lệ ($rel \in \{0, 1, 2, 3\}$).
- **Giả thuyết Thống kê (Kiểm định Hai phía - Two-tailed, $\alpha = 0.05$):**
  - $H_0$: Không có sự khác biệt về điểm $\text{NDCG}@3$ trung bình giữa P2 và P0 trên tập cặp hợp lệ:
    $$\mathbb{E}[\Delta_{\text{NDCG}}] = 0$$
  - $H_1$: Có sự khác biệt có ý nghĩa thống kê về điểm $\text{NDCG}@3$ giữa P2 và P0:
    $$\mathbb{E}[\Delta_{\text{NDCG}}] \ne 0$$

#### 2. Các Chỉ số Phụ (Secondary Endpoints)
- **Chất lượng Xếp hạng:** Precision@3 ($rel \ge 2$), Hit@3, Severe Disconnect Rate ($rel = 0$).
- **Hành vi Thuật toán:** Coverage (Tỷ lệ khả dụng), Abstain Rate (Hồ sơ phẳng), Tied Boundary Rate (Hòa điểm biên), Top-1 Agreement, Jaccard@3, Recommendation Gini Coefficient.
- **Trải nghiệm Người học Mù đôi (Part B):** Điểm đánh giá Tính dễ hiểu (1–5), Tính hữu ích định hướng (1–5), Cảm nhận tự chủ (1–5), và Tỷ lệ lựa chọn ưu tiên không ép buộc (Head-to-head Preference).

---

### IV. MÔ HÌNH KIỂM ĐỊNH & XỬ LÝ PHỤ THUỘC NỘI CỤM

#### 1. Kiểm định Phi tham số & Giả định Bắt buộc
- **Kiểm định Hoán vị Cặp (Paired Permutation Test / Exact Randomization Test):**  
  *Giả định cốt lõi:* Tính khả hoán (Exchangeability) của cặp kết quả dưới giả thuyết vô hiệu $H_0$ — nghĩa là nếu P0 và P2 không có sự khác biệt thực sự, việc gán nhãn P0 hay P2 cho từng kết quả trong cùng một cá nhân là hoàn toàn ngẫu nhiên và có phân phối đồng nhất.
- **Kiểm định Dấu hạng Wilcoxon với quy tắc Pratt:**  
  Quy tắc Pratt bảo lưu các cặp hòa điểm ($\Delta = 0$) trong quá trình xếp hạng ban đầu trước khi tính tổng dấu, tránh làm sai lệch mức ý nghĩa thống kê khi có nhiều cặp đồng điểm.
- **Kiểm định McNemar có hiệu chỉnh Edwards:** Áp dụng cho biến nhị phân ghép cặp Hit@3.
- **Kiểm soát Khám phá Sai (Multiple Testing Correction):** Áp dụng quy trình **Benjamini-Hochberg (BH-FDR $\le 0.05$)** trên toàn bộ tập giả thuyết phụ.

#### 2. Ước lượng Khoảng Tin cậy theo Cụm Trường học (Clustered Bootstrap)
- Khi học sinh được tuyển chọn theo từng trường/lớp, các quan sát trong cùng một trường có sự tương quan nội cụm (Intra-Cluster Correlation - ICC).
- **Cấp độ Lấy mẫu lại (Resampling Unit):**  
  Trong quy trình Bootstrap ($B = 10.000$ lần lặp), đơn vị lấy mẫu lại bắt buộc phải là **cấp độ cụm (Trường học / Lớp học)**, không phải từng học sinh riêng rẽ, nhằm bảo tồn nguyên vẹn cấu trúc tương quan nội cụm thực tế.
- Báo cáo khoảng tin cậy $95\%$ BCa (Bias-Corrected and Accelerated) cho $\mathbb{E}[\Delta_{\text{NDCG}}]$.

---

### V. KỊCH BẢN CỠ MẪU SƠ BỘ VÀ LỘ TRÌNH ĐIỀU CHỈNH THỰC TẾ

#### 1. Công thức Phân tích Năng lực Thống kê Phức hợp
Cỡ mẫu cơ sở tính theo phép xấp xỉ chuẩn theo cặp:
$$N_{\text{base}} = \frac{(z_{1 - \alpha/2} + z_{1 - \beta})^2}{d_z^2}$$
Điều chỉnh cho kiểm định phi tham số, hiệu ứng cụm trường học và mất mẫu:
$$N_{\text{target}} = \frac{N_{\text{base}} \times (1 / \text{ARE}) \times \text{DEFF}}{1 - \text{DropRate}}$$
Trong đó:
- $z_{1 - \alpha/2} = 1.96$ ($\alpha = 0.05$, kiểm định 2 phía).
- $z_{1 - \beta} = 0.8416$ (Power $80\%$) hoặc $1.2816$ (Power $90\%$).
- $\text{ARE} \approx 0.864$ (Hệ số hiệu quả tiệm cận thấp nhất của kiểm định Wilcoxon so với t-test).
- $\text{DEFF} = 1 + (m - 1)\rho \approx 1 + (30 - 1) \times 0.02 = 1.58$ (Hiệu ứng thiết kế do cụm, giả định $m=30$ học sinh/trường, $\rho = 0.02$).
- $\text{DropRate} \approx 0.20$ (Tỷ lệ mất mẫu, hồ sơ phẳng Abstain, hòa điểm Tied, và thiếu nhãn Top-3).

#### 2. Bảng Kịch bản Sơ bộ Minh họa (Preliminary Illustrative Scenarios)

| Kịch bản hiệu ứng | Cohen's $d_z$ | Power ($1-\beta$) | $N_{\text{base}}$ (Paired t) | $N$ sau chỉnh Wilcoxon & DEFF | Cỡ mẫu mục tiêu sơ bộ ($N_{\text{target}}$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **Nhỏ (Small)** | $0.15$ | $80\%$ | $352$ | $643$ | $\approx \mathbf{800}$ |
| **Vừa (Moderate)** | $0.20$ | $80\%$ | $199$ | $364$ | $\approx \mathbf{455}$ |
| **Vừa (Moderate)** | $0.20$ | $90\%$ | $265$ | $484$ | $\approx \mathbf{605}$ |
| **Lớn (Substantial)**| $0.30$ | $90\%$ | $119$ | $217$ | $\approx \mathbf{270}$ |

> [!CAUTION]
> **Giới hạn Khoa học của Kịch bản Cỡ mẫu:**
> - Con số **$600 - 800$ học sinh** chỉ là **kịch bản sơ bộ (preliminary illustrative scenario)** dựa trên các giả định mô phỏng nêu trên.
> - **TUYỆT ĐỐI KHÔNG TUYÊN BỐ** công thức trên đã chứng minh đây là cỡ mẫu tối ưu tuyệt đối.
> - Cỡ mẫu chính thức bắt buộc phải được chuẩn hóa lại dựa trên phương sai thực nghiệm ($\sigma_{\Delta}$), tỷ lệ hồ sơ phẳng (`ABSTAIN_FLAT_PROFILE`), và tỷ lệ nhãn thiếu thực tế đo lường được từ **Giai đoạn 2 (Measurement Pilot)** kết hợp nguồn lực khả thi của đề tài.

#### 3. Hạn ngạch Tuyển chọn Minh họa
- Khối lớp: Lớp 10 ($30\%$), Lớp 11 ($40\%$), Lớp 12 ($30\%$).
- Vùng miền: Miền Bắc ($35\%$), Miền Trung ($30\%$), Miền Nam ($35\%$).
- Loại hình trường: Công lập đại trà ($45\%$), Chuyên/chọn ($20\%$), Tư thục ($20\%$), GDTX/Nghề ($15\%$).

*Nhãn bắt buộc:* **`ILLUSTRATIVE_QUOTA_NOT_POPULATION_BENCHMARK`** — Đây là mẫu thuận tiện có chủ đích, không đại diện cho toàn bộ dân số học sinh THPT Việt Nam. Báo cáo nghiên cứu bắt buộc phải công bố giới hạn này.
