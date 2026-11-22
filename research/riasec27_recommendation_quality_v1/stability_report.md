# B-10 — Độ ổn định khi perturb

RESEARCH_ONLY — TOP3_NOT_VALIDATED

RECOMMENDATION_BEHAVIOR_EVALUATED

Mỗi câu của mỗi hồ sơ được thay đúng ±1; tại biên 1/5 chọn hướng vào trong, các mức giữa dùng seed cố định. Không chọn perturb dựa vào kết quả. N=6.561 cặp cho mỗi phương pháp.

## P0

```json
{
  "total_pairs": 6561,
  "evaluable_pairs": 6340,
  "not_evaluable": 221,
  "not_evaluable_reasons": {
    "NON_SUCCESS": 221
  },
  "same_top3_set": {
    "count": 4590,
    "denominator": 6340,
    "rate": 0.7239747634069401,
    "rate_all_pairs": 0.6995884773662552
  },
  "same_unique_top1": {
    "count": 5294,
    "denominator": 6340,
    "rate": 0.8350157728706624,
    "rate_all_pairs": 0.8068891937204694
  },
  "same_top3_order": {
    "count": 3497,
    "denominator": 6340,
    "rate": 0.5515772870662461,
    "rate_all_pairs": 0.5329980185947264
  },
  "overlap_counts": {
    "0": 9,
    "1": 137,
    "2": 1604,
    "3": 4590
  },
  "jaccard_at_3": {
    "n": 6340,
    "min": 0.0,
    "median": 1.0,
    "mean": 0.8547949526813879,
    "p95": 1.0,
    "max": 1.0
  },
  "status_transitions": {
    "ABSTAIN_FLAT_PROFILE -> SUCCESS": 216,
    "SUCCESS -> ABSTAIN_FLAT_PROFILE": 5,
    "SUCCESS -> SUCCESS": 6340
  },
  "absolute_pearson_change_all_common_candidates": {
    "n": 133140,
    "min": 0.0,
    "median": 0.028579316194874582,
    "mean": 0.039475635439610135,
    "p95": 0.10960101502091626,
    "max": 0.9666936262937775
  }
}
```

## P2

```json
{
  "total_pairs": 6561,
  "evaluable_pairs": 6340,
  "not_evaluable": 221,
  "not_evaluable_reasons": {
    "NON_SUCCESS": 221
  },
  "same_top3_set": {
    "count": 5036,
    "denominator": 6340,
    "rate": 0.7943217665615142,
    "rate_all_pairs": 0.7675659198292943
  },
  "same_unique_top1": {
    "count": 5702,
    "denominator": 6340,
    "rate": 0.8993690851735016,
    "rate_all_pairs": 0.8690748361530255
  },
  "same_top3_order": {
    "count": 3985,
    "denominator": 6340,
    "rate": 0.6285488958990536,
    "rate_all_pairs": 0.6073769242493522
  },
  "overlap_counts": {
    "0": 21,
    "1": 122,
    "2": 1161,
    "3": 5036
  },
  "jaccard_at_3": {
    "n": 6340,
    "min": 0.0,
    "median": 1.0,
    "mean": 0.8897318611987381,
    "p95": 1.0,
    "max": 1.0
  },
  "status_transitions": {
    "ABSTAIN_FLAT_PROFILE -> SUCCESS": 216,
    "SUCCESS -> ABSTAIN_FLAT_PROFILE": 5,
    "SUCCESS -> SUCCESS": 6340
  },
  "absolute_pearson_change_all_common_candidates": {
    "n": 133140,
    "min": 4.2862930205167515e-08,
    "median": 0.018683674568280476,
    "mean": 0.03696843604149908,
    "p95": 0.13338868245550722,
    "max": 1.1121292858060894
  },
  "absolute_probability_change": {
    "R": {
      "n": 6340,
      "min": 7.551917949284032e-06,
      "median": 0.006286585060118581,
      "mean": 0.015325034241345148,
      "p95": 0.06532211421806773,
      "max": 0.11480881904759338
    },
    "I": {
      "n": 6340,
      "min": 0.0,
      "median": 0.0,
      "mean": 0.009651058226565269,
      "p95": 0.058490711450576716,
      "max": 0.2267293930053711
    },
    "A": {
      "n": 6340,
      "min": 0.00010310171470861995,
      "median": 0.012611115175893126,
      "mean": 0.019897206967298273,
      "p95": 0.064312957054037,
      "max": 0.11711245772053919
    },
    "S": {
      "n": 6340,
      "min": 0.0,
      "median": 0.002275332808494568,
      "mean": 0.010111793047199114,
      "p95": 0.04532780051231378,
      "max": 0.2493416666984558
    },
    "E": {
      "n": 6340,
      "min": 3.2678271021047145e-05,
      "median": 0.013273711272147076,
      "mean": 0.019511787010062915,
      "p95": 0.06896168281235365,
      "max": 0.09138866871157714
    },
    "C": {
      "n": 6340,
      "min": 0.0,
      "median": 0.0,
      "mean": 0.010935311418390988,
      "p95": 0.052859234809875394,
      "max": 0.21466830372810364
    }
  }
}
```

overlap_counts báo số cặp có 0/1/2/3 ngành chung, thay cho ngưỡng 'thay đổi mạnh' tùy ý. Tỷ lệ không giao Top-3 = số overlap=0 / số cặp SUCCESS hai phía; báo thêm mẫu số toàn bộ.

Điểm r được so trên mọi ứng viên chung có điểm; chênh lệch Top-3 chung cũng được lưu riêng. Q5 delta chỉ tính khi cả trước/sau có đủ sáu xác suất; qua flat guard là N/A. P95 nội suy tuyến tính trên chỉ số 0,95(n−1); không phải khoảng tin cậy.

| Nhóm | N cặp | P0 Jaccard TB | P2 Jaccard TB |
|---|---|---|---|
| anchor | 27 | 0.814815 | 1.000000 |
| balanced | 54 | 0.410204 | 0.640816 |
| combined_pair | 405 | 0.969136 | 0.964198 |
| combined_triple | 540 | 0.974074 | 0.976852 |
| flat_nonuniform | 81 | N/A | N/A |
| flat_uniform | 135 | N/A | N/A |
| micro_change | 891 | 0.855219 | 0.953423 |
| near_competition | 810 | 0.911358 | 0.890370 |
| random_uniform_likert | 3456 | 0.811082 | 0.849479 |
| single_dominant | 162 | 0.959877 | 0.975309 |

Không có ground truth ngành đúng, nhãn relevance hoặc khảo sát độc lập. Không tính Accuracy,
Hit@3, NDCG hay kết luận P2 tốt hơn P0. Các hồ sơ thiết kế và các perturb có chung hồ sơ gốc,
không phải mẫu học sinh độc lập; không suy rộng tần suất hay tính khoảng tin cậy dân số.
Likert là thứ bậc. Hồ sơ cực trị/ngẫu nhiên có thể ngoài phân bố huấn luyện. Xác suất Q5 chưa
được phê duyệt calibration; không phải xác suất phù hợp ngành hoặc thành công. Chỉ 21/33 ngành
tham gia; 12 ngành còn lại không được chấm. READY chỉ là điều kiện chạy prototype.
Không đặt ngưỡng đạt ổn định khoa học; không thay model, normalization, mapping hoặc tie policy.
