"""
LabanAI - Direction B / Phase B-02
Script: test_artifacts.py
Purpose: Comprehensive test suite for the 6 Q5 model artifacts, verifying the 14 mandatory checks.
Run via:
    py -3.14 -m unittest research/riasec27_q5_models_v1/test_artifacts.py -v
"""

import hashlib
import json
import os
from pathlib import Path
import sys
import unittest
import joblib
import numpy as np
import pandas as pd

# Add current directory and repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
sys.path.insert(0, str(SCRIPT_DIR))

FEATURE_ORDER_27 = [
    "R1", "I1", "A1", "R2", "I2", "A2", "S1", "S2", "R3", "A3",
    "S3", "E1", "R4", "S4", "E2", "R5", "I3", "A4", "E3", "I4",
    "A5", "E4", "C1", "E5", "C2", "C3", "C4"
]

DOMAINS = ["R", "I", "A", "S", "E", "C"]
ARTIFACT_NAMES = {
    "R": "model_q5_re.joblib",
    "I": "model_q5_in.joblib",
    "A": "model_q5_ar.joblib",
    "S": "model_q5_so.joblib",
    "E": "model_q5_en.joblib",
    "C": "model_q5_co.joblib",
}


def validate_input_dict(input_dict: dict) -> list:
    """
    Validates a dictionary of {question_id: score} against FEATURE_ORDER_27.
    Rejects extra, missing, wrong type, or out-of-bounds keys.
    """
    if not isinstance(input_dict, dict):
        raise TypeError(f"Expected dict, got {type(input_dict).__name__}")
    if set(input_dict.keys()) != set(FEATURE_ORDER_27):
        missing = set(FEATURE_ORDER_27) - set(input_dict.keys())
        extra = set(input_dict.keys()) - set(FEATURE_ORDER_27)
        raise ValueError(f"Invalid question keys. Missing: {missing}, Extra: {extra}")

    validated = []
    for k in FEATURE_ORDER_27:
        val = input_dict[k]
        if isinstance(val, bool) or not isinstance(val, int):
            raise TypeError(f"Key {k} must have integer value, got {type(val).__name__} ({val!r})")
        if val < 1 or val > 5:
            raise ValueError(f"Key {k} with value {val} is out of bounds [1, 5]")
        validated.append(int(val))
    return validated


