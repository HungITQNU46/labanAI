# B-11 — Đối soát 21 trường hợp P2 đổi cả Top-3

RESEARCH_ONLY — TOP3_NOT_VALIDATED

Tái lập riêng 21 cặp từ B-10 bằng ranker gốc: 84 lời gọi P0/P2 trước–sau; không fit, không đọc workbook hoặc Test 947. Tất cả đầu ra compact khớp chính xác B-10, không chỉ so mã ngành.

## Kết quả tổng hợp

```json
{
  "case_count": 21,
  "replayed_native_rank_calls": 84,
  "category_counts": {
    "balanced": 3,
    "random_uniform_likert": 18
  },
  "changed_question_counts": {
    "S1": 3,
    "R5": 5,
    "I3": 1,
    "R1": 7,
    "S3": 1,
    "R4": 2,
    "E5": 1,
    "R3": 1
  },
  "max_abs_probability_change": {
    "R": 0.11458479730270582,
    "I": 0.168808251619339,
    "A": 0.056999491045831796,
    "S": 0.21275967359542847,
    "E": 0.061150068039300676,
    "C": 0.10147559642791748
  },
  "max_abs_z_change": {
    "R": 0.5027854203716798,
    "I": 0.6630331956769011,
    "A": 0.21388176752657329,
    "S": 0.9226351847156481,
    "E": 0.2615486229225862,
    "C": 0.43016361351385113
  },
  "xgb_changed_leaf_count_range": {
    "I": [
      0,
      24
    ],
    "S": [
      0,
      28
    ],
    "C": [
      0,
      17
    ]
  },
  "class_flip_count": {
    "R": 7,
    "I": 1,
    "A": 0,
    "S": 1,
    "E": 0,
    "C": 4
  },
  "cases_without_any_binary_class_flip": 8,
  "cases_without_any_xgb_leaf_change": 1,
  "boundary_margin_range": {
    "before": [
      0.001983697526048822,
      0.12850943594774203
    ],
    "after": [
      0.0008672665297078108,
      0.06093485149387512
    ]
  }
}
```

## Diễn giải có căn cứ

Tầng Q5: các xác suất trước–sau là đầu ra thật của sáu pipeline đã khóa. Với I/S/C, số cây đổi leaf và raw margin được kiểm tra trực tiếp trên booster của artifact. Nếu số leaf thay đổi >0, có bằng chứng cặp đầu vào đi qua các nhánh cây khác nhau; chưa phải giải thích nhân quả về sở thích của người trả lời.

Tầng Z-score: Δz_d = Δp_d/σ_d được kiểm tra với σ cố định (khoảng 0,228–0,267). Đây là phép đổi thang riêng từng chiều, không fit lại và không phải calibration. LR cũng có thay đổi margin/xác suất; không quy mọi biến động cho XGBoost.

Tầng Pearson: r dựa vào hướng của vector sáu chiều sau trừ trung bình và chia chuẩn. Vector có độ phân hóa thấp có thể nhạy với thay đổi hướng. Báo centered-z norm và gap r hạng 3/4 thực tế, không đặt ngưỡng gần/xa tùy ý hoặc ngưỡng ổn định khoa học.

Mốc lớp nhị phân được ghi từ model.predict để đối chiếu; ranker thực tế dùng predict_proba, không dùng lớp nhị phân hoặc mốc 0,5 để chọn ngành. Một lần đổi lớp không tự chứng minh nguyên nhân đổi Top-3.

Đối soát cụ thể: 8/21 cặp đổi cả Top-3 dù không đổi lớp nhị phân nào; random_122:R1 không đổi leaf ở cả ba mô hình XGBoost nhưng vẫn đổi cả Top-3. Vì vậy không thể giải thích toàn bộ 21 cặp bằng ranh giới lớp 0,5 hoặc chỉ bằng XGBoost.

Không phát hiện sai khác suy luận hoặc bug ranking trong 21 cặp. Đây là hành vi nhạy cần trình bày minh bạch; chưa chứng nhận chất lượng hướng nghiệp và không chứng minh P2 hơn P0.

| Hồ sơ | Câu | Trước→sau | Gap 3/4 trước | Gap 3/4 sau |
|---|---|---|---|---|
| balanced_small_C | S1 | 3→2 | 0.05329810 | 0.00603108 |
| balanced_small_C | R5 | 3→4 | 0.05329810 | 0.02349404 |
| balanced_small_C | I3 | 3→4 | 0.05329810 | 0.04650737 |
| random_004 | R1 | 3→2 | 0.01387567 | 0.03134915 |
| random_004 | R5 | 5→4 | 0.01387567 | 0.03622285 |
| random_013 | R1 | 2→3 | 0.12850944 | 0.03929399 |
| random_026 | R1 | 3→2 | 0.00198370 | 0.05541011 |
| random_027 | S3 | 4→5 | 0.01159916 | 0.00086727 |
| random_027 | R4 | 5→4 | 0.01159916 | 0.01792680 |
| random_027 | R5 | 4→3 | 0.01159916 | 0.06093485 |
| random_027 | E5 | 3→4 | 0.01159916 | 0.04264177 |
| random_054 | R1 | 4→3 | 0.02554372 | 0.01551895 |
| random_054 | R5 | 4→3 | 0.02554372 | 0.01384880 |
| random_100 | S1 | 4→3 | 0.09789025 | 0.01794661 |
| random_119 | R1 | 2→3 | 0.09209565 | 0.00144620 |
| random_122 | R1 | 4→5 | 0.02699060 | 0.02938606 |
| random_122 | S1 | 2→1 | 0.02699060 | 0.02318390 |
| random_122 | R3 | 1→2 | 0.02699060 | 0.03576276 |
| random_122 | R4 | 2→3 | 0.02699060 | 0.03881959 |
| random_122 | R5 | 3→4 | 0.02699060 | 0.03490973 |
| random_127 | R1 | 1→2 | 0.01344030 | 0.03466846 |

## balanced_small_C:S1

Câu S1: 3 → 2. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 3 | 3 |
| I1 | 3 | 3 |
| A1 | 3 | 3 |
| R2 | 3 | 3 |
| I2 | 3 | 3 |
| A2 | 3 | 3 |
| S1 | 3 | 2 |
| S2 | 3 | 3 |
| R3 | 3 | 3 |
| A3 | 3 | 3 |
| S3 | 3 | 3 |
| E1 | 3 | 3 |
| R4 | 3 | 3 |
| S4 | 3 | 3 |
| E2 | 3 | 3 |
| R5 | 3 | 3 |
| I3 | 3 | 3 |
| A4 | 3 | 3 |
| E3 | 3 | 3 |
| I4 | 3 | 3 |
| A5 | 3 | 3 |
| E4 | 3 | 3 |
| C1 | 4 | 4 |
| E5 | 3 | 3 |
| C2 | 3 | 3 |
| C3 | 3 | 3 |
| C4 | 3 | 3 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.00000000 | 3.00000000 | 0.39458914 | 0.44820415 | 0.43259827 | 0.66785497 |
| I | 3.00000000 | 3.00000000 | 0.49964127 | 0.49448022 | 0.34108904 | 0.32081784 |
| A | 3.00000000 | 3.00000000 | 0.57321740 | 0.55503763 | 0.31075948 | 0.24254270 |
| S | 3.00000000 | 2.75000000 | 0.58805370 | 0.37529403 | 0.60994668 | -0.31268851 |
| E | 3.00000000 | 3.00000000 | 0.56679865 | 0.57982590 | 0.42685479 | 0.48257443 |
| C | 3.25000000 | 3.25000000 | 0.64275962 | 0.58718902 | 1.03162196 | 0.79605349 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | ke_toan | 0.8495390787 |
| P0 | before | 2 | ngon_ngu_anh | 0.6283674530 |
| P0 | before | 3 | ky_thuat_phan_mem | 0.5364578950 |
| P0 | after | 1 | ke_toan | 0.6903714316 |
| P0 | after | 2 | quan_ly_dat_dai | 0.6510119929 |
| P0 | after | 3 | ky_thuat_phan_mem | 0.6389030185 |
| P2 | before | 1 | ke_toan | 0.7816827129 |
| P2 | before | 2 | quan_tri_khach_san | 0.5837118499 |
| P2 | before | 3 | ngon_ngu_anh | 0.5270121504 |
| P2 | after | 1 | quan_ly_dat_dai | 0.7158433789 |
| P2 | after | 2 | cong_nghe_ky_thuat_xay_dung | 0.6995623585 |
| P2 | after | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.6506096482 |

Rời Top-3 P2: ke_toan, ngon_ngu_anh, quan_tri_khach_san.

Gia nhập Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, cong_nghe_ky_thuat_xay_dung, quan_ly_dat_dai.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 11 | 21 | 0.25421280 | -0.83394418 | -1.08815698 |
| giao_duc_mam_non | 12 | 19 | 0.23963392 | -0.81014821 | -1.04978213 |
| quan_ly_giao_duc | 5 | 17 | 0.44955002 | -0.40313598 | -0.85268600 |
| tam_ly_hoc_giao_duc | 13 | 18 | 0.22598832 | -0.74706122 | -0.97304954 |
| ky_thuat_phan_mem | 8 | 6 | 0.33642183 | 0.52137791 | 0.18495608 |
| kinh_te | 14 | 12 | 0.22145421 | 0.22667573 | 0.00522152 |
| quan_tri_kinh_doanh | 4 | 11 | 0.47371405 | 0.28573845 | -0.18797560 |
| ke_toan | 1 | 7 | 0.78168271 | 0.47179772 | -0.30988500 |
| tai_chinh_ngan_hang | 6 | 9 | 0.40419665 | 0.33235403 | -0.07184263 |
| quan_tri_khach_san | 2 | 13 | 0.58371185 | 0.15337702 | -0.43033483 |
| ngon_ngu_anh | 3 | 16 | 0.52701215 | -0.07940912 | -0.60642127 |
| van_hoc | 15 | 14 | 0.18199376 | 0.08559171 | -0.09640205 |
| luat | 10 | 15 | 0.30009383 | 0.03000191 | -0.27009192 |
| cong_nghe_ky_thuat_xay_dung | 18 | 2 | 0.07607949 | 0.69956236 | 0.62348287 |
| ky_thuat_dien_tu_vien_thong | 17 | 5 | 0.08812662 | 0.58692628 | 0.49879965 |
| ky_thuat_dien | 20 | 4 | 0.05147812 | 0.64457857 | 0.59310045 |
| cong_nghe_ky_thuat_hoa_hoc | 19 | 3 | 0.05671646 | 0.65060965 | 0.59389319 |
| toan_hoc | 16 | 10 | 0.11063512 | 0.29203780 | 0.18140268 |
| nong_hoc | 21 | 8 | -0.18780940 | 0.41700335 | 0.60481275 |
| quan_ly_dat_dai | 7 | 1 | 0.34075911 | 0.71584338 | 0.37508426 |
| cong_tac_xa_hoi | 9 | 20 | 0.30010968 | -0.81201960 | -1.11212929 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.42806224403166415,
      -0.20792932604786096
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      148
    ],
    "raw_margins": [
      -0.0014349319972097874,
      -0.02208002470433712
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.29499030451634267,
      0.22104619719959537
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 23,
    "changed_tree_indices_0based": [
      0,
      1,
      2,
      3,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      19,
      20,
      23,
      26,
      38,
      66,
      137,
      146
    ],
    "raw_margins": [
      0.3559251129627228,
      -0.5095712542533875
    ],
    "binary_class_changed": true
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.26880149394496644,
      0.3220587447595503
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 13,
    "changed_tree_indices_0based": [
      36,
      46,
      54,
      67,
      70,
      79,
      82,
      96,
      104,
      106,
      114,
      121,
      156
    ],
    "raw_margins": [
      0.5873619914054871,
      0.3523569703102112
    ],
    "binary_class_changed": false
  }
}
```

## balanced_small_C:R5

Câu R5: 3 → 4. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 3 | 3 |
| I1 | 3 | 3 |
| A1 | 3 | 3 |
| R2 | 3 | 3 |
| I2 | 3 | 3 |
| A2 | 3 | 3 |
| S1 | 3 | 3 |
| S2 | 3 | 3 |
| R3 | 3 | 3 |
| A3 | 3 | 3 |
| S3 | 3 | 3 |
| E1 | 3 | 3 |
| R4 | 3 | 3 |
| S4 | 3 | 3 |
| E2 | 3 | 3 |
| R5 | 3 | 4 |
| I3 | 3 | 3 |
| A4 | 3 | 3 |
| E3 | 3 | 3 |
| I4 | 3 | 3 |
| A5 | 3 | 3 |
| E4 | 3 | 3 |
| C1 | 4 | 4 |
| E5 | 3 | 3 |
| C2 | 3 | 3 |
| C3 | 3 | 3 |
| C4 | 3 | 3 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.00000000 | 3.20000000 | 0.39458914 | 0.47444376 | 0.43259827 | 0.78299149 |
| I | 3.00000000 | 3.00000000 | 0.49964127 | 0.49639353 | 0.34108904 | 0.32833280 |
| A | 3.00000000 | 3.00000000 | 0.57321740 | 0.55578590 | 0.31075948 | 0.24535047 |
| S | 3.00000000 | 3.00000000 | 0.58805370 | 0.56987751 | 0.60994668 | 0.53112535 |
| E | 3.00000000 | 3.00000000 | 0.56679865 | 0.53558938 | 0.42685479 | 0.29336774 |
| C | 3.25000000 | 3.25000000 | 0.64275962 | 0.60126519 | 1.03162196 | 0.85572358 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | ke_toan | 0.8495390787 |
| P0 | before | 2 | ngon_ngu_anh | 0.6283674530 |
| P0 | before | 3 | ky_thuat_phan_mem | 0.5364578950 |
| P0 | after | 1 | quan_ly_dat_dai | 0.7722935909 |
| P0 | after | 2 | cong_nghe_ky_thuat_xay_dung | 0.6642701714 |
| P0 | after | 3 | ky_thuat_dien_tu_vien_thong | 0.6069837051 |
| P2 | before | 1 | ke_toan | 0.7816827129 |
| P2 | before | 2 | quan_tri_khach_san | 0.5837118499 |
| P2 | before | 3 | ngon_ngu_anh | 0.5270121504 |
| P2 | after | 1 | quan_ly_dat_dai | 0.6641539578 |
| P2 | after | 2 | cong_nghe_ky_thuat_xay_dung | 0.5576221656 |
| P2 | after | 3 | ky_thuat_dien_tu_vien_thong | 0.5267350827 |

Rời Top-3 P2: ke_toan, ngon_ngu_anh, quan_tri_khach_san.

Gia nhập Top-3 P2: cong_nghe_ky_thuat_xay_dung, ky_thuat_dien_tu_vien_thong, quan_ly_dat_dai.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 11 | 14 | 0.25421280 | 0.03520299 | -0.21900981 |
| giao_duc_mam_non | 12 | 13 | 0.23963392 | 0.08799593 | -0.15163799 |
| quan_ly_giao_duc | 5 | 17 | 0.44955002 | -0.12508212 | -0.57463214 |
| tam_ly_hoc_giao_duc | 13 | 18 | 0.22598832 | -0.19551889 | -0.42150721 |
| ky_thuat_phan_mem | 8 | 6 | 0.33642183 | 0.37075523 | 0.03433340 |
| kinh_te | 14 | 20 | 0.22145421 | -0.30796739 | -0.52942160 |
| quan_tri_kinh_doanh | 4 | 12 | 0.47371405 | 0.11011490 | -0.36359915 |
| ke_toan | 1 | 7 | 0.78168271 | 0.36755559 | -0.41412712 |
| tai_chinh_ngan_hang | 6 | 16 | 0.40419665 | -0.06777352 | -0.47197017 |
| quan_tri_khach_san | 2 | 9 | 0.58371185 | 0.28824509 | -0.29546676 |
| ngon_ngu_anh | 3 | 11 | 0.52701215 | 0.12537445 | -0.40163770 |
| van_hoc | 15 | 21 | 0.18199376 | -0.38988713 | -0.57188089 |
| luat | 10 | 19 | 0.30009383 | -0.27375764 | -0.57385147 |
| cong_nghe_ky_thuat_xay_dung | 18 | 2 | 0.07607949 | 0.55762217 | 0.48154267 |
| ky_thuat_dien_tu_vien_thong | 17 | 3 | 0.08812662 | 0.52673508 | 0.43860846 |
| ky_thuat_dien | 20 | 4 | 0.05147812 | 0.50324104 | 0.45176292 |
| cong_nghe_ky_thuat_hoa_hoc | 19 | 5 | 0.05671646 | 0.49294838 | 0.43623192 |
| toan_hoc | 16 | 10 | 0.11063512 | 0.13388434 | 0.02324922 |
| nong_hoc | 21 | 8 | -0.18780940 | 0.29620190 | 0.48401130 |
| quan_ly_dat_dai | 7 | 1 | 0.34075911 | 0.66415396 | 0.32339484 |
| cong_tac_xa_hoi | 9 | 15 | 0.30010968 | -0.03612013 | -0.33622981 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.42806224403166415,
      -0.10231411550249359
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      157
    ],
    "raw_margins": [
      -0.0014349319972097874,
      -0.01442621648311615
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.29499030451634267,
      0.22407649973482033
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 7,
    "changed_tree_indices_0based": [
      89,
      95,
      119,
      124,
      141,
      143,
      157
    ],
    "raw_margins": [
      0.3559251129627228,
      0.28135138750076294
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.26880149394496644,
      0.1425986574429566
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 9,
    "changed_tree_indices_0based": [
      83,
      105,
      108,
      113,
      118,
      123,
      143,
      148,
      154
    ],
    "raw_margins": [
      0.5873619914054871,
      0.4107394516468048
    ],
    "binary_class_changed": false
  }
}
```

