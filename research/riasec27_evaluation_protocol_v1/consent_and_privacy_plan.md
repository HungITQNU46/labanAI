# Kế hoạch Đạo đức Nghiên cứu, Bảo vệ Quyền Riêng tư & Quản trị Dữ liệu
## File: consent_and_privacy_plan.md — Module: research/riasec27_evaluation_protocol_v1/
## Phiên bản: 1.2.0 (Phase B-08-R2) — Trạng thái: EVALUATION_PROTOCOL_READY_FOR_ETHICS_PREPARATION

---

### I. KHUNG ĐẠO ĐỨC & BẢO VỆ ĐỐI TƯỢNG VỊ THÀNH NIÊN

Đối tượng nghiên cứu dự kiến là học sinh THPT (15–18 tuổi), là người chưa thành niên theo pháp luật Việt Nam. Đề cương này bắt buộc phải được thẩm định và phê duyệt chính thức bởi **Hội đồng Đạo đức Nghiên cứu Độc lập (Institutional Review Board - IRB / Research Ethics Committee)** trước khi có thể tuyển chọn bất kỳ người tham gia nào.

> [!CRITICAL]
> **Tuyên bố Trạng thái Đạo đức & Ranh giới Hoạt động:**
> 1. Tài liệu này là **HỒ SƠ KẾ HOẠCH DỰ KIẾN (PROPOSED PROTOCOL)** phục vụ chuẩn bị xin phê duyệt đạo đức; **CHƯA ĐƯỢC HỘI ĐỒNG ĐẠO ĐỨC THÔNG QUA**.
> 2. Dự án **TUYỆT ĐỐI CHƯA ĐƯỢC PHÉP** tuyển người tham gia, gửi phiếu khảo sát, hay thu thập bất kỳ dữ liệu người thật nào.
> 3. Hệ thống kỹ thuật **KHÔNG KÍCH HOẠT VÀ KHÔNG TẠO BẤT KỲ CHỨC NĂNG LƯU TRỮ DỮ LIỆU NGHIÊN CỨU NÀO** ở giai đoạn này.

#### 1. Quy trình Đồng thuận Hai cấp Dự kiến (Planned Dual-Consent Framework)
1. **Sự Đồng ý Có hiểu biết của Cha mẹ / Người giám hộ hợp pháp (Parental Informed Consent):**
   - Cung cấp văn bản giải thích rõ: mục đích khoa học phi thương mại, không chấm điểm học tập, không ảnh hưởng học bạ.
   - Cha mẹ ký phiếu chấp thuận văn bản hoặc chữ ký điện tử xác thực.
2. **Sự Tự nguyện Ứng thuận của Học sinh (Student Assent):**
   - Bản thông tin ngắn gọn, phù hợp lứa tuổi học sinh THPT:
     *"Đây là nghiên cứu thử nghiệm công cụ hướng nghiệp, không phải bài kiểm tra hay bài thi. Không có câu trả lời đúng hay sai. Em hoàn toàn có quyền từ chối tham gia hoặc dừng lại bất kỳ lúc nào mà không gặp bất kỳ bất lợi nào."*

---

### II. PHÂN ĐỊNH KHÁI NIỆM BẢO VỆ DỮ LIỆU & QUYỀN RIÊNG TƯ

Để đảm bảo tính chính xác về mặt pháp lý và an toàn thông tin, nghiên cứu phân biệt rõ các cấp độ dữ liệu:

```
+-----------------------------------------------------------------------------------+
|  1. ĐỊNH DANH TRỰC TIẾP (Direct Identifiers) — LOẠI TRỪ TUYỆT ĐỐI                |
|     - Họ và tên, số điện thoại, email, địa chỉ nhà, số CCCD, học bạ.              |
|     - Quy tắc: KHÔNG BAO GIỜ thu thập trong bảng hỏi khảo sát.                     |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|  2. ĐỊNH DANH GIÁN TIẾP (Quasi-Identifiers / Indirect Identifiers)                |
|     - Khối lớp, loại hình trường, vùng miền, giới tính, dấu thời gian phiên làm.  |
|     - Rủi ro: Việc kết hợp các biến này có thể làm lộ danh tính nếu mẫu quá nhỏ.  |
|     - Ranh giới: Việc dùng UUID KHÔNG TỰ ĐỘNG BẢO ĐẢM ẨN DANH HOÀN TOÀN.          |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|  3. DỮ LIỆU ĐÃ MÃ HÓA ĐỊNH DANH (Pseudonymized Dataset)                          |
|     - Dữ liệu khảo sát được gán mã ngẫu nhiên UUIDv4.                             |
|     - Khẳng định: Dữ liệu là PSEUDONYMIZED, KHÔNG PHẢI "hoàn toàn vô danh"        |
|       (Fully Anonymous) hay "Zero-PII".                                           |
+-----------------------------------------------------------------------------------+
```

