# LabanAI — báo cáo phát triển tiếp ngày 14/11/2026

Làm việc trực tiếp trên nhánh `Nguyen`, bắt đầu tại commit `3f2cd53`. Trước khi làm đã có `.gitignore` bị sửa và toàn bộ `data/` chưa được Git theo dõi. Không checkout, pull, merge, rebase, commit hoặc push.

## Thay đổi và xác minh theo phase

| Phase | File thay đổi | Kết quả và giới hạn |
| --- | --- | --- |
| 0 — kiểm tra | Không sửa source; sao lưu trạng thái ban đầu ngoài repository | Kiểm tra status/branch/log/diff; workbook có 1.000 mẫu, checksum khớp; đọc kết quả C1/C2A/C2B/Nested CV hiện có. Baseline: 59 test Python đạt; npm test cũ là placeholder và thất bại. |
| 1 — dữ liệu/KDD | Notebook `00–05`, `07`, `09`; `data_contract.py`, `source_policy.v1.json` | 8 notebook chạy riêng từ thư mục notebooks. Thêm bảng, biểu đồ, phương pháp, nhận xét và kết luận; tái lập split 700/150/150 và digest; không sửa workbook hoặc tự loại cờ bất thường. Ghi riêng OWNER_CONFIRMED_REAL; RIASEC và synthetic ablation vẫn có điều kiện dừng. |
| 2 — training/evaluation | Notebook `06`, `08`, `10`, `12`; thêm `check_notebooks.py` | 4 notebook chạy riêng; kế thừa lựa chọn LinearSVC C2B và centroid tau=10 full-data inner CV. Precision/recall/F1 từng lớp tính từ confusion matrix cũ; không mở lại locked test. Verify policy/mapping hashes và nested fold feasibility. |
| 3 — export/inference | Notebook `11`; `inference.py`, `__init__.py`; thêm `artifact_export.py`, `test_f54_artifact.py`, model JSON và manifest | Notebook export chạy thành công. 66 test Python đạt, gồm parity với công thức centroid nghiên cứu, domain/schema, determinism, hash bị sửa và chống overwrite. Artifact chỉ chứa 33 centroid tổng hợp, schema/order/versions, cấu hình và metrics. |
| 4 — website | `server.js`, `package.json`, `src/routes/web.js`, `src/controllers/evaluationController.js`, `src/views/pages/evaluation.ejs`; thêm `src/models/mlModel.js`, `src/views/partials/ml-research.ejs`, `public/js/ml-research.js`, `tests/ml.test.js` | API và mục thu gọn F54 được tích hợp vào Express/EJS cũ. Không thêm dependency Node. 16 test Node đạt: parity Python/Node, HTTP input/error handling, EJS của 7 route, 60 câu Holland, schema/hash và hành vi form. Không thay đổi database hoặc ghi câu trả lời. |
| 5 — kiểm thử/tài liệu | README pipeline/artifacts; thêm `requirements-notebooks.txt`, báo cáo này và verification JSON; cập nhật assertion xác nhận owner trong test contract | Cả 13 notebook chạy lại từ repository root, mỗi notebook bằng kernel mới. Python/JavaScript syntax, notebook/pipeline JSON và kiểm tra whitespace của các file tracked được sửa đều đạt. Hash của 18 file gốc được bảo vệ vẫn khớp bản sao ban đầu. Chưa kiểm tra trực quan trong browser. |

Sau mỗi phase đã kiểm tra Git status; nhánh vẫn là `Nguyen`. Danh sách chính xác các file gốc bị sửa và file mới nằm trong `continuation_2026-11-14.verification.json`. Vì `data/` đã là untracked từ trước, `git diff` thông thường không hiển thị phần này; dùng danh sách baseline và bản sao gốc để phân biệt thay đổi mới.

## Kết quả khoa học được giữ đúng phạm vi

