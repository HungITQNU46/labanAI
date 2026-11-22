# B-11 — Giải thích Top-3 trên preview nội bộ

TOP3_EXPLANATION_LOCAL_READY

RESEARCH_ONLY — TOP3_NOT_VALIDATED

Phạm vi: tái lập 21 trường hợp P2 đổi cả Top-3 trong B-10 và bổ sung giải thích
quy trình/thứ hạng trên `/evaluation/riasec27-preview`. Không fit, hiệu chuẩn,
đổi normalization/Pearson hoặc dùng Test 947. Không đánh giá Accuracy ngành.

## Đối soát offline

`analyze_cases.py` đọc đầy đủ manifest/kết quả B-10, chọn đúng 21 cặp không giao
Top-3, rồi gọi P0/P2 gốc cho hai phía. 84 lời gọi ranker mỗi lượt đối soát đều
khớp chính xác đầu ra B-10: trạng thái, sáu trung bình, sáu xác suất, sáu z-score,
Top-3 và toàn bộ 21 thứ hạng/điểm. Không viết lại thuật toán xếp hạng.

`case_audit.json` giữ số đầy đủ; `case_report.md` trình bày từng cặp, 27 đáp án
theo mã, giá trị đổi, sáu chiều trước/sau, thứ hạng/r, ngành ra/vào và bằng chứng
leaf/margin từ artifact. Các phép predict bổ sung chỉ phục vụ đối soát offline.
Không gọi chúng từ website, bridge, controller hoặc service.

18 cặp thuộc nhóm ngẫu nhiên, 3 cặp gần cân bằng. Có 8 cặp không đổi bất kỳ lớp
nhị phân nào; `random_122:R1` không đổi leaf của cả ba XGBoost. Không thể quy
toàn bộ biến động cho ranh giới lớp hoặc riêng XGBoost. Δz=Δp/σ đã được kiểm tra
với cấu hình cố định. Gap Pearson hạng 3/4 được báo số thực tế, không đặt ngưỡng
đạt/không đạt tính ổn định. Đây là giải thích toán học và hành vi suy luận, không
phải giải thích nhân quả về tâm lý hoặc năng lực học sinh.

## Thay đổi preview

- EJS thêm phần “LabanAI tạo gợi ý như thế nào?” trong panel kết quả, gồm quy
  trình 27 câu → sáu Q5 → xử lý đã khóa → Pearson → Top-3 trong 21/33 ngành.
- Mỗi thẻ ngành có “Vì sao ngành này xuất hiện trong Top-3?” từ hạng và r thật.
  Giữ native rank khi đồng hạng; nếu thiếu dữ liệu hiển thị N/A.
- Pearson là số thập phân, không phải phần trăm phù hợp. Không hiển thị xác suất
  Q5 dưới nhãn phù hợp ngành hoặc xác suất thành công.
- ABSTAIN không quy lỗi cho học sinh; TIED không phá hòa; cả hai không tạo Top-3
  thay thế. Lỗi dùng thông báo cố định, không phản chiếu chẩn đoán backend.
- Banner preview xuống dòng ở màn hình nhỏ, không đổi stylesheet chung.
- Không thêm fetch, lưu trữ, log đáp án hoặc perturb trực tuyến. Server, gate,
  controller, bridge, service, bảng câu hỏi và Tier 2 thực thi không thay đổi.

Hai chỗ Cosine được sửa thành Pearson tại README và module docstring của Tier 2.
Code thực thi `research_flow.py` được đối chiếu AST bỏ docstring để xác nhận không
đổi. Báo cáo B-10 giữ nguyên như lịch sử; không chạy lại script ghi đè B-10.

## Kiểm chứng

Python 3.14.7 hiện có, Node.js v24.21.0, Chrome headless/CDP có sẵn; không cài gói.

```powershell
$env:PYTHONIOENCODING='utf-8'
$env:ML_PYTHON='C:\Users\DELL\AppData\Local\Programs\Python\Python314\python.exe'
py -3.14 -B research/riasec27_top3_explanation_b11/analyze_cases.py
py -3.14 -B -m unittest discover -s research/riasec27_top3_explanation_b11 -p test_b11.py -v
node --require ./research/riasec27_top3_explanation_b11/safe_test_bootstrap.cjs --test tests/riasec27.test.js tests/ml.test.js
node --require ./research/riasec27_top3_explanation_b11/safe_test_bootstrap.cjs --test --test-isolation=none research/riasec27_top3_explanation_b11/preview.test.cjs
node --require ./research/riasec27_top3_explanation_b11/safe_test_bootstrap.cjs tests/riasec27-browser.cjs
node research/riasec27_top3_explanation_b11/browser.cjs
```

Đã chạy 87 research tests + 20 B-10 tests + 6 B-11 Python tests: 113 PASS.
Node: 81 tests hiện có (50 F54/Holland, 31 RIASEC27) và 10 B-11 tests PASS.
Browser RIASEC27 cũ A–M PASS; browser B-11 có 13 kiểm tra PASS tại desktop 1440px
và mobile 375px/320px. Hai lần gửi hồ sơ trước/sau và một hồ sơ phẳng tạo đúng
3 worker evaluate; mở giải thích không thêm ML. TIED và lỗi được mô phỏng qua
phản hồi mạng vào renderer thật, không tự chèn HTML để giả lập kết quả.

Windows sandbox ban đầu chặn Node child-process bằng EPERM. Kiểm thử cần subprocess
được chạy ngoài sandbox sau khi được phép, vẫn chỉ dùng server loopback. Preload
`safe_test_bootstrap.cjs` vô hiệu hóa dotenv.config trong tiến trình test, ngăn
server.js đọc .env; không đổi cấu hình runtime. Profile Chrome tạm thời được dọn
sau khi kiểm tra đường dẫn thuộc thư mục tạm của lượt chạy.

Các kiểm tra không chứng nhận khả năng dự đoán ngành trên người thật. READY chỉ
áp dụng cho giải thích trên preview nội bộ; chưa cho phép công khai/production.