## balanced_small_C:I3

Câu I3: 3 → 4. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 3 | 3 |
| I1 | 3 | 3 |
| A1 | 3 | 3 |
| R2 | 3 | 3 |
| I2 | 3 | 3 |
| A2 | 3 | 3 |
| S1 | 3 | 3 |
| S2 | 3 | 3 |
| R3 | 3 | 3 |
| A3 | 3 | 3 |
| S3 | 3 | 3 |
| E1 | 3 | 3 |
| R4 | 3 | 3 |
| S4 | 3 | 3 |
| E2 | 3 | 3 |
| R5 | 3 | 3 |
| I3 | 3 | 4 |
| A4 | 3 | 3 |
| E3 | 3 | 3 |
| I4 | 3 | 3 |
| A5 | 3 | 3 |
| E4 | 3 | 3 |
| C1 | 4 | 4 |
| E5 | 3 | 3 |
| C2 | 3 | 3 |
| C3 | 3 | 3 |
| C4 | 3 | 3 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.00000000 | 3.00000000 | 0.39458914 | 0.43605281 | 0.43259827 | 0.61453622 |
| I | 3.00000000 | 3.25000000 | 0.49964127 | 0.66844952 | 0.34108904 | 1.00412224 |
| A | 3.00000000 | 3.00000000 | 0.57321740 | 0.55423114 | 0.31075948 | 0.23951647 |
| S | 3.00000000 | 3.00000000 | 0.58805370 | 0.55040461 | 0.60994668 | 0.44668087 |
| E | 3.00000000 | 3.00000000 | 0.56679865 | 0.56249866 | 0.42685479 | 0.40846305 |
| C | 3.25000000 | 3.25000000 | 0.64275962 | 0.61946154 | 1.03162196 | 0.93285942 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | ke_toan | 0.8495390787 |
| P0 | before | 2 | ngon_ngu_anh | 0.6283674530 |
| P0 | before | 3 | ky_thuat_phan_mem | 0.5364578950 |
| P0 | after | 1 | ky_thuat_phan_mem | 0.9365272888 |
| P0 | after | 2 | toan_hoc | 0.8794818150 |
| P0 | after | 3 | ke_toan | 0.7477229982 |
| P2 | before | 1 | ke_toan | 0.7816827129 |
| P2 | before | 2 | quan_tri_khach_san | 0.5837118499 |
| P2 | before | 3 | ngon_ngu_anh | 0.5270121504 |
| P2 | after | 1 | ky_thuat_phan_mem | 0.9447316577 |
| P2 | after | 2 | toan_hoc | 0.8323958490 |
| P2 | after | 3 | quan_ly_dat_dai | 0.8173441975 |

Rời Top-3 P2: ke_toan, ngon_ngu_anh, quan_tri_khach_san.

Gia nhập Top-3 P2: ky_thuat_phan_mem, quan_ly_dat_dai, toan_hoc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 11 | 19 | 0.25421280 | -0.19690007 | -0.45111287 |
| giao_duc_mam_non | 12 | 21 | 0.23963392 | -0.31577598 | -0.55540990 |
| quan_ly_giao_duc | 5 | 18 | 0.44955002 | -0.11054900 | -0.56009902 |
| tam_ly_hoc_giao_duc | 13 | 14 | 0.22598832 | 0.14093810 | -0.08505022 |
| ky_thuat_phan_mem | 8 | 1 | 0.33642183 | 0.94473166 | 0.60830982 |
| kinh_te | 14 | 11 | 0.22145421 | 0.34619972 | 0.12474550 |
| quan_tri_kinh_doanh | 4 | 15 | 0.47371405 | 0.08401355 | -0.38970050 |
| ke_toan | 1 | 9 | 0.78168271 | 0.64374999 | -0.13793272 |
| tai_chinh_ngan_hang | 6 | 10 | 0.40419665 | 0.58678494 | 0.18258828 |
| quan_tri_khach_san | 2 | 16 | 0.58371185 | -0.09648052 | -0.68019237 |
| ngon_ngu_anh | 3 | 13 | 0.52701215 | 0.17573427 | -0.35127788 |
| van_hoc | 15 | 20 | 0.18199376 | -0.22295813 | -0.40495189 |
| luat | 10 | 12 | 0.30009383 | 0.28461753 | -0.01547630 |
| cong_nghe_ky_thuat_xay_dung | 18 | 7 | 0.07607949 | 0.68741422 | 0.61133473 |
| ky_thuat_dien_tu_vien_thong | 17 | 4 | 0.08812662 | 0.77083683 | 0.68271020 |
| ky_thuat_dien | 20 | 6 | 0.05147812 | 0.74750517 | 0.69602705 |
| cong_nghe_ky_thuat_hoa_hoc | 19 | 5 | 0.05671646 | 0.75560676 | 0.69889030 |
| toan_hoc | 16 | 2 | 0.11063512 | 0.83239585 | 0.72176073 |
| nong_hoc | 21 | 8 | -0.18780940 | 0.68288231 | 0.87069171 |
| quan_ly_dat_dai | 7 | 3 | 0.34075911 | 0.81734420 | 0.47658508 |
| cong_tac_xa_hoi | 9 | 17 | 0.30010968 | -0.10097085 | -0.40108053 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.42806224403166415,
      -0.2571972722084518
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 24,
    "changed_tree_indices_0based": [
      3,
      6,
      8,
      9,
      11,
      13,
      14,
      16,
      18,
      21,
      26,
      30,
      36,
      37,
      39,
      40,
      56,
      62,
      92,
      95,
      116,
      125,
      127,
      131
    ],
    "raw_margins": [
      -0.0014349319972097874,
      0.7011808156967163
    ],
    "binary_class_changed": true
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.29499030451634267,
      0.21778125465085982
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 11,
    "changed_tree_indices_0based": [
      70,
      86,
      90,
      92,
      94,
      96,
      103,
      117,
      136,
      139,
      150
    ],
    "raw_margins": [
      0.3559251129627228,
      0.2023056447505951
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.26880149394496644,
      0.25130898801137325
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 7,
    "changed_tree_indices_0based": [
      107,
      117,
      119,
      130,
      132,
      137,
      139
    ],
    "raw_margins": [
      0.5873619914054871,
      0.4872633218765259
    ],
    "binary_class_changed": false
  }
}
```

## random_004:R1

Câu R1: 3 → 2. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 3 | 2 |
| I1 | 2 | 2 |
| A1 | 2 | 2 |
| R2 | 5 | 5 |
| I2 | 4 | 4 |
| A2 | 1 | 1 |
| S1 | 1 | 1 |
| S2 | 1 | 1 |
| R3 | 2 | 2 |
| A3 | 2 | 2 |
| S3 | 4 | 4 |
| E1 | 5 | 5 |
| R4 | 1 | 1 |
| S4 | 4 | 4 |
| E2 | 4 | 4 |
| R5 | 5 | 5 |
| I3 | 4 | 4 |
| A4 | 5 | 5 |
| E3 | 3 | 3 |
| I4 | 5 | 5 |
| A5 | 1 | 1 |
| E4 | 1 | 1 |
| C1 | 5 | 5 |
| E5 | 3 | 3 |
| C2 | 3 | 3 |
| C3 | 1 | 1 |
| C4 | 3 | 3 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.20000000 | 3.00000000 | 0.40332467 | 0.29882401 | 0.47092878 | 0.01239143 |
| I | 3.75000000 | 3.75000000 | 0.67831504 | 0.57455134 | 1.04287134 | 0.63531557 |
| A | 2.20000000 | 2.20000000 | 0.54390929 | 0.57060040 | 0.20078533 | 0.30093957 |
| S | 2.50000000 | 2.50000000 | 0.36883950 | 0.36181539 | -0.34067865 | -0.37113880 |
| E | 3.20000000 | 3.20000000 | 0.54425570 | 0.57778510 | 0.33043499 | 0.47384559 |
| C | 3.00000000 | 3.00000000 | 0.47922006 | 0.50145507 | 0.33836398 | 0.43262004 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | ky_thuat_dien | 0.7414768485 |
| P0 | before | 2 | nong_hoc | 0.7270525456 |
| P0 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.7224891472 |
| P0 | after | 1 | ky_thuat_dien | 0.6626783903 |
| P0 | after | 2 | ky_thuat_phan_mem | 0.6557207483 |
| P0 | after | 3 | nong_hoc | 0.6537879820 |
| P2 | before | 1 | nong_hoc | 0.7876830618 |
| P2 | before | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.7701775855 |
| P2 | before | 3 | ky_thuat_dien | 0.7575408987 |
| P2 | after | 1 | kinh_te | 0.7212658061 |
| P2 | after | 2 | tai_chinh_ngan_hang | 0.7119966213 |
| P2 | after | 3 | ky_thuat_phan_mem | 0.5684114826 |

Rời Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, ky_thuat_dien, nong_hoc.

Gia nhập Top-3 P2: kinh_te, ky_thuat_phan_mem, tai_chinh_ngan_hang.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 20 | 20 | -0.72791745 | -0.72046895 | 0.00744850 |
| giao_duc_mam_non | 21 | 21 | -0.81783655 | -0.81764174 | 0.00019481 |
| quan_ly_giao_duc | 18 | 17 | -0.53624078 | -0.13700624 | 0.39923453 |
| tam_ly_hoc_giao_duc | 16 | 18 | -0.33469314 | -0.25504652 | 0.07964662 |
| ky_thuat_phan_mem | 4 | 3 | 0.74366523 | 0.56841148 | -0.17525375 |
| kinh_te | 10 | 1 | 0.33562169 | 0.72126581 | 0.38564412 |
| quan_tri_kinh_doanh | 14 | 14 | -0.12674718 | 0.24012384 | 0.36687102 |
| ke_toan | 11 | 6 | 0.20136187 | 0.49507737 | 0.29371550 |
| tai_chinh_ngan_hang | 9 | 2 | 0.41414788 | 0.71199662 | 0.29784875 |
| quan_tri_khach_san | 17 | 16 | -0.44932775 | -0.10976449 | 0.33956327 |
| ngon_ngu_anh | 15 | 15 | -0.19108687 | 0.08574454 | 0.27683141 |
| van_hoc | 13 | 7 | -0.10592951 | 0.47484534 | 0.58077486 |
| luat | 12 | 5 | 0.12665136 | 0.51269031 | 0.38603895 |
| cong_nghe_ky_thuat_xay_dung | 7 | 11 | 0.70629571 | 0.29419389 | -0.41210182 |
| ky_thuat_dien_tu_vien_thong | 6 | 12 | 0.72594329 | 0.28828770 | -0.43765559 |
| ky_thuat_dien | 3 | 10 | 0.75754090 | 0.33144794 | -0.42609296 |
| cong_nghe_ky_thuat_hoa_hoc | 2 | 8 | 0.77017759 | 0.35668820 | -0.41348938 |
| toan_hoc | 5 | 4 | 0.74267403 | 0.53706233 | -0.20561170 |
| nong_hoc | 1 | 13 | 0.78768306 | 0.27786764 | -0.50981542 |
| quan_ly_dat_dai | 8 | 9 | 0.64875668 | 0.34044005 | -0.30831663 |
| cong_tac_xa_hoi | 19 | 19 | -0.65788414 | -0.58220887 | 0.07567527 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.39163126013326366,
      -0.8529041217718266
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 15,
    "changed_tree_indices_0based": [
      36,
      48,
      51,
      52,
      62,
      63,
      84,
      85,
      87,
      114,
      118,
      123,
      125,
      127,
      144
    ],
    "raw_margins": [
      0.7460390329360962,
      0.3004452884197235
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.17609077428723882,
      0.2843011704628028
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      143
    ],
    "raw_margins": [
      -0.5371986627578735,
      -0.5674934983253479
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.17748726459349992,
      0.31368757358704435
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 5,
    "changed_tree_indices_0based": [
      62,
      87,
      100,
      102,
      116
    ],
    "raw_margins": [
      -0.08316770941019058,
      0.005820275284349918
    ],
    "binary_class_changed": true
  }
}
```

## random_004:R5

Câu R5: 5 → 4. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 3 | 3 |
| I1 | 2 | 2 |
| A1 | 2 | 2 |
| R2 | 5 | 5 |
| I2 | 4 | 4 |
| A2 | 1 | 1 |
| S1 | 1 | 1 |
| S2 | 1 | 1 |
| R3 | 2 | 2 |
| A3 | 2 | 2 |
| S3 | 4 | 4 |
| E1 | 5 | 5 |
| R4 | 1 | 1 |
| S4 | 4 | 4 |
| E2 | 4 | 4 |
| R5 | 5 | 4 |
| I3 | 4 | 4 |
| A4 | 5 | 5 |
| E3 | 3 | 3 |
| I4 | 5 | 5 |
| A5 | 1 | 1 |
| E4 | 1 | 1 |
| C1 | 5 | 5 |
| E5 | 3 | 3 |
| C2 | 3 | 3 |
| C3 | 1 | 1 |
| C4 | 3 | 3 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.20000000 | 3.00000000 | 0.40332467 | 0.32797032 | 0.47092878 | 0.14028223 |
| I | 3.75000000 | 3.75000000 | 0.67831504 | 0.67831504 | 1.04287134 | 1.04287134 |
| A | 2.20000000 | 2.20000000 | 0.54390929 | 0.56143909 | 0.20078533 | 0.26656319 |
| S | 2.50000000 | 2.50000000 | 0.36883950 | 0.36883950 | -0.34067865 | -0.34067865 |
| E | 3.20000000 | 3.20000000 | 0.54425570 | 0.57534434 | 0.33043499 | 0.46340609 |
| C | 3.00000000 | 3.00000000 | 0.47922006 | 0.50401610 | 0.33836398 | 0.44347648 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | ky_thuat_dien | 0.7414768485 |
| P0 | before | 2 | nong_hoc | 0.7270525456 |
| P0 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.7224891472 |
| P0 | after | 1 | ky_thuat_dien | 0.6626783903 |
| P0 | after | 2 | ky_thuat_phan_mem | 0.6557207483 |
| P0 | after | 3 | nong_hoc | 0.6537879820 |
| P2 | before | 1 | nong_hoc | 0.7876830618 |
| P2 | before | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.7701775855 |
| P2 | before | 3 | ky_thuat_dien | 0.7575408987 |
| P2 | after | 1 | toan_hoc | 0.7136444107 |
| P2 | after | 2 | ky_thuat_phan_mem | 0.7069675028 |
| P2 | after | 3 | tai_chinh_ngan_hang | 0.6588262711 |

