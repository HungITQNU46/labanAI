# B-10 — Các trường hợp giải thích

RESEARCH_ONLY — TOP3_NOT_VALIDATED

Chọn theo quy tắc cố định trong manifest: Jaccard nhỏ nhất từng nhóm và perturb P2, hòa theo ID/vị trí. Đây là ví dụ cực trị mô tả, không đại diện dân số.

## single_C

| Mã câu | Giá trị |
|---|---|
| R1 | 1 |
| I1 | 1 |
| A1 | 1 |
| R2 | 1 |
| I2 | 1 |
| A2 | 1 |
| S1 | 1 |
| S2 | 1 |
| R3 | 1 |
| A3 | 1 |
| S3 | 1 |
| E1 | 1 |
| R4 | 1 |
| S4 | 1 |
| E2 | 1 |
| R5 | 1 |
| I3 | 1 |
| A4 | 1 |
| E3 | 1 |
| I4 | 1 |
| A5 | 1 |
| E4 | 1 |
| C1 | 5 |
| E5 | 1 |
| C2 | 5 |
| C3 | 5 |
| C4 | 5 |

| Chiều | Trung bình thô P0 | p Q5 P2 | z P2 |
|---|---|---|---|
| R | 1.000000 | 0.105943 | -0.833948 |
| I | 1.000000 | 0.248152 | -0.646693 |
| A | 1.000000 | 0.145948 | -1.292503 |
| S | 1.000000 | 0.277155 | -0.738270 |
| E | 1.000000 | 0.325013 | -0.607301 |
| C | 5.000000 | 0.858466 | 1.946021 |

| Phương pháp | Trạng thái | Hạng | Ngành | Pearson r |
|---|---|---|---|---|
| P0 | SUCCESS | 1 | ke_toan | 0.849539 |
| P0 | SUCCESS | 2 | ngon_ngu_anh | 0.628367 |
| P0 | SUCCESS | 3 | ky_thuat_phan_mem | 0.536458 |
| P2 | SUCCESS | 1 | ke_toan | 0.917781 |
| P2 | SUCCESS | 2 | tai_chinh_ngan_hang | 0.617408 |
| P2 | SUCCESS | 3 | ky_thuat_phan_mem | 0.568328 |

Khác biệt kỹ thuật: P0 tương quan vector trung bình thô với OI; P2 tương quan vector z của sáu xác suất với cùng OI. Z dùng μ/σ từng chiều đã khóa, không ước lượng lại trên hồ sơ này. Thay vector làm đổi hình dạng tương đối giữa sáu chiều và thứ hạng Pearson. Đây là giải thích phép tính xếp hạng, chưa chỉ ra đặc trưng nào gây ra dự đoán ML.

Giá trị lớn nhất: trung bình thô ở C; vector z ở C. Đây chỉ là đối chiếu hai vector, không phải quy tắc 'chọn ngành theo chiều cao nhất'.

Khoảng cách r tại biên hạng 3/4: P0=0.023805, P2=0.049276. Đây là khoảng cách số học, không phải độ tin cậy hướng nghiệp.

## competition_IS_lower_S

| Mã câu | Giá trị |
|---|---|
| R1 | 2 |
| I1 | 4 |
| A1 | 2 |
| R2 | 2 |
| I2 | 4 |
| A2 | 2 |
| S1 | 3 |
| S2 | 4 |
| R3 | 2 |
| A3 | 2 |
| S3 | 4 |
| E1 | 2 |
| R4 | 2 |
| S4 | 4 |
| E2 | 2 |
| R5 | 2 |
| I3 | 4 |
| A4 | 2 |
| E3 | 2 |
| I4 | 4 |
| A5 | 2 |
| E4 | 2 |
| C1 | 2 |
| E5 | 2 |
| C2 | 2 |
| C3 | 2 |
| C4 | 2 |

