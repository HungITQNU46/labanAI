const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ARTIFACT_DIRECTORY = path.join(__dirname, '..', '..', 'data', 'ml_pipeline', 'artifacts');
const ARTIFACT_FILE = 'f54_centroid_full1000_v1.json';
const MANIFEST_FILE = 'f54_centroid_full1000_v1.manifest.json';
const MODEL_VERSION = 'f54-centroid-full1000-v1';
const DATASET_VERSION = 'owner-declared-real-2026-10-19';
const DATASET_SHA256 = '13e37affaeca2eaef49ee998acb80efb70de6146ce1ba4f781c215740786ff42';
const FEATURE_ORDER = Array.from({ length: 54 }, (_, index) => `q${index + 1}`);
const ARTIFACT_FIELDS = ['model_version', 'dataset_version', 'dataset_sha256', 'mapping_version', 'mapping_status',
    'owner_confirmation_status', 'independent_verification_status', 'task', 'feature_set', 'feature_count',
    'feature_order', 'feature_schema', 'model', 'training_configuration', 'evaluation_metrics', 'reference_sha256', 'limitations'];
const NOTICE = 'Điểm tương đồng phản hồi F54 không phải xác suất thành công, trúng tuyển hay mức phù hợp nghề nghiệp đã được kiểm chứng.';

class MlInputError extends Error {}
class MlArtifactError extends Error {}

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateInput(payload) {
    if (!isObject(payload) || Object.keys(payload).some((key) => !['feature_set', 'answers', 'top_k'].includes(key))) {
        throw new MlInputError('Chỉ chấp nhận feature_set, answers và top_k.');
    }
    if (payload.feature_set !== 'F54') {
        throw new MlInputError('feature_set phải là F54; khảo sát Holland 60 câu chưa có bảng chuyển đổi.');
    }
    if (!Array.isArray(payload.answers) || payload.answers.length !== 54) {
        throw new MlInputError('Cần đúng 54 câu trả lời theo thứ tự q1 đến q54 của công cụ F54.');
    }
    if (!Array.from(payload.answers).every((answer) => Number.isInteger(answer) && answer >= 1 && answer <= 5)) {
        throw new MlInputError('Mỗi câu trả lời phải là số nguyên từ 1 đến 5.');
    }
    const topK = payload.top_k === undefined ? 5 : payload.top_k;
    if (!Number.isInteger(topK) || topK < 1 || topK > 33) {
        throw new MlInputError('top_k phải là số nguyên từ 1 đến 33.');
    }
    return { answers: payload.answers, topK };
}

function validateArtifact(artifact) {
    if (!isObject(artifact) || Object.keys(artifact).sort().join(',') !== [...ARTIFACT_FIELDS].sort().join(',')) {
        throw new MlArtifactError('Model phải chỉ chứa các trường tổng hợp đã khai báo.');
    }
    const schema = artifact.feature_schema;
    const profiles = artifact.model?.profiles;
    if (artifact.model_version !== MODEL_VERSION || artifact.dataset_version !== DATASET_VERSION
        || artifact.dataset_sha256 !== DATASET_SHA256 || artifact.task !== 'current_major_retrieval'
        || artifact.feature_set !== 'F54' || artifact.feature_count !== 54
        || JSON.stringify(artifact.feature_order) !== JSON.stringify(FEATURE_ORDER)
        || artifact.mapping_status !== 'PROPOSED' || artifact.mapping_version !== '0.1.0-proposed'
        || artifact.owner_confirmation_status !== 'OWNER_CONFIRMED_REAL'
        || artifact.independent_verification_status !== 'NOT_YET_INDEPENDENTLY_VERIFIED'
        || !isObject(schema) || Object.keys(schema).length !== 4 || schema.type !== 'integer'
        || schema.minimum !== 1 || schema.maximum !== 5 || schema.count !== 54
        || !isObject(artifact.model) || Object.keys(artifact.model).sort().join(',') !== 'profiles,tau,type'
        || artifact.model.type !== 'centroid_cosine' || artifact.model.tau !== 10
        || !isObject(artifact.training_configuration) || !isObject(artifact.evaluation_metrics)
        || !Array.isArray(profiles) || profiles.length !== 33) {
        throw new MlArtifactError('Model F54 không đáp ứng contract.');
    }
    const codes = [];
    for (const profile of profiles) {
        if (!isObject(profile) || Object.keys(profile).sort().join(',') !== 'centroid,major_code,major_name,n_train'
            || typeof profile.major_code !== 'string' || !profile.major_code.trim()
            || typeof profile.major_name !== 'string' || !profile.major_name.trim()
            || !Number.isInteger(profile.n_train) || profile.n_train < 5
            || !Array.isArray(profile.centroid) || profile.centroid.length !== 54
            || !profile.centroid.every((value) => Number.isFinite(value) && value >= 1 && value <= 5)) {
            throw new MlArtifactError('Centroid F54 không hợp lệ.');
        }
        codes.push(profile.major_code);
    }
    if (new Set(codes).size !== 33 || JSON.stringify([...codes].sort()) !== JSON.stringify(codes)
        || profiles.reduce((total, profile) => total + profile.n_train, 0) !== 1000) {
        throw new MlArtifactError('Nhãn hoặc support của model không hợp lệ.');
    }
    const configuration = artifact.training_configuration;
    const requiredConfiguration = {
        fit_record_count: 1000, fit_scope: 'FULL_DATA_AFTER_INNER_CV_SELECTION',
        preprocessing: 'RAW_LIKERT_NO_SCALER', seed: 20261019,
        selected_ranking_config: 'centroid_cosine:{"tau":10.0}',
        selection_source: 'EXISTING_FULL_DATA_INNER_GROUP_CV', cv_rerun: false, test_reevaluated: false
    };
    const metrics = artifact.evaluation_metrics;
    if (Object.entries(requiredConfiguration).some(([key, value]) => configuration[key] !== value)
        || ['selected_procedure_nested_oof_hit_at_3', 'centroid_method_nested_oof_hit_at_3']
            .some((key) => !Number.isFinite(metrics[key]) || metrics[key] < 0 || metrics[key] > 1)
        || metrics.kpi_threshold !== 0.8 || metrics.kpi_threshold_met !== false
        || metrics.full_data_fit_has_independent_test !== false) {
        throw new MlArtifactError('Model phải giữ đúng cấu hình training và giới hạn đánh giá.');
    }
}

