# Hệ thống Chỉ số Đánh giá Chất lượng LabanAI (Direction B)
## File: evaluation_metrics.md — Module: research/riasec27_evaluation_protocol_v1/
## Phiên bản: 1.2.0 (Phase B-08-R2) — Trạng thái: EVALUATION_PROTOCOL_READY_FOR_ETHICS_PREPARATION

---

### I. CẤP ĐỘ 1: ĐÁNH GIÁ MÔ HÌNH HỌC MÁY Q5 (ML LEVEL)

Các chỉ số Cấp độ 1 đo lường năng lực phân loại nhị phân xu hướng sở thích nhóm nghề tự khai báo $Y \in \{0, 1\}$ trên 6 lĩnh vực RIASEC từ vector 27 nhận định.

> [!IMPORTANT]
> **Ranh giới Khoa học Bắt buộc:**
> 1. Sáu biến mục tiêu Q5 (`Q5_LikeRe` .. `Q5_LikeCo`) đo lường **mức độ yêu thích nhóm nghề tự khai báo** (Self-reported vocational preference), tuyệt đối **KHÔNG PHẢI là năng lực học thuật khách quan** hay sự phù hợp thành công với một ngành đào tạo cụ thể.
> 2. Mẫu khảo sát trung lập $Q5 = 3$ (Neutral) bị loại bỏ khỏi bài toán phân loại nhị phân khi huấn luyện và đánh giá mô hình đơn lẻ (`1,2 -> 0; 4,5 -> 1`).
> 3. Số lượng mẫu huấn luyện hợp lệ trên tập Train (3.963 mẫu) đã được kiểm toán đối soát khớp 100% với `models_manifest.json` và B-02:
>    - $R (\text{Q5\_LikeRe}): 2.860$ mẫu ($2.055$ Dislike / $805$ Like)
>    - $I (\text{Q5\_LikeIn}): 2.884$ mẫu ($1.720$ Dislike / $1.164$ Like)
>    - $A (\text{Q5\_LikeAr}): 2.895$ mẫu ($1.481$ Dislike / $1.414$ Like)
>    - $S (\text{Q5\_LikeSo}): 2.784$ mẫu ($1.564$ Dislike / $1.220$ Like)
>    - $E (\text{Q5\_LikeEn}): 2.829$ mẫu ($1.542$ Dislike / $1.287$ Like)
>    - $C (\text{Q5\_LikeCo}): 2.874$ mẫu ($1.761$ Dislike / $1.113$ Like)
> 4. Giá trị Z-score cố định là đặc trưng định vị hình học để tính tương quan Pearson, **không phải là xác suất hậu nghiệm đã hiệu chuẩn**.

#### Các chỉ số phân loại và hiệu chuẩn:
- **Balanced Accuracy:** $\frac{1}{2} (\text{Sensitivity} + \text{Specificity})$
- **Macro F1-Score:** $2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$
- **Brier Score:** $\frac{1}{N} \sum_{i=1}^N (p_i - y_i)^2$
- **Expected Calibration Error (ECE):** $\sum_{m=1}^{10} \frac{|B_m|}{N} |\text{acc}(B_m) - \text{conf}(B_m)|$

---

### II. CẤP ĐỘ 2: ĐÁNH GIÁ HÀNH VI THUẬT TOÁN (ALGORITHMIC BEHAVIOR)

Các chỉ số Cấp độ 2 đo lường đặc tính toán học nội tại, độ ổn định và độ bao phủ của P2 so với P0 trên tập ứng viên đồng nhất gồm **21 ngành READY_FOR_PROTOTYPE**.

> [!WARNING]
> Các chỉ số Cấp độ 2 là **chỉ số đo lường hành vi toán học**, tuyệt đối **không đại diện cho độ chuẩn xác hướng nghiệp hay sự hài lòng của học sinh**.

#### 1. Độ bao phủ và Tỷ lệ từ chối xếp hạng (Báo cáo Độc lập)
- **Coverage (Tỷ lệ khả dụng đề xuất):**
  $$\text{Coverage} = \frac{N_{\text{SUCCESS}}}{N_{\text{TOTAL}}}$$