- Task A dự đoán/truy hồi **ngành đang học** từ 54 phản hồi Likert. Đây không phải độ chính xác tư vấn nghề nghiệp.
- Lựa chọn phân loại C2B là **LinearSVC**, dựa trên validation theo policy có sẵn. Không fit lại model này hoặc đánh giá lại test nghiên cứu.
- Model export là **centroid cosine F54, tau=10**, kế thừa lựa chọn full-data inner Group CV đã lưu. Chỉ tái tạo centroid fit đủ 1.000 mẫu để xuất JSON; không chạy lại toàn bộ CV hoặc chọn theo outer metrics.
- Hit@3 OOF của quy trình chọn bằng inner CV là **0,291**. Hit@3 của phương pháp centroid trong bảng so sánh là **0,299**. Ngưỡng **0,8 chưa đạt**; model full-data không có test độc lập mới.
- Task B RIASEC F6 vẫn **chờ codebook 54 câu được xác nhận**. Notebook profile chỉ mô tả centroid F54 trên train.
- Mapping 33→7 giữ nguyên **PROPOSED**; family mapping không được dùng để chấm điểm endpoint centroid.
- Synthetic ablation ghi **NOT_RUN_NO_APPROVED_SYNTHETIC_SOURCE**. Không sinh, nhân bản hoặc gán synthetic theo timestamp.
- Owner xác nhận REAL được ghi riêng; provenance độc lập vẫn **NOT_YET_INDEPENDENTLY_VERIFIED**.

## API và kiểm thử

`GET /api/ml/status` xác minh artifact và trả metadata/giới hạn đánh giá. `POST /api/ml/recommendations` nhận `feature_set=F54`, đúng 54 số nguyên 1–5 và `top_k` 1–33. Response trả Top-K theo cosine 0–100, versions và thông báo điểm tương đồng không phải xác suất thành công/trúng tuyển. Xếp hạng theo số đầy đủ trước khi làm tròn; hòa điểm dùng mã ngành.

Các trường hợp input sai, boolean/string/fractional answers, 60 câu, Top-K ngoài miền, JSON lỗi, payload trên 10 KB, artifact thiếu hoặc bị sửa đều đã được kiểm tra. API không lưu/ghi log câu trả lời; response không phản chiếu input và dùng `Cache-Control: no-store`. Form F54 chỉ đọc input của chính nó, render tên ngành bằng text và không nối với Holland-60.

Lệnh kiểm thử đã thực sự chạy:

```powershell
python -m unittest discover -s data/ml_pipeline/tests -v
npm test
python data/ml_pipeline/check_notebooks.py --execute --cwd root
```

Kết quả: **66/66 Python**, **16/16 Node**, **13/13 notebook**. Cả 13 notebook cũng đã chạy riêng từ thư mục notebooks trong các phase trước. Python syntax kiểm tra 25 file; `node --check` kiểm tra 6 file JavaScript thuộc phần thay đổi. Test HTTP khởi động server loopback tạm và đóng khi xong.

Windows sandbox yêu cầu quyền chạy kernel Jupyter và process con của Node. Một fixture file tạm bị chặn trong lần đầu; test hash đã chuyển sang thay đổi byte trong bộ nhớ, và thư mục fixture trống do lần test đó tạo đã được dọn, xác minh không còn. Không có test thất bại còn tồn đọng. Jupyter có warning runtime trên Windows; không có cell lỗi.

## Bảo toàn và phần còn chờ

Workbook, `.gitignore`, các báo cáo/manifest nghiên cứu cũ và mapping/policy thí nghiệm được đối chiếu SHA-256 với bản sao trước khi sửa: **18 file gốc không đổi**. Không có MongoDB connection/write, không sửa database ứng dụng, không thêm dependency Node, không tạo commit hoặc push.

Bản sao source trước khi sửa nằm ở thư mục tạm `labanai-before-continuation-sdgu_y24` của tài khoản local. Không sao chép workbook vào bản sao này; chỉ ghi hash của workbook. Các file gốc đang được nhóm phát triển đều có bản sao trước khi chỉnh.

Browser automation không có trong môi trường; website đã được kiểm tra qua HTTP/EJS và hành vi form bằng DOM mock, chưa xác nhận hiển thị trực quan hoặc tương tác browser thật. Cần codebook được xác nhận trước khi mở RIASEC F6; cần phê duyệt chuyên môn nếu muốn nâng mapping 7 nhóm khỏi PROPOSED. Chưa có nguồn synthetic để thực hiện ablation. Hiệu năng hiện tại chỉ phù hợp trình bày dưới dạng kết quả nghiên cứu, chưa đạt KPI đã khai báo.