---

### III. BẢO VỆ LIÊN KẾT TỐI THIỂU & CƠ CHẾ RÚT LUI (WITHDRAWAL MECHANISM)

Để đảm bảo quyền rút lui tự nguyện của người tham gia mà vẫn bảo vệ tính riêng tư:

1. **Cơ chế Mã Biên nhận Rút lui (Withdrawal Code):**
   - Khi hoàn thành đồng thuận, học sinh/phụ huynh được cấp một mã biên nhận rút lui ngẫu nhiên (ví dụ: `WDR-9X2A-7K4M`).
2. **Bảo vệ Liên kết Tối thiểu (Minimal Linkage Protection):**
   - Bảng ánh xạ duy nhất giữa `Withdrawal Code` và `participant_id` (UUIDv4) được mã hóa bằng khóa riêng (AES-256 / RSA-4096) và lưu trữ ngoại tuyến (air-gapped) trên thiết bị bảo mật chuyên dụng.
   - Chỉ duy nhất Chủ nhiệm Đề tài (Principal Investigator - PI) được cấp quyền giải mã khi có yêu cầu rút lui hợp lệ.
3. **Quy trình Thực hiện Rút lui:**
   - Người tham gia gửi mã `Withdrawal Code` đến ban nghiên cứu trước thời điểm chốt sổ dữ liệu.
   - Hệ thống định vị bản ghi theo UUIDv4 tương ứng, xóa vĩnh viễn bản ghi khỏi bộ dữ liệu phân tích và xóa mục tương ứng trong bảng ánh xạ.
4. **Hủy Khóa Liên kết (Irreversible De-identification):**
   - Sau thời hạn cho phép rút lui (thời điểm đóng băng dữ liệu để phân tích và công bố), bảng ánh xạ mã rút lui sẽ bị **tiêu hủy vĩnh viễn (Cryptographic Key Shredding)**.
   - Kể từ thời điểm này, bộ dữ liệu trở thành phi định danh hoàn toàn (Irreversibly De-identified) và không còn bất kỳ cơ chế kỹ thuật nào có thể truy vết ngược lại cá nhân người tham gia.

---

### IV. THỜI HẠN LƯU TRỮ VÀ CƠ SỞ XÁC MINH TRƯỚC KHI CHỐT

> [!NOTE]
> **Thời hạn Lưu trữ Đề xuất: `PROPOSED_RETENTION_PERIOD` (Dự kiến 3 năm)**  
> Thời hạn này là **đề xuất dự kiến**, CHƯA ĐƯỢC PHÊ DUYỆT CHÍNH THỨC.

#### Các cơ sở pháp lý và học thuật bắt buộc phải xác minh trước khi chốt thời hạn:
1. **Quy định Pháp lý Việt Nam:** Tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân (đặc biệt là Điều 20 về xử lý dữ liệu cá nhân của trẻ em).
2. **Quy chế của Hội đồng Đạo đức (IRB):** Yêu cầu cụ thể của Hội đồng Đạo đức tại cơ quan chủ quản hoặc trường đại học bảo trợ về thời gian lưu trữ dữ liệu thô phục vụ kiểm chứng khoa học.
3. **Thỏa thuận Hợp tác Nghiên cứu:** Cam kết bảo mật đã thống nhất với các trường THPT đối tác tham gia khảo sát.

#### Quy trình Tiêu hủy An toàn:
Khi hết thời hạn lưu trữ đã được phê duyệt, toàn bộ dữ liệu nghiên cứu sẽ được tiêu hủy bằng quy trình **xóa bảo mật đa lớp (Multi-pass Secure Overwrite) và tiêu hủy khóa mã hóa (Key Shredding)**, đảm bảo không thể khôi phục bằng bất kỳ công cụ phần mềm hay phần cứng nào.