Rời Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, ky_thuat_dien, nong_hoc.

Gia nhập Top-3 P2: ky_thuat_phan_mem, tai_chinh_ngan_hang, toan_hoc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 20 | 20 | -0.72791745 | -0.65489904 | 0.07301842 |
| giao_duc_mam_non | 21 | 21 | -0.81783655 | -0.77698585 | 0.04085069 |
| quan_ly_giao_duc | 18 | 17 | -0.53624078 | -0.25315018 | 0.28309059 |
| tam_ly_hoc_giao_duc | 16 | 16 | -0.33469314 | -0.15284703 | 0.18184612 |
| ky_thuat_phan_mem | 4 | 2 | 0.74366523 | 0.70696750 | -0.03669773 |
| kinh_te | 10 | 4 | 0.33562169 | 0.62260342 | 0.28698173 |
| quan_tri_kinh_doanh | 14 | 14 | -0.12674718 | 0.06802055 | 0.19476773 |
| ke_toan | 11 | 12 | 0.20136187 | 0.40124832 | 0.19988645 |
| tai_chinh_ngan_hang | 9 | 3 | 0.41414788 | 0.65882627 | 0.24467840 |
| quan_tri_khach_san | 17 | 18 | -0.44932775 | -0.29921221 | 0.15011554 |
| ngon_ngu_anh | 15 | 15 | -0.19108687 | -0.00363921 | 0.18744766 |
| van_hoc | 13 | 13 | -0.10592951 | 0.21347988 | 0.31940940 |
| luat | 12 | 11 | 0.12665136 | 0.42682826 | 0.30017691 |
| cong_nghe_ky_thuat_xay_dung | 7 | 10 | 0.70629571 | 0.45021964 | -0.25607607 |
| ky_thuat_dien_tu_vien_thong | 6 | 8 | 0.72594329 | 0.48459491 | -0.24134838 |
| ky_thuat_dien | 3 | 7 | 0.75754090 | 0.51455395 | -0.24298695 |
| cong_nghe_ky_thuat_hoa_hoc | 2 | 5 | 0.77017759 | 0.53548032 | -0.23469727 |
| toan_hoc | 5 | 1 | 0.74267403 | 0.71364441 | -0.02902962 |
| nong_hoc | 1 | 6 | 0.78768306 | 0.52799823 | -0.25968483 |
| quan_ly_dat_dai | 8 | 9 | 0.64875668 | 0.46486740 | -0.18388928 |
| cong_tac_xa_hoi | 19 | 19 | -0.65788414 | -0.52270212 | 0.13518201 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.39163126013326366,
      -0.717379388662434
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.7460390329360962,
      0.7460390329360962
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.17609077428723882,
      0.24700457906876114
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      -0.5371986627578735,
      -0.5371986627578735
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.17748726459349992,
      0.30369010109551
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 3,
    "changed_tree_indices_0based": [
      106,
      141,
      147
    ],
    "raw_margins": [
      -0.08316770941019058,
      0.016064859926700592
    ],
    "binary_class_changed": true
  }
}
```

## random_013:R1

Câu R1: 2 → 3. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 2 | 3 |
| I1 | 3 | 3 |
| A1 | 3 | 3 |
| R2 | 5 | 5 |
| I2 | 2 | 2 |
| A2 | 3 | 3 |
| S1 | 2 | 2 |
| S2 | 3 | 3 |
| R3 | 5 | 5 |
| A3 | 4 | 4 |
| S3 | 3 | 3 |
| E1 | 1 | 1 |
| R4 | 1 | 1 |
| S4 | 4 | 4 |
| E2 | 3 | 3 |
| R5 | 1 | 1 |
| I3 | 1 | 1 |
| A4 | 3 | 3 |
| E3 | 2 | 2 |
| I4 | 3 | 3 |
| A5 | 2 | 2 |
| E4 | 4 | 4 |
| C1 | 5 | 5 |
| E5 | 4 | 4 |
| C2 | 5 | 5 |
| C3 | 1 | 1 |
| C4 | 1 | 1 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 2.80000000 | 3.00000000 | 0.30491986 | 0.41030485 | 0.03913936 | 0.50155703 |
| I | 2.25000000 | 2.25000000 | 0.12334959 | 0.14752750 | -1.13688298 | -1.04191869 |
| A | 3.00000000 | 3.00000000 | 0.59959586 | 0.57335947 | 0.40974055 | 0.31129257 |
| S | 3.00000000 | 3.00000000 | 0.26835713 | 0.26835713 | -0.77642182 | -0.77642182 |
| E | 2.80000000 | 2.80000000 | 0.47590315 | 0.44209537 | 0.03808021 | -0.10652110 |
| C | 3.00000000 | 3.00000000 | 0.26629800 | 0.26095602 | -0.56423062 | -0.58687571 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | giao_duc_mam_non | 0.5005968392 |
| P0 | before | 2 | quan_tri_khach_san | 0.4671061281 |
| P0 | before | 3 | giao_duc_tieu_hoc | 0.3776660376 |
| P0 | after | 1 | giao_duc_mam_non | 0.4152203659 |
| P0 | after | 2 | quan_tri_khach_san | 0.3999971490 |
| P0 | after | 3 | giao_duc_tieu_hoc | 0.2646512535 |
| P2 | before | 1 | van_hoc | 0.2875556572 |
| P2 | before | 2 | quan_tri_khach_san | 0.0555068786 |
| P2 | before | 3 | quan_tri_kinh_doanh | -0.0457762632 |
| P2 | after | 1 | cong_nghe_ky_thuat_xay_dung | 0.1183107534 |
| P2 | after | 2 | ky_thuat_dien | 0.0150696624 |
| P2 | after | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.0102777568 |

Rời Top-3 P2: quan_tri_khach_san, quan_tri_kinh_doanh, van_hoc.

Gia nhập Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, cong_nghe_ky_thuat_xay_dung, ky_thuat_dien.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 14 | 13 | -0.39483798 | -0.45986101 | -0.06502303 |
| giao_duc_mam_non | 6 | 10 | -0.24793961 | -0.29756425 | -0.04962463 |
| quan_ly_giao_duc | 10 | 17 | -0.30569146 | -0.55189826 | -0.24620679 |
| tam_ly_hoc_giao_duc | 21 | 21 | -0.70993394 | -0.83883480 | -0.12890087 |
| ky_thuat_phan_mem | 19 | 12 | -0.57692543 | -0.44912398 | 0.12780145 |
| kinh_te | 11 | 15 | -0.30878762 | -0.52858870 | -0.21980108 |
| quan_tri_kinh_doanh | 3 | 9 | -0.04577626 | -0.20283346 | -0.15705720 |
| ke_toan | 16 | 16 | -0.42654570 | -0.53149362 | -0.10494791 |
| tai_chinh_ngan_hang | 17 | 18 | -0.47636221 | -0.63100762 | -0.15464541 |
| quan_tri_khach_san | 2 | 8 | 0.05550688 | -0.07589529 | -0.13140217 |
| ngon_ngu_anh | 5 | 11 | -0.18553578 | -0.33218449 | -0.14664871 |
| van_hoc | 1 | 4 | 0.28755566 | -0.02901624 | -0.31657189 |
| luat | 15 | 20 | -0.40553486 | -0.63692009 | -0.23138522 |
| cong_nghe_ky_thuat_xay_dung | 4 | 1 | -0.17428570 | 0.11831075 | 0.29259645 |
| ky_thuat_dien_tu_vien_thong | 12 | 5 | -0.32319802 | -0.03359526 | 0.28960277 |
| ky_thuat_dien | 8 | 2 | -0.27264757 | 0.01506966 | 0.28771723 |
| cong_nghe_ky_thuat_hoa_hoc | 7 | 3 | -0.27017310 | 0.01027776 | 0.28045086 |
| toan_hoc | 20 | 14 | -0.58561292 | -0.47828923 | 0.10732369 |
| nong_hoc | 13 | 6 | -0.34398619 | -0.04838052 | 0.29560568 |
| quan_ly_dat_dai | 9 | 7 | -0.29660161 | -0.05235581 | 0.24424580 |
| cong_tac_xa_hoi | 18 | 19 | -0.52431011 | -0.63253792 | -0.10822781 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.8239781584771565,
      -0.3627052968385933
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 12,
    "changed_tree_indices_0based": [
      48,
      51,
      52,
      62,
      63,
      84,
      85,
      87,
      114,
      123,
      127,
      144
    ],
    "raw_margins": [
      -1.9610857963562012,
      -1.7541263103485107
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.4037814552192297,
      0.2955710590436659
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      -1.0029737949371338,
      -1.0029737949371338
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.09646211399342783,
      -0.23266242298697212
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      99
    ],
    "raw_margins": [
      -1.0134871006011963,
      -1.0410054922103882
    ],
    "binary_class_changed": false
  }
}
```

## random_026:R1

Câu R1: 3 → 2. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 3 | 2 |
| I1 | 5 | 5 |
| A1 | 5 | 5 |
| R2 | 4 | 4 |
| I2 | 4 | 4 |
| A2 | 4 | 4 |
| S1 | 5 | 5 |
| S2 | 3 | 3 |
| R3 | 3 | 3 |
| A3 | 2 | 2 |
| S3 | 1 | 1 |
| E1 | 3 | 3 |
| R4 | 4 | 4 |
| S4 | 2 | 2 |
| E2 | 4 | 4 |
| R5 | 5 | 5 |
| I3 | 5 | 5 |
| A4 | 4 | 4 |
| E3 | 3 | 3 |
| I4 | 1 | 1 |
| A5 | 4 | 4 |
| E4 | 3 | 3 |
| C1 | 2 | 2 |
| E5 | 4 | 4 |
| C2 | 2 | 2 |
| C3 | 3 | 3 |
| C4 | 3 | 3 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.80000000 | 3.60000000 | 0.57927821 | 0.46469341 | 1.24299346 | 0.74020804 |
| I | 3.75000000 | 3.75000000 | 0.89061940 | 0.86409503 | 1.87674547 | 1.77256493 |
| A | 3.80000000 | 3.80000000 | 0.65597833 | 0.67996991 | 0.62130706 | 0.71133173 |
| S | 2.75000000 | 2.75000000 | 0.71589023 | 0.71589023 | 1.16431149 | 1.16431149 |
| E | 3.40000000 | 3.40000000 | 0.72380604 | 0.75018897 | 1.09840050 | 1.21124452 |
| C | 2.50000000 | 2.50000000 | 0.51172996 | 0.51172996 | 0.47617616 | 0.47617616 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | nong_hoc | 0.4598691716 |
| P0 | before | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.2937079154 |
| P0 | before | 3 | ky_thuat_dien | 0.2905375798 |
| P0 | after | 1 | nong_hoc | 0.3964209403 |
| P0 | after | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.2200408865 |
| P0 | after | 3 | ky_thuat_dien | 0.2128533949 |
| P2 | before | 1 | nong_hoc | 0.6085615394 |
| P2 | before | 2 | ky_thuat_dien | 0.4060690910 |
| P2 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.3823843759 |
| P2 | after | 1 | tam_ly_hoc_giao_duc | 0.4275199348 |
| P2 | after | 2 | luat | 0.3897835180 |
| P2 | after | 3 | kinh_te | 0.3593412884 |

Rời Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, ky_thuat_dien, nong_hoc.