- **Abstain Rate (Tỷ lệ từ chối do hồ sơ phẳng):**
  $$\text{Rate}_{\text{ABSTAIN}} = \frac{N_{\text{ABSTAIN}}}{N_{\text{TOTAL}}}$$
- **Tied Boundary Rate (Tỷ lệ hòa điểm biên Top-3):**
  $$\text{Rate}_{\text{TIED}} = \frac{N_{\text{TIED}}}{N_{\text{TOTAL}}}$$

#### 2. Độ tương đồng và Hệ số tập trung gợi ý
- **Top-1 Agreement:** Tỷ lệ trùng khớp ngành xếp hạng 1 giữa P2 và P0 trên các hồ sơ khả dụng.
- **Top-3 Jaccard Similarity:** $J(T_3(P2), T_3(P0)) = \frac{|T_3(P2) \cap T_3(P0)|}{|T_3(P2) \cup T_3(P0)|}$.
- **Recommendation Gini Coefficient ($G$):** Đo lường mức độ tập trung gợi ý vào một số ít ngành trên 21 ngành READY ($G \in [0, 1]$).

---

### III. CẤP ĐỘ 3: ĐÁNH GIÁ TRÊN NHÃN ĐỘC LẬP & TRẢI NGHIỆM NGƯỜI HỌC

#### 1. Chỉ số Chính (Primary Endpoint): NDCG@3 trên Nhãn Độc lập Thu trước Gợi ý
Được tính toán trên nhãn mức độ quan tâm ngành tự đánh giá $rel_k \in \{0, 1, 2, 3\}$ thu thập độc lập ở Phần A **trước khi** học sinh nhìn thấy bất kỳ kết quả gợi ý nào.

$$\Delta_{\text{NDCG}}^{(i)} = \text{NDCG}@3^{(i)}(P2) - \text{NDCG}@3^{(i)}(P0)$$

- **Discounted Cumulative Gain tại Top-3 (DCG@3):**
  $$\text{DCG}@3 = \sum_{k=1}^3 \frac{2^{rel_k} - 1}{\log_2(k + 1)}$$

- **Định nghĩa Tập Ứng viên và Ideal DCG (IDCG@3):**
  1. **Tập Ứng viên Đồng nhất:** Cả P0 và P2 bắt buộc phải chọn Top-3 từ cùng một tập hợp chính xác là **21 ngành READY_FOR_PROTOTYPE**.
  2. **Kịch bản A — Đánh giá Toàn bộ 21 Ngành READY (Standard Benchmark):**  
     IDCG@3 được tính bằng cách sắp xếp giảm dần toàn bộ các ngành có nhãn hợp lệ ($rel \in \{0, 1, 2, 3\}$) trong tập 21 ngành để lấy 3 điểm cao nhất ($rel_{(1)} \ge rel_{(2)} \ge rel_{(3)}$):
     $$\text{IDCG}@3 = \sum_{k=1}^3 \frac{2^{rel_{(k)}} - 1}{\log_2(k + 1)}$$
  3. **Kịch bản B — Đánh giá trên Candidate Pool Giới hạn (Pooled Evaluation $P0 \cup P2$):**  
     IDCG@3 được tính trên 3 điểm cao nhất trong tập hợp nhất các ngành do P0 và P2 sinh ra ($P0 \cup P2$, từ 3 đến 6 ngành). *Bắt buộc phải gắn nhãn dữ liệu là `POOLED_EVALUATION`, công bố rõ rủi ro thiên lệch lựa chọn (Selection Bias do bỏ sót False Negatives ngoài tập hợp nhất) và tuyệt đối không tuyên bố tương đương với đánh giá toàn bộ 21 ngành.*

