"""
LabanAI - Direction B / Phase B-02
Script: train_models.py
Purpose: Reproducible training and packaging of the 6 locked Q5 ML models.
Outputs:
  - 6 .joblib model artifact files
  - models_manifest.json with complete metadata, OOF diagnostics, and checksums
"""

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    brier_score_loss,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

# Constants
EXPECTED_RAW_SHA256 = "c8a9445edba02a37cf862a3b1eabffba910eb7eeaf1d48b4c6f8ac19fea296c8"
EXPECTED_TRAIN_INDEX_SHA256 = "471fecbbc5d665e949eae03bcdebedc996044f30136a56d8b1d698ad3d7e2d4d"

FEATURE_ORDER_27 = [
    "R1", "I1", "A1", "R2", "I2", "A2", "S1", "S2", "R3", "A3",
    "S3", "E1", "R4", "S4", "E2", "R5", "I3", "A4", "E3", "I4",
    "A5", "E4", "C1", "E5", "C2", "C3", "C4"
]

TARGET_CONFIGS = {
    "R": {
        "target_col": "Q5_LikeRe",
        "model_id": "model_q5_re",
        "artifact_name": "model_q5_re.joblib",
        "algorithm": "LogisticRegression",
        "preprocessing": "StandardScaler",
        "hyperparameters": {
            "C": 1.0,
            "solver": "lbfgs",
            "max_iter": 10000,
            "tol": 1e-4,
            "random_state": 42,
            "class_weight": None,
        },
    },
    "I": {
        "target_col": "Q5_LikeIn",
        "model_id": "model_q5_in",
        "artifact_name": "model_q5_in.joblib",
        "algorithm": "XGBClassifier",
        "preprocessing": "None (Raw27)",
        "hyperparameters": {
            "n_estimators": 160,
            "max_depth": 2,
            "learning_rate": 0.05,
            "subsample": 0.85,
            "colsample_bytree": 0.85,
            "reg_lambda": 4.0,
            "objective": "binary:logistic",
            "eval_metric": "logloss",
            "tree_method": "hist",
            "random_state": 42,
            "n_jobs": 1,
        },
    },
    "A": {
        "target_col": "Q5_LikeAr",
        "model_id": "model_q5_ar",
        "artifact_name": "model_q5_ar.joblib",
        "algorithm": "LogisticRegression",
        "preprocessing": "StandardScaler",
        "hyperparameters": {
            "C": 1.0,
            "solver": "lbfgs",
            "max_iter": 10000,
            "tol": 1e-4,
            "random_state": 42,
            "class_weight": None,
        },
    },
    "S": {
        "target_col": "Q5_LikeSo",
        "model_id": "model_q5_so",
        "artifact_name": "model_q5_so.joblib",
        "algorithm": "XGBClassifier",
        "preprocessing": "None (Raw27)",
        "hyperparameters": {
            "n_estimators": 160,
            "max_depth": 2,
            "learning_rate": 0.05,
            "subsample": 0.85,
            "colsample_bytree": 0.85,
            "reg_lambda": 4.0,
            "objective": "binary:logistic",
            "eval_metric": "logloss",
            "tree_method": "hist",
            "random_state": 42,
            "n_jobs": 1,
        },
    },
    "E": {
        "target_col": "Q5_LikeEn",
        "model_id": "model_q5_en",
        "artifact_name": "model_q5_en.joblib",
        "algorithm": "LogisticRegression",
        "preprocessing": "StandardScaler",
        "hyperparameters": {
            "C": 1.0,
            "solver": "lbfgs",
            "max_iter": 10000,
            "tol": 1e-4,
            "random_state": 42,
            "class_weight": None,
        },
    },
    "C": {
        "target_col": "Q5_LikeCo",
        "model_id": "model_q5_co",
        "artifact_name": "model_q5_co.joblib",
        "algorithm": "XGBClassifier",
        "preprocessing": "None (Raw27)",
        "hyperparameters": {
            "n_estimators": 160,
            "max_depth": 2,
            "learning_rate": 0.05,
            "subsample": 0.85,
            "colsample_bytree": 0.85,
            "reg_lambda": 4.0,
            "objective": "binary:logistic",
            "eval_metric": "logloss",
            "tree_method": "hist",
            "random_state": 42,
            "n_jobs": 1,
        },
    },
}


