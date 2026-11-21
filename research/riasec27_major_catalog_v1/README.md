# LabanAI — Research Major Catalog v1 (`riasec27_major_catalog_v1`)
## Báo cáo Kiểm toán và Đính chính Giai đoạn B-04-R1 (Nhánh `Nguyen`)

---

## 1. Mục tiêu và Phạm vi Giai đoạn B-04-R1

Giai đoạn B-04-R1 là đợt đối soát tập trung, dứt điểm nhằm:
1. **Đối soát toàn diện mã O\*NET SOC và vector OI** giữa baseline `reference.json`, `majors_registry.json` và cơ sở dữ liệu chính thức O\*NET 30.2 (cập nhật 02/2026).
2. **Khắc phục triệt để các sai sót narrative của B-04:**
   - Đưa tất cả các mã nghề đề xuất mới (`19-3011.00`, `27-3043.05`, `19-1011.00`, `19-1031.02`, `21-1029.00`, `19-3094.00`, `25-1123.00`) vào trường cách ly `proposed_mappings` với trạng thái `PENDING_REVIEW`.
   - Bảo toàn 100% mã SOC và vector OI nguyên thủy của baseline `reference.json` cho 21 ngành READY.
   - Giải trình rõ nguồn gốc của các vector bị ghi nhầm trong narrative B-04 (như vector của `25-1123.00` bị dán nhầm sang `27-3091.00`).
3. **Kiểm toán trung thực 33 nguồn chương trình đào tạo đại học:**
   - Rà soát tình trạng kết nối HTTP thực tế qua mạng công cộng.
   - Chuyển trạng thái sang `ACCESSIBLE_BUT_INSUFFICIENT` cho các trang chủ cơ sở đào tạo; xóa bỏ hoàn toàn trạng thái mô phỏng `VERIFIED_OFFICIAL_DIRECT`.
4. **Loại bỏ trọng số Composite vô căn cứ:**
   - Xóa bỏ các tỷ trọng số học (40/35/25, 50/50) khỏi cấu hình tính toán.
   - Chuyển mô hình tổ hợp nghề sang trạng thái `UNVALIDATED_DESIGN_HYPOTHESIS`.
5. **Đính chính thiết kế Tier 2:**
   - Khóa hoàn toàn Cơ chế B (Hệ thống tự động chèn cụm vào Top-3). Tier 1 chỉ chấm điểm 21 ngành READY.
   - Cơ chế A (Người dùng chủ động khám phá cụm) chỉ đóng vai trò cẩm nang so sánh định tính.
   - Hiệu chỉnh câu hỏi phù hợp với học sinh phổ thông/THCS (đo lường sở thích khám phá học tập, không giả định học bạ THPT hay kỹ năng nghề nghiệp).
6. **Xác minh số học P3 từng hồ sơ:**
   - Khẳng định 309 hồ sơ chuyển từ `TIED_BOUNDARY` sang `ABSTAIN_FLAT_PROFILE` là chính xác tuyệt đối trên từng dòng mẫu.
   - Đính chính định nghĩa Flat Profile Guard dựa trên 6 trung bình RIASEC của dữ liệu đầu vào bằng nhau (`u_var < 1e-12`), không phải trên xác suất mô hình ML.

---

## 2. Kết quả Đối soát Chi tiết O\*NET 30.2 cho 33 Ngành

