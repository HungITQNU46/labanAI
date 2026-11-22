# RIASEC27 INDEPENDENT PILOT EVALUATION PREPARATION V1 (PHASE B-13)

Phiên bản: **1.0.0**  
Giai đoạn: **B-13 (Cập nhật B-13-R1)**  
Trạng thái tài liệu: `RESEARCH_ONLY — TOP3_NOT_VALIDATED`  
Mục tiêu: **Chuẩn bị quy trình và tài liệu tối giản phục vụ đánh giá độc lập Top-3**  

---

## 1. MỤC TIÊU VÀ PHẠM VI GIAI ĐOẠN B-13

Giai đoạn B-13 xây dựng tài liệu quy trình thao tác chuẩn (SOP) phục vụ việc chuẩn bị đánh giá thực nghiệm độc lập chất lượng gợi ý ngành giữa hai phương pháp:
- **Baseline P0**: Khoảng cách Pearson từ trung bình miền RIASEC đến hồ sơ O*NET.
- **Mô hình P2**: Sáu xác suất ML Q5 chuẩn hóa Z-score và tương quan Pearson với hồ sơ O*NET.

### Phân định ranh giới 3 tầng trạng thái:
1. **ĐÃ CÓ (AS-IS)**:
   - Công cụ đánh giá ngoại tuyến B-12 ([research/riasec27_top3_validation_v1/](file:///c:/Users/DELL/OneDrive/Máy%20tính/labanAI/research/riasec27_top3_validation_v1)) là **công cụ kiểm thử kỹ thuật bằng dữ liệu giả lập** (`SYNTHETIC_DEMO_ONLY — NOT_SCIENTIFIC_VALIDATION`).
   - B-12 có cổng kiểm định an toàn (security gate), **từ chối 100% mọi tệp dữ liệu không mang nhãn synthetic**.
2. **MỚI LÀ ĐỀ XUẤT (PROPOSED)**:
   - Toàn bộ cơ chế thu thập nhãn sở thích độc lập, quy trình khóa bản ghi (freezing), lưu trữ ẩn danh, phương án rút lui dữ liệu và quy trình đánh giá so sánh theo cặp trong B-13 **chỉ là đề xuất phương pháp luận và tài liệu chuẩn bị**.
3. **CHƯA ĐƯỢC PHÉP (NOT PERMITTED)**:
   - Tuyệt đối **chưa được phép thu thập hay xử lý dữ liệu học sinh thật**.
   - Tuyệt đối **không được đưa dữ liệu học sinh thật vào công cụ B-12** và **nghiêm cấm hành vi gắn nhãn dữ liệu thật thành "SYNTHETIC_DEMO_ONLY"** để đánh lừa cổng kiểm định của B-12.
   - Khi nghiên cứu thực tế được cấp phép trong tương lai, một công cụ đánh giá chính thức có kiểm soát thẩm quyền sẽ được phê duyệt riêng biệt.

---

## 2. CẤU TRÚC TÀI LIỆU B-13

```
research/riasec27_independent_pilot_prep_v1/
├── README.md                          # Tài liệu tổng quan mục tiêu, phạm vi và ranh giới B-13
├── pilot_flow.md                      # Quy trình 6 bước đánh giá độc lập được đề xuất
├── interest_rating_instructions.md    # Bản hướng dẫn chấm nhãn sở thích dành cho học sinh
├── data_collection_checklist.md       # Bảng kiểm điều kiện vận hành trước, trong và sau thu thập
├── b12_denominator_review.md          # Phân tích đối soát mẫu số và phân biệt coverage fixture vs thực tế
└── readiness_and_limitations.md       # 7 điều kiện tiên quyết bắt buộc phê duyệt trước khảo sát
```

---

## 3. BA NGUYÊN TẮC CỐT LÕI CỦA QUY TRÌNH THU NHẬN NHÃN

1. **Thu thập độc lập trước gợi ý (Pre-Recommendation Independence)**:
   - Người học đọc mô tả 21 ngành và tự đánh giá mức độ quan tâm **hoàn toàn trước khi** nhìn thấy bất kỳ kết quả gợi ý nào từ P0 hoặc P2.
   - Tuyệt đối không để thuật toán gợi ý can thiệp hoặc định hướng mức độ quan tâm của học sinh.
2. **Khóa bản ghi trước khi suy luận (Data Freezing)**:
   - Dữ liệu 27 câu trả lời và 21 nhãn ngành phải được ghi nhận và khóa bất biến (freeze/timestamp) trước khi chạy suy luận P0/P2 và tính toán các chỉ số xếp hạng ($NDCG@3$, $Precision@3$, $Hit@3$).
3. **Tách biệt đánh giá trải nghiệm (Post-Recommendation Separation)**:
   - Nếu thực hiện khảo sát trải nghiệm sau gợi ý (mức độ hài lòng, tính dễ hiểu, độ ưu tiên), dữ liệu này phải được lưu vào bảng/trường riêng biệt, tuyệt đối không được dùng để thay thế hoặc ghi đè nhãn quan tâm ngành ban đầu.