def build_pipeline(domain: str) -> Pipeline:
    """Builds the locked pipeline for the specified domain."""
    cfg = TARGET_CONFIGS[domain]
    if cfg["algorithm"] == "LogisticRegression":
        steps = [
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(**cfg["hyperparameters"])),
        ]
    elif cfg["algorithm"] == "XGBClassifier":
        steps = [
            ("classifier", XGBClassifier(**cfg["hyperparameters"])),
        ]
    else:
        raise ValueError(f"Unknown algorithm {cfg['algorithm']}")
    return Pipeline(steps)


def load_and_split_data(repo_root: Path):
    """Replicates the exact Train split from Notebook 02."""
    workbook_path = repo_root / "dataLabanAI.xlsx"
    if not workbook_path.is_file():
        raise FileNotFoundError(f"Missing workbook: {workbook_path}")

    raw_sha = hashlib.sha256(workbook_path.read_bytes()).hexdigest()
    assert raw_sha == EXPECTED_RAW_SHA256, f"Data SHA mismatch: {raw_sha} vs {EXPECTED_RAW_SHA256}"

    excel = pd.ExcelFile(workbook_path)
    raw_riasec = pd.read_excel(excel, sheet_name="RIASEC_27")
    raw_q5 = pd.read_excel(excel, sheet_name="SO_THICH_6")

    merged = raw_riasec.merge(raw_q5, on="SOURCE_ROW", how="outer", validate="one_to_one", sort=False)
    merged = merged.set_index("SOURCE_ROW").loc[raw_riasec["SOURCE_ROW"]].reset_index()

    q5_cols = [cfg["target_col"] for cfg in TARGET_CONFIGS.values()]
    X = merged[FEATURE_ORDER_27].astype("int64")
    y = merged[q5_cols].astype("int64")

    # Group defined by identical 27-item vectors
    groups = pd.Series(pd.factorize(pd.MultiIndex.from_frame(X), sort=False)[0], index=X.index, name="group_X27")

    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_pos, test_pos = next(splitter.split(X, groups=groups))

    X_train = X.iloc[train_pos].copy()
    y_train = y.iloc[train_pos].copy()
    groups_train = groups.iloc[train_pos].copy()

    # Verify signatures
    train_sha = hashlib.sha256(np.asarray(X_train.index, dtype="<i8").tobytes()).hexdigest()
    assert train_sha == EXPECTED_TRAIN_INDEX_SHA256, f"Train index SHA mismatch: {train_sha}"
    assert len(X_train) == 3963, f"Expected 3963 train samples, got {len(X_train)}"

    return X_train, y_train, groups_train, raw_sha, train_sha


