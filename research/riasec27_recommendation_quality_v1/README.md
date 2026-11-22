# B-10 — Đánh giá hành vi và độ ổn định P0/P2

RESEARCH_ONLY — TOP3_NOT_VALIDATED

Mục tiêu: mô tả sự khác biệt giữa hai phương pháp gợi ý và độ nhạy với một bậc
Likert, giúp nhận diện trường hợp cần nghiên cứu tiếp. Không đánh giá độ chính xác
hướng nghiệp và không có nhãn ngành đúng được gán cho hồ sơ tổng hợp.

## Chạy lại

Từ root repository, dùng Python 3.14 hiện có; không cài package hoặc tạo môi trường:

```powershell
$env:PYTHONIOENCODING='utf-8'
py -3.14 -B research/riasec27_recommendation_quality_v1/evaluate_profiles.py
py -3.14 -B -m unittest discover -s research/riasec27_recommendation_quality_v1 -p test_evaluation.py -v
```

Script chỉ ghi năm file kết quả trong chính thư mục này; không ghi log, artifact,
workbook, notebook hay file ngoài thư mục. `-B` tránh tạo bytecode. Mô hình chỉ được
load và gọi inference. Không gọi fit, không đọc dữ liệu khảo sát hoặc Test 947.

## Thiết kế trước khi xem đầu ra

243 hồ sơ: 6 nổi trội riêng, 15 cặp nổi trội, 20 bộ ba nổi trội, 2 gần cân bằng,
5 đồng nhất, 3 câu trả lời khác nhau nhưng sáu trung bình bằng nhau, 30 cạnh tranh
gần nhau, 1 anchor phân hóa, 33 biến thể nhỏ từ anchor, 128 ngẫu nhiên (seed 42).
27 vị trí xen kẽ được khóa đúng CODEBOOK; các nhóm có số câu 5/4/5/4/5/4.
Không nối sáu khối liên tiếp. Mỗi hồ sơ có 27 perturb, mỗi lần đúng một câu ±1,
hướng vào trong ở mức 1/5, còn lại chọn bằng seed 20261121: tổng 6.561 cặp.

Seed, quy tắc sinh, mục đích, thứ tự đầu vào và quy tắc chọn ví dụ được ghi trong
`profiles_manifest.json`. Hồ sơ tổng hợp không phải người thật và không đại diện
cho phân bố học sinh Việt Nam. Các perturb dùng chung anchor nên không độc lập.

## Gọi đúng thuật toán đã có

- P0: `riasec27_top3_b1_v0/prototype.py::rank_majors` với list 27 giá trị.
- P2: `riasec27_ml_top3_v0/ranker.py::MLTop3Ranker.rank` với cùng list.
- P0 dùng sáu trung bình thô; P2 dùng sáu xác suất Q5, Z-score μ/σ đã khóa và Pearson.
- Ranker gốc tự bảo vệ hồ sơ phẳng, đồng hạng ở biên Top-3 và kiểm tra artifact.
- So sánh phạm vi ID/SOC/OI với catalog: cùng 21 READY; không thêm 12 ngành còn lại.
- SHA-256 nguồn/config/manifest/sáu artifact/catalog/protocol được lưu trong kết quả;
  kiểm tra trước–sau. Kiểm tra lặp inference và P2 list so với dict đảo thứ tự key.

Không viết lại Pearson, normalization hoặc chính sách xếp hạng. Trạng thái bất
thường kỹ thuật nghiêm trọng dẫn đến BLOCKED; sửa thuật toán cần nhiệm vụ riêng.

## Định nghĩa và mẫu số

Trạng thái được đếm trên đủ 243 hồ sơ; chuyển trạng thái trên đủ 6.561 cặp.
Jaccard = |A∩B|/|A∪B|, chỉ tính khi hai phía SUCCESS có ba ngành khác nhau.
Hai danh sách rỗng là N/A, không phải trùng khớp hoàn hảo. Đồng hạng Top-1/thứ tự
được giữ N/A; không phá hòa theo ID. Các tỷ lệ báo cả mẫu số có thể đánh giá và
mẫu số toàn bộ. Chênh lệch r và xác suất có dấu được giữ trong JSON; tóm tắt trị
tuyệt đối không thay dấu của bản ghi gốc. Các ứng viên chung có điểm đều được so.

Tần suất tính từ ba slot của mỗi SUCCESS, gồm cả 21 ngành có tần suất 0.
Gini = Σ_iΣ_j|c_i−c_j|/(2mΣc_i), m=21. H = −Σp_i ln(p_i), p_i=c_i/Σc_i;
H chuẩn hóa bằng ln(21), exp(H) là số ngành hiệu dụng. Không có slot thì chỉ số N/A.
Số tập Top-3 khác nhau bỏ qua thứ tự. P95 nội suy tuyến tính trên 0,95(n−1).
Không đặt ngưỡng pass/fail ổn định; báo các mức giao 0/1/2/3 để người đọc tự xét.

## Kết quả và kiểm chứng

- `comparison_results.json`: toàn bộ đầu ra số, trạng thái, provenance và tổng hợp.
- `comparison_report.md`: nhóm hồ sơ, trạng thái, agreement và đủ 21 tần suất.
- `stability_report.md`: chuyển trạng thái, độ nhạy, thay đổi r/sáu xác suất.
- `explainability_cases.md`: 27 giá trị theo mã, sáu trung bình, p, z và Top-3/r.
- `test_evaluation.py`: kiểm tra đầu vào, module gốc, flat/tie, metrics, inference
  không fit/đọc workbook, catalog nguyên vẹn và output không có dữ liệu cá nhân.

Giải thích đường tính điểm không phải giải thích nhân quả của mô hình ML. Sáu
xác suất dự đoán thích Q5 chưa được phê duyệt calibration, không phải xác suất
thành công hay phù hợp ngành. Không có ground truth để tính Accuracy/Hit@3/NDCG,
không chứng minh P2 hơn P0. Kết quả này không cho phép triển khai production.
