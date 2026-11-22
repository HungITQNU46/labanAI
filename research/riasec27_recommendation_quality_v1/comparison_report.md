# B-10 — Đánh giá hành vi Top-3

RESEARCH_ONLY — TOP3_NOT_VALIDATED

RECOMMENDATION_BEHAVIOR_EVALUATED

243 hồ sơ tổng hợp; 6561 perturb một câu, một bậc. Seed 42; perturb seed 20261121. Cùng 21 ID/SOC/OI: True.

P0 gọi prototype.rank_majors: sáu trung bình thô → Pearson. P2 gọi MLTop3Ranker.rank: sáu predict_proba → Z-score cố định → Pearson. Không viết lại ranker.

| Nhóm | N | P0 trạng thái | P2 trạng thái | Cặp hợp lệ | Jaccard TB |
|---|---|---|---|---|---|
| anchor | 1 | {"SUCCESS": 1} | {"SUCCESS": 1} | 1 | 0.500000 |
| balanced | 2 | {"SUCCESS": 2} | {"SUCCESS": 2} | 2 | 0.500000 |
| combined_pair | 15 | {"SUCCESS": 15} | {"SUCCESS": 15} | 15 | 0.646667 |
| combined_triple | 20 | {"SUCCESS": 20} | {"SUCCESS": 20} | 20 | 0.705000 |
| flat_nonuniform | 3 | {"ABSTAIN_FLAT_PROFILE": 3} | {"ABSTAIN_FLAT_PROFILE": 3} | 0 | N/A |
| flat_uniform | 5 | {"ABSTAIN_FLAT_PROFILE": 5} | {"ABSTAIN_FLAT_PROFILE": 5} | 0 | N/A |
| micro_change | 33 | {"SUCCESS": 33} | {"SUCCESS": 33} | 33 | 0.406061 |
| near_competition | 30 | {"SUCCESS": 30} | {"SUCCESS": 30} | 30 | 0.626667 |
| random_uniform_likert | 128 | {"SUCCESS": 128} | {"SUCCESS": 128} | 128 | 0.399219 |
| single_dominant | 6 | {"SUCCESS": 6} | {"SUCCESS": 6} | 6 | 0.750000 |

## Trùng nhau giữa phương pháp

```json
{
  "total_pairs": 243,
  "evaluable_pairs": 235,
  "not_evaluable": 8,
  "not_evaluable_reasons": {
    "NON_SUCCESS": 8
  },
  "same_top3_set": {
    "count": 56,
    "denominator": 235,
    "rate": 0.23829787234042554,
    "rate_all_pairs": 0.23045267489711935
  },
  "same_unique_top1": {
    "count": 102,
    "denominator": 235,
    "rate": 0.4340425531914894,
    "rate_all_pairs": 0.41975308641975306
  },
  "same_top3_order": {
    "count": 26,
    "denominator": 235,
    "rate": 0.11063829787234042,
    "rate_all_pairs": 0.10699588477366255
  },
  "overlap_counts": {
    "0": 30,
    "1": 58,
    "2": 91,
    "3": 56
  },
  "jaccard_at_3": {
    "n": 235,
    "min": 0.0,
    "median": 0.5,
    "mean": 0.48127659574468085,
    "p95": 1.0,
    "max": 1.0
  }
}
```

Cặp không SUCCESS hoặc khác phạm vi không được gán Jaccard=1 hay 0; được giữ trong tổng mẫu số. Top-1 đồng hạng và thứ tự trong nhóm đồng hạng là N/A, không dùng ID phá hòa.

## Tần suất đủ 21 ngành