- **Normalized Discounted Cumulative Gain (NDCG@3):**
  $$\text{NDCG}@3 = \begin{cases} \frac{\text{DCG}@3}{\text{IDCG}@3} & \text{nếu } \text{IDCG}@3 > 0 \\ 0.0 & \text{nếu } \text{IDCG}@3 = 0 \text{ và } \text{DCG}@3 = 0 \end{cases}$$

---

### IV. QUY TẮC BẮT BUỘC VỀ XỬ LÝ NHÃN THIẾU, ABSTAIN VÀ ĐIỀU KIỆN ĐÁNH GIÁ

> [!CRITICAL]
> **10 NGUYÊN TẮC KHÓA CHẶT TRONG TÍNH TOÁN NDCG@3:**
> 
> 1. **Điều kiện đưa hồ sơ vào phân tích NDCG@3 chính:**
>    - Hồ sơ có đủ 27 câu trả lời Likert hợp lệ.
>    - Cả hai thuật toán P0 và P2 đều trả về trạng thái `SUCCESS` (sinh ra Top-3 xác định).
>    - Toàn bộ các ngành cần thiết để tính DCG và IDCG phải có nhãn quan sát được hợp lệ ($rel \in \{0, 1, 2, 3\}$).
> 2. **Nhãn bắt buộc để tính DCG@3:**  
>    Tất cả 3 ngành trong Top-3 của P2 và tất cả 3 ngành trong Top-3 của P0 bắt buộc phải có nhãn quan sát được. Nếu có bất kỳ ngành nào trong Top-3 bị khuyết nhãn hoặc mang nhãn "Chưa biết đủ thông tin", hồ sơ đó **KHÔNG ĐƯỢC TÍNH DCG@3**, đánh dấu `NOT_EVALUABLE_INSUFFICIENT_LABELS`.
> 3. **Nhãn bắt buộc để tính IDCG@3:**  
>    Cần có tối thiểu 3 ngành có nhãn hợp lệ trong tập ứng viên. Nếu số ngành có nhãn hợp lệ $< 3$, đánh dấu `NOT_EVALUABLE_INSUFFICIENT_LABELS`.
> 4. **Tuyệt đối không coi nhãn thiếu bằng 0:**  
>    Lựa chọn "Chưa biết đủ thông tin về ngành" phản ánh sự thiếu hụt thông tin, không phải là sự không phù hợp. Tuyệt đối không tự tiện gán $rel = 0$.
> 5. **Không tự giả định dữ liệu thiếu là MAR (Missing at Random):**  
>    Trong giáo dục hướng nghiệp, học sinh chọn "Chưa biết đủ thông tin" thường rơi vào các ngành mới lạ, chuyên sâu hoặc ít phổ biến trên truyền thông (cơ chế MNAR - Missing Not At Random). Không được giả định ngầm là MAR trong phân tích chính.
> 6. **Xử lý hồ sơ không đủ nhãn hợp lệ:**  
>    Ghi nhận chính xác mã trạng thái `NOT_EVALUABLE_INSUFFICIENT_LABELS`. Tuyệt đối không tự điền số hoặc nội suy tùy tiện để làm đẹp mẫu.
> 7. **Báo cáo tỷ lệ mất mẫu minh bạch (Attrition Flow):**  
>    Báo cáo đầy đủ lưu đồ suy giảm mẫu: Tổng số tham gia ($N_{\text{total}}$) $\to$ Số bị loại do P0/P2 Abstain $\to$ Số bị loại do Tied $\to$ Số bị loại do thiếu nhãn trong Top-3 $\to$ Cỡ mẫu phân tích cặp hợp lệ ($N_{\text{valid}}$).
> 8. **Báo cáo Coverage độc lập với NDCG có điều kiện:**  
>    Coverage phản ánh tính khả dụng thực tế của hệ thống; NDCG@3 chỉ phản ánh chất lượng xếp hạng có điều kiện trên tập hồ sơ đánh giá được ($N_{\text{valid}}$).
> 9. **Ranh giới công bố kết luận:**  
>    **Tuyệt đối không tuyên bố P2 vượt trội trên toàn bộ người học** nếu kết quả chỉ được kiểm định trên tập con mà P2 trả về `SUCCESS` và có đầy đủ nhãn.
> 10. **Tập ứng viên của P0 và P2 phải giống hệt nhau:**  
>     Cả hai thuật toán cùng vận hành trên đúng 21 ngành READY, không áp dụng bất kỳ ngoại lệ nào.