def run_oof_diagnostics(X_train: pd.DataFrame, y_train: pd.DataFrame, groups_train: pd.Series):
    """
    Performs 5-fold GroupKFold OOF diagnostics on the Train set.
    Evaluates both the labeled population (Q5 != 3) and the full Train population.
    """
    gkf = GroupKFold(n_splits=5)
    oof_results = {}

    for domain, cfg in TARGET_CONFIGS.items():
        col = cfg["target_col"]
        # Labeled subset mask
        labeled_mask = y_train[col].isin([1, 2, 4, 5])
        X_dom = X_train.loc[labeled_mask].copy()
        y_dom = (y_train.loc[labeled_mask, col] >= 4).astype("int64")
        g_dom = groups_train.loc[labeled_mask].copy()

        n_samples = len(X_dom)
        n_pos = int(y_dom.sum())
        prevalence = n_pos / n_samples

        # Arrays to hold OOF predictions on labeled set
        oof_y_pred = np.zeros(n_samples, dtype="int64")
        oof_p_pred = np.zeros(n_samples, dtype="float64")

        # Also collect OOF probabilities for the FULL 3,963 Train records
        oof_full_p = np.zeros(len(X_train), dtype="float64")

        # 5-fold CV on labeled set
        for train_idx, val_idx in gkf.split(X_dom, y_dom, groups=g_dom):
            pipe = build_pipeline(domain)
            pipe.fit(X_dom.iloc[train_idx], y_dom.iloc[train_idx])

            oof_y_pred[val_idx] = pipe.predict(X_dom.iloc[val_idx])
            oof_p_pred[val_idx] = pipe.predict_proba(X_dom.iloc[val_idx])[:, 1]

        # 5-fold CV across the entire Train (to predict on neutral Q5=3 without leakage)
        for train_idx_full, val_idx_full in gkf.split(X_train, groups=groups_train):
            # Fit only on the labeled samples within this training fold!
            fold_train_labeled = labeled_mask.iloc[train_idx_full]
            pipe_full = build_pipeline(domain)
            pipe_full.fit(
                X_train.iloc[train_idx_full].loc[fold_train_labeled],
                (y_train.iloc[train_idx_full].loc[fold_train_labeled, col] >= 4).astype("int64")
            )
            oof_full_p[val_idx_full] = pipe_full.predict_proba(X_train.iloc[val_idx_full])[:, 1]

        # Compute metrics on labeled set
        acc = accuracy_score(y_dom, oof_y_pred)
        bal_acc = balanced_accuracy_score(y_dom, oof_y_pred)
        prec = precision_score(y_dom, oof_y_pred, zero_division=0)
        rec = recall_score(y_dom, oof_y_pred, zero_division=0)
        f1_bin = f1_score(y_dom, oof_y_pred, zero_division=0)
        f1_macro = f1_score(y_dom, oof_y_pred, average="macro", zero_division=0)
        brier = brier_score_loss(y_dom, oof_p_pred)
        lloss = log_loss(y_dom, oof_p_pred)
        baseline_brier = prevalence * (1.0 - prevalence)
        dummy_acc = max(prevalence, 1.0 - prevalence)

        # Reliability bins (5 bins)
        bins = np.linspace(0.0, 1.0, 6)
        bin_indices = np.digitize(oof_p_pred, bins) - 1
        bin_indices = np.clip(bin_indices, 0, 4)
        reliability = []
        for b in range(5):
            b_mask = (bin_indices == b)
            b_count = int(b_mask.sum())
            if b_count > 0:
                mean_pred = float(oof_p_pred[b_mask].mean())
                frac_pos = float(y_dom.iloc[b_mask].mean())
            else:
                mean_pred = None
                frac_pos = None
            reliability.append({
                "bin_range": [round(bins[b], 1), round(bins[b+1], 1)],
                "count": b_count,
                "mean_predicted_prob": round(mean_pred, 4) if mean_pred is not None else None,
                "fraction_positive": round(frac_pos, 4) if frac_pos is not None else None,
            })

        oof_results[domain] = {
            "target_col": col,
            "labeled_population": {
                "n_samples": n_samples,
                "n_positive": n_pos,
                "prevalence": round(prevalence, 4),
                "dummy_baseline_accuracy": round(dummy_acc, 4),
                "oof_accuracy": round(acc, 4),
                "oof_balanced_accuracy": round(bal_acc, 4),
                "oof_precision": round(prec, 4),
                "oof_recall": round(rec, 4),
                "oof_f1_binary": round(f1_bin, 4),
                "oof_f1_macro": round(f1_macro, 4),
                "brier_score": round(brier, 4),
                "baseline_brier_score": round(baseline_brier, 4),
                "brier_skill_score": round(1.0 - (brier / baseline_brier), 4),
                "log_loss": round(lloss, 4),
                "mean_oof_prob": round(float(oof_p_pred.mean()), 4),
                "std_oof_prob": round(float(oof_p_pred.std()), 4),
                "reliability_5_bins": reliability,
            },
            "full_train_population": {
                "n_samples": len(X_train),
                "mean_oof_prob": round(float(oof_full_p.mean()), 4),
                "std_oof_prob": round(float(oof_full_p.std()), 4),
                "min_oof_prob": round(float(oof_full_p.min()), 4),
                "max_oof_prob": round(float(oof_full_p.max()), 4),
                "quantile_25": round(float(np.quantile(oof_full_p, 0.25)), 4),
                "quantile_50": round(float(np.quantile(oof_full_p, 0.50)), 4),
                "quantile_75": round(float(np.quantile(oof_full_p, 0.75)), 4),
            }
        }

    return oof_results


