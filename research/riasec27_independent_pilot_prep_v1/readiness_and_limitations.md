# ĐIỀU KIỆN TIÊN QUYẾT VÀ GIỚI HẠN TRƯỚC KHI KHẢO SÁT HỌC SINH THỰC TẾ

Tài liệu này xác lập danh mục các điều kiện pháp lý, đạo đức và phương pháp luận **bắt buộc phải được Chủ dự án và các cấp thẩm quyền phê duyệt chính thức** trước khi có thể áp dụng quy trình pilot B-13 trên đối tượng học sinh THPT.

> [!CAUTION]
> **Tuyên bố trạng thái**:
> Nhóm nghiên cứu kỹ thuật **TUYỆT ĐỐI KHÔNG TỰ XÁC NHẬN** bất kỳ điều kiện nào dưới đây là đã đạt được. Toàn bộ các mục dưới đây đang ở trạng thái **CHỜ XEM XÉT VÀ PHÊ DUYỆT (PENDING APPROVAL)**.

---

## 1. PHÂN BIỆT RÕ RANH GIỚI 3 TRẠNG THÁI HIỆN TẠI

1. **ĐÃ CÓ (AS-IS)**:
   - Công cụ offline B-12 ([research/riasec27_top3_validation_v1/](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_top3_validation_v1)) được lập trình và khóa cứng chỉ để kiểm thử thuật toán và luồng xử lý bằng dữ liệu giả lập (`data_kind: SYNTHETIC_DEMO_ONLY — NOT_SCIENTIFIC_VALIDATION`).
   - Cổng bảo vệ trong `validate_input.py` và `evaluate_top3.py` từ chối mọi tệp dữ liệu không mang nhãn synthetic.
2. **MỚI LÀ ĐỀ XUẤT (PROPOSED)**:
   - Toàn bộ quy trình 6 bước, cơ chế khóa bản ghi, mẫu hướng dẫn chấm nhãn và bảng kiểm vận hành trong B-13 **chỉ là đề xuất phương pháp luận và tài liệu chuẩn bị**.
   - Khi nghiên cứu pilot được cấp phép chính thức, sẽ có công cụ đánh giá độc lập có thẩm quyền dành cho nghiên cứu thực tế.
3. **CHƯA ĐƯỢC PHÉP (NOT PERMITTED)**:
   - Tuyệt đối **chưa được phép thu thập hay xử lý dữ liệu học sinh thật** dưới bất kỳ hình thức nào.
   - **Nghiêm cấm hành vi đưa dữ liệu học sinh thật vào công cụ B-12** hoặc **gắn nhãn giả mạo "SYNTHETIC_DEMO_ONLY"** cho dữ liệu thật để vượt qua cổng kiểm định của B-12.

---

## 2. DANH MỤC 7 ĐIỀU KIỆN TIÊN QUYẾT BẮT BUỘC CẦN PHÊ DUYỆT

| STT | Điều kiện tiên quyết | Nội dung yêu cầu cụ thể | Trạng thái hiện tại | Thẩm quyền phê duyệt |
|:---:|:---|:---|:---:|:---:|
| **1** | **Phù hợp ngôn ngữ và sư phạm** | Nội dung 27 câu hỏi RIASEC và 21 bản mô tả ngành B-09 được hội đồng chuyên gia giáo dục xem xét, bảo đảm học sinh THPT đọc hiểu đúng mà không bị định kiến hay thiên lệch. | **CHƯA ĐẠT (PENDING)** | Hội đồng Sư phạm / Chuyên gia GD |
| **2** | **Bảo vệ người chưa thành niên** | Xây dựng hoàn chỉnh biểu mẫu giải thích nghiên cứu (Assent form) cho học sinh và mẫu đồng thuận có chữ ký của cha mẹ / người giám hộ hợp pháp (Consent form) theo Luật Trẻ em và quy định bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP). | **CHƯA ĐẠT (PENDING)** | Bộ phận Pháp chế & Đạo đức |
| **3** | **Phương án quản trị và rút lui dữ liệu** | Có quy chế lưu trữ máy chủ an toàn, cơ chế cho phép người học rút lui khỏi nghiên cứu bất kỳ lúc nào và quy trình xóa hoàn toàn dữ liệu theo yêu cầu mà không để lại di chứng. | **CHƯA ĐẠT (PENDING)** | Quản trị Dữ liệu & Chủ dự án |
| **4** | **Nhân sự chịu trách nhiệm nghiên cứu** | Bổ nhiệm chính thức Chủ nhiệm đề tài (Principal Investigator - PI) chịu trách nhiệm pháp lý và đạo đức cao nhất đối với toàn bộ quá trình thu thập và công bố dữ liệu. | **CHƯA ĐẠT (PENDING)** | Ban Giám đốc / Chủ dự án |
| **5** | **Phê duyệt Hội đồng Đạo đức (IRB)** | Đề cương nghiên cứu đầy đủ (từ B-08/B-09/B-12/B-13) được thẩm định và cấp mã phê duyệt bởi Hội đồng Đạo đức trong nghiên cứu y sinh học / khoa học xã hội có thẩm quyền. | **CHƯA ĐẠT (PENDING)** | Hội đồng Đạo đức Nghiên cứu |
| **6** | **Kế hoạch thống kê và xử lý khuyết nhãn** | Quyết định chính thức về cỡ mẫu nghiên cứu (Power calculation) và đăng ký trước (pre-registered plan) phương án phân tích dữ liệu khuyết thiếu (quy tắc xử lý khi học sinh chọn "Chưa biết đủ thông tin"). | **CHƯA ĐẠT (PENDING)** | Nhà Thống kê học / Trưởng nhóm ML |
| **7** | **Thử nghiệm khả năng đọc hiểu (Cognitive Pre-testing)** | Phỏng vấn thử nghiệm nhận thức (Cognitive debriefing) trên một nhóm nhỏ 5–10 học sinh để kiểm tra xem các em có hiểu rõ 21 bản mô tả mà không cảm thấy áp lực hay phân vân giữa các mức điểm hay không. | **CHƯA ĐẠT (PENDING)** | Nhóm Nghiên cứu Giáo dục |

---

## 3. GIỚI HẠN KHOA HỌC HIỆN TẠI CỦA LABANAI

Cho đến khi toàn bộ 7 điều kiện trên được phê duyệt chính thức:
1. **Hệ thống tiếp tục duy trì trạng thái**:
   ```text
   RESEARCH_ONLY — TOP3_NOT_VALIDATED
   ```
2. **Không có bất kỳ kết luận nào về tính ưu việt của P2 so với P0**:
   - Mọi so sánh số học trên dữ liệu giả lập B-12 chỉ nhằm mục đích kiểm tra luồng tính toán phần mềm (`SYNTHETIC_DEMO_ONLY`).
   - Bất kỳ tuyên bố nào cho rằng mô hình ML Q5 hay bộ xếp hạng P2 chính xác hơn phương pháp truyền thống P0 tại thời điểm này đều là thiếu căn cứ khoa học và vi phạm quy chuẩn nghiên cứu.
3. **Phạm vi áp dụng của 21 bản mô tả**:
   - 21 bản mô tả ngành từ B-09 chỉ đóng vai trò là tài liệu bản thảo tham khảo (DRAFT). Chúng chưa được kiểm định hay phê duyệt làm tài liệu hướng nghiệp chính thức của bất kỳ cơ quan quản lý giáo dục nào.