Gia nhập Top-3 P2: kinh_te, luat, tam_ly_hoc_giao_duc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 14 | 11 | -0.07885685 | 0.05375424 | 0.13261109 |
| giao_duc_mam_non | 15 | 16 | -0.16649497 | -0.07279782 | 0.09369715 |
| quan_ly_giao_duc | 16 | 8 | -0.21105542 | 0.13321755 | 0.34427297 |
| tam_ly_hoc_giao_duc | 8 | 1 | 0.16922116 | 0.42751993 | 0.25829877 |
| ky_thuat_phan_mem | 7 | 9 | 0.23717322 | 0.12045772 | -0.11671549 |
| kinh_te | 12 | 3 | 0.04432025 | 0.35934129 | 0.31502103 |
| quan_tri_kinh_doanh | 17 | 14 | -0.21393009 | -0.02940620 | 0.18452389 |
| ke_toan | 18 | 17 | -0.25902554 | -0.11250623 | 0.14651931 |
| tai_chinh_ngan_hang | 10 | 4 | 0.06363741 | 0.30393118 | 0.24029377 |
| quan_tri_khach_san | 19 | 19 | -0.38824316 | -0.25510725 | 0.13313591 |
| ngon_ngu_anh | 20 | 21 | -0.56200240 | -0.37350783 | 0.18849456 |
| van_hoc | 21 | 20 | -0.63624744 | -0.26934840 | 0.36689904 |
| luat | 11 | 2 | 0.04877413 | 0.38978352 | 0.34100939 |
| cong_nghe_ky_thuat_xay_dung | 6 | 15 | 0.32964641 | -0.04379964 | -0.37344605 |
| ky_thuat_dien_tu_vien_thong | 4 | 13 | 0.38040068 | 0.03079393 | -0.34960675 |
| ky_thuat_dien | 2 | 10 | 0.40606909 | 0.05379195 | -0.35227715 |
| cong_nghe_ky_thuat_hoa_hoc | 3 | 12 | 0.38238438 | 0.03890494 | -0.34347944 |
| toan_hoc | 5 | 6 | 0.33199768 | 0.25776112 | -0.07423657 |
| nong_hoc | 1 | 5 | 0.60856154 | 0.27057401 | -0.33798753 |
| quan_ly_dat_dai | 9 | 18 | 0.14207770 | -0.16649280 | -0.30857051 |
| cong_tac_xa_hoi | 13 | 7 | 0.01572574 | 0.21957483 | 0.20384910 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      0
    ],
    "raw_margins": [
      0.3198110768261635,
      -0.1414617848123998
    ],
    "binary_class_changed": true
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 13,
    "changed_tree_indices_0based": [
      36,
      48,
      51,
      52,
      62,
      63,
      84,
      85,
      114,
      123,
      125,
      127,
      144
    ],
    "raw_margins": [
      2.097083330154419,
      1.849726915359497
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.6454231126102902,
      0.7536335087858542
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.9241663217544556,
      0.9241663217544556
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.9634200671619941,
      1.0996203761555383
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.04692841321229935,
      0.04692841321229935
    ],
    "binary_class_changed": false
  }
}
```

## random_027:S3

Câu S3: 4 → 5. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 3 | 3 |
| I1 | 3 | 3 |
| A1 | 5 | 5 |
| R2 | 3 | 3 |
| I2 | 5 | 5 |
| A2 | 1 | 1 |
| S1 | 5 | 5 |
| S2 | 2 | 2 |
| R3 | 1 | 1 |
| A3 | 2 | 2 |
| S3 | 4 | 5 |
| E1 | 4 | 4 |
| R4 | 5 | 5 |
| S4 | 2 | 2 |
| E2 | 4 | 4 |
| R5 | 4 | 4 |
| I3 | 4 | 4 |
| A4 | 1 | 1 |
| E3 | 1 | 1 |
| I4 | 3 | 3 |
| A5 | 2 | 2 |
| E4 | 4 | 4 |
| C1 | 2 | 2 |
| E5 | 3 | 3 |
| C2 | 5 | 5 |
| C3 | 3 | 3 |
| C4 | 4 | 4 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.20000000 | 3.20000000 | 0.50889644 | 0.49266866 | 0.93416603 | 0.86296035 |
| I | 3.75000000 | 3.75000000 | 0.72085369 | 0.72085369 | 1.20995164 | 1.20995164 |
| A | 2.20000000 | 2.20000000 | 0.28310614 | 0.26489247 | -0.77783811 | -0.84618210 |
| S | 3.25000000 | 3.50000000 | 0.61553192 | 0.73879868 | 0.72910634 | 1.26365428 |
| E | 3.20000000 | 3.20000000 | 0.68393870 | 0.68777774 | 0.92788153 | 0.94430172 |
| C | 3.50000000 | 3.50000000 | 0.58176517 | 0.58176517 | 0.77306136 | 0.77306136 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | ky_thuat_phan_mem | 0.6207055779 |
| P0 | before | 2 | tai_chinh_ngan_hang | 0.5933360334 |
| P0 | before | 3 | ke_toan | 0.5779956279 |
| P0 | after | 1 | tai_chinh_ngan_hang | 0.5204620424 |
| P0 | after | 2 | ke_toan | 0.5197697538 |
| P0 | after | 3 | ky_thuat_phan_mem | 0.5174349459 |
| P2 | before | 1 | ky_thuat_dien | 0.5306069841 |
| P2 | before | 2 | cong_nghe_ky_thuat_xay_dung | 0.5067619033 |
| P2 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.4913083225 |
| P2 | after | 1 | quan_tri_kinh_doanh | 0.4191326437 |
| P2 | after | 2 | quan_tri_khach_san | 0.3794385422 |
| P2 | after | 3 | luat | 0.3702162784 |

Rời Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, cong_nghe_ky_thuat_xay_dung, ky_thuat_dien.

Gia nhập Top-3 P2: luat, quan_tri_khach_san, quan_tri_kinh_doanh.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 18 | 17 | -0.13209260 | 0.15287456 | 0.28496716 |
| giao_duc_mam_non | 19 | 19 | -0.20585850 | 0.08004127 | 0.28589978 |
| quan_ly_giao_duc | 15 | 7 | 0.15512930 | 0.33386421 | 0.17873491 |
| tam_ly_hoc_giao_duc | 16 | 9 | 0.08095045 | 0.30715501 | 0.22620456 |
| ky_thuat_phan_mem | 9 | 14 | 0.41040503 | 0.25340288 | -0.15700215 |
| kinh_te | 13 | 16 | 0.31302416 | 0.24377651 | -0.06924765 |
| quan_tri_kinh_doanh | 8 | 1 | 0.43536153 | 0.41913264 | -0.01622889 |
| ke_toan | 10 | 5 | 0.40471462 | 0.34033721 | -0.06437741 |
| tai_chinh_ngan_hang | 6 | 4 | 0.45236249 | 0.36934901 | -0.08301348 |
| quan_tri_khach_san | 12 | 2 | 0.32552849 | 0.37943854 | 0.05391005 |
| ngon_ngu_anh | 20 | 20 | -0.48343586 | -0.41282800 | 0.07060785 |
| van_hoc | 21 | 21 | -0.61699946 | -0.62907889 | -0.01207943 |
| luat | 11 | 3 | 0.36609705 | 0.37021628 | 0.00411922 |
| cong_nghe_ky_thuat_xay_dung | 2 | 11 | 0.50676190 | 0.29464263 | -0.21211927 |
| ky_thuat_dien_tu_vien_thong | 5 | 12 | 0.47539525 | 0.28897646 | -0.18641879 |
| ky_thuat_dien | 1 | 8 | 0.53060698 | 0.32501775 | -0.20558924 |
| cong_nghe_ky_thuat_hoa_hoc | 3 | 13 | 0.49130832 | 0.28285023 | -0.20845809 |
| toan_hoc | 14 | 18 | 0.22072322 | 0.09698229 | -0.12374094 |
| nong_hoc | 4 | 10 | 0.47970916 | 0.30546501 | -0.17424415 |
| quan_ly_dat_dai | 7 | 15 | 0.43917385 | 0.24838161 | -0.19079223 |
| cong_tac_xa_hoi | 17 | 6 | 0.05930199 | 0.33750572 | 0.27820373 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      0
    ],
    "raw_margins": [
      0.03558950776401848,
      -0.029327444819674753
    ],
    "binary_class_changed": true
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.9487000703811646,
      0.9487000703811646
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.9291058987712018,
      -1.020692820762265
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 17,
    "changed_tree_indices_0based": [
      22,
      32,
      34,
      45,
      51,
      52,
      58,
      60,
      63,
      65,
      84,
      87,
      91,
      95,
      115,
      117,
      128
    ],
    "raw_margins": [
      0.47062599658966064,
      1.0397337675094604
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.771932122197986,
      0.7897504349375513
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.33002394437789917,
      0.33002394437789917
    ],
    "binary_class_changed": false
  }
}
```

## random_027:R4

Câu R4: 5 → 4. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 3 | 3 |
| I1 | 3 | 3 |
| A1 | 5 | 5 |
| R2 | 3 | 3 |
| I2 | 5 | 5 |
| A2 | 1 | 1 |
| S1 | 5 | 5 |
| S2 | 2 | 2 |
| R3 | 1 | 1 |
| A3 | 2 | 2 |
| S3 | 4 | 4 |
| E1 | 4 | 4 |
| R4 | 5 | 4 |
| S4 | 2 | 2 |
| E2 | 4 | 4 |
| R5 | 4 | 4 |
| I3 | 4 | 4 |
| A4 | 1 | 1 |
| E3 | 1 | 1 |
| I4 | 3 | 3 |
| A5 | 2 | 2 |
| E4 | 4 | 4 |
| C1 | 2 | 2 |
| E5 | 3 | 3 |
| C2 | 5 | 5 |
| C3 | 3 | 3 |
| C4 | 4 | 4 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.20000000 | 3.00000000 | 0.50889644 | 0.44010194 | 0.93416603 | 0.63230339 |
| I | 3.75000000 | 3.75000000 | 0.72085369 | 0.72095841 | 1.20995164 | 1.21036297 |
| A | 2.20000000 | 2.20000000 | 0.28310614 | 0.30121081 | -0.77783811 | -0.70990316 |
| S | 3.25000000 | 3.25000000 | 0.61553192 | 0.61553192 | 0.72910634 | 0.72910634 |
| E | 3.20000000 | 3.20000000 | 0.68393870 | 0.69078386 | 0.92788153 | 0.95715936 |
| C | 3.50000000 | 3.50000000 | 0.58176517 | 0.58176517 | 0.77306136 | 0.77306136 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | ky_thuat_phan_mem | 0.6207055779 |
| P0 | before | 2 | tai_chinh_ngan_hang | 0.5933360334 |
| P0 | before | 3 | ke_toan | 0.5779956279 |
| P0 | after | 1 | tai_chinh_ngan_hang | 0.6800851907 |
| P0 | after | 2 | ke_toan | 0.6395576097 |
| P0 | after | 3 | ky_thuat_phan_mem | 0.6126605943 |
| P2 | before | 1 | ky_thuat_dien | 0.5306069841 |
| P2 | before | 2 | cong_nghe_ky_thuat_xay_dung | 0.5067619033 |
| P2 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.4913083225 |
| P2 | after | 1 | tai_chinh_ngan_hang | 0.5789161903 |
| P2 | after | 2 | luat | 0.5204473087 |
| P2 | after | 3 | quan_tri_kinh_doanh | 0.5102244920 |

Rời Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, cong_nghe_ky_thuat_xay_dung, ky_thuat_dien.

Gia nhập Top-3 P2: luat, quan_tri_kinh_doanh, tai_chinh_ngan_hang.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 18 | 18 | -0.13209260 | -0.07896441 | 0.05312819 |
| giao_duc_mam_non | 19 | 19 | -0.20585850 | -0.17612184 | 0.02973666 |
| quan_ly_giao_duc | 15 | 14 | 0.15512930 | 0.29252959 | 0.13740029 |
| tam_ly_hoc_giao_duc | 16 | 16 | 0.08095045 | 0.20458458 | 0.12363413 |
| ky_thuat_phan_mem | 9 | 7 | 0.41040503 | 0.41094935 | 0.00054432 |
| kinh_te | 13 | 5 | 0.31302416 | 0.45748618 | 0.14446202 |
| quan_tri_kinh_doanh | 8 | 3 | 0.43536153 | 0.51022449 | 0.07486296 |
| ke_toan | 10 | 4 | 0.40471462 | 0.49229769 | 0.08758307 |
| tai_chinh_ngan_hang | 6 | 1 | 0.45236249 | 0.57891619 | 0.12655370 |
| quan_tri_khach_san | 12 | 12 | 0.32552849 | 0.36997281 | 0.04444432 |
| ngon_ngu_anh | 20 | 20 | -0.48343586 | -0.40129844 | 0.08213741 |
| van_hoc | 21 | 21 | -0.61699946 | -0.48777710 | 0.12922236 |
| luat | 11 | 2 | 0.36609705 | 0.52044731 | 0.15435025 |
| cong_nghe_ky_thuat_xay_dung | 2 | 9 | 0.50676190 | 0.38768858 | -0.11907332 |
| ky_thuat_dien_tu_vien_thong | 5 | 11 | 0.47539525 | 0.37237662 | -0.10301864 |
| ky_thuat_dien | 1 | 6 | 0.53060698 | 0.42473467 | -0.10587231 |
| cong_nghe_ky_thuat_hoa_hoc | 3 | 8 | 0.49130832 | 0.38911589 | -0.10219243 |
| toan_hoc | 14 | 15 | 0.22072322 | 0.23557349 | 0.01485026 |
| nong_hoc | 4 | 10 | 0.47970916 | 0.38038990 | -0.09931926 |
| quan_ly_dat_dai | 7 | 13 | 0.43917385 | 0.35187222 | -0.08730163 |
| cong_tac_xa_hoi | 17 | 17 | 0.05930199 | 0.14730292 | 0.08800092 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      0
    ],
    "raw_margins": [
      0.03558950776401848,
      -0.240748339042669
    ],
    "binary_class_changed": true
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      159
    ],
    "raw_margins": [
      0.9487000703811646,
      0.9492207169532776
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.9291058987712018,
      -0.8415387326381161
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.47062599658966064,
      0.47062599658966064
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.771932122197986,
      0.8037864634679863
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.33002394437789917,
      0.33002394437789917
    ],
    "binary_class_changed": false
  }
}
```

## random_027:R5

Câu R5: 4 → 3. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 3 | 3 |
| I1 | 3 | 3 |
| A1 | 5 | 5 |
| R2 | 3 | 3 |
| I2 | 5 | 5 |
| A2 | 1 | 1 |
| S1 | 5 | 5 |
| S2 | 2 | 2 |
| R3 | 1 | 1 |
| A3 | 2 | 2 |
| S3 | 4 | 4 |
| E1 | 4 | 4 |
| R4 | 5 | 5 |
| S4 | 2 | 2 |
| E2 | 4 | 4 |
| R5 | 4 | 3 |
| I3 | 4 | 4 |
| A4 | 1 | 1 |
| E3 | 1 | 1 |
| I4 | 3 | 3 |
| A5 | 2 | 2 |
| E4 | 4 | 4 |
| C1 | 2 | 2 |
| E5 | 3 | 3 |
| C2 | 5 | 5 |
| C3 | 3 | 3 |
| C4 | 4 | 4 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.20000000 | 3.00000000 | 0.50889644 | 0.42796503 | 0.93416603 | 0.57904798 |
| I | 3.75000000 | 3.75000000 | 0.72085369 | 0.72346032 | 1.20995164 | 1.22018977 |
| A | 2.20000000 | 2.20000000 | 0.28310614 | 0.29771721 | -0.77783811 | -0.72301236 |
| S | 3.25000000 | 3.25000000 | 0.61553192 | 0.71768647 | 0.72910634 | 1.17210093 |
| E | 3.20000000 | 3.20000000 | 0.68393870 | 0.71056609 | 0.92788153 | 1.04177111 |
| C | 3.50000000 | 3.50000000 | 0.58176517 | 0.59145129 | 0.77306136 | 0.81412161 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | ky_thuat_phan_mem | 0.6207055779 |
| P0 | before | 2 | tai_chinh_ngan_hang | 0.5933360334 |
| P0 | before | 3 | ke_toan | 0.5779956279 |
| P0 | after | 1 | tai_chinh_ngan_hang | 0.6800851907 |
| P0 | after | 2 | ke_toan | 0.6395576097 |
| P0 | after | 3 | ky_thuat_phan_mem | 0.6126605943 |
| P2 | before | 1 | ky_thuat_dien | 0.5306069841 |
| P2 | before | 2 | cong_nghe_ky_thuat_xay_dung | 0.5067619033 |
| P2 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.4913083225 |
| P2 | after | 1 | luat | 0.5338367263 |
| P2 | after | 2 | quan_tri_kinh_doanh | 0.5156375369 |
| P2 | after | 3 | tai_chinh_ngan_hang | 0.5145840896 |

Rời Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, cong_nghe_ky_thuat_xay_dung, ky_thuat_dien.

Gia nhập Top-3 P2: luat, quan_tri_kinh_doanh, tai_chinh_ngan_hang.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 18 | 17 | -0.13209260 | 0.15160192 | 0.28369452 |
| giao_duc_mam_non | 19 | 19 | -0.20585850 | 0.05730838 | 0.26316688 |
| quan_ly_giao_duc | 15 | 4 | 0.15512930 | 0.45364924 | 0.29851994 |
| tam_ly_hoc_giao_duc | 16 | 8 | 0.08095045 | 0.38370816 | 0.30275771 |
| ky_thuat_phan_mem | 9 | 10 | 0.41040503 | 0.26361982 | -0.14678520 |
| kinh_te | 13 | 7 | 0.31302416 | 0.40984574 | 0.09682158 |
| quan_tri_kinh_doanh | 8 | 2 | 0.43536153 | 0.51563754 | 0.08027600 |
| ke_toan | 10 | 5 | 0.40471462 | 0.44355535 | 0.03884072 |
| tai_chinh_ngan_hang | 6 | 3 | 0.45236249 | 0.51458409 | 0.06222160 |
| quan_tri_khach_san | 12 | 6 | 0.32552849 | 0.43457029 | 0.10904180 |
| ngon_ngu_anh | 20 | 20 | -0.48343586 | -0.34566178 | 0.13777407 |
| van_hoc | 21 | 21 | -0.61699946 | -0.48208596 | 0.13491351 |
| luat | 11 | 1 | 0.36609705 | 0.53383673 | 0.16773967 |
| cong_nghe_ky_thuat_xay_dung | 2 | 15 | 0.50676190 | 0.19721866 | -0.30954324 |
| ky_thuat_dien_tu_vien_thong | 5 | 14 | 0.47539525 | 0.19859341 | -0.27680184 |
| ky_thuat_dien | 1 | 11 | 0.53060698 | 0.23735431 | -0.29325267 |
| cong_nghe_ky_thuat_hoa_hoc | 3 | 13 | 0.49130832 | 0.19905900 | -0.29224932 |
| toan_hoc | 14 | 18 | 0.22072322 | 0.11209995 | -0.10862327 |
| nong_hoc | 4 | 12 | 0.47970916 | 0.21437671 | -0.26533245 |
| quan_ly_dat_dai | 7 | 16 | 0.43917385 | 0.17857435 | -0.26059950 |
| cong_tac_xa_hoi | 17 | 9 | 0.05930199 | 0.37476535 | 0.31546335 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      0
    ],
    "raw_margins": [
      0.03558950776401848,
      -0.29015862076515186
    ],
    "binary_class_changed": true
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      157
    ],
    "raw_margins": [
      0.9487000703811646,
      0.9616913795471191
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.9291058987712018,
      -0.8581920939896794
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 17,
    "changed_tree_indices_0based": [
      27,
      46,
      53,
      67,
      71,
      74,
      76,
      83,
      85,
      89,
      95,
      112,
      119,
      126,
      141,
      143,
      157
    ],
    "raw_margins": [
      0.47062599658966064,
      0.9330145120620728
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.771932122197986,
      0.898134958699996
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 10,
    "changed_tree_indices_0based": [
      73,
      92,
      105,
      113,
      115,
      118,
      123,
      137,
      143,
      148
    ],
    "raw_margins": [
      0.33002394437789917,
      0.36996811628341675
    ],
    "binary_class_changed": false
  }
}
```