| Ngành | ID | P0 số slot | P2 số slot |
|---|---|---|---|
| Giáo dục Tiểu học | giao_duc_tieu_hoc | 42 | 21 |
| Giáo dục Mầm non | giao_duc_mam_non | 42 | 25 |
| Quản lý giáo dục | quan_ly_giao_duc | 24 | 31 |
| Tâm lý học giáo dục | tam_ly_hoc_giao_duc | 20 | 16 |
| Kỹ thuật phần mềm | ky_thuat_phan_mem | 20 | 18 |
| Kinh tế | kinh_te | 27 | 25 |
| Quản trị kinh doanh | quan_tri_kinh_doanh | 34 | 47 |
| Kế toán | ke_toan | 36 | 27 |
| Tài chính - Ngân hàng | tai_chinh_ngan_hang | 17 | 18 |
| Quản trị khách sạn | quan_tri_khach_san | 50 | 45 |
| Ngôn ngữ Anh | ngon_ngu_anh | 29 | 30 |
| Văn học | van_hoc | 40 | 39 |
| Luật | luat | 18 | 19 |
| Công nghệ kỹ thuật xây dựng | cong_nghe_ky_thuat_xay_dung | 35 | 85 |
| Kỹ thuật điện tử - viễn thông | ky_thuat_dien_tu_vien_thong | 30 | 56 |
| Kỹ thuật điện | ky_thuat_dien | 56 | 86 |
| Công nghệ kỹ thuật hóa học | cong_nghe_ky_thuat_hoa_hoc | 55 | 27 |
| Toán học | toan_hoc | 28 | 25 |
| Nông học | nong_hoc | 33 | 35 |
| Quản lý đất đai | quan_ly_dat_dai | 33 | 16 |
| Công tác xã hội | cong_tac_xa_hoi | 36 | 14 |

Mỗi SUCCESS đóng góp đúng ba slot. Tỷ trọng slot = c_i/Σc; tỷ lệ hồ sơ = c_i/N_SUCCESS. ABSTAIN/TIED đóng góp 0 slot nhưng vẫn ở mẫu số trạng thái N=243.

Gini = Σ_iΣ_j|c_i−c_j|/(2mΣc_i), m=21 gồm cả tần suất 0. Entropy = −Σ p_i ln(p_i), p_i=c_i/Σc; chuẩn hóa H/ln(21), số ngành hiệu dụng exp(H). Các chỉ số chỉ mô tả tập tổng hợp này.

| Phương pháp | SUCCESS | Slot | Số ngành có mặt | Tập Top-3 khác nhau | Gini | H/ln21 |
|---|---|---|---|---|---|---|
| P0 | 235 | 705 | 21 | 85 | 0.182911 | 0.982673 |
| P2 | 235 | 705 | 21 | 72 | 0.298818 | 0.950599 |

## Bất thường kỹ thuật

Không phát hiện vi phạm hợp đồng kỹ thuật trong các lời gọi đã kiểm tra. Điều này không chứng nhận chất lượng hướng nghiệp.

## Bất nhất tài liệu mức thấp

```json
[
  {
    "severity": "LOW",
    "file": "riasec27_tier2_explorer_v0/README.md:20; research_flow.py:6",
    "input": "Not input-dependent: documentation inspection",
    "expected": "Documentation describes the locked Pearson ranking policy",
    "actual": "Tier 2 architecture diagram/docstring still says Cosine; actual flow delegates to Pearson P2 ranker",
    "impact": "May mislead research interpretation; no runtime modification in B-10",
    "action": "Propose a separate documentation correction; do not change similarity"
  }
]
```

Tần suất tổng hợp chịu trọng số thiết kế: 128/243 hồ sơ ngẫu nhiên và 34/243 anchor/biến thể anchor. Xem số liệu riêng từng nhóm trong comparison_results.json; không diễn giải bảng gộp thành phân bố dân số.


## Giới hạn

Không có ground truth ngành đúng, nhãn relevance hoặc khảo sát độc lập. Không tính Accuracy,
Hit@3, NDCG hay kết luận P2 tốt hơn P0. Các hồ sơ thiết kế và các perturb có chung hồ sơ gốc,
không phải mẫu học sinh độc lập; không suy rộng tần suất hay tính khoảng tin cậy dân số.
Likert là thứ bậc. Hồ sơ cực trị/ngẫu nhiên có thể ngoài phân bố huấn luyện. Xác suất Q5 chưa
được phê duyệt calibration; không phải xác suất phù hợp ngành hoặc thành công. Chỉ 21/33 ngành
tham gia; 12 ngành còn lại không được chấm. READY chỉ là điều kiện chạy prototype.
Không đặt ngưỡng đạt ổn định khoa học; không thay model, normalization, mapping hoặc tie policy.
