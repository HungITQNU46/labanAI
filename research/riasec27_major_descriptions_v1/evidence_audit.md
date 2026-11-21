# BÁO CÁO KIỂM TOÁN BẰNG CHỨNG CHƯƠNG TRÌNH ĐÀO TẠO ĐẠI HỌC (PHASE B-09)

## I. MỤC TIÊU VÀ NGUYÊN TẮC KIỂM TOÁN

Báo cáo kiểm toán này được thực hiện trong khuôn khổ **Giai đoạn B-09: Xây dựng bộ mô tả trung lập cho 21 ngành từ nguồn chương trình đào tạo chính thức**.

Mục tiêu cốt lõi:
1. Thu thập, xác minh và đối soát bằng chứng chương trình đào tạo (CTĐT) hoặc chuẩn đầu ra trực tiếp từ các cơ sở giáo dục đại học chính quy tại Việt Nam cho đúng **21 ngành `READY_FOR_PROTOTYPE`**.
2. Bảo đảm tính trung lập sư phạm, khách quan và loại bỏ hoàn toàn các yếu tố tiếp thị tuyển sinh, khẳng định phù hợp cá nhân chủ quan hoặc dự báo thu nhập.
3. Tạo lập căn cứ học thuật vững chắc phục vụ hồ sơ thẩm định chuyên gia giáo dục trước khi có thể sử dụng làm tài liệu giới thiệu trong các nghiên cứu thực nghiệm tiếp theo.

### Nguyên tắc kiểm toán bắt buộc:
- **Nguồn chính thống**: Chỉ chấp nhận nguồn tài liệu từ các cơ sở giáo dục đại học Việt Nam hoạt động hợp pháp dưới tên miền `.edu.vn` hoặc cơ quan nhà nước `.gov.vn`.
- **Bậc đào tạo đại học chính quy**: Bắt buộc là trình độ đại học (Cử nhân / Kỹ sư). Loại trừ tuyệt đối các chương trình sau đại học (Thạc sĩ, Tiến sĩ), cao đẳng hoặc chứng chỉ ngắn hạn.
- **Xác thực kết nối an toàn (TLS/SSL)**: Toàn bộ liên kết bằng chứng được kiểm tra tính hợp lệ về chứng chỉ SSL; không sử dụng các nguồn bị lỗi kết nối hoặc vi phạm cảnh báo bảo mật.
- **Minh bạch cấp độ xác minh**:
  - `VERIFIED_OFFICIAL_DIRECT`: Khung chương trình đào tạo chi tiết được ban hành chính thức, liệt kê đầy đủ danh mục học phần, khối kiến thức và phân bổ tín chỉ (14/21 ngành).
  - `VERIFIED_OFFICIAL_SUMMARY`: Bản mô tả tóm tắt mục tiêu, chuẩn đầu ra và cấu trúc học phần chính quy công bố trên cổng đào tạo/tuyển sinh chính thức của trường (7/21 ngành).
  - `INSUFFICIENT_EVIDENCE`: 0/21 ngành.

---

## II. MA TRẬN KIỂM TOÁN 21 NGÀNH `READY_FOR_PROTOTYPE`