Kiểm toán tải trực tiếp từ O\*NET 30.2 Database (`Interests.txt` và `Occupation Data.txt`, 1.016 mã SOC) cho thấy:
- **21 Ngành READY:** Giữ nguyên 100% mã SOC và vector OI từ `reference.json`.
- **Kinh tế (`kinh_te`):** Baseline dùng `13-1161.00` (Market Research Analysts, OI: `[1.08, 4.60, 2.56, 2.47, 5.52, 4.62]`). Mã `19-3011.00` (Economists, OI: `[1.35, 7.00, 2.43, 2.40, 3.93, 4.53]`) được lưu tại `proposed_mappings` (`PENDING_REVIEW`).
- **Văn học (`van_hoc`):** Baseline dùng `27-3041.00` (Editors, OI: `[1.03, 2.90, 5.39, 2.56, 4.13, 4.68]`). Sửa tiêu đề tiếng Anh chính thức là `Editors`. Mã `27-3043.05` (Poets, Lyricists and Creative Writers, OI: `[1.17, 3.58, 7.00, 2.83, 3.17, 2.88]`) được lưu tại `proposed_mappings` (`PENDING_REVIEW`).
- **Nông học (`nong_hoc`):** Baseline dùng `19-1013.00` (Soil and Plant Scientists, OI: `[6.43, 6.71, 2.11, 1.67, 1.71, 3.41]`). Mã `19-1011.00` (Animal Scientists) được lưu tại `proposed_mappings` (`PENDING_REVIEW`).
- **Quản lý đất đai (`quan_ly_dat_dai`):** Baseline dùng `17-1022.00` (Surveyors, OI: `[5.25, 4.73, 2.12, 1.63, 1.88, 5.29]`). Mã `19-1031.02` (Range Managers) được lưu tại `proposed_mappings` (`PENDING_REVIEW`).
- **Công tác xã hội (`cong_tac_xa_hoi`):** Baseline dùng `21-1021.00` (Child, Family, and School Social Workers, OI: `[1.70, 3.32, 2.90, 6.85, 2.94, 3.57]`). Mã `21-1029.00` (Social Workers, All Other) không có vector OI riêng trong O\*NET 30.2, được lưu tại `proposed_mappings` (`PENDING_REVIEW`).
- **Việt Nam học (`viet_nam_hoc`):** Baseline dùng `39-7011.00` với vector lịch sử `[2.63, 2.47, 4.39, 4.19, 5.64, 2.80]`. Trong O\*NET 30.2, mã này có vector chính thức là `[3.33, 2.40, 3.46, 5.35, 3.64, 2.85]`. Ngành này đang ở trạng thái `CONDITIONAL` (`automatic_ranking_eligibility: false`) nên không ảnh hưởng đến prototype xếp hạng.

---

## 3. Kết quả Kiểm toán Nguồn Chương trình Đào tạo

| Nhóm Trạng Thái | Số Lượng | Đánh Giá Kỹ Thuật |
| :--- | :---: | :--- |
| **`ACCESSIBLE_BUT_INSUFFICIENT`** | **32** | URL là trang chủ chính thức của trường đại học, kết nối HTTP 200 thành công. Tuy nhiên đây chỉ là trang cấp cơ sở đào tạo, chưa có văn bản Quyết định ban hành CTĐT hoặc đề cương chi tiết được thẩm định độc lập. |
| **`NOT_ACCESSIBLE`** | **1** | Ngành `quan_ly_nha_nuoc` (URL `https://napa.vn` không phân giải được DNS qua mạng công cộng, cần cập nhật tên miền mới). |
| **`VERIFIED_OFFICIAL_DIRECT`** | **0** | Tuyệt đối không mô phỏng hay tự gắn nhãn VERIFIED khi chưa tải và kiểm toán văn bản đề cương gốc. |

---

## 4. Xác minh Từng Hồ sơ Phương pháp P3 (N = 3.963)

| Trạng thái | P3 Raw (Trước Guard) | P3 Guarded (Sau Guard) | Biến động Dòng mẫu |
| :--- | :---: | :---: | :--- |
| **`SUCCESS`** | **751** | **751** | Giữ nguyên 100% (751 mẫu không đổi). |
| **`TIED_BOUNDARY`** | **3.212** | **2.903** | Giảm đúng 309 mẫu. |
| **`ABSTAIN_FLAT_PROFILE`** | **0** | **309** | Tăng đúng 309 mẫu. |
| **TỔNG CỘNG** | **3.963** | **3.963** | Toàn bộ 309 mẫu hồ sơ phẳng chuyển từ `TIED` sang `ABSTAIN`. |

---

## 5. Ba Cổng Nghiệm thu Giai đoạn B-04-R1

1. **`CATALOG_STRUCTURE_GATE`**: **`PASS`**
   - Đủ chính xác 33 major_id, 21 READY, 10 CONDITIONAL, 2 UNRESOLVED.
   - Toàn bộ 33 ngành hiển thị minh bạch (`catalog_visibility: true`), chỉ 21 ngành READY được xếp hạng tự động.
2. **`EVIDENCE_GATE`**: **`PARTIAL`**
   - 32 trường đại học có trang chủ truy cập được, nhưng chưa có tài liệu CTĐT trực tiếp cấp môn học/chuẩn đầu ra.
   - Được phép tiếp tục ở phạm vi nghiên cứu danh mục và 21 ngành READY của baseline.
3. **`TIER2_DESIGN_GATE`**: **`READY_FOR_RESEARCH_PROTOTYPE`**
   - Đã loại bỏ trọng số giả, khóa cơ chế tự động gợi ý cụm (Cơ chế B).
   - Cơ chế A sẵn sàng cho thử nghiệm cẩm nang so sánh định tính dành cho học sinh phổ thông.
