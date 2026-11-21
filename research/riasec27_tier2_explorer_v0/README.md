# LabanAI — Research Tier 2 Qualitative Explorer (`riasec27_tier2_explorer_v0`)
## Nguyên mẫu Nghiên cứu Khám phá 33 Ngành và Tier 2 Định tính (Giai đoạn B-05)

---

## 1. Mục tiêu và Phạm vi Kỹ thuật

`riasec27_tier2_explorer_v0` hiện thực hóa nguyên mẫu nghiên cứu tích hợp:
1. **Bảo tồn nguyên vẹn Bộ xếp hạng P2 ML:** Chấm điểm Top-3 tự động dựa trên 6 mô hình ML Q5 đối soát O\*NET OI chỉ trên **đúng 21 ngành READY_FOR_PROTOTYPE**.
2. **Tra cứu minh bạch toàn bộ 33 ngành:** Hiển thị thông tin chính thức, tình trạng bằng chứng (`EVIDENCE_INCOMPLETE`), và các ánh xạ đề xuất (`PENDING_REVIEW`) của cả 33 ngành.
3. **Khám phá định tính Hai cấp (Tier 2):** Chỉ kích hoạt khi **người dùng chủ động lựa chọn** một ngành hoặc cụm ngành phi READY. Trả về phân tích định hướng so sánh định tính, **tuyệt đối KHÔNG thay đổi thứ hạng Top-3 ML** và **KHÔNG tạo điểm số phần trăm phù hợp giả tạo**.

---

## 2. Kiến trúc Ba Thành phần Độc lập

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THÀNH PHẦN A: ML RANKING                        │
│ 27 câu RIASEC ──> 6 Model Q5 ──> Chuẩn hóa P2 ──> Cosine O*NET OI      │
│                     ──> Top-3 (Strictly 21 Ngành READY)                │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     THÀNH PHẦN B: CATALOG DISCOVERY                    │
│ Tra cứu đầy đủ 33 ngành từ majors_registry.json                        │
│ (21 READY, 10 CONDITIONAL, 2 UNRESOLVED, Gắn nhãn EVIDENCE_INCOMPLETE) │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                         Người dùng chủ động chọn
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   THÀNH PHẦN C: TIER 2 QUALITATIVE                     │
│ 5 Chủ đề Khám phá Định tính:                                           │
│ 1. Sư phạm THPT (7 ngành)                                              │
│ 2. CNTT vs Kỹ thuật phần mềm (2 ngành)                                 │
│ 3. Đông phương học vs Việt Nam học (2 ngành)                           │
│ 4. Quản lý DV Du lịch & Lữ hành (1 ngành độc lập)                      │
│ 5. Quản lý Nhà nước (1 ngành độc lập)                                  │
│                                                                        │
│ * Hỗ trợ chọn hướng học tập, chọn "Chưa rõ" hoặc "Bỏ qua".             │
│ * Trả về phân tích so sánh môn học / hoạt động nghề nghiệp.            │
│ * TUYỆT ĐỐI KHÔNG SỬA ĐỔI TOP-3 ML.                                    │
│ * TUYỆT ĐỐI KHÔNG TÍNH ĐIỂM PERCENT PHÙ HỢP.                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Năm Chủ đề Khám phá Định tính Phân lập

| Mã Chủ Đề | Tên Chủ Đề | Số Ngành Thành Viên | Trọng Tâm Phân Định Định Tính |
| :--- | :--- | :---: | :--- |
| `THEME_A_SECONDARY_PEDAGOGY` | Nhóm Sư phạm THPT | 7 ngành | Phân định dựa trên sở thích môn học chuyên sâu (Toán, Văn, Anh, Tin, Hóa, Địa, Chính trị/Pháp luật). Không coi sở thích là năng lực hay điểm trúng tuyển. |
| `THEME_B_IT_AND_SOFTWARE` | CNTT & Kỹ thuật phần mềm | 2 ngành | So sánh trọng tâm: Phát triển phần mềm/viết code ứng dụng (KTPM) vs Hạ tầng mạng, hệ thống máy chủ, an ninh đám mây (CNTT), làm rõ vùng kiến thức nền tảng chung. |
| `THEME_C_REGIONAL_AND_CULTURE` | Khu vực học & Văn hóa học | 2 ngành | Phân định phạm vi không gian: Nghiên cứu quốc tế các nước châu Á (Đông phương học) vs Bản sắc văn hóa, lịch sử và sư phạm tiếng Việt (Việt Nam học). |
| `THEME_D_TOURISM_AND_HOSPITALITY` | Quản trị DV Du lịch & Lữ hành | 1 ngành | Khám phá độc lập các mảng: Thiết kế tour/quản lý lữ hành vs Nghiệp vụ hướng dẫn viên hiện trường. Không dùng trọng số composite giả. |
| `THEME_E_PUBLIC_ADMINISTRATION` | Quản lý Nhà nước | 1 ngành | Khám phá độc lập các mảng: Quản trị công vụ, hành chính công sở vs Phân tích và hoạch định chính sách công. Tách biệt hoàn toàn với Du lịch. |

---

## 4. Các Ràng buộc An toàn và Liêm chính Khoa học (Safety Guardrails)

1. **Khóa hoàn toàn Cơ chế Tự động (Mechanism B = BLOCKED):**
   Hệ thống không tự ý đưa 4 cụm hay 12 ngành phi READY vào danh sách tính điểm của Tier 1 khi chưa có vector đại diện được kiểm chứng khoa học.
2. **Không có Điểm số Phần trăm Phù hợp (No Fit Score in Tier 2):**
   Kết quả Tier 2 là thông tin định hướng và so sánh định tính (`status: "QUALITATIVE_EXPLORATION"` hoặc `"USER_SKIPPED"`).
3. **Bỏ qua an toàn (Safe Skip):**
   Khi người dùng chọn bỏ qua hoặc chọn "Chưa rõ", hệ thống cung cấp bức tranh toàn cảnh so sánh các ngành, không tự động gán ép chọn bừa một ngành con.
4. **Bảo tồn Flat Profile Guard:**
   Đầu vào có 6 điểm trung bình RIASEC bằng nhau tuyệt đối tiếp tục bị từ chối xếp hạng (`ABSTAIN_FLAT_PROFILE`) tại tầng ML.
5. **Tiêu đề Bắt buộc trên Mọi Đầu ra:**
   Mọi payload trả về đều chứa: `research_status: "RESEARCH_ONLY — TOP3_NOT_VALIDATED"`.

---

## 5. Hướng dẫn Kiểm thử và Tái lập

Chạy bộ kiểm thử mới của module Explorer và Research Flow:
```powershell
py -3.14 -B -m unittest discover -s research/riasec27_tier2_explorer_v0 -p "test_*.py"
```

Chạy toàn bộ kiểm thử hệ thống (B-02, B-03, B-04-R1, B-05):
```powershell
py -3.14 -B research/riasec27_major_catalog_v1/validate_catalog.py
py -3.14 -B -m unittest discover -s research/riasec27_major_catalog_v1 -p "test_*.py"
py -3.14 -B -m unittest discover -s research/riasec27_q5_models_v1 -p "test_*.py"
py -3.14 -B -m unittest discover -s research/riasec27_top3_b1_v0 -p "test_*.py"
py -3.14 -B -m unittest discover -s research/riasec27_ml_top3_v0 -p "test_*.py"
py -3.14 -B -m unittest discover -s research/riasec27_tier2_explorer_v0 -p "test_*.py"
```