| STT | Mã nội bộ (`major_id`) | Tên ngành tiếng Việt | Mã GD&ĐT | Cơ sở đào tạo trích dẫn | Trình độ đào tạo | Năm CTĐT | Cấp độ xác minh | URL tham chiếu |
|:---:|:---|:---|:---:|:---|:---|:---:|:---:|:---|
| 1 | `giao_duc_tieu_hoc` | Giáo dục Tiểu học | 7140202 | ĐH Sư phạm Hà Nội (HNUE) | Cử nhân (Đại học) | 2019-2023 | DIRECT | `https://tuyensinh.hnue.edu.vn/khungchuongtrinh/354` |
| 2 | `giao_duc_mam_non` | Giáo dục Mầm non | 7140201 | ĐH Sư phạm Hà Nội (HNUE) | Cử nhân (Đại học) | 2019-2023 | DIRECT | `https://tuyensinh.hnue.edu.vn/khungchuongtrinh/352` |
| 3 | `quan_ly_giao_duc` | Quản lý giáo dục | 7140114 | ĐH Sư phạm Hà Nội (HNUE) | Cử nhân (Đại học) | 2021-2025 | DIRECT | `https://tuyensinh.hnue.edu.vn/khungchuongtrinh/357` |
| 4 | `tam_ly_hoc_giao_duc` | Tâm lý học giáo dục | 7310403 | ĐH Sư phạm Hà Nội (HNUE) | Cử nhân (Đại học) | 2019-2023 | DIRECT | `https://tuyensinh.hnue.edu.vn/khungchuongtrinh/339` |
| 5 | `ky_thuat_phan_mem` | Kỹ thuật phần mềm | 7480103 | ĐH CNTT - ĐHQG-HCM (UIT) | Kỹ sư / Cử nhân | 2024 | SUMMARY | `https://tuyensinh.uit.edu.vn/ky-thuat-phan-mem` |
| 6 | `kinh_te` | Kinh tế | 7310101 | ĐH Kinh tế Quốc dân (NEU) | Cử nhân (Đại học) | 2018-2022 | DIRECT | `https://courses.neu.edu.vn/curriculum/kinh-te-k60-K60.7310101` |
| 7 | `quan_tri_kinh_doanh` | Quản trị kinh doanh | 7340101 | ĐH Kinh tế Quốc dân (NEU) | Cử nhân (Đại học) | 2018-2022 | DIRECT | `https://courses.neu.edu.vn/curriculum/quan-tri-kinh-doanh-k60-K60.7340101` |
| 8 | `ke_toan` | Kế toán | 7340301 | ĐH Kinh tế Quốc dân (NEU) | Cử nhân (Đại học) | 2018-2022 | DIRECT | `https://courses.neu.edu.vn/curriculum/ke-toan-k60-K60.7340301` |
| 9 | `tai_chinh_ngan_hang` | Tài chính - Ngân hàng | 7340201 | ĐH Kinh tế Quốc dân (NEU) | Cử nhân (Đại học) | 2018-2022 | DIRECT | `https://courses.neu.edu.vn/curriculum/tai-chinh-ngan-hang-k60-K60.7340201` |
| 10 | `quan_tri_khach_san` | Quản trị khách sạn | 7810201 | ĐH Kinh tế Quốc dân (NEU) | Cử nhân (Đại học) | 2018-2022 | DIRECT | `https://courses.neu.edu.vn/curriculum/quan-tri-khach-san-k60-K60.7810201` |
| 11 | `ngon_ngu_anh` | Ngôn ngữ Anh | 7220201 | ĐH Sư phạm Hà Nội (HNUE) | Cử nhân (Đại học) | 2019-2023 | DIRECT | `https://tuyensinh.hnue.edu.vn/khungchuongtrinh/347` |
| 12 | `van_hoc` | Văn học | 7229030 | ĐH Sư phạm Hà Nội (HNUE) | Cử nhân (Đại học) | 2019-2023 | DIRECT | `https://tuyensinh.hnue.edu.vn/khungchuongtrinh/334` |
| 13 | `luat` | Luật | 7380101 | ĐH Luật - ĐHQGHN (VNU-UL) | Cử nhân (Đại học) | 2024 | SUMMARY | `https://law.vnu.edu.vn/academics/nganh-luat/` |
| 14 | `cong_nghe_ky_thuat_xay_dung` | Công nghệ kỹ thuật xây dựng | 7510103 | ĐH Xây dựng Hà Nội (HUCE) | Kỹ sư / Cử nhân | 2024 | SUMMARY | `https://tuyensinh.huce.edu.vn/nganh-cong-nghe-ky-thuat-xay-dung` |
| 15 | `ky_thuat_dien_tu_vien_thong` | Kỹ thuật điện tử - viễn thông | 7520207 | ĐH Bách khoa Hà Nội (HUST) | Kỹ sư / Cử nhân | 2024 | SUMMARY | `https://seee.hust.edu.vn/vi/dao-tao/et1/` |
| 16 | `ky_thuat_dien` | Kỹ thuật điện | 7520201 | ĐH Bách khoa Hà Nội (HUST) | Kỹ sư / Cử nhân | 2024 | SUMMARY | `https://seee.hust.edu.vn/vi/dao-tao/ee1/` |
| 17 | `cong_nghe_ky_thuat_hoa_hoc` | Công nghệ kỹ thuật hóa học | 7510401 | ĐH KHTN - ĐHQGHN (VNU-HUS) | Cử nhân (Đại học) | 2024 | SUMMARY | `https://tuyensinh.hus.vnu.edu.vn/dai-hoc/nganh-hoc/hoa-hoc-va-cong-nghe/cong-nghe-ky-thuat-hoa-hoc` |
| 18 | `toan_hoc` | Toán học | 7460101 | ĐH KHTN - ĐHQGHN (VNU-HUS) | Cử nhân (Đại học) | 2024 | SUMMARY | `https://tuyensinh.hus.vnu.edu.vn/dai-hoc/nganh-hoc/toan-toan-ung-dung-va-tin-hoc/toan-hoc` |
| 19 | `nong_hoc` | Nông học | 7620109 | Học viện Nông nghiệp VN (VNUA) | Kỹ sư (Đại học) | 2023-2027 | DIRECT | `https://file.vnua.edu.vn/data/26/documents/2024/01/26/btvnonghoc/danh-muc-nong-hoc-k68-final.pdf` |
| 20 | `quan_ly_dat_dai` | Quản lý đất đai | 7850103 | ĐH Kinh tế Quốc dân (NEU) | Cử nhân (Đại học) | 2018-2022 | DIRECT | `https://courses.neu.edu.vn/curriculum/quan-ly-dat-dai-k60-K60.7850103` |
| 21 | `cong_tac_xa_hoi` | Công tác xã hội | 7760101 | ĐH Sư phạm Hà Nội (HNUE) | Cử nhân (Đại học) | 2019-2023 | DIRECT | `https://tuyensinh.hnue.edu.vn/khungchuongtrinh/358` |

