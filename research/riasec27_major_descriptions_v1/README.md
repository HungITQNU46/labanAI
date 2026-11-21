# RIASEC27 MAJOR DESCRIPTIONS V1 (PHASE B-09)

Phiên bản: **1.0.0**  
Giai đoạn: **B-09**  
Trạng thái tài liệu: `DRAFT_READY_FOR_EXPERT_REVIEW`  
Trạng thái vật liệu nghiên cứu chung: `MATERIALS_NOT_READY`  

---

## 1. MỤC TIÊU VÀ PHẠM VI

Thư mục này chứa bộ tài liệu giới thiệu trung lập cho đúng **21 ngành `READY_FOR_PROTOTYPE`** của LabanAI, được biên soạn hoàn toàn dựa trên bằng chứng chương trình đào tạo (CTĐT) hoặc chuẩn đầu ra đại học chính quy tại Việt Nam.

Tài liệu này phục vụ mục tiêu chuẩn bị hồ sơ nghiên cứu cho các giai đoạn đánh giá thực nghiệm tiếp theo, giúp người học hiểu rõ nội dung học tập thực tế của từng ngành trước khi tự đánh giá mức độ quan tâm.

> [!IMPORTANT]
> **Tuyệt đối không sử dụng làm tài liệu khảo sát thực tế khi chưa có thẩm định chuyên gia**: Toàn bộ nội dung ở giai đoạn B-09 là bản thảo dựa trên bằng chứng (`DRAFT_EVIDENCE_BACKED`), chưa được thẩm định độc lập bởi hội đồng chuyên gia giáo dục (`DRAFT_READY_FOR_EXPERT_REVIEW`). Trạng thái vật liệu nghiên cứu chung vẫn là `MATERIALS_NOT_READY`. Không tuyển người tham gia hoặc thực hiện khảo sát học sinh tại giai đoạn này.

---

## 2. CẤU TRÚC THƯ MỤC

```
research/riasec27_major_descriptions_v1/
├── README.md                  # Hướng dẫn tổng quan và nguyên tắc phương pháp luận
├── sources_registry.json      # Sổ bộ 21 nguồn bằng chứng CTĐT đại học chính thức
├── major_descriptions.json    # 21 bản mô tả trung lập (DRAFT_EVIDENCE_BACKED)
├── evidence_audit.md          # Báo cáo kiểm toán chi tiết bằng chứng và học phần
├── validate_descriptions.py   # Công cụ kiểm định tự động 13 quy tắc chất lượng
└── test_descriptions.py       # Bộ unit tests xác minh và kiểm thử phủ định
```

---

## 3. CĂN CỨ VÀ NGUỒN BẰNG CHỨNG (100% ĐẠI HỌC CHÍNH QUY)

Tổng số 21 ngành được trích xuất từ các cơ sở giáo dục đại học uy tín tại Việt Nam với chứng chỉ kết nối TLS/SSL an toàn:
- **14 ngành `VERIFIED_OFFICIAL_DIRECT`**:
  - ĐH Sư phạm Hà Nội (HNUE): 7 ngành (`giao_duc_tieu_hoc`, `giao_duc_mam_non`, `quan_ly_giao_duc`, `tam_ly_hoc_giao_duc`, `ngon_ngu_anh`, `van_hoc`, `cong_tac_xa_hoi`).
  - ĐH Kinh tế Quốc dân (NEU): 6 ngành (`kinh_te`, `quan_tri_kinh_doanh`, `ke_toan`, `tai_chinh_ngan_hang`, `quan_tri_khach_san`, `quan_ly_dat_dai`).
  - Học viện Nông nghiệp Việt Nam (VNUA): 1 ngành (`nong_hoc`).
- **7 ngành `VERIFIED_OFFICIAL_SUMMARY`**:
  - ĐH Bách khoa Hà Nội (HUST): 2 ngành (`ky_thuat_dien`, `ky_thuat_dien_tu_vien_thong`).
  - ĐH Khoa học Tự nhiên - ĐHQGHN (VNU-HUS): 2 ngành (`toan_hoc`, `cong_nghe_ky_thuat_hoa_hoc`).
  - ĐH Luật - ĐHQGHN (VNU-UL): 1 ngành (`luat`).
  - ĐH Xây dựng Hà Nội (HUCE): 1 ngành (`cong_nghe_ky_thuat_xay_dung`).
  - ĐH Công nghệ Thông tin - ĐHQG-HCM (UIT): 1 ngành (`ky_thuat_phan_mem`).
- **0 ngành thiếu bằng chứng (`INSUFFICIENT_EVIDENCE`)**.

---

## 4. NHẮC LẠI HAI ĐIỀU KIỆN PHƯƠNG PHÁP LUẬN BẮT BUỘC TỪ B-08

Để đảm bảo tính nhất quán và chặt chẽ của đề cương đánh giá Top-3 (theo B-08-R1/R2), bất kỳ nghiên cứu thực nghiệm nào sử dụng bộ mô tả này sau khi được nghiệm thu vật liệu đều phải tuân thủ nghiêm ngặt hai điều kiện:

1. **Điều kiện 1 (Tính toán IDCG@3 trên tập 21 ngành)**:
   - Việc tính toán thước đo xếp hạng $NDCG@3$ với chuẩn hóa $IDCG@3$ trên toàn bộ không gian 21 ngành `READY_FOR_PROTOTYPE` đòi hỏi về mặt toán học người tham gia phải cung cấp nhãn mức độ phù hợp (relevance label) cho cả 21 ngành, HOẶC đề cương phải đăng ký trước (pre-registered protocol) quy tắc xử lý dữ liệu khuyết thiếu (ví dụ: các ngành không được xếp hạng mặc định có điểm phù hợp bằng 0, hoặc chỉ tính toán trên tập con các ngành được đánh giá).
2. **Điều kiện 2 (Nhất quán nhãn giữa hai nhánh P0 và P2)**:
   - Trong thiết kế thử nghiệm so sánh giữa P0 (Pearson baseline) và P2 (ML Top-3), nếu một ngành xuất hiện trong cả hai danh sách gợi ý của cùng một người tham gia, ngành đó bắt buộc phải nhận cùng một nhãn đánh giá độ phù hợp từ người tham gia đó. Không được phép gán nhãn khác nhau cho cùng một cặp (học sinh - ngành) giữa hai nhánh đánh giá.

---

## 5. HƯỚNG DẪN KIỂM ĐỊNH VÀ CHẠY TESTS

Chạy công cụ kiểm tra tự động 13 quy tắc:
```powershell
py -3.14 -B research/riasec27_major_descriptions_v1/validate_descriptions.py
```

Chạy bộ unit tests (bao gồm kiểm thử phủ định):
```powershell
py -3.14 -B -m unittest discover -s research/riasec27_major_descriptions_v1 -p "test_*.py"
```