function loadVerifiedArtifact(directory = ARTIFACT_DIRECTORY) {
    try {
        // Recheck the on-disk bundle on every request; never use a stale cached model.
        const contents = fs.readFileSync(path.join(directory, ARTIFACT_FILE));
        const manifest = JSON.parse(fs.readFileSync(path.join(directory, MANIFEST_FILE), 'utf8'));
        const digest = createHash('sha256').update(contents).digest('hex');
        if (manifest.model_version !== MODEL_VERSION || !isObject(manifest.files)
            || Object.keys(manifest.files).length !== 1 || manifest.files[ARTIFACT_FILE] !== digest) {
            throw new MlArtifactError('Manifest SHA-256 không khớp model.');
        }
        const artifact = JSON.parse(contents.toString('utf8'));
        validateArtifact(artifact);
        return artifact;
    } catch {
        // Do not expose local paths, raw inputs or parser internals to callers.
        throw new MlArtifactError('Model F54 đã xác minh hiện không khả dụng.');
    }
}

function rankF54(artifact, payload) {
    const { answers, topK } = validateInput(payload);
    const queryNorm = Math.sqrt(answers.reduce((sum, value) => sum + value * value, 0));
    const ranked = artifact.model.profiles.map((profile) => {
        const dot = profile.centroid.reduce((sum, value, index) => sum + value * answers[index], 0);
        const norm = Math.sqrt(profile.centroid.reduce((sum, value) => sum + value * value, 0));
        return {
            major_code: profile.major_code,
            major_name: profile.major_name,
            similarity_score: Math.max(0, Math.min(100, 100 * dot / (queryNorm * norm))),
            n_train: profile.n_train
        };
    });
    ranked.sort((left, right) => right.similarity_score - left.similarity_score
        || (left.major_code < right.major_code ? -1 : left.major_code > right.major_code ? 1 : 0));
    return {
        model_version: artifact.model_version,
        dataset_version: artifact.dataset_version,
        feature_set: 'F54',
        task: 'current_major_retrieval',
        research_only: true,
        score_type: 'cosine_similarity_0_100',
        recommendations: ranked.slice(0, topK).map((entry) => ({
            ...entry, similarity_score: Math.round(entry.similarity_score * 1e6) / 1e6
        })),
        notice: NOTICE
    };
}

function recommend(payload) {
    validateInput(payload);
    return rankF54(loadVerifiedArtifact(), payload);
}

function getStatus() {
    const artifact = loadVerifiedArtifact();
    return {
        available: true,
        model_version: artifact.model_version,
        feature_set: 'F54',
        feature_count: 54,
        task: artifact.task,
        research_only: true,
        mapping_status: artifact.mapping_status,
        owner_confirmation_status: artifact.owner_confirmation_status,
        independent_verification_status: artifact.independent_verification_status,
        evaluation_metrics: artifact.evaluation_metrics,
        notice: NOTICE
    };
}

module.exports = { recommend, getStatus, validateInput, rankF54, loadVerifiedArtifact, MlInputError, MlArtifactError };