| Chiều | Trung bình thô P0 | p Q5 P2 | z P2 |
|---|---|---|---|
| R | 2.000000 | 0.159401 | -0.599382 |
| I | 4.000000 | 0.786664 | 1.468435 |
| A | 2.000000 | 0.216402 | -1.028135 |
| S | 3.750000 | 0.352592 | -0.411135 |
| E | 2.000000 | 0.322630 | -0.617493 |
| C | 2.000000 | 0.220147 | -0.759869 |

| Phương pháp | Trạng thái | Hạng | Ngành | Pearson r |
|---|---|---|---|---|
| P0 | SUCCESS | 1 | tam_ly_hoc_giao_duc | 0.788029 |
| P0 | SUCCESS | 2 | cong_tac_xa_hoi | 0.629877 |
| P0 | SUCCESS | 3 | giao_duc_tieu_hoc | 0.561391 |
| P2 | SUCCESS | 1 | toan_hoc | 0.696662 |
| P2 | SUCCESS | 2 | nong_hoc | 0.632177 |
| P2 | SUCCESS | 3 | ky_thuat_phan_mem | 0.592345 |

Khác biệt kỹ thuật: P0 tương quan vector trung bình thô với OI; P2 tương quan vector z của sáu xác suất với cùng OI. Z dùng μ/σ từng chiều đã khóa, không ước lượng lại trên hồ sơ này. Thay vector làm đổi hình dạng tương đối giữa sáu chiều và thứ hạng Pearson. Đây là giải thích phép tính xếp hạng, chưa chỉ ra đặc trưng nào gây ra dự đoán ML.

Giá trị lớn nhất: trung bình thô ở I; vector z ở I. Đây chỉ là đối chiếu hai vector, không phải quy tắc 'chọn ngành theo chiều cao nhất'.

Khoảng cách r tại biên hạng 3/4: P0=0.124361, P2=0.118494. Đây là khoảng cách số học, không phải độ tin cậy hướng nghiệp.

## random_009

| Mã câu | Giá trị |
|---|---|
| R1 | 4 |
| I1 | 2 |
| A1 | 1 |
| R2 | 4 |
| I2 | 5 |
| A2 | 1 |
| S1 | 1 |
| S2 | 5 |
| R3 | 1 |
| A3 | 1 |
| S3 | 2 |
| E1 | 2 |
| R4 | 4 |
| S4 | 4 |
| E2 | 4 |
| R5 | 2 |
| I3 | 4 |
| A4 | 1 |
| E3 | 2 |
| I4 | 4 |
| A5 | 1 |
| E4 | 4 |
| C1 | 3 |
| E5 | 4 |
| C2 | 3 |
| C3 | 4 |
| C4 | 5 |

| Chiều | Trung bình thô P0 | p Q5 P2 | z P2 |
|---|---|---|---|
| R | 3.000000 | 0.637775 | 1.499669 |
| I | 3.750000 | 0.778863 | 1.437796 |
| A | 1.000000 | 0.046464 | -1.665801 |
| S | 3.000000 | 0.364139 | -0.361062 |
| E | 3.200000 | 0.795549 | 1.405258 |
| C | 3.750000 | 0.793815 | 1.671957 |

| Phương pháp | Trạng thái | Hạng | Ngành | Pearson r |
|---|---|---|---|---|
| P0 | SUCCESS | 1 | ke_toan | 0.660883 |
| P0 | SUCCESS | 2 | tai_chinh_ngan_hang | 0.636841 |
| P0 | SUCCESS | 3 | ky_thuat_phan_mem | 0.569845 |
| P2 | SUCCESS | 1 | cong_nghe_ky_thuat_xay_dung | 0.706740 |
| P2 | SUCCESS | 2 | ky_thuat_dien | 0.699121 |
| P2 | SUCCESS | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.671855 |