---

## III. CHI TIẾT BẰNG CHỨNG VÀ HỌC PHẦN CỐT LÕI TỪNG NGÀNH

### 1. Giáo dục Tiểu học (`giao_duc_tieu_hoc` - 7140202)
- **Nguồn trích dẫn**: Trường Đại học Sư phạm Hà Nội (HNUE) — Khung CTĐT K69 (ID 354).
- **Học phần cốt lõi trích xuất**: Tâm lý học tiểu học, Giáo dục học tiểu học, Rèn luyện nghiệp vụ sư phạm, Phương pháp dạy học Tiếng Việt ở tiểu học, Phương pháp dạy học Toán ở tiểu học, Phương pháp dạy học Tự nhiên và Xã hội.
- **Giới hạn phạm vi**: CTĐT đào tạo giáo viên tiểu học chuẩn mực của HNUE; các trường sư phạm địa phương có thể có phân bổ môn tự chọn vùng miền khác nhau.

### 2. Giáo dục Mầm non (`giao_duc_mam_non` - 7140201)
- **Nguồn trích dẫn**: Trường Đại học Sư phạm Hà Nội (HNUE) — Khung CTĐT K69 (ID 352).
- **Học phần cốt lõi trích xuất**: Tâm lý học phát triển trẻ em mầm non, Vệ sinh phòng bệnh và dinh dưỡng trẻ em, Tổ chức hoạt động vui chơi, Phương pháp hình thành biểu tượng toán, Phương pháp phát triển ngôn ngữ, Rèn luyện kỹ năng kể chuyện, âm nhạc và tạo hình.
- **Giới hạn phạm vi**: Định hướng chuyên biệt cho độ tuổi 0-6 tuổi; tỷ trọng học phần nghệ thuật mầm non có thể thay đổi tùy điều kiện từng trường đào tạo.