## random_027:E5

Câu E5: 3 → 4. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 3 | 3 |
| I1 | 3 | 3 |
| A1 | 5 | 5 |
| R2 | 3 | 3 |
| I2 | 5 | 5 |
| A2 | 1 | 1 |
| S1 | 5 | 5 |
| S2 | 2 | 2 |
| R3 | 1 | 1 |
| A3 | 2 | 2 |
| S3 | 4 | 4 |
| E1 | 4 | 4 |
| R4 | 5 | 5 |
| S4 | 2 | 2 |
| E2 | 4 | 4 |
| R5 | 4 | 4 |
| I3 | 4 | 4 |
| A4 | 1 | 1 |
| E3 | 1 | 1 |
| I4 | 3 | 3 |
| A5 | 2 | 2 |
| E4 | 4 | 4 |
| C1 | 2 | 2 |
| E5 | 3 | 4 |
| C2 | 5 | 5 |
| C3 | 3 | 3 |
| C4 | 4 | 4 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.20000000 | 3.20000000 | 0.50889644 | 0.49937445 | 0.93416603 | 0.89238460 |
| I | 3.75000000 | 3.75000000 | 0.72085369 | 0.72085369 | 1.20995164 | 1.20995164 |
| A | 2.20000000 | 2.20000000 | 0.28310614 | 0.29217220 | -0.77783811 | -0.74381913 |
| S | 3.25000000 | 3.25000000 | 0.61553192 | 0.62322259 | 0.72910634 | 0.76245702 |
| E | 3.20000000 | 3.40000000 | 0.68393870 | 0.74508877 | 0.92788153 | 1.18943016 |
| C | 3.50000000 | 3.50000000 | 0.58176517 | 0.64477056 | 0.77306136 | 1.04014651 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | ky_thuat_phan_mem | 0.6207055779 |
| P0 | before | 2 | tai_chinh_ngan_hang | 0.5933360334 |
| P0 | before | 3 | ke_toan | 0.5779956279 |
| P0 | after | 1 | tai_chinh_ngan_hang | 0.6463174856 |
| P0 | after | 2 | ke_toan | 0.5946008638 |
| P0 | after | 3 | ky_thuat_phan_mem | 0.5452286761 |
| P2 | before | 1 | ky_thuat_dien | 0.5306069841 |
| P2 | before | 2 | cong_nghe_ky_thuat_xay_dung | 0.5067619033 |
| P2 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.4913083225 |
| P2 | after | 1 | quan_tri_kinh_doanh | 0.5843907881 |
| P2 | after | 2 | tai_chinh_ngan_hang | 0.5692230849 |
| P2 | after | 3 | ke_toan | 0.5352729005 |

Rời Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, cong_nghe_ky_thuat_xay_dung, ky_thuat_dien.

Gia nhập Top-3 P2: ke_toan, quan_tri_kinh_doanh, tai_chinh_ngan_hang.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 18 | 18 | -0.13209260 | -0.16138901 | -0.02929641 |
| giao_duc_mam_non | 19 | 19 | -0.20585850 | -0.23734647 | -0.03148797 |
| quan_ly_giao_duc | 15 | 14 | 0.15512930 | 0.26969078 | 0.11456147 |
| tam_ly_hoc_giao_duc | 16 | 16 | 0.08095045 | 0.07631162 | -0.00463882 |
| ky_thuat_phan_mem | 9 | 11 | 0.41040503 | 0.39600097 | -0.01440406 |
| kinh_te | 13 | 8 | 0.31302416 | 0.44077598 | 0.12775182 |
| quan_tri_kinh_doanh | 8 | 1 | 0.43536153 | 0.58439079 | 0.14902925 |
| ke_toan | 10 | 3 | 0.40471462 | 0.53527290 | 0.13055828 |
| tai_chinh_ngan_hang | 6 | 2 | 0.45236249 | 0.56922308 | 0.11686059 |
| quan_tri_khach_san | 12 | 5 | 0.32552849 | 0.46392444 | 0.13839594 |
| ngon_ngu_anh | 20 | 20 | -0.48343586 | -0.42977061 | 0.05366524 |
| van_hoc | 21 | 21 | -0.61699946 | -0.48379086 | 0.13320860 |
| luat | 11 | 4 | 0.36609705 | 0.49263113 | 0.12653407 |
| cong_nghe_ky_thuat_xay_dung | 2 | 7 | 0.50676190 | 0.44241018 | -0.06435173 |
| ky_thuat_dien_tu_vien_thong | 5 | 12 | 0.47539525 | 0.39530755 | -0.08008770 |
| ky_thuat_dien | 1 | 6 | 0.53060698 | 0.45887202 | -0.07173497 |
| cong_nghe_ky_thuat_hoa_hoc | 3 | 9 | 0.49130832 | 0.42079113 | -0.07051720 |
| toan_hoc | 14 | 15 | 0.22072322 | 0.17227054 | -0.04845269 |
| nong_hoc | 4 | 13 | 0.47970916 | 0.36627654 | -0.11343262 |
| quan_ly_dat_dai | 7 | 10 | 0.43917385 | 0.40415777 | -0.03501607 |
| cong_tac_xa_hoi | 17 | 17 | 0.05930199 | 0.05901352 | -0.00028848 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      0
    ],
    "raw_margins": [
      0.03558950776401848,
      -0.0025022007091930476
    ],
    "binary_class_changed": true
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.9487000703811646,
      0.9487000703811646
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.9291058987712018,
      -0.8848574772988478
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      11
    ],
    "raw_margins": [
      0.47062599658966064,
      0.5032492280006409
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.771932122197986,
      1.072588000469072
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 13,
    "changed_tree_indices_0based": [
      1,
      8,
      14,
      18,
      27,
      44,
      48,
      58,
      88,
      119,
      122,
      129,
      151
    ],
    "raw_margins": [
      0.33002394437789917,
      0.5961307287216187
    ],
    "binary_class_changed": false
  }
}
```

## random_054:R1

Câu R1: 4 → 3. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 4 | 3 |
| I1 | 4 | 4 |
| A1 | 2 | 2 |
| R2 | 2 | 2 |
| I2 | 4 | 4 |
| A2 | 5 | 5 |
| S1 | 2 | 2 |
| S2 | 5 | 5 |
| R3 | 5 | 5 |
| A3 | 3 | 3 |
| S3 | 1 | 1 |
| E1 | 4 | 4 |
| R4 | 1 | 1 |
| S4 | 4 | 4 |
| E2 | 1 | 1 |
| R5 | 4 | 4 |
| I3 | 1 | 1 |
| A4 | 3 | 3 |
| E3 | 5 | 5 |
| I4 | 4 | 4 |
| A5 | 5 | 5 |
| E4 | 4 | 4 |
| C1 | 4 | 4 |
| E5 | 3 | 3 |
| C2 | 1 | 1 |
| C3 | 4 | 4 |
| C4 | 1 | 1 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.20000000 | 3.00000000 | 0.47868546 | 0.36665761 | 0.80160360 | 0.31003776 |
| I | 3.25000000 | 3.25000000 | 0.69463122 | 0.69463122 | 1.10695687 | 1.10695687 |
| A | 3.60000000 | 3.60000000 | 0.69602131 | 0.71841906 | 0.77156215 | 0.85560621 |
| S | 3.00000000 | 3.00000000 | 0.44753650 | 0.45460591 | 0.00059193 | 0.03124851 |
| E | 3.40000000 | 3.40000000 | 0.59578230 | 0.62811113 | 0.55082248 | 0.68909807 |
| C | 2.50000000 | 2.50000000 | 0.48454064 | 0.48454064 | 0.36091836 | 0.36091836 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | van_hoc | 0.0664283707 |
| P0 | before | 2 | nong_hoc | -0.0634410388 |
| P0 | before | 3 | kinh_te | -0.1557602455 |
| P0 | after | 1 | van_hoc | 0.2236425726 |
| P0 | after | 2 | kinh_te | -0.0068356083 |
| P0 | after | 3 | luat | -0.0782533063 |
| P2 | before | 1 | nong_hoc | 0.7075781694 |
| P2 | before | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.6243377889 |
| P2 | before | 3 | ky_thuat_dien | 0.6063391678 |
| P2 | after | 1 | toan_hoc | 0.4990448250 |
| P2 | after | 2 | kinh_te | 0.4503414995 |
| P2 | after | 3 | van_hoc | 0.3773947499 |

Rời Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, ky_thuat_dien, nong_hoc.

Gia nhập Top-3 P2: kinh_te, toan_hoc, van_hoc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 18 | 20 | -0.73154119 | -0.55195050 | 0.17959069 |
| giao_duc_mam_non | 21 | 21 | -0.77106969 | -0.64429572 | 0.12677397 |
| quan_ly_giao_duc | 19 | 17 | -0.75371613 | -0.31350387 | 0.44021226 |
| tam_ly_hoc_giao_duc | 16 | 15 | -0.47973985 | -0.13530303 | 0.34443682 |
| ky_thuat_phan_mem | 7 | 5 | 0.46892391 | 0.34655490 | -0.12236901 |
| kinh_te | 9 | 2 | 0.04848788 | 0.45034150 | 0.40185362 |
| quan_tri_kinh_doanh | 15 | 16 | -0.41929698 | -0.18575108 | 0.23354590 |
| ke_toan | 13 | 14 | -0.20706427 | -0.00318128 | 0.20388299 |
| tai_chinh_ngan_hang | 10 | 4 | 0.04537684 | 0.36187580 | 0.31649896 |
| quan_tri_khach_san | 17 | 19 | -0.68793937 | -0.51975470 | 0.16818467 |
| ngon_ngu_anh | 14 | 13 | -0.24554826 | 0.00386174 | 0.24940999 |
| van_hoc | 11 | 3 | -0.07408228 | 0.37739475 | 0.45147703 |
| luat | 12 | 7 | -0.18394919 | 0.25346517 | 0.43741437 |
| cong_nghe_ky_thuat_xay_dung | 6 | 11 | 0.56978747 | 0.11226946 | -0.45751800 |
| ky_thuat_dien_tu_vien_thong | 4 | 10 | 0.58079545 | 0.15796776 | -0.42282769 |
| ky_thuat_dien | 3 | 9 | 0.60633917 | 0.17779578 | -0.42854339 |
| cong_nghe_ky_thuat_hoa_hoc | 2 | 8 | 0.62433779 | 0.20696486 | -0.41737293 |
| toan_hoc | 5 | 1 | 0.57047752 | 0.49904483 | -0.07143270 |
| nong_hoc | 1 | 6 | 0.70757817 | 0.29605129 | -0.41152688 |
| quan_ly_dat_dai | 8 | 12 | 0.44039967 | 0.07114077 | -0.36925889 |
| cong_tac_xa_hoi | 20 | 18 | -0.75945730 | -0.48793374 | 0.27152356 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.08530986065155188,
      -0.5465827222901152
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.8218607902526855,
      0.8218607902526855
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.8284226941818038,
      0.9366330903573679
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 3,
    "changed_tree_indices_0based": [
      103,
      138,
      146
    ],
    "raw_margins": [
      -0.21062922477722168,
      -0.18207785487174988
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.38792172139777215,
      0.5241220303913166
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      -0.06185729056596756,
      -0.06185729056596756
    ],
    "binary_class_changed": false
  }
}
```

## random_054:R5

Câu R5: 4 → 3. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 4 | 4 |
| I1 | 4 | 4 |
| A1 | 2 | 2 |
| R2 | 2 | 2 |
| I2 | 4 | 4 |
| A2 | 5 | 5 |
| S1 | 2 | 2 |
| S2 | 5 | 5 |
| R3 | 5 | 5 |
| A3 | 3 | 3 |
| S3 | 1 | 1 |
| E1 | 4 | 4 |
| R4 | 1 | 1 |
| S4 | 4 | 4 |
| E2 | 1 | 1 |
| R5 | 4 | 3 |
| I3 | 1 | 1 |
| A4 | 3 | 3 |
| E3 | 5 | 5 |
| I4 | 4 | 4 |
| A5 | 5 | 5 |
| E4 | 4 | 4 |
| C1 | 4 | 4 |
| E5 | 3 | 3 |
| C2 | 1 | 1 |
| C3 | 4 | 4 |
| C4 | 1 | 1 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.20000000 | 3.00000000 | 0.47868546 | 0.39865846 | 0.80160360 | 0.45045398 |
| I | 3.25000000 | 3.25000000 | 0.69463122 | 0.69976211 | 1.10695687 | 1.12710961 |
| A | 3.60000000 | 3.60000000 | 0.69602131 | 0.71081313 | 0.77156215 | 0.82706617 |
| S | 3.00000000 | 3.00000000 | 0.44753650 | 0.46983758 | 0.00059193 | 0.09730085 |
| E | 3.40000000 | 3.40000000 | 0.59578230 | 0.62577287 | 0.55082248 | 0.67909696 |
| C | 2.50000000 | 2.50000000 | 0.48454064 | 0.58601624 | 0.36091836 | 0.79108197 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | van_hoc | 0.0664283707 |
| P0 | before | 2 | nong_hoc | -0.0634410388 |
| P0 | before | 3 | kinh_te | -0.1557602455 |
| P0 | after | 1 | van_hoc | 0.2236425726 |
| P0 | after | 2 | kinh_te | -0.0068356083 |
| P0 | after | 3 | luat | -0.0782533063 |
| P2 | before | 1 | nong_hoc | 0.7075781694 |
| P2 | before | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.6243377889 |
| P2 | before | 3 | ky_thuat_dien | 0.6063391678 |
| P2 | after | 1 | toan_hoc | 0.7088269788 |
| P2 | after | 2 | ky_thuat_phan_mem | 0.6532887068 |
| P2 | after | 3 | tai_chinh_ngan_hang | 0.5583606036 |

Rời Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, ky_thuat_dien, nong_hoc.

