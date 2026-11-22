# B-12 — Demo công cụ đánh giá theo cặp

SYNTHETIC_DEMO_ONLY — NOT_SCIENTIFIC_VALIDATION

RESEARCH_ONLY — TOP3_NOT_VALIDATED

Nhãn được sinh độc lập với dự đoán chỉ để kiểm tra công thức/luồng xử lý. Không phải nhãn học sinh, không phải kiểm định khoa học và không phải độ phù hợp nghề nghiệp khách quan.

## Quy tắc khóa trước demo

Gain=2^rel−1; discount=1/log2(k+1); IDCG lấy ba relevance lớn nhất trên đúng 21 READY. Precision@3 và Hit@3 coi rel≥2 là có quan tâm. Không đổi ngưỡng để P2 thắng. Nhãn null không bằng 0; thiếu một nhãn ngoài Top-3 cũng không đủ điều kiện phân tích chính.

IDCG=0: NDCG=0 theo B-08, giữ trong mẫu số paired, báo số lượng riêng. Nếu đồng hạng nằm trọn trong Top-3, DCG lấy kỳ vọng trên hoán vị trong nhóm; không phá hòa theo ID. TIED_BOUNDARY/ABSTAIN/ERROR không có Top-3 thay thế.

## Thống kê

```json
{
  "total_profiles": 13,
  "valid_profiles": 8,
  "invalid_profiles": 5,
  "missing_label_profiles": 3,
  "complete_label_valid_profiles": 6,
  "paired_evaluable_profiles": 5,
  "not_evaluable_profiles": 8,
  "not_evaluable_reasons_nonexclusive": {
    "INSUFFICIENT_LABELS": 3,
    "NON_SUCCESS": 1,
    "INVALID_INPUT": 5
  },
  "idcg_zero_paired_profiles": 1,
  "unique_answer_vectors_valid_profiles": 8,
  "mean_paired_difference_ndcg_at_3": -0.12625620019642397,
  "methods": {
    "P0": {
      "statuses": {
        "SUCCESS": 7,
        "ABSTAIN_FLAT_PROFILE": 1,
        "TIED_BOUNDARY": 0,
        "ERROR": 0,
        "NOT_RUN_INVALID_INPUT": 5
      },
      "status_rates_all_profiles": {
        "SUCCESS": {
          "count": 7,
          "denominator": 13,
          "rate": 0.5384615384615384
        },
        "ABSTAIN_FLAT_PROFILE": {
          "count": 1,
          "denominator": 13,
          "rate": 0.07692307692307693
        },
        "TIED_BOUNDARY": {
          "count": 0,
          "denominator": 13,
          "rate": 0.0
        },
        "ERROR": {
          "count": 0,
          "denominator": 13,
          "rate": 0.0
        },
        "NOT_RUN_INVALID_INPUT": {
          "count": 5,
          "denominator": 13,
          "rate": 0.38461538461538464
        }
      },
      "coverage_all_profiles": {
        "count": 7,
        "denominator": 13,
        "rate": 0.5384615384615384
      },
      "coverage_valid_profiles": {
        "count": 7,
        "denominator": 8,
        "rate": 0.875
      },
      "paired_metric_denominator": 5,
      "mean_ndcg_at_3": 0.6454903949123352,
      "mean_precision_at_3": 0.5333333333333333,
      "mean_hit_at_3": 0.6
    },
    "P2": {
      "statuses": {
        "SUCCESS": 7,
        "ABSTAIN_FLAT_PROFILE": 1,
        "TIED_BOUNDARY": 0,
        "ERROR": 0,
        "NOT_RUN_INVALID_INPUT": 5
      },
      "status_rates_all_profiles": {
        "SUCCESS": {
          "count": 7,
          "denominator": 13,
          "rate": 0.5384615384615384
        },
        "ABSTAIN_FLAT_PROFILE": {
          "count": 1,
          "denominator": 13,
          "rate": 0.07692307692307693
        },
        "TIED_BOUNDARY": {
          "count": 0,
          "denominator": 13,
          "rate": 0.0
        },
        "ERROR": {
          "count": 0,
          "denominator": 13,
          "rate": 0.0
        },
        "NOT_RUN_INVALID_INPUT": {
          "count": 5,
          "denominator": 13,
          "rate": 0.38461538461538464
        }
      },
      "coverage_all_profiles": {
        "count": 7,
        "denominator": 13,
        "rate": 0.5384615384615384
      },
      "coverage_valid_profiles": {
        "count": 7,
        "denominator": 8,
        "rate": 0.875
      },
      "paired_metric_denominator": 5,
      "mean_ndcg_at_3": 0.5192341947159111,
      "mean_precision_at_3": 0.5333333333333333,
      "mean_hit_at_3": 0.6
    }
  }
}
```