### 3. Quản lý giáo dục (`quan_ly_giao_duc` - 7140114)
- **Nguồn trích dẫn**: Trường Đại học Sư phạm Hà Nội (HNUE) — Khung CTĐT K71 (ID 357).
- **Học phần cốt lõi trích xuất**: Quản trị nhà trường, Quản lý tài chính và cơ sở vật chất trường học, Quản lý nhân sự giáo dục, Kiểm định chất lượng và đánh giá giáo dục, Chính sách và pháp luật giáo dục, Lập kế hoạch và dự án phát triển giáo dục.
- **Giới hạn phạm vi**: Chuyên về quản lý hành chính và điều hành tổ chức giáo dục; không đào tạo kỹ năng giảng dạy bộ môn cụ thể.

### 4. Tâm lý học giáo dục (`tam_ly_hoc_giao_duc` - 7310403)
- **Nguồn trích dẫn**: Trường Đại học Sư phạm Hà Nội (HNUE) — Khung CTĐT K69 (ID 339).
- **Học phần cốt lõi trích xuất**: Tâm lý học đại cương, Tâm lý học lứa tuổi và sư phạm, Tham vấn tâm lý học đường, Đánh giá và chẩn đoán tâm lý trẻ em và học sinh, Can thiệp khó khăn tâm lý trong học đường, Kỹ năng tham vấn và trị liệu hành vi cơ bản.
- **Giới hạn phạm vi**: Trọng tâm là tâm lý học đường; không thay thế chương trình đào tạo bác sĩ tâm thần hoặc trị liệu lâm sàng bệnh viện.

### 5. Kỹ thuật phần mềm (`ky_thuat_phan_mem` - 7480103)
- **Nguồn trích dẫn**: Trường Đại học Công nghệ Thông tin - ĐHQG-HCM (UIT).
- **Học phần cốt lõi trích xuất**: Quy trình phát triển phần mềm (Agile/Scrum), Cấu trúc dữ liệu & Giải thuật, Kiến trúc và thiết kế phần mềm, Kiểm thử và đảm bảo chất lượng phần mềm, Quản lý dự án phần mềm, Lập trình ứng dụng phân tán và di động.
- **Giới hạn phạm vi**: Tập trung vào quy trình kỹ nghệ và chu kỳ phần mềm; ngôn ngữ và framework công nghệ có thể cập nhật linh hoạt theo niên khóa.

### 6. Kinh tế (`kinh_te` - 7310101)
- **Nguồn trích dẫn**: Đại học Kinh tế Quốc dân (NEU) — Khung CTĐT K60 (K60.7310101).
- **Học phần cốt lõi trích xuất**: Kinh tế vi mô 1 & 2, Kinh tế vĩ mô 1 & 2, Kinh tế lượng, Lịch sử các học thuyết kinh tế, Kinh tế phát triển, Phân tích dữ liệu kinh tế, Kinh tế học công cộng, Kinh tế quốc tế.
- **Giới hạn phạm vi**: Đào tạo tư duy phương pháp luận và phân tích chính sách kinh tế tổng thể; phân biệt với các ngành quản trị tác nghiệp cụ thể.

### 7. Quản trị kinh doanh (`quan_tri_kinh_doanh` - 7340101)
- **Nguồn trích dẫn**: Đại học Kinh tế Quốc dân (NEU) — Khung CTĐT K60 (K60.7340101).
- **Học phần cốt lõi trích xuất**: Quản trị học, Quản trị chiến lược, Quản trị tác nghiệp, Quản trị nhân lực, Quản trị marketing, Hành vi tổ chức, Quản trị tài chính doanh nghiệp, Khởi sự kinh doanh và quản trị doanh nghiệp nhỏ.
- **Giới hạn phạm vi**: Bao quát rộng các chức năng quản trị trong tổ chức; người học cần chủ động định hướng chuyên sâu ở các năm cuối.