Gia nhập Top-3 P2: ky_thuat_phan_mem, tai_chinh_ngan_hang, toan_hoc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 18 | 20 | -0.73154119 | -0.61934457 | 0.11219661 |
| giao_duc_mam_non | 21 | 21 | -0.77106969 | -0.72320610 | 0.04786359 |
| quan_ly_giao_duc | 19 | 17 | -0.75371613 | -0.30589937 | 0.44781676 |
| tam_ly_hoc_giao_duc | 16 | 16 | -0.47973985 | -0.17187920 | 0.30786065 |
| ky_thuat_phan_mem | 7 | 2 | 0.46892391 | 0.65328871 | 0.18436480 |
| kinh_te | 9 | 4 | 0.04848788 | 0.54451181 | 0.49602393 |
| quan_tri_kinh_doanh | 15 | 15 | -0.41929698 | -0.06542016 | 0.35387682 |
| ke_toan | 13 | 11 | -0.20706427 | 0.34616020 | 0.55322447 |
| tai_chinh_ngan_hang | 10 | 3 | 0.04537684 | 0.55836060 | 0.51298376 |
| quan_tri_khach_san | 17 | 18 | -0.68793937 | -0.40133863 | 0.28660074 |
| ngon_ngu_anh | 14 | 14 | -0.24554826 | 0.22497882 | 0.47052707 |
| van_hoc | 11 | 5 | -0.07408228 | 0.44391684 | 0.51799912 |
| luat | 12 | 13 | -0.18394919 | 0.32412733 | 0.50807652 |
| cong_nghe_ky_thuat_xay_dung | 6 | 12 | 0.56978747 | 0.32686266 | -0.24292481 |
| ky_thuat_dien_tu_vien_thong | 4 | 10 | 0.58079545 | 0.37945042 | -0.20134503 |
| ky_thuat_dien | 3 | 9 | 0.60633917 | 0.38490604 | -0.22143313 |
| cong_nghe_ky_thuat_hoa_hoc | 2 | 6 | 0.62433779 | 0.42211700 | -0.20222079 |
| toan_hoc | 5 | 1 | 0.57047752 | 0.70882698 | 0.13834945 |
| nong_hoc | 1 | 7 | 0.70757817 | 0.39676997 | -0.31080820 |
| quan_ly_dat_dai | 8 | 8 | 0.44039967 | 0.39272639 | -0.04767327 |
| cong_tac_xa_hoi | 20 | 19 | -0.75945730 | -0.55077797 | 0.20867933 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.08530986065155188,
      -0.4110579891807222
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      97
    ],
    "raw_margins": [
      0.8218607902526855,
      0.8461651802062988
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.8284226941818038,
      0.8993364989633261
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 8,
    "changed_tree_indices_0based": [
      46,
      89,
      95,
      119,
      124,
      141,
      143,
      157
    ],
    "raw_margins": [
      -0.21062922477722168,
      -0.12079621106386185
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.38792172139777215,
      0.5141245578997821
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 17,
    "changed_tree_indices_0based": [
      24,
      25,
      44,
      53,
      73,
      83,
      85,
      92,
      105,
      108,
      113,
      115,
      123,
      137,
      143,
      148,
      154
    ],
    "raw_margins": [
      -0.06185729056596756,
      0.3475207984447479
    ],
    "binary_class_changed": true
  }
}
```

## random_100:S1

Câu S1: 4 → 3. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 2 | 2 |
| I1 | 3 | 3 |
| A1 | 1 | 1 |
| R2 | 2 | 2 |
| I2 | 5 | 5 |
| A2 | 2 | 2 |
| S1 | 4 | 3 |
| S2 | 1 | 1 |
| R3 | 3 | 3 |
| A3 | 2 | 2 |
| S3 | 5 | 5 |
| E1 | 2 | 2 |
| R4 | 5 | 5 |
| S4 | 4 | 4 |
| E2 | 5 | 5 |
| R5 | 3 | 3 |
| I3 | 4 | 4 |
| A4 | 2 | 2 |
| E3 | 1 | 1 |
| I4 | 5 | 5 |
| A5 | 3 | 3 |
| E4 | 1 | 1 |
| C1 | 1 | 1 |
| E5 | 4 | 4 |
| C2 | 2 | 2 |
| C3 | 1 | 1 |
| C4 | 3 | 3 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.00000000 | 3.00000000 | 0.33123922 | 0.38167313 | 0.15462582 | 0.37592424 |
| I | 4.25000000 | 4.25000000 | 0.69888210 | 0.69888210 | 1.12365319 | 1.12365319 |
| A | 2.00000000 | 2.00000000 | 0.17255400 | 0.16225050 | -1.19266791 | -1.23133021 |
| S | 3.50000000 | 3.25000000 | 0.75268674 | 0.61821789 | 1.32388005 | 0.74075406 |
| E | 2.60000000 | 2.60000000 | 0.45043600 | 0.46365124 | -0.07084690 | -0.01432319 |
| C | 1.75000000 | 1.75000000 | 0.44646168 | 0.44646168 | 0.19949842 | 0.19949842 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | nong_hoc | 0.5001725627 |
| P0 | before | 2 | tam_ly_hoc_giao_duc | 0.3924956472 |
| P0 | before | 3 | toan_hoc | 0.2989182788 |
| P0 | after | 1 | nong_hoc | 0.5637140915 |
| P0 | after | 2 | toan_hoc | 0.3509022987 |
| P0 | after | 3 | ky_thuat_dien | 0.3416438432 |
| P2 | before | 1 | tam_ly_hoc_giao_duc | 0.6183525407 |
| P2 | before | 2 | cong_tac_xa_hoi | 0.5891696561 |
| P2 | before | 3 | giao_duc_tieu_hoc | 0.4663443019 |
| P2 | after | 1 | nong_hoc | 0.5157484502 |
| P2 | after | 2 | ky_thuat_dien | 0.4675826659 |
| P2 | after | 3 | ky_thuat_dien_tu_vien_thong | 0.4672756477 |

Rời Top-3 P2: cong_tac_xa_hoi, giao_duc_tieu_hoc, tam_ly_hoc_giao_duc.

Gia nhập Top-3 P2: ky_thuat_dien, ky_thuat_dien_tu_vien_thong, nong_hoc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 3 | 14 | 0.46634430 | 0.19338806 | -0.27295625 |
| giao_duc_mam_non | 4 | 18 | 0.36845406 | 0.09535368 | -0.27310037 |
| quan_ly_giao_duc | 5 | 15 | 0.32356114 | 0.13946240 | -0.18409875 |
| tam_ly_hoc_giao_duc | 1 | 7 | 0.61835254 | 0.39389012 | -0.22446242 |
| ky_thuat_phan_mem | 7 | 4 | 0.28611274 | 0.44932904 | 0.16321630 |
| kinh_te | 18 | 16 | 0.09611421 | 0.13798488 | 0.04187067 |
| quan_tri_kinh_doanh | 17 | 17 | 0.09946391 | 0.12280268 | 0.02333877 |
| ke_toan | 13 | 12 | 0.20018457 | 0.25375514 | 0.05357056 |
| tai_chinh_ngan_hang | 11 | 11 | 0.23546074 | 0.30318160 | 0.06772086 |
| quan_tri_khach_san | 19 | 19 | 0.09330329 | 0.05463530 | -0.03866799 |
| ngon_ngu_anh | 20 | 20 | -0.14862030 | -0.28016811 | -0.13154781 |
| van_hoc | 21 | 21 | -0.59310868 | -0.67332997 | -0.08022129 |
| luat | 9 | 13 | 0.25574560 | 0.23561001 | -0.02013559 |
| cong_nghe_ky_thuat_xay_dung | 16 | 6 | 0.15034362 | 0.40615651 | 0.25581289 |
| ky_thuat_dien_tu_vien_thong | 10 | 3 | 0.24086292 | 0.46727565 | 0.22641273 |
| ky_thuat_dien | 12 | 2 | 0.21878361 | 0.46758267 | 0.24879906 |
| cong_nghe_ky_thuat_hoa_hoc | 14 | 5 | 0.19174900 | 0.43856599 | 0.24681698 |
| toan_hoc | 8 | 9 | 0.25769140 | 0.37554352 | 0.11785211 |
| nong_hoc | 6 | 1 | 0.29663898 | 0.51574845 | 0.21910947 |
| quan_ly_dat_dai | 15 | 8 | 0.16379599 | 0.38306140 | 0.21926541 |
| cong_tac_xa_hoi | 2 | 10 | 0.58916966 | 0.32769390 | -0.26147576 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.7025855696353036,
      -0.4824526516515004
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.8419802784919739,
      0.8419802784919739
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -1.5676335943609288,
      -1.6415777016776758
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 28,
    "changed_tree_indices_0based": [
      0,
      1,
      2,
      3,
      6,
      7,
      8,
      9,
      10,
      15,
      16,
      17,
      20,
      24,
      25,
      27,
      28,
      36,
      38,
      40,
      53,
      72,
      79,
      100,
      112,
      119,
      126,
      144
    ],
    "raw_margins": [
      1.1129932403564453,
      0.4819909930229187
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.1989092512767215,
      -0.14565200046213783
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      -0.21497727930545807,
      -0.21497727930545807
    ],
    "binary_class_changed": false
  }
}
```

## random_119:R1

Câu R1: 2 → 3. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 2 | 3 |
| I1 | 4 | 4 |
| A1 | 2 | 2 |
| R2 | 2 | 2 |
| I2 | 1 | 1 |
| A2 | 5 | 5 |
| S1 | 5 | 5 |
| S2 | 1 | 1 |
| R3 | 5 | 5 |
| A3 | 2 | 2 |
| S3 | 4 | 4 |
| E1 | 3 | 3 |
| R4 | 2 | 2 |
| S4 | 2 | 2 |
| E2 | 4 | 4 |
| R5 | 5 | 5 |
| I3 | 4 | 4 |
| A4 | 2 | 2 |
| E3 | 1 | 1 |
| I4 | 1 | 1 |
| A5 | 2 | 2 |
| E4 | 1 | 1 |
| C1 | 5 | 5 |
| E5 | 4 | 4 |
| C2 | 3 | 3 |
| C3 | 4 | 4 |
| C4 | 3 | 3 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.20000000 | 3.40000000 | 0.49578795 | 0.60931274 | 0.87664744 | 1.37478165 |
| I | 2.50000000 | 2.50000000 | 0.71886516 | 0.76559603 | 1.20214123 | 1.38568748 |
| A | 2.60000000 | 2.60000000 | 0.21390541 | 0.19627292 | -1.03750314 | -1.10366633 |
| S | 3.00000000 | 3.00000000 | 0.61847126 | 0.61847126 | 0.74185284 | 0.74185284 |
| E | 2.60000000 | 2.60000000 | 0.71754983 | 0.68914817 | 1.07164169 | 0.95016325 |
| C | 3.75000000 | 3.75000000 | 0.71535057 | 0.71535057 | 1.33934111 | 1.33934111 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | quan_ly_dat_dai | 0.5323846928 |
| P0 | before | 2 | ke_toan | 0.5246763929 |
| P0 | before | 3 | quan_tri_khach_san | 0.4143200168 |
| P0 | after | 1 | quan_ly_dat_dai | 0.5816582204 |
| P0 | after | 2 | cong_nghe_ky_thuat_xay_dung | 0.4348182917 |
| P0 | after | 3 | ke_toan | 0.4257323817 |
| P2 | before | 1 | ke_toan | 0.6271422139 |
| P2 | before | 2 | tai_chinh_ngan_hang | 0.5911870716 |
| P2 | before | 3 | quan_tri_kinh_doanh | 0.5804702560 |
| P2 | after | 1 | ky_thuat_dien | 0.6424285253 |
| P2 | after | 2 | cong_nghe_ky_thuat_xay_dung | 0.6331587574 |
| P2 | after | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.6084635321 |

Rời Top-3 P2: ke_toan, quan_tri_kinh_doanh, tai_chinh_ngan_hang.

Gia nhập Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, cong_nghe_ky_thuat_xay_dung, ky_thuat_dien.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 18 | 18 | -0.12419334 | -0.18368848 | -0.05949514 |
| giao_duc_mam_non | 19 | 19 | -0.20012622 | -0.24173387 | -0.04160765 |
| quan_ly_giao_duc | 14 | 15 | 0.27730650 | 0.06847493 | -0.20883157 |
| tam_ly_hoc_giao_duc | 16 | 16 | 0.09892514 | -0.01887839 | -0.11780354 |
| ky_thuat_phan_mem | 8 | 7 | 0.47644748 | 0.52021508 | 0.04376760 |
| kinh_te | 12 | 14 | 0.42812156 | 0.24679817 | -0.18132339 |
| quan_tri_kinh_doanh | 3 | 10 | 0.58047026 | 0.41677008 | -0.16370018 |
| ke_toan | 1 | 8 | 0.62714221 | 0.49225132 | -0.13489089 |
| tai_chinh_ngan_hang | 2 | 9 | 0.59118707 | 0.43417378 | -0.15701329 |
| quan_tri_khach_san | 6 | 11 | 0.48058594 | 0.33578997 | -0.14479597 |
| ngon_ngu_anh | 20 | 20 | -0.29849305 | -0.37630184 | -0.07780879 |
| van_hoc | 21 | 21 | -0.43953456 | -0.59986648 | -0.16033192 |
| luat | 7 | 13 | 0.48016026 | 0.27826515 | -0.20189511 |
| cong_nghe_ky_thuat_xay_dung | 9 | 2 | 0.47404810 | 0.63315876 | 0.15911066 |
| ky_thuat_dien_tu_vien_thong | 11 | 5 | 0.43958293 | 0.59743244 | 0.15784952 |
| ky_thuat_dien | 4 | 1 | 0.48837461 | 0.64242853 | 0.15405392 |
| cong_nghe_ky_thuat_hoa_hoc | 10 | 3 | 0.45559788 | 0.60846353 | 0.15286565 |
| toan_hoc | 15 | 12 | 0.23504230 | 0.28952250 | 0.05448019 |
| nong_hoc | 13 | 6 | 0.36602771 | 0.53734851 | 0.17132080 |
| quan_ly_dat_dai | 5 | 4 | 0.48563723 | 0.60701733 | 0.12138010 |
| cong_tac_xa_hoi | 17 | 17 | 0.08000113 | -0.02795338 | -0.10795451 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      1
    ],
    "raw_margins": [
      -0.01684859552334461,
      0.4444242661152187
    ],
    "binary_class_changed": true
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 13,
    "changed_tree_indices_0based": [
      36,
      48,
      51,
      52,
      62,
      63,
      84,
      85,
      87,
      114,
      118,
      125,
      127
    ],
    "raw_margins": [
      0.9388393759727478,
      1.1836086511611938
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -1.301543202018998,
      -1.4097535981945621
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.4830647110939026,
      0.4830647110939026
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.9323402342546088,
      0.7961399252610646
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.9215144515037537,
      0.9215144515037537
    ],
    "binary_class_changed": false
  }
}
```

## random_122:R1

Câu R1: 4 → 5. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 4 | 5 |
| I1 | 4 | 4 |
| A1 | 1 | 1 |
| R2 | 5 | 5 |
| I2 | 5 | 5 |
| A2 | 5 | 5 |
| S1 | 2 | 2 |
| S2 | 3 | 3 |
| R3 | 1 | 1 |
| A3 | 3 | 3 |
| S3 | 1 | 1 |
| E1 | 5 | 5 |
| R4 | 2 | 2 |
| S4 | 2 | 2 |
| E2 | 5 | 5 |
| R5 | 3 | 3 |
| I3 | 4 | 4 |
| A4 | 5 | 5 |
| E3 | 1 | 1 |
| I4 | 3 | 3 |
| A5 | 4 | 4 |
| E4 | 2 | 2 |
| C1 | 1 | 1 |
| E5 | 2 | 2 |
| C2 | 1 | 1 |
| C3 | 4 | 4 |
| C4 | 1 | 1 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.00000000 | 3.20000000 | 0.40837437 | 0.52263031 | 0.49308632 | 0.99442876 |
| I | 4.00000000 | 4.00000000 | 0.79000765 | 0.79000765 | 1.48156972 | 1.48156972 |
| A | 3.60000000 | 3.60000000 | 0.69688767 | 0.67355548 | 0.77481302 | 0.68726260 |
| S | 2.00000000 | 2.00000000 | 0.39111793 | 0.39111793 | -0.24406795 | -0.24406795 |
| E | 3.00000000 | 3.00000000 | 0.71666107 | 0.68820888 | 1.06784034 | 0.94614575 |
| C | 1.75000000 | 1.75000000 | 0.48549837 | 0.48549837 | 0.36497825 | 0.36497825 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | nong_hoc | 0.4328828322 |
| P0 | before | 2 | toan_hoc | 0.3236847460 |
| P0 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.2453362381 |
| P0 | after | 1 | nong_hoc | 0.4819702417 |
| P0 | after | 2 | toan_hoc | 0.3126936110 |
| P0 | after | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.2974381256 |
| P2 | before | 1 | kinh_te | 0.5183290378 |
| P2 | before | 2 | toan_hoc | 0.4493352754 |
| P2 | before | 3 | tai_chinh_ngan_hang | 0.4491914840 |
| P2 | after | 1 | nong_hoc | 0.6791201085 |
| P2 | after | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.6229882592 |
| P2 | after | 3 | ky_thuat_dien | 0.6189848359 |

Rời Top-3 P2: kinh_te, tai_chinh_ngan_hang, toan_hoc.

Gia nhập Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, ky_thuat_dien, nong_hoc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 20 | 20 | -0.72994170 | -0.82979392 | -0.09985222 |
| giao_duc_mam_non | 21 | 21 | -0.81660417 | -0.88039519 | -0.06379102 |
| quan_ly_giao_duc | 17 | 18 | -0.32800586 | -0.59923766 | -0.27123180 |
| tam_ly_hoc_giao_duc | 16 | 17 | -0.29756809 | -0.51328430 | -0.21571621 |
| ky_thuat_phan_mem | 5 | 7 | 0.38779817 | 0.45064369 | 0.06284552 |
| kinh_te | 1 | 9 | 0.51832904 | 0.24954319 | -0.26878585 |
| quan_tri_kinh_doanh | 14 | 14 | 0.00464641 | -0.13729658 | -0.14194299 |
| ke_toan | 13 | 12 | 0.07836051 | -0.05834615 | -0.13670666 |
| tai_chinh_ngan_hang | 3 | 10 | 0.44919148 | 0.23563683 | -0.21355465 |
| quan_tri_khach_san | 18 | 16 | -0.35507980 | -0.44706832 | -0.09198852 |
| ngon_ngu_anh | 15 | 15 | -0.25630642 | -0.42963297 | -0.17332655 |
| van_hoc | 12 | 13 | 0.18772109 | -0.12087670 | -0.30859779 |
| luat | 8 | 11 | 0.31568377 | 0.03092793 | -0.28475584 |
| cong_nghe_ky_thuat_xay_dung | 9 | 4 | 0.30093037 | 0.58959877 | 0.28866841 |
| ky_thuat_dien_tu_vien_thong | 10 | 5 | 0.29171877 | 0.55593227 | 0.26421350 |
| ky_thuat_dien | 7 | 3 | 0.35035263 | 0.61898484 | 0.26863221 |
| cong_nghe_ky_thuat_hoa_hoc | 6 | 2 | 0.36308564 | 0.62298826 | 0.25990262 |
| toan_hoc | 2 | 6 | 0.44933528 | 0.47583433 | 0.02649905 |
| nong_hoc | 4 | 1 | 0.42220088 | 0.67912011 | 0.25691923 |
| quan_ly_dat_dai | 11 | 8 | 0.19975610 | 0.42863249 | 0.22887639 |
| cong_tac_xa_hoi | 19 | 19 | -0.61351037 | -0.77175599 | -0.15824562 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      1
    ],
    "raw_margins": [
      -0.3706897151962195,
      0.09058314644234344
    ],
    "binary_class_changed": true
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      1.3249719142913818,
      1.3249719142913818
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.8325207663834959,
      0.7243103702079319
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      -0.44261547923088074,
      -0.44261547923088074
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.9279592112860118,
      0.7917589022924676
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      -0.05802283436059952,
      -0.05802283436059952
    ],
    "binary_class_changed": false
  }
}
```