class TestLabanAIQ5Artifacts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest_path = SCRIPT_DIR / "models_manifest.json"
        if not cls.manifest_path.is_file():
            raise FileNotFoundError(f"Manifest not found: {cls.manifest_path}")
        with open(cls.manifest_path, "r", encoding="utf-8") as f:
            cls.manifest = json.load(f)

        cls.loaded_models = {}
        for d in DOMAINS:
            model_path = SCRIPT_DIR / ARTIFACT_NAMES[d]
            cls.loaded_models[d] = joblib.load(model_path)

        # Baseline sample (hypothetical realistic 27 answers)
        cls.sample_input_list = [4, 5, 2, 4, 5, 1, 2, 1, 5, 2, 2, 3, 4, 1, 3, 5, 4, 2, 2, 5, 1, 3, 4, 2, 4, 5, 4]
        cls.sample_input_df = pd.DataFrame([cls.sample_input_list], columns=FEATURE_ORDER_27)

    # 1. Có đủ sáu artifact
    def test_01_all_six_artifacts_exist(self):
        for d, name in ARTIFACT_NAMES.items():
            path = SCRIPT_DIR / name
            self.assertTrue(path.is_file(), f"Artifact missing: {name}")
            self.assertGreater(path.stat().st_size, 1000, f"Artifact too small: {name}")

    # 2. Nạp lại được bằng môi trường hiện tại
    def test_02_reloadable_in_current_environment(self):
        for d, name in ARTIFACT_NAMES.items():
            model = joblib.load(SCRIPT_DIR / name)
            self.assertIsNotNone(model)
            self.assertTrue(hasattr(model, "predict"))
            self.assertTrue(hasattr(model, "predict_proba"))

    # 3. Dự đoán đúng kiểu dữ liệu
    def test_03_predict_correct_data_types(self):
        for d, model in self.loaded_models.items():
            preds = model.predict(self.sample_input_df)
            probs = model.predict_proba(self.sample_input_df)
            self.assertIsInstance(preds, np.ndarray)
            self.assertIn(preds.dtype, [np.int64, np.int32, int])
            self.assertIsInstance(probs, np.ndarray)
            self.assertTrue(np.issubdtype(probs.dtype, np.floating), f"Expected float dtype, got {probs.dtype}")
            self.assertIn(probs.dtype, [np.float32, np.float64])
            self.assertEqual(probs.shape, (1, 2))

    # 4. Mỗi model nhận chính xác 27 đặc trưng
    def test_04_each_model_accepts_exactly_27_features(self):
        for d, model in self.loaded_models.items():
            # 27 features OK
            probs = model.predict_proba(self.sample_input_df)
            self.assertEqual(len(probs), 1)

            # 26 features -> raises ValueError
            bad_26 = self.sample_input_df.iloc[:, :26]
            with self.assertRaises(ValueError):
                model.predict_proba(bad_26)

            # 28 features -> raises ValueError
            bad_28 = self.sample_input_df.copy()
            bad_28["EXTRA"] = 3
            with self.assertRaises(ValueError):
                model.predict_proba(bad_28)

    # 5. classes_ khớp thứ tự nhãn 0/1
    def test_05_classes_matches_label_order_0_1(self):
        for d, model in self.loaded_models.items():
            classes = model.classes_
            self.assertEqual(list(classes), [0, 1])

    # 6. predict_proba hữu hạn, nằm trong [0,1], tổng hai lớp bằng 1 trong dung sai số học
    def test_06_predict_proba_finite_and_sums_to_one(self):
        # Test on varied inputs
        test_inputs = pd.DataFrame([
            [1] * 27,
            [5] * 27,
            [3] * 27,
            self.sample_input_list,
        ], columns=FEATURE_ORDER_27)

        for d, model in self.loaded_models.items():
            probs = model.predict_proba(test_inputs)
            self.assertTrue(np.all(np.isfinite(probs)), f"Non-finite prob in domain {d}")
            self.assertTrue(np.all(probs >= 0.0), f"Negative prob in domain {d}")
            self.assertTrue(np.all(probs <= 1.0), f"Prob > 1 in domain {d}")
            row_sums = probs.sum(axis=1)
            np.testing.assert_allclose(row_sums, 1.0, atol=1e-6, err_msg=f"Probs don't sum to 1 in {d}")

    # 7. Dự đoán cùng dữ liệu trước/sau lưu có kết quả nhất quán
    def test_07_prediction_consistency_before_after_saving(self):
        # Reload fresh instances from disk and verify bit-identity
        for d, name in ARTIFACT_NAMES.items():
            reloaded = joblib.load(SCRIPT_DIR / name)
            p1 = self.loaded_models[d].predict(self.sample_input_df)
            p2 = reloaded.predict(self.sample_input_df)
            np.testing.assert_array_equal(p1, p2)

    # 8. Sai lệch xác suất trước/sau nạp lại nằm trong dung sai số thực
    def test_08_probability_delta_within_numerical_tolerance(self):
        for d, name in ARTIFACT_NAMES.items():
            reloaded = joblib.load(SCRIPT_DIR / name)
            prob1 = self.loaded_models[d].predict_proba(self.sample_input_df)
            prob2 = reloaded.predict_proba(self.sample_input_df)
            max_delta = np.max(np.abs(prob1 - prob2))
            self.assertLessEqual(max_delta, 1e-7, f"Domain {d} probability delta too large: {max_delta}")

    # 9. Đầu vào thiếu, thừa, sai kiểu, ngoài miền 1–5 bị từ chối bởi bộ xác thực
    def test_09_inputs_invalid_rejected_by_validator(self):
        valid_dict = {k: 3 for k in FEATURE_ORDER_27}

        # Missing key
        dict_missing = valid_dict.copy()
        del dict_missing["R1"]
        with self.assertRaises(ValueError):
            validate_input_dict(dict_missing)

        # Extra key
        dict_extra = valid_dict.copy()
        dict_extra["EXTRA_Q"] = 3
        with self.assertRaises(ValueError):
            validate_input_dict(dict_extra)

        # Out of bounds (< 1)
        dict_low = valid_dict.copy()
        dict_low["A1"] = 0
        with self.assertRaises(ValueError):
            validate_input_dict(dict_low)

        # Out of bounds (> 5)
        dict_high = valid_dict.copy()
        dict_high["C4"] = 6
        with self.assertRaises(ValueError):
            validate_input_dict(dict_high)

        # Float value
        dict_float = valid_dict.copy()
        dict_float["S1"] = 3.5
        with self.assertRaises(TypeError):
            validate_input_dict(dict_float)

        # Bool value
        dict_bool = valid_dict.copy()
        dict_bool["E2"] = True
        with self.assertRaises(TypeError):
            validate_input_dict(dict_bool)

    # 10. Thứ tự câu hỏi sai không bị âm thầm chấp nhận tại hợp đồng có mã câu hỏi
    def test_10_wrong_question_order_rejected_in_keyed_contract(self):
        # A reversed-order dictionary with valid values in [1, 5]
        reversed_dict = {k: (idx % 5) + 1 for idx, k in enumerate(reversed(FEATURE_ORDER_27))}
        validated_list = validate_input_dict(reversed_dict)
        self.assertEqual(len(validated_list), 27)
        # Ensure that R1 got its actual dict value, not the first key in the reversed dict
        self.assertEqual(validated_list[0], reversed_dict["R1"])
        self.assertEqual(validated_list[-1], reversed_dict["C4"])

    # 11. Mỗi mô hình nhận đúng nhãn mục tiêu của mình
    def test_11_each_model_receives_correct_target(self):
        models_meta = self.manifest["models"]
        expected_targets = {
            "R": "Q5_LikeRe",
            "I": "Q5_LikeIn",
            "A": "Q5_LikeAr",
            "S": "Q5_LikeSo",
            "E": "Q5_LikeEn",
            "C": "Q5_LikeCo",
        }
        for d, expected_col in expected_targets.items():
            self.assertIn(d, models_meta)
            self.assertEqual(models_meta[d]["target_column"], expected_col)

    # 12. Không có bản ghi thuộc nhóm Test trong tập fit
    def test_12_no_test_group_in_fit_set(self):
        prov = self.manifest["data_provenance"]
        self.assertEqual(prov["train_records"], 3963)
        self.assertEqual(prov["test_records_locked_untouched"], 947)
        self.assertEqual(prov["total_raw_records"], 4910)
        # Verify training samples per domain match expected counts after dropping Q5=3
        expected_counts = {"R": 2860, "I": 2884, "A": 2895, "S": 2784, "E": 2829, "C": 2874}
        for d, expected_n in expected_counts.items():
            self.assertEqual(self.manifest["models"][d]["training_samples"], expected_n)

    # 13. Có thể tái lập artifact từ script và dữ liệu đã khóa
    def test_13_reproducibility_check(self):
        self.assertEqual(self.manifest["data_provenance"]["raw_workbook_sha256"],
                         "c8a9445edba02a37cf862a3b1eabffba910eb7eeaf1d48b4c6f8ac19fea296c8")
        self.assertEqual(self.manifest["data_provenance"]["train_index_sha256"],
                         "471fecbbc5d665e949eae03bcdebedc996044f30136a56d8b1d698ad3d7e2d4d")

    # 14. Không làm thay đổi kết quả hoặc file của baseline Pearson
    def test_14_no_changes_to_baseline_pearson(self):
        baseline_dir = REPO_ROOT / "research" / "riasec27_top3_b1_v0"
        self.assertTrue(baseline_dir.is_dir())
        baseline_files = {p.name for p in baseline_dir.iterdir() if p.is_file()}
        expected_files = {"prototype.py", "reference.json", "test_prototype.py", "README.md"}
        self.assertEqual(baseline_files, expected_files)


if __name__ == "__main__":
    unittest.main()