def train_and_save_artifacts(X_train: pd.DataFrame, y_train: pd.DataFrame, output_dir: Path):
    """
    Fits each of the 6 final pipelines on the entire qualified Train set for that domain.
    Saves each pipeline as a .joblib file and calculates SHA-256 checksums.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    artifact_details = {}

    for domain, cfg in TARGET_CONFIGS.items():
        col = cfg["target_col"]
        mask = y_train[col].isin([1, 2, 4, 5])
        X_dom = X_train.loc[mask].copy()
        y_dom = (y_train.loc[mask, col] >= 4).astype("int64")

        pipe = build_pipeline(domain)
        pipe.fit(X_dom, y_dom)

        artifact_path = output_dir / cfg["artifact_name"]
        joblib.dump(pipe, artifact_path, compress=3)

        sha = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
        artifact_details[domain] = {
            "model_id": cfg["model_id"],
            "artifact_file": cfg["artifact_name"],
            "sha256": sha,
            "fitted_sample_count": len(X_dom),
            "fitted_class_counts": {
                "0 (Dislike)": int((y_dom == 0).sum()),
                "1 (Like)": int((y_dom == 1).sum()),
            },
            "classes": [int(c) for c in pipe.classes_],
        }

    return artifact_details


def main():
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parents[1]  # research/riasec27_q5_models_v1 -> repo_root

    print("=== LabanAI Phase B-02: Model Training & Artifact Packaging ===")
    print(f"Repository Root: {repo_root}")
    print(f"Artifact Directory: {script_dir}")

    # 1. Load and replicate Train split
    print("\n1. Replicating Train split from dataLabanAI.xlsx...")
    X_train, y_train, groups_train, raw_sha, train_sha = load_and_split_data(repo_root)
    print(f"   Train samples: {len(X_train)}, Features: {X_train.shape[1]}")
    print(f"   Train Index SHA-256: {train_sha} [VERIFIED]")

    # 2. Run OOF Diagnostics on Train
    print("\n2. Running 5-fold GroupKFold OOF Diagnostics on Train...")
    oof_results = run_oof_diagnostics(X_train, y_train, groups_train)
    for d, res in oof_results.items():
        lp = res["labeled_population"]
        print(f"   Domain {d} ({res['target_col']}): N={lp['n_samples']}, "
              f"Acc={lp['oof_accuracy']:.4f}, BalAcc={lp['oof_balanced_accuracy']:.4f}, "
              f"Brier={lp['brier_score']:.4f} (Base={lp['baseline_brier_score']:.4f})")

    # 3. Fit and Save Final Artifacts
    print("\n3. Fitting and Saving Final Artifacts on Full Qualified Train Sets...")
    artifact_details = train_and_save_artifacts(X_train, y_train, script_dir)
    for d, detail in artifact_details.items():
        print(f"   Saved {detail['artifact_file']}: N={detail['fitted_sample_count']}, SHA-256={detail['sha256'][:16]}...")

    # 4. Generate models_manifest.json
    print("\n4. Generating models_manifest.json...")
    import sklearn
    import xgboost
    manifest_data = {
        "manifest_version": "1.0.0",
        "phase": "B-02",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "environment": {
            "python_version": sys.version,
            "numpy_version": np.__version__,
            "pandas_version": pd.__version__,
            "scikit_learn_version": sklearn.__version__,
            "xgboost_version": xgboost.__version__,
            "joblib_version": joblib.__version__,
        },
        "data_provenance": {
            "source_workbook": "dataLabanAI.xlsx",
            "raw_workbook_sha256": raw_sha,
            "train_index_sha256": train_sha,
            "total_raw_records": 4910,
            "train_records": len(X_train),
            "test_records_locked_untouched": 947,
            "feature_order_27": FEATURE_ORDER_27,
            "binary_encoding_rule": "1,2 -> 0; 4,5 -> 1; 3 -> dropped per target",
        },
        "models": {},
        "calibration_status": "NOT_APPROVED",
        "calibration_notes": (
            "Probabilities are raw model outputs and have NOT been approved for cross-domain comparison or Top-3 ranking. "
            "Z-score transformation is an exploratory heuristic and is NOT applied to final artifacts."
        ),
        "oof_diagnostics": oof_results,
    }

    for d, cfg in TARGET_CONFIGS.items():
        ad = artifact_details[d]
        manifest_data["models"][d] = {
            "model_id": cfg["model_id"],
            "domain": d,
            "target_column": cfg["target_col"],
            "artifact_file": ad["artifact_file"],
            "sha256": ad["sha256"],
            "algorithm": cfg["algorithm"],
            "preprocessing": cfg["preprocessing"],
            "hyperparameters": cfg["hyperparameters"],
            "training_samples": ad["fitted_sample_count"],
            "class_distribution": ad["fitted_class_counts"],
            "classes": ad["classes"],
        }

    manifest_path = script_dir / "models_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)
    print(f"   Manifest written to {manifest_path}")
    print("\n=== B-02 Model Training Completed Successfully ===")


if __name__ == "__main__":
    main()