## random_122:S1

Câu S1: 2 → 1. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 4 | 4 |
| I1 | 4 | 4 |
| A1 | 1 | 1 |
| R2 | 5 | 5 |
| I2 | 5 | 5 |
| A2 | 5 | 5 |
| S1 | 2 | 1 |
| S2 | 3 | 3 |
| R3 | 1 | 1 |
| A3 | 3 | 3 |
| S3 | 1 | 1 |
| E1 | 5 | 5 |
| R4 | 2 | 2 |
| S4 | 2 | 2 |
| E2 | 5 | 5 |
| R5 | 3 | 3 |
| I3 | 4 | 4 |
| A4 | 5 | 5 |
| E3 | 1 | 1 |
| I4 | 3 | 3 |
| A5 | 4 | 4 |
| E4 | 2 | 2 |
| C1 | 1 | 1 |
| E5 | 2 | 2 |
| C2 | 1 | 1 |
| C3 | 4 | 4 |
| C4 | 1 | 1 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.00000000 | 3.00000000 | 0.40837437 | 0.46243174 | 0.49308632 | 0.73028406 |
| I | 4.00000000 | 4.00000000 | 0.79000765 | 0.79000765 | 1.48156972 | 1.48156972 |
| A | 3.60000000 | 3.60000000 | 0.69688767 | 0.68104463 | 0.77481302 | 0.71536447 |
| S | 2.00000000 | 1.75000000 | 0.39111793 | 0.38467535 | -0.24406795 | -0.27200627 |
| E | 3.00000000 | 3.00000000 | 0.71666107 | 0.72734952 | 1.06784034 | 1.11355655 |
| C | 1.75000000 | 1.75000000 | 0.48549837 | 0.49244931 | 0.36497825 | 0.39444389 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | nong_hoc | 0.4328828322 |
| P0 | before | 2 | toan_hoc | 0.3236847460 |
| P0 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.2453362381 |
| P0 | after | 1 | nong_hoc | 0.4533969074 |
| P0 | after | 2 | toan_hoc | 0.3457586135 |
| P0 | after | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.2905630820 |
| P2 | before | 1 | kinh_te | 0.5183290378 |
| P2 | before | 2 | toan_hoc | 0.4493352754 |
| P2 | before | 3 | tai_chinh_ngan_hang | 0.4491914840 |
| P2 | after | 1 | nong_hoc | 0.5184115842 |
| P2 | after | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.4730709993 |
| P2 | after | 3 | ky_thuat_dien | 0.4664765059 |

Rời Top-3 P2: kinh_te, tai_chinh_ngan_hang, toan_hoc.

Gia nhập Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, ky_thuat_dien, nong_hoc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 20 | 20 | -0.72994170 | -0.81269631 | -0.08275461 |
| giao_duc_mam_non | 21 | 21 | -0.81660417 | -0.88232695 | -0.06572278 |
| quan_ly_giao_duc | 17 | 17 | -0.32800586 | -0.42152811 | -0.09352225 |
| tam_ly_hoc_giao_duc | 16 | 18 | -0.29756809 | -0.42292993 | -0.12536184 |
| ky_thuat_phan_mem | 5 | 7 | 0.38779817 | 0.40452298 | 0.01672481 |
| kinh_te | 1 | 4 | 0.51832904 | 0.44329261 | -0.07503643 |
| quan_tri_kinh_doanh | 14 | 14 | 0.00464641 | 0.00748751 | 0.00284110 |
| ke_toan | 13 | 13 | 0.07836051 | 0.05165997 | -0.02670053 |
| tai_chinh_ngan_hang | 3 | 9 | 0.44919148 | 0.39299783 | -0.05619365 |
| quan_tri_khach_san | 18 | 15 | -0.35507980 | -0.33828365 | 0.01679615 |
| ngon_ngu_anh | 15 | 16 | -0.25630642 | -0.36678558 | -0.11047916 |
| van_hoc | 12 | 12 | 0.18772109 | 0.06179758 | -0.12592351 |
| luat | 8 | 11 | 0.31568377 | 0.23150518 | -0.08417859 |
| cong_nghe_ky_thuat_xay_dung | 9 | 6 | 0.30093037 | 0.43044499 | 0.12951462 |
| ky_thuat_dien_tu_vien_thong | 10 | 8 | 0.29171877 | 0.39661856 | 0.10489979 |
| ky_thuat_dien | 7 | 3 | 0.35035263 | 0.46647651 | 0.11612388 |
| cong_nghe_ky_thuat_hoa_hoc | 6 | 2 | 0.36308564 | 0.47307100 | 0.10998536 |
| toan_hoc | 2 | 5 | 0.44933528 | 0.43088489 | -0.01845039 |
| nong_hoc | 4 | 1 | 0.42220088 | 0.51841158 | 0.09621070 |
| quan_ly_dat_dai | 11 | 10 | 0.19975610 | 0.29700062 | 0.09724452 |
| cong_tac_xa_hoi | 19 | 19 | -0.61351037 | -0.70646452 | -0.09295415 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.3706897151962195,
      -0.15055679721241666
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      1.3249719142913818,
      1.3249719142913818
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.8325207663834959,
      0.7585766590667486
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      105
    ],
    "raw_margins": [
      -0.44261547923088074,
      -0.46975019574165344
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.9279592112860118,
      0.9812164621005954
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      152
    ],
    "raw_margins": [
      -0.05802283436059952,
      -0.030205145478248596
    ],
    "binary_class_changed": false
  }
}
```

## random_122:R3

Câu R3: 1 → 2. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 4 | 4 |
| I1 | 4 | 4 |
| A1 | 1 | 1 |
| R2 | 5 | 5 |
| I2 | 5 | 5 |
| A2 | 5 | 5 |
| S1 | 2 | 2 |
| S2 | 3 | 3 |
| R3 | 1 | 2 |
| A3 | 3 | 3 |
| S3 | 1 | 1 |
| E1 | 5 | 5 |
| R4 | 2 | 2 |
| S4 | 2 | 2 |
| E2 | 5 | 5 |
| R5 | 3 | 3 |
| I3 | 4 | 4 |
| A4 | 5 | 5 |
| E3 | 1 | 1 |
| I4 | 3 | 3 |
| A5 | 4 | 4 |
| E4 | 2 | 2 |
| C1 | 1 | 1 |
| E5 | 2 | 2 |
| C2 | 1 | 1 |
| C3 | 4 | 4 |
| C4 | 1 | 1 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.00000000 | 3.20000000 | 0.40837437 | 0.48727119 | 0.49308632 | 0.83927685 |
| I | 4.00000000 | 4.00000000 | 0.79000765 | 0.79000765 | 1.48156972 | 1.48156972 |
| A | 3.60000000 | 3.60000000 | 0.69688767 | 0.63988818 | 0.77481302 | 0.56093125 |
| S | 2.00000000 | 2.00000000 | 0.39111793 | 0.39613998 | -0.24406795 | -0.22228977 |
| E | 3.00000000 | 3.00000000 | 0.71666107 | 0.71029097 | 1.06784034 | 1.04059438 |
| C | 1.75000000 | 1.75000000 | 0.48549837 | 0.47186956 | 0.36497825 | 0.30720457 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | nong_hoc | 0.4328828322 |
| P0 | before | 2 | toan_hoc | 0.3236847460 |
| P0 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.2453362381 |
| P0 | after | 1 | nong_hoc | 0.4819702417 |
| P0 | after | 2 | toan_hoc | 0.3126936110 |
| P0 | after | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.2974381256 |
| P2 | before | 1 | kinh_te | 0.5183290378 |
| P2 | before | 2 | toan_hoc | 0.4493352754 |
| P2 | before | 3 | tai_chinh_ngan_hang | 0.4491914840 |
| P2 | after | 1 | nong_hoc | 0.6145074215 |
| P2 | after | 2 | ky_thuat_dien | 0.5517622525 |
| P2 | after | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.5515909614 |

Rời Top-3 P2: kinh_te, tai_chinh_ngan_hang, toan_hoc.

Gia nhập Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, ky_thuat_dien, nong_hoc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 20 | 20 | -0.72994170 | -0.80002453 | -0.07008283 |
| giao_duc_mam_non | 21 | 21 | -0.81660417 | -0.86619552 | -0.04959136 |
| quan_ly_giao_duc | 17 | 18 | -0.32800586 | -0.47034126 | -0.14233541 |
| tam_ly_hoc_giao_duc | 16 | 16 | -0.29756809 | -0.43408486 | -0.13651677 |
| ky_thuat_phan_mem | 5 | 7 | 0.38779817 | 0.41900747 | 0.03120930 |
| kinh_te | 1 | 8 | 0.51832904 | 0.36709962 | -0.15122942 |
| quan_tri_kinh_doanh | 14 | 13 | 0.00464641 | -0.02460568 | -0.02925209 |
| ke_toan | 13 | 12 | 0.07836051 | 0.00095890 | -0.07740161 |
| tai_chinh_ngan_hang | 3 | 10 | 0.44919148 | 0.33674161 | -0.11244987 |
| quan_tri_khach_san | 18 | 15 | -0.35507980 | -0.35615366 | -0.00107386 |
| ngon_ngu_anh | 15 | 17 | -0.25630642 | -0.46573174 | -0.20942533 |
| van_hoc | 12 | 14 | 0.18772109 | -0.09884927 | -0.28657036 |
| luat | 8 | 11 | 0.31568377 | 0.16800161 | -0.14768216 |
| cong_nghe_ky_thuat_xay_dung | 9 | 4 | 0.30093037 | 0.51582820 | 0.21489784 |
| ky_thuat_dien_tu_vien_thong | 10 | 5 | 0.29171877 | 0.47918101 | 0.18746224 |
| ky_thuat_dien | 7 | 2 | 0.35035263 | 0.55176225 | 0.20140962 |
| cong_nghe_ky_thuat_hoa_hoc | 6 | 3 | 0.36308564 | 0.55159096 | 0.18850532 |
| toan_hoc | 2 | 6 | 0.44933528 | 0.43602342 | -0.01331185 |
| nong_hoc | 4 | 1 | 0.42220088 | 0.61450742 | 0.19230654 |
| quan_ly_dat_dai | 11 | 9 | 0.19975610 | 0.35292643 | 0.15317033 |
| cong_tac_xa_hoi | 19 | 19 | -0.61351037 | -0.69740591 | -0.08389554 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.3706897151962195,
      -0.05092622486469334
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      1.3249719142913818,
      1.3249719142913818
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.8325207663834959,
      0.5748788376147763
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 1,
    "changed_tree_indices_0based": [
      108
    ],
    "raw_margins": [
      -0.44261547923088074,
      -0.42157480120658875
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.9279592112860118,
      0.8967976043805841
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 3,
    "changed_tree_indices_0based": [
      95,
      116,
      142
    ],
    "raw_margins": [
      -0.05802283436059952,
      -0.11264090985059738
    ],
    "binary_class_changed": false
  }
}
```

## random_122:R4

Câu R4: 2 → 3. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 4 | 4 |
| I1 | 4 | 4 |
| A1 | 1 | 1 |
| R2 | 5 | 5 |
| I2 | 5 | 5 |
| A2 | 5 | 5 |
| S1 | 2 | 2 |
| S2 | 3 | 3 |
| R3 | 1 | 1 |
| A3 | 3 | 3 |
| S3 | 1 | 1 |
| E1 | 5 | 5 |
| R4 | 2 | 3 |
| S4 | 2 | 2 |
| E2 | 5 | 5 |
| R5 | 3 | 3 |
| I3 | 4 | 4 |
| A4 | 5 | 5 |
| E3 | 1 | 1 |
| I4 | 3 | 3 |
| A5 | 4 | 4 |
| E4 | 2 | 2 |
| C1 | 1 | 1 |
| E5 | 2 | 2 |
| C2 | 1 | 1 |
| C3 | 4 | 4 |
| C4 | 1 | 1 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.00000000 | 3.20000000 | 0.40837437 | 0.47642952 | 0.49308632 | 0.79170477 |
| I | 4.00000000 | 4.00000000 | 0.79000765 | 0.79000765 | 1.48156972 | 1.48156972 |
| A | 3.60000000 | 3.60000000 | 0.69688767 | 0.67807812 | 0.77481302 | 0.70423310 |
| S | 2.00000000 | 2.00000000 | 0.39111793 | 0.40427744 | -0.24406795 | -0.18700154 |
| E | 3.00000000 | 3.00000000 | 0.71666107 | 0.71014839 | 1.06784034 | 1.03998458 |
| C | 1.75000000 | 1.75000000 | 0.48549837 | 0.48549837 | 0.36497825 | 0.36497825 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | nong_hoc | 0.4328828322 |
| P0 | before | 2 | toan_hoc | 0.3236847460 |
| P0 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.2453362381 |
| P0 | after | 1 | nong_hoc | 0.4819702417 |
| P0 | after | 2 | toan_hoc | 0.3126936110 |
| P0 | after | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.2974381256 |
| P2 | before | 1 | kinh_te | 0.5183290378 |
| P2 | before | 2 | toan_hoc | 0.4493352754 |
| P2 | before | 3 | tai_chinh_ngan_hang | 0.4491914840 |
| P2 | after | 1 | nong_hoc | 0.5725831630 |
| P2 | after | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.5099054213 |
| P2 | after | 3 | ky_thuat_dien | 0.5044343860 |

Rời Top-3 P2: kinh_te, tai_chinh_ngan_hang, toan_hoc.