## Từng hồ sơ

| Dòng | Hợp lệ | Thiếu nhãn | P0 | P2 | Điều kiện | NDCG P0 | NDCG P2 | Δ P2−P0 |
|---|---|---|---|---|---|---|---|---|
| 1 | True | 0 | SUCCESS | SUCCESS | EVALUABLE_COMPLETE_21 | 1.00000000 | 0.86592036 | -0.13407964 |
| 2 | True | 0 | SUCCESS | SUCCESS | EVALUABLE_COMPLETE_21 | 0.83081034 | 0.30167918 | -0.52913116 |
| 3 | True | 1 | SUCCESS | SUCCESS | NOT_EVALUABLE | N/A | N/A | N/A |
| 4 | True | 1 | SUCCESS | SUCCESS | NOT_EVALUABLE | N/A | N/A | N/A |
| 5 | True | 0 | SUCCESS | SUCCESS | EVALUABLE_COMPLETE_21 | 0.00000000 | 0.00000000 | 0.00000000 |
| 6 | True | 0 | ABSTAIN_FLAT_PROFILE | ABSTAIN_FLAT_PROFILE | NOT_EVALUABLE | N/A | N/A | N/A |
| 7 | False | 0 | NOT_RUN_INVALID_INPUT | NOT_RUN_INVALID_INPUT | NOT_EVALUABLE | N/A | N/A | N/A |
| 8 | False | 0 | NOT_RUN_INVALID_INPUT | NOT_RUN_INVALID_INPUT | NOT_EVALUABLE | N/A | N/A | N/A |
| 9 | False | 1 | NOT_RUN_INVALID_INPUT | NOT_RUN_INVALID_INPUT | NOT_EVALUABLE | N/A | N/A | N/A |
| 10 | False | 0 | NOT_RUN_INVALID_INPUT | NOT_RUN_INVALID_INPUT | NOT_EVALUABLE | N/A | N/A | N/A |
| 11 | False | 0 | NOT_RUN_INVALID_INPUT | NOT_RUN_INVALID_INPUT | NOT_EVALUABLE | N/A | N/A | N/A |
| 12 | True | 0 | SUCCESS | SUCCESS | EVALUABLE_COMPLETE_21 | 0.39664164 | 0.42857143 | 0.03192979 |
| 13 | True | 0 | SUCCESS | SUCCESS | EVALUABLE_COMPLETE_21 | 1.00000000 | 1.00000000 | 0.00000000 |

## Diễn giải và giới hạn

Không suy từ chênh lệch số học trên demo thành P2 tốt hơn P0. Các trung bình chỉ dùng chung các hồ sơ paired đủ 21 nhãn; coverage báo riêng trên toàn bộ đầu vào và trên hồ sơ hợp lệ. Không bỏ hồ sơ thiếu/abstain/tied/error khỏi tổng đếm. Các lý do loại trừ có thể chồng lấp, không cộng chúng như một flow loại trừ rời nhau.

Dữ liệu giả không cung cấp p-value, khoảng tin cậy dân số hoặc bằng chứng chất lượng Top-3. Khi có nghiên cứu thật được duyệt: khóa nhãn trước gợi ý, kế hoạch loại trừ và phân tích theo cặp trước khi xem điểm; CI/kiểm định cần xét cụm trường/lớp/người và vector lặp, không mặc định độc lập hay MAR. Schema B-12 chưa chứa mã cụm; phải thiết kế quản trị dữ liệu riêng trước suy luận thống kê chính thức.