Khác biệt kỹ thuật: P0 tương quan vector trung bình thô với OI; P2 tương quan vector z của sáu xác suất với cùng OI. Z dùng μ/σ từng chiều đã khóa, không ước lượng lại trên hồ sơ này. Thay vector làm đổi hình dạng tương đối giữa sáu chiều và thứ hạng Pearson. Đây là giải thích phép tính xếp hạng, chưa chỉ ra đặc trưng nào gây ra dự đoán ML.

Giá trị lớn nhất: trung bình thô ở I,C; vector z ở C. Đây chỉ là đối chiếu hai vector, không phải quy tắc 'chọn ngành theo chiều cao nhất'.

Khoảng cách r tại biên hạng 3/4: P0=0.049313, P2=0.001107. Đây là khoảng cách số học, không phải độ tin cậy hướng nghiệp.

## balanced_small_C:before

| Mã câu | Giá trị |
|---|---|
| R1 | 3 |
| I1 | 3 |
| A1 | 3 |
| R2 | 3 |
| I2 | 3 |
| A2 | 3 |
| S1 | 3 |
| S2 | 3 |
| R3 | 3 |
| A3 | 3 |
| S3 | 3 |
| E1 | 3 |
| R4 | 3 |
| S4 | 3 |
| E2 | 3 |
| R5 | 3 |
| I3 | 3 |
| A4 | 3 |
| E3 | 3 |
| I4 | 3 |
| A5 | 3 |
| E4 | 3 |
| C1 | 4 |
| E5 | 3 |
| C2 | 3 |
| C3 | 3 |
| C4 | 3 |

| Chiều | Trung bình thô P0 | p Q5 P2 | z P2 |
|---|---|---|---|
| R | 3.000000 | 0.394589 | 0.432598 |
| I | 3.000000 | 0.499641 | 0.341089 |
| A | 3.000000 | 0.573217 | 0.310759 |
| S | 3.000000 | 0.588054 | 0.609947 |
| E | 3.000000 | 0.566799 | 0.426855 |
| C | 3.250000 | 0.642760 | 1.031622 |

| Phương pháp | Trạng thái | Hạng | Ngành | Pearson r |
|---|---|---|---|---|
| P0 | SUCCESS | 1 | ke_toan | 0.849539 |
| P0 | SUCCESS | 2 | ngon_ngu_anh | 0.628367 |
| P0 | SUCCESS | 3 | ky_thuat_phan_mem | 0.536458 |
| P2 | SUCCESS | 1 | ke_toan | 0.781683 |
| P2 | SUCCESS | 2 | quan_tri_khach_san | 0.583712 |
| P2 | SUCCESS | 3 | ngon_ngu_anh | 0.527012 |

Khác biệt kỹ thuật: P0 tương quan vector trung bình thô với OI; P2 tương quan vector z của sáu xác suất với cùng OI. Z dùng μ/σ từng chiều đã khóa, không ước lượng lại trên hồ sơ này. Thay vector làm đổi hình dạng tương đối giữa sáu chiều và thứ hạng Pearson. Đây là giải thích phép tính xếp hạng, chưa chỉ ra đặc trưng nào gây ra dự đoán ML.

Giá trị lớn nhất: trung bình thô ở C; vector z ở C. Đây chỉ là đối chiếu hai vector, không phải quy tắc 'chọn ngành theo chiều cao nhất'.

Khoảng cách r tại biên hạng 3/4: P0=0.023805, P2=0.053298. Đây là khoảng cách số học, không phải độ tin cậy hướng nghiệp.

## balanced_small_C:after:S1

| Mã câu | Giá trị |
|---|---|
| R1 | 3 |
| I1 | 3 |
| A1 | 3 |
| R2 | 3 |
| I2 | 3 |
| A2 | 3 |
| S1 | 2 |
| S2 | 3 |
| R3 | 3 |
| A3 | 3 |
| S3 | 3 |
| E1 | 3 |
| R4 | 3 |
| S4 | 3 |
| E2 | 3 |
| R5 | 3 |
| I3 | 3 |
| A4 | 3 |
| E3 | 3 |
| I4 | 3 |
| A5 | 3 |
| E4 | 3 |
| C1 | 4 |
| E5 | 3 |
| C2 | 3 |
| C3 | 3 |
| C4 | 3 |