### 8. Kế toán (`ke_toan` - 7340301)
- **Nguồn trích dẫn**: Đại học Kinh tế Quốc dân (NEU) — Khung CTĐT K60 (K60.7340301).
- **Học phần cốt lõi trích xuất**: Nguyên lý kế toán, Kế toán tài chính 1 & 2, Kế toán quản trị, Kiểm toán căn bản, Hệ thống thông tin kế toán, Phân tích báo cáo tài chính, Kế toán chi phí, Thuế và kế toán thuế.
- **Giới hạn phạm vi**: Chuẩn mực kế toán Việt Nam (VAS) và tiếp cận chuẩn quốc tế (IFRS); sinh viên cần thực hành phần mềm kế toán chuyên dụng và tích lũy chứng chỉ nghề nghiệp.

### 9. Tài chính - Ngân hàng (`tai_chinh_ngan_hang` - 7340201)
- **Nguồn trích dẫn**: Đại học Kinh tế Quốc dân (NEU) — Khung CTĐT K60 (K60.7340201).
- **Học phần cốt lõi trích xuất**: Tài chính tiền tệ, Tài chính doanh nghiệp 1 & 2, Nghiệp vụ ngân hàng thương mại, Thị trường tài chính và các định chế tài chính, Quản trị rủi ro tài chính, Thị trường chứng khoán, Thẩm định dự án đầu tư.
- **Giới hạn phạm vi**: Bao quát cả hai mảng tài chính doanh nghiệp và ngân hàng thương mại; nghiệp vụ thực tế có thể phân hóa theo quy chế từng tổ chức tín dụng.

### 10. Quản trị khách sạn (`quan_tri_khach_san` - 7810201)
- **Nguồn trích dẫn**: Đại học Kinh tế Quốc dân (NEU) — Khung CTĐT K60 (K60.7810201).
- **Học phần cốt lõi trích xuất**: Tổng quan ngành du lịch và khách sạn, Quản trị lễ tân và tiền sảnh, Quản trị buồng và dịch vụ phòng, Quản trị nhà hàng và dịch vụ ẩm thực (F&B), Quản trị doanh thu khách sạn, Tổ chức sự kiện và hội nghị (MICE), Quản trị an toàn và vệ sinh trong khách sạn.
- **Giới hạn phạm vi**: Đòi hỏi thời lượng thực hành nghiệp vụ khách sạn thực tế cao; môi trường làm việc chịu ảnh hưởng của tính mùa vụ du lịch.

### 11. Ngôn ngữ Anh (`ngon_ngu_anh` - 7220201)
- **Nguồn trích dẫn**: Trường Đại học Sư phạm Hà Nội (HNUE) — Khung CTĐT K69 (ID 347).
- **Học phần cốt lõi trích xuất**: Ngữ âm và Âm vị học tiếng Anh, Ngữ pháp học, Cú pháp học, Ngữ nghĩa học, Lý thuyết và thực hành Biên dịch, Lý thuyết và thực hành Phiên dịch, Văn hóa và văn học các nước nói tiếng Anh, Giao tiếp liên văn hóa.
- **Giới hạn phạm vi**: Chương trình cử nhân Ngôn ngữ Anh (chuyên ngành biên - phiên dịch); phân biệt với chương trình Sư phạm Tiếng Anh (mã 7140231).

### 12. Văn học (`van_hoc` - 7229030)
- **Nguồn trích dẫn**: Trường Đại học Sư phạm Hà Nội (HNUE) — Khung CTĐT K69 (ID 334).
- **Học phần cốt lõi trích xuất**: Lý luận văn học và tác phẩm văn học, Văn học dân gian Việt Nam, Văn học Việt Nam trung đại, Văn học Việt Nam hiện đại, Lịch sử văn học phương Tây, Văn học phương Đông, Phê bình văn học và phương pháp phân tích văn bản.
- **Giới hạn phạm vi**: Cử nhân khoa học ngành Văn học thuần túy (nghiên cứu, phê bình, xuất bản); phân biệt với chương trình Sư phạm Ngữ văn (mã 7140217).