---

### V. CÁC PHÂN TÍCH ĐỘ NHẠY ĐỐI VỚI DỮ LIỆU THIẾU (SENSITIVITY ANALYSES)

Các phân tích thay thế dữ liệu thiếu chỉ được thực hiện dưới dạng **Phân tích Độ nhạy (Sensitivity Analyses)** phụ trợ nhằm kiểm tra tính bền vững của kết luận, với các giả định được công bố minh bạch:

1. **Phân tích Chính (Primary Analysis - Complete Case):**  
   Chỉ phân tích trên các hồ sơ có đầy đủ nhãn hợp lệ cho toàn bộ các ngành trong Top-3 của P0 và P2 (`EVALUABLE_COMPLETE`).
2. **Phân tích Cận biên Cực trị (Worst-case / Best-case Bounding):**  
   - Kịch bản Cận dưới: Gán toàn bộ các ngành thiếu nhãn trong Top-3 của P2 giá trị $rel = 0$ và Top-3 của P0 giá trị $rel = 3$.
   - Kịch bản Cận trên: Gán toàn bộ các ngành thiếu nhãn trong Top-3 của P2 giá trị $rel = 3$ và Top-3 của P0 giá trị $rel = 0$.
   - Nếu P2 vẫn duy trì ưu thế trong kịch bản thận trọng, kết luận được coi là cực kỳ bền vững.
3. **Phân tích Đa gán dưới Giả định MAR (Multiple Imputation - Sensitivity Only):**  
   Thực hiện gán đa biến (MICE) với giả định MAR có điều kiện, sử dụng các biến bổ trợ (tổ hợp môn, vùng miền, điểm các câu RIASEC cùng nhóm) và công bố rõ ràng giới hạn của giả định này.

---

### VI. BẢNG TỔNG HỢP VÀ ĐIỀU KIỆN ÁP DỤNG HỢP LỆ

| Cấp độ | Chỉ số | Khái niệm đo lường | Điều kiện áp dụng hợp lệ | Diễn giải sai lầm cần tránh |
| :---: | :--- | :--- | :--- | :--- |
| **Cấp 1** | Balanced Acc, F1, Log Loss, Brier | Phân loại nhị phân sở thích nhóm nghề | Đánh giá 6 mô hình Q5 trên tập Train/Test theo manifest đã khóa | **Không** coi đây là độ chính xác chọn ngành đại học. |
| **Cấp 2** | Coverage, Abstain Rate, Tied Rate | Tính khả dụng và ranh giới an toàn thuật toán | Đánh giá trên toàn bộ mẫu khảo sát ($N_{\text{total}}$) | **Không** coi ít Abstain là tốt hơn nếu hồ sơ thực sự phẳng. |
| **Cấp 2** | Jaccard, Gini Coefficient | Độ ổn định và tập trung gợi ý | Đánh giá trên 21 ngành READY | Là chỉ số toán học, **không** phản ánh sự hài lòng của học sinh. |
| **Cấp 3** | **NDCG@3 (Primary)**, Precision@3, Hit@3 | Chất lượng xếp hạng trên nhãn quan tâm độc lập | Cả P0 và P2 đều `SUCCESS`, đầy đủ nhãn Top-3 ($N_{\text{valid}}$) | **Tuyệt đối không** gán nhãn thiếu = 0; không coi kết quả áp dụng cho toàn bộ quần thể. |
| **Cấp 3** | Perceived Utility, Agency, Disconnect | Giá trị sư phạm và trải nghiệm mù đôi | Thu thập ở Phần B sau khi đã khóa nhãn Phần A | Điểm cảm nhận cao **không** chứng minh năng lực học tập của thí sinh. |