Gia nhập Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, ky_thuat_dien, nong_hoc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 20 | 20 | -0.72994170 | -0.79594785 | -0.06600615 |
| giao_duc_mam_non | 21 | 21 | -0.81660417 | -0.86434795 | -0.04774379 |
| quan_ly_giao_duc | 17 | 18 | -0.32800586 | -0.46947497 | -0.14146911 |
| tam_ly_hoc_giao_duc | 16 | 17 | -0.29756809 | -0.41958208 | -0.12201399 |
| ky_thuat_phan_mem | 5 | 7 | 0.38779817 | 0.41432078 | 0.02652262 |
| kinh_te | 1 | 8 | 0.51832904 | 0.38400256 | -0.13432647 |
| quan_tri_kinh_doanh | 14 | 14 | 0.00464641 | -0.05353862 | -0.05818503 |
| ke_toan | 13 | 12 | 0.07836051 | -0.00081811 | -0.07917861 |
| tai_chinh_ngan_hang | 3 | 9 | 0.44919148 | 0.34185580 | -0.10733569 |
| quan_tri_khach_san | 18 | 15 | -0.35507980 | -0.39204151 | -0.03696171 |
| ngon_ngu_anh | 15 | 16 | -0.25630642 | -0.39354962 | -0.13724321 |
| van_hoc | 12 | 13 | 0.18772109 | -0.00769532 | -0.19541641 |
| luat | 8 | 11 | 0.31568377 | 0.17492304 | -0.14076073 |
| cong_nghe_ky_thuat_xay_dung | 9 | 4 | 0.30093037 | 0.46561480 | 0.16468443 |
| ky_thuat_dien_tu_vien_thong | 10 | 6 | 0.29171877 | 0.43821062 | 0.14649186 |
| ky_thuat_dien | 7 | 3 | 0.35035263 | 0.50443439 | 0.15408176 |
| cong_nghe_ky_thuat_hoa_hoc | 6 | 2 | 0.36308564 | 0.50990542 | 0.14681978 |
| toan_hoc | 2 | 5 | 0.44933528 | 0.45192166 | 0.00258638 |
| nong_hoc | 4 | 1 | 0.42220088 | 0.57258316 | 0.15038228 |
| quan_ly_dat_dai | 11 | 10 | 0.19975610 | 0.31961929 | 0.11986319 |
| cong_tac_xa_hoi | 19 | 19 | -0.61351037 | -0.70191022 | -0.08839985 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.3706897151962195,
      -0.09435186838953213
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      1.3249719142913818,
      1.3249719142913818
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.8325207663834959,
      0.7449536002504102
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 3,
    "changed_tree_indices_0based": [
      75,
      129,
      153
    ],
    "raw_margins": [
      -0.44261547923088074,
      -0.3876737654209137
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.9279592112860118,
      0.8961048700160115
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      -0.05802283436059952,
      -0.05802283436059952
    ],
    "binary_class_changed": false
  }
}
```

## random_122:R5

Câu R5: 3 → 4. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 4 | 4 |
| I1 | 4 | 4 |
| A1 | 1 | 1 |
| R2 | 5 | 5 |
| I2 | 5 | 5 |
| A2 | 5 | 5 |
| S1 | 2 | 2 |
| S2 | 3 | 3 |
| R3 | 1 | 1 |
| A3 | 3 | 3 |
| S3 | 1 | 1 |
| E1 | 5 | 5 |
| R4 | 2 | 2 |
| S4 | 2 | 2 |
| E2 | 5 | 5 |
| R5 | 3 | 4 |
| I3 | 4 | 4 |
| A4 | 5 | 5 |
| E3 | 1 | 1 |
| I4 | 3 | 3 |
| A5 | 4 | 4 |
| E4 | 2 | 2 |
| C1 | 1 | 1 |
| E5 | 2 | 2 |
| C2 | 1 | 1 |
| C3 | 4 | 4 |
| C4 | 1 | 1 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 3.00000000 | 3.20000000 | 0.40837437 | 0.48876649 | 0.49308632 | 0.84583806 |
| I | 4.00000000 | 4.00000000 | 0.79000765 | 0.78375369 | 1.48156972 | 1.45700586 |
| A | 3.60000000 | 3.60000000 | 0.69688767 | 0.68170252 | 0.77481302 | 0.71783310 |
| S | 2.00000000 | 2.00000000 | 0.39111793 | 0.38214150 | -0.24406795 | -0.28299436 |
| E | 3.00000000 | 3.00000000 | 0.71666107 | 0.69035006 | 1.06784034 | 0.95530394 |
| C | 1.75000000 | 1.75000000 | 0.48549837 | 0.43638083 | 0.36497825 | 0.15676487 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | nong_hoc | 0.4328828322 |
| P0 | before | 2 | toan_hoc | 0.3236847460 |
| P0 | before | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.2453362381 |
| P0 | after | 1 | nong_hoc | 0.4819702417 |
| P0 | after | 2 | toan_hoc | 0.3126936110 |
| P0 | after | 3 | cong_nghe_ky_thuat_hoa_hoc | 0.2974381256 |
| P2 | before | 1 | kinh_te | 0.5183290378 |
| P2 | before | 2 | toan_hoc | 0.4493352754 |
| P2 | before | 3 | tai_chinh_ngan_hang | 0.4491914840 |
| P2 | after | 1 | nong_hoc | 0.5957788102 |
| P2 | after | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.5080478492 |
| P2 | after | 3 | ky_thuat_dien | 0.5037165085 |

Rời Top-3 P2: kinh_te, tai_chinh_ngan_hang, toan_hoc.

Gia nhập Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, ky_thuat_dien, nong_hoc.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 20 | 20 | -0.72994170 | -0.78294557 | -0.05300387 |
| giao_duc_mam_non | 21 | 21 | -0.81660417 | -0.83575755 | -0.01915338 |
| quan_ly_giao_duc | 17 | 18 | -0.32800586 | -0.55317998 | -0.22517412 |
| tam_ly_hoc_giao_duc | 16 | 16 | -0.29756809 | -0.45946685 | -0.16189876 |
| ky_thuat_phan_mem | 5 | 7 | 0.38779817 | 0.35073029 | -0.03706788 |
| kinh_te | 1 | 9 | 0.51832904 | 0.26316584 | -0.25516319 |
| quan_tri_kinh_doanh | 14 | 14 | 0.00464641 | -0.15558065 | -0.16022706 |
| ke_toan | 13 | 13 | 0.07836051 | -0.13429091 | -0.21265142 |
| tai_chinh_ngan_hang | 3 | 10 | 0.44919148 | 0.21079056 | -0.23840092 |
| quan_tri_khach_san | 18 | 17 | -0.35507980 | -0.46956921 | -0.11448941 |
| ngon_ngu_anh | 15 | 15 | -0.25630642 | -0.44207643 | -0.18577001 |
| van_hoc | 12 | 12 | 0.18772109 | -0.07227813 | -0.25999921 |
| luat | 8 | 11 | 0.31568377 | 0.05428483 | -0.26139894 |
| cong_nghe_ky_thuat_xay_dung | 9 | 4 | 0.30093037 | 0.46880678 | 0.16787641 |
| ky_thuat_dien_tu_vien_thong | 10 | 5 | 0.29171877 | 0.43990449 | 0.14818572 |
| ky_thuat_dien | 7 | 3 | 0.35035263 | 0.50371651 | 0.15336388 |
| cong_nghe_ky_thuat_hoa_hoc | 6 | 2 | 0.36308564 | 0.50804785 | 0.14496221 |
| toan_hoc | 2 | 6 | 0.44933528 | 0.41275615 | -0.03657913 |
| nong_hoc | 4 | 1 | 0.42220088 | 0.59577881 | 0.17357793 |
| quan_ly_dat_dai | 11 | 8 | 0.19975610 | 0.29340866 | 0.09365256 |
| cong_tac_xa_hoi | 19 | 19 | -0.61351037 | -0.72039899 | -0.10688862 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.3706897151962195,
      -0.04494158666704906
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 2,
    "changed_tree_indices_0based": [
      97,
      157
    ],
    "raw_margins": [
      1.3249719142913818,
      1.2876763343811035
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.8325207663834959,
      0.7616069616019736
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 6,
    "changed_tree_indices_0based": [
      46,
      89,
      95,
      119,
      141,
      157
    ],
    "raw_margins": [
      -0.44261547923088074,
      -0.48046863079071045
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.9279592112860118,
      0.8017563747840017
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 16,
    "changed_tree_indices_0based": [
      24,
      25,
      44,
      53,
      73,
      85,
      92,
      105,
      113,
      115,
      118,
      123,
      137,
      143,
      148,
      154
    ],
    "raw_margins": [
      -0.05802283436059952,
      -0.2558634579181671
    ],
    "binary_class_changed": false
  }
}
```

## random_127:R1

Câu R1: 1 → 2. Đầu vào tổng hợp đầy đủ:

| Mã câu | Trước | Sau |
|---|---|---|
| R1 | 1 | 2 |
| I1 | 4 | 4 |
| A1 | 3 | 3 |
| R2 | 1 | 1 |
| I2 | 2 | 2 |
| A2 | 5 | 5 |
| S1 | 2 | 2 |
| S2 | 4 | 4 |
| R3 | 4 | 4 |
| A3 | 1 | 1 |
| S3 | 2 | 2 |
| E1 | 3 | 3 |
| R4 | 1 | 1 |
| S4 | 1 | 1 |
| E2 | 2 | 2 |
| R5 | 5 | 5 |
| I3 | 4 | 4 |
| A4 | 3 | 3 |
| E3 | 4 | 4 |
| I4 | 1 | 1 |
| A5 | 5 | 5 |
| E4 | 1 | 1 |
| C1 | 5 | 5 |
| E5 | 2 | 2 |
| C2 | 4 | 4 |
| C3 | 1 | 1 |
| C4 | 5 | 5 |

| Chiều | Mean trước | Mean sau | p trước | p sau | z trước | z sau |
|---|---|---|---|---|---|---|
| R | 2.40000000 | 2.60000000 | 0.30728457 | 0.41300123 | 0.04951546 | 0.51338847 |
| I | 2.75000000 | 2.75000000 | 0.66971302 | 0.66971302 | 1.00908492 | 1.00908492 |
| A | 3.40000000 | 3.40000000 | 0.43943657 | 0.41298008 | -0.19123238 | -0.29050628 |
| S | 2.25000000 | 2.25000000 | 0.31314015 | 0.31314015 | -0.58221963 | -0.58221963 |
| E | 2.40000000 | 2.40000000 | 0.64935054 | 0.61774442 | 0.77994244 | 0.64475798 |
| C | 3.75000000 | 3.75000000 | 0.54524201 | 0.49411365 | 0.61823659 | 0.40149917 |

| Phương pháp | Thời điểm | Hạng | Ngành | r |
|---|---|---|---|---|
| P0 | before | 1 | ngon_ngu_anh | 0.8279112082 |
| P0 | before | 2 | van_hoc | 0.7252164795 |
| P0 | before | 3 | ke_toan | 0.5074792410 |
| P0 | after | 1 | ngon_ngu_anh | 0.7825006886 |
| P0 | after | 2 | van_hoc | 0.6503263942 |
| P0 | after | 3 | ky_thuat_phan_mem | 0.4931776583 |
| P2 | before | 1 | tai_chinh_ngan_hang | 0.8245310602 |
| P2 | before | 2 | kinh_te | 0.7785461213 |
| P2 | before | 3 | ky_thuat_phan_mem | 0.6385161609 |
| P2 | after | 1 | ky_thuat_dien | 0.7328990478 |
| P2 | after | 2 | cong_nghe_ky_thuat_hoa_hoc | 0.7245011460 |
| P2 | after | 3 | cong_nghe_ky_thuat_xay_dung | 0.7099036377 |

Rời Top-3 P2: kinh_te, ky_thuat_phan_mem, tai_chinh_ngan_hang.

Gia nhập Top-3 P2: cong_nghe_ky_thuat_hoa_hoc, cong_nghe_ky_thuat_xay_dung, ky_thuat_dien.

| Ngành | Hạng trước | Hạng sau | r trước | r sau | Δr |
|---|---|---|---|---|---|
| giao_duc_tieu_hoc | 20 | 20 | -0.68916229 | -0.78692151 | -0.09775922 |
| giao_duc_mam_non | 21 | 21 | -0.80082963 | -0.86502090 | -0.06419127 |
| quan_ly_giao_duc | 16 | 16 | -0.01921222 | -0.30518412 | -0.28597190 |
| tam_ly_hoc_giao_duc | 18 | 18 | -0.20189029 | -0.40508367 | -0.20319338 |
| ky_thuat_phan_mem | 3 | 6 | 0.63851616 | 0.64448609 | 0.00596993 |
| kinh_te | 2 | 10 | 0.77854612 | 0.49852319 | -0.28002293 |
| quan_tri_kinh_doanh | 11 | 13 | 0.44666120 | 0.26698246 | -0.17967874 |
| ke_toan | 5 | 11 | 0.62109203 | 0.39243387 | -0.22865816 |
| tai_chinh_ngan_hang | 1 | 8 | 0.82453106 | 0.57486687 | -0.24966419 |
| quan_tri_khach_san | 15 | 14 | 0.10102884 | -0.04140413 | -0.14243297 |
| ngon_ngu_anh | 17 | 17 | -0.15340847 | -0.40426185 | -0.25085339 |
| van_hoc | 14 | 15 | 0.15539846 | -0.18977990 | -0.34517836 |
| luat | 4 | 12 | 0.62507586 | 0.33158948 | -0.29348638 |
| cong_nghe_ky_thuat_xay_dung | 10 | 3 | 0.45567227 | 0.70990364 | 0.25423137 |
| ky_thuat_dien_tu_vien_thong | 12 | 5 | 0.42572986 | 0.65623024 | 0.23050038 |
| ky_thuat_dien | 8 | 1 | 0.49279616 | 0.73289905 | 0.24010288 |
| cong_nghe_ky_thuat_hoa_hoc | 7 | 2 | 0.49566889 | 0.72450115 | 0.22883226 |
| toan_hoc | 6 | 9 | 0.51487711 | 0.51302258 | -0.00185453 |
| nong_hoc | 13 | 4 | 0.41183184 | 0.67523518 | 0.26340334 |
| quan_ly_dat_dai | 9 | 7 | 0.46389322 | 0.62420349 | 0.16031027 |
| cong_tac_xa_hoi | 19 | 19 | -0.47861285 | -0.63009144 | -0.15147859 |

Bằng chứng tầng mô hình (không phải attribution nhân quả):

```json
{
  "R": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.8128450088377468,
      -0.35157214719918395
    ],
    "binary_class_changed": false
  },
  "I": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      1
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      0.7068872451782227,
      0.7068872451782227
    ],
    "binary_class_changed": false
  },
  "A": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      0,
      0
    ],
    "raw_margins": [
      -0.24344901879476405,
      -0.35165941497032804
    ],
    "binary_class_changed": false
  },
  "S": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      0,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 0,
    "changed_tree_indices_0based": [],
    "raw_margins": [
      -0.7854794263839722,
      -0.7854794263839722
    ],
    "binary_class_changed": false
  },
  "E": {
    "class": "LogisticRegression",
    "predicted_binary_classes": [
      1,
      1
    ],
    "raw_margins": [
      0.6161856649482207,
      0.47998535595467673
    ],
    "binary_class_changed": false
  },
  "C": {
    "class": "XGBClassifier",
    "predicted_binary_classes": [
      1,
      0
    ],
    "tree_count": 160,
    "changed_leaf_count": 14,
    "changed_tree_indices_0based": [
      38,
      47,
      51,
      56,
      61,
      71,
      73,
      84,
      86,
      93,
      98,
      110,
      111,
      127
    ],
    "raw_margins": [
      0.1814643144607544,
      -0.023546498268842697
    ],
    "binary_class_changed": true
  }
}
```