### 13. Luật (`luat` - 7380101)
- **Nguồn trích dẫn**: Trường Đại học Luật - Đại học Quốc gia Hà Nội (VNU-UL).
- **Học phần cốt lõi trích xuất**: Lý luận chung về Nhà nước và Pháp luật, Lịch sử nhà nước và pháp luật, Luật Hiến pháp, Luật Hành chính, Luật Dân sự, Luật Hình sự, Luật Tố tụng dân sự và hình sự, Công pháp quốc tế và Tư pháp quốc tế.
- **Giới hạn phạm vi**: Đào tạo cử nhân luật tổng quát; để hành nghề luật sư hoặc thẩm phán, người học cần hoàn thành khóa đào tạo nghề tư pháp sau đại học.

### 14. Công nghệ kỹ thuật xây dựng (`cong_nghe_ky_thuat_xay_dung` - 7510103)
- **Nguồn trích dẫn**: Trường Đại học Xây dựng Hà Nội (HUCE).
- **Học phần cốt lõi trích xuất**: Sức bền vật liệu, Cơ học kết cấu công trình, Kết cấu bê tông cốt thép, Kết cấu thép, Kỹ thuật thi công xây dựng, Tổ chức thi công và quản lý dự án công trình, Kiểm định chất lượng công trình.
- **Giới hạn phạm vi**: Định hướng ứng dụng công nghệ và kỹ thuật thi công thực tế tại công trường; cần kết hợp thực tập hiện trường.

### 15. Kỹ thuật điện tử - viễn thông (`ky_thuat_dien_tu_vien_thong` - 7520207)
- **Nguồn trích dẫn**: Trường Điện - Điện tử, Đại học Bách khoa Hà Nội (HUST).
- **Học phần cốt lõi trích xuất**: Lý thuyết mạch điện tử, Kỹ thuật số, Vi xử lý và hệ thống nhúng, Xử lý tín hiệu số, Kỹ thuật truyền thông và mạng vô tuyến, Thiết kế mạch tích hợp (VLSI/vi mạch), Trường điện từ và anten.
- **Giới hạn phạm vi**: Chương trình đạt chuẩn kiểm định AUN-QA; có các phân ngành định hướng vi mạch, nhúng và mạng viễn thông từ năm thứ 3.

### 16. Kỹ thuật điện (`ky_thuat_dien` - 7520201)
- **Nguồn trích dẫn**: Trường Điện - Điện tử, Đại học Bách khoa Hà Nội (HUST).
- **Học phần cốt lõi trích xuất**: Máy điện, Khí cụ điện, Kỹ thuật điện áp cao, Hệ thống cung cấp điện và lưới điện, Nhà máy điện và trạm biến áp, Điện tử công suất, Năng lượng tái tạo và điều khiển truyền động điện.
- **Giới hạn phạm vi**: Tập trung vào phát điện, truyền tải, phân phối điện năng và thiết bị điện công nghiệp; phân biệt với ngành Điện tử Viễn thông.

### 17. Công nghệ kỹ thuật hóa học (`cong_nghe_ky_thuat_hoa_hoc` - 7510401)
- **Nguồn trích dẫn**: Trường Đại học Khoa học Tự nhiên - ĐHQGHN (VNU-HUS).
- **Học phần cốt lõi trích xuất**: Quá trình và thiết bị công nghệ hóa học, Hóa lý và động học phản ứng, Phân tích hóa học và kiểm tra chất lượng sản phẩm, Công nghệ tổng hợp hóa học, Kỹ thuật môi trường hóa chất và an toàn công nghiệp.
- **Giới hạn phạm vi**: Tập trung vào quy mô công nghệ và quy trình sản xuất hóa chất công nghiệp, khác với nghiên cứu lý thuyết hóa học cơ bản.