| Chiều | Trung bình thô P0 | p Q5 P2 | z P2 |
|---|---|---|---|
| R | 3.000000 | 0.448204 | 0.667855 |
| I | 3.000000 | 0.494480 | 0.320818 |
| A | 3.000000 | 0.555038 | 0.242543 |
| S | 2.750000 | 0.375294 | -0.312689 |
| E | 3.000000 | 0.579826 | 0.482574 |
| C | 3.250000 | 0.587189 | 0.796053 |

| Phương pháp | Trạng thái | Hạng | Ngành | Pearson r |
|---|---|---|---|---|
| P0 | SUCCESS | 1 | ke_toan | 0.690371 |
| P0 | SUCCESS | 2 | quan_ly_dat_dai | 0.651012 |
| P0 | SUCCESS | 3 | ky_thuat_phan_mem | 0.638903 |
| P2 | SUCCESS | 1 | quan_ly_dat_dai | 0.715843 |
| P2 | SUCCESS | 2 | cong_nghe_ky_thuat_xay_dung | 0.699562 |
| P2 | SUCCESS | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.650610 |

Khác biệt kỹ thuật: P0 tương quan vector trung bình thô với OI; P2 tương quan vector z của sáu xác suất với cùng OI. Z dùng μ/σ từng chiều đã khóa, không ước lượng lại trên hồ sơ này. Thay vector làm đổi hình dạng tương đối giữa sáu chiều và thứ hạng Pearson. Đây là giải thích phép tính xếp hạng, chưa chỉ ra đặc trưng nào gây ra dự đoán ML.

Giá trị lớn nhất: trung bình thô ở C; vector z ở C. Đây chỉ là đối chiếu hai vector, không phải quy tắc 'chọn ngành theo chiều cao nhất'.

Khoảng cách r tại biên hạng 3/4: P0=0.117156, P2=0.006031. Đây là khoảng cách số học, không phải độ tin cậy hướng nghiệp.

## Perturb đã chọn

```json
{
  "profile_id": "balanced_small_C",
  "feature_id": "S1",
  "delta": -1,
  "q5_probability_changes": {
    "R": 0.05361500398051794,
    "I": -0.0051610469818115234,
    "A": -0.018179770602600898,
    "S": -0.21275967359542847,
    "E": 0.013027252072014384,
    "C": -0.05557060241699219
  }
}
```

Không suy từ một chênh lệch đầu vào–đầu ra thành giải thích nhân quả hoặc attribution đáng tin cậy. Pearson gần nhau có thể đổi thứ tự qua perturb nhỏ; xem đầy đủ điểm và trạng thái trước–sau trong JSON.

So sánh P2 trước–sau: {"evaluable": true, "overlap_count": 0, "jaccard_at_3": 0.0, "same_top3_set": false, "top1_evaluable": true, "same_unique_top1": false, "order_evaluable": true, "same_top3_order": false, "common_top3_score_changes": {}}

Không có ground truth ngành đúng, nhãn relevance hoặc khảo sát độc lập. Không tính Accuracy,
Hit@3, NDCG hay kết luận P2 tốt hơn P0. Các hồ sơ thiết kế và các perturb có chung hồ sơ gốc,
không phải mẫu học sinh độc lập; không suy rộng tần suất hay tính khoảng tin cậy dân số.
Likert là thứ bậc. Hồ sơ cực trị/ngẫu nhiên có thể ngoài phân bố huấn luyện. Xác suất Q5 chưa
được phê duyệt calibration; không phải xác suất phù hợp ngành hoặc thành công. Chỉ 21/33 ngành
tham gia; 12 ngành còn lại không được chấm. READY chỉ là điều kiện chạy prototype.
Không đặt ngưỡng đạt ổn định khoa học; không thay model, normalization, mapping hoặc tie policy.