### 18. Toán học (`toan_hoc` - 7460101)
- **Nguồn trích dẫn**: Trường Đại học Khoa học Tự nhiên - ĐHQGHN (VNU-HUS).
- **Học phần cốt lõi trích xuất**: Giải tích cổ điển và hàm, Đại số tuyến tính và đại số trừu tượng, Hình học và Tô-pô, Xác suất và Thống kê toán học, Phương trình vi phân và phương trình đạo hàm riêng, Phương pháp tính và giải tích số.
- **Giới hạn phạm vi**: Ngành khoa học cơ bản về toán lý thuyết và phương pháp toán học, phân biệt với ngành Sư phạm Toán học (mã 7140209).

### 19. Nông học (`nong_hoc` - 7620109)
- **Nguồn trích dẫn**: Học viện Nông nghiệp Việt Nam (VNUA) — Khung CTĐT K68 PDF chính thức.
- **Học phần cốt lõi trích xuất**: Sinh lý học thực vật, Di truyền học thực vật và chọn tạo giống cây trồng, Đất và dinh dưỡng cây trồng, Bảo vệ thực vật và bệnh hại cây trồng, Kỹ thuật canh tác cây lương thực và cây công nghiệp, Nông nghiệp công nghệ cao và nông nghiệp sinh thái.
- **Giới hạn phạm vi**: Thời lượng thực nghiệm đồng ruộng và phòng thí nghiệm nông nghiệp chiếm tỷ trọng lớn; gắn với chu kỳ mùa vụ cây trồng.

### 20. Quản lý đất đai (`quan_ly_dat_dai` - 7850103)
- **Nguồn trích dẫn**: Đại học Kinh tế Quốc dân (NEU) — Khung CTĐT K60 (K60.7850103).
- **Học phần cốt lõi trích xuất**: Luật đất đai và chính sách bất động sản, Trắc địa và đo đạc địa chính, Bản đồ địa chính, Hệ thống thông tin đất đai (LIS/GIS), Quy hoạch và kế hoạch sử dụng đất, Định giá đất và bất động sản, Quản lý thị trường bất động sản.
- **Giới hạn phạm vi**: Kết hợp giữa kỹ thuật đo đạc địa chính và chính sách quản lý kinh tế - pháp luật về đất đai; tuân thủ quy định Luật Đất đai Việt Nam.

### 21. Công tác xã hội (`cong_tac_xa_hoi` - 7760101)
- **Nguồn trích dẫn**: Trường Đại học Sư phạm Hà Nội (HNUE) — Khung CTĐT K69 (ID 358).
- **Học phần cốt lõi trích xuất**: Nhập môn Công tác xã hội, Công tác xã hội với cá nhân và gia đình, Công tác xã hội nhóm, Phát triển cộng đồng, An sinh xã hội và chính sách xã hội, Tham vấn và trị liệu tâm lý xã hội cơ bản, Công tác xã hội trong trường học và bệnh viện.
- **Giới hạn phạm vi**: Khung CTĐT HNUE định hướng trợ giúp xã hội học đường và cộng đồng; yêu cầu thời lượng thực tập thực địa tại các cơ sở bảo trợ xã hội.

---

## IV. TỔNG KẾT VÀ KẾT LUẬN KIỂM TOÁN

1. **Đầy đủ 100% bằng chứng**: Đúng 21/21 ngành `READY_FOR_PROTOTYPE` có nguồn tài liệu đại học chính thức được xác minh với kết nối an toàn.
2. **Cân đối cấu trúc và dung lượng**: Cả 21 bản mô tả tuân thủ nghiêm ngặt khung độ dài (30-120 từ cho kiến thức cốt lõi, 2-5 hoạt động học tập, 1-4 hướng tìm hiểu an toàn).
3. **Tuyệt đối trung lập**: 0 từ ngữ phóng đại/quảng bá tuyển sinh; 0 khẳng định phù hợp cá nhân chủ quan.
4. **Trạng thái nghiên cứu**: Toàn bộ tài liệu mang trạng thái `DRAFT_EVIDENCE_BACKED`, sẵn sàng trình hội đồng chuyên gia thẩm định sư phạm (`DRAFT_READY_FOR_EXPERT_REVIEW`). Trạng thái vật liệu chung vẫn là `MATERIALS_NOT_READY`.
