const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const vm = require('node:vm');
const mlModel = require('../src/models/mlModel');
const app = require('../server');

let server;
let origin;
before(async () => {
    server = await new Promise((resolve) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const payload = () => ({ feature_set: 'F54', answers: Array(54).fill(3), top_k: 5 });
const post = (body) => fetch(`${origin}/api/ml/recommendations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});
const syntheticQueries = () => [
    { name: 'all 1', answers: Array(54).fill(1) },
    { name: 'all 3', answers: Array(54).fill(3) },
    { name: 'all 5', answers: Array(54).fill(5) },
    { name: 'alternating 1 and 5', answers: Array.from({ length: 54 }, (_, index) => index % 2 ? 5 : 1) },
    { name: 'first 27 high, last 27 low', answers: [...Array(27).fill(5), ...Array(27).fill(1)] },
    { name: 'first 27 low, last 27 high', answers: [...Array(27).fill(1), ...Array(27).fill(5)] }
];

function assertSafeError(data) {
    assert.equal(typeof data.error, 'string');
    assert.equal(typeof data.message, 'string');
    for (const field of ['answers', 'raw_answers', 'student_name', 'stack', 'centroid']) {
        assert.equal(Object.hasOwn(data, field), false, field);
    }
}

test('verified artifact loads with the declared F54 feature order', () => {
    const artifact = mlModel.loadVerifiedArtifact();
    assert.equal(artifact.model.profiles.length, 33);
    assert.deepEqual(artifact.feature_order, Array.from({ length: 54 }, (_, index) => `q${index + 1}`));
    assert.equal(artifact.owner_confirmation_status, 'OWNER_CONFIRMED_REAL');
});

test('input contract rejects other instruments, invalid answers, Top-K and extra fields', () => {
    for (const change of [
        { feature_set: 'F60' }, { answers: Array(60).fill(3) }, { answers: Array(53).fill(3) },
        { answers: Array(55).fill(3) }, { answers: Array(54) },
        { answers: [true, ...Array(53).fill(3)] }, { answers: ['3', ...Array(53).fill(3)] },
        { answers: [3.5, ...Array(53).fill(3)] }, { answers: [0, ...Array(53).fill(3)] },
        { answers: [6, ...Array(53).fill(3)] }, { answers: [null, ...Array(53).fill(3)] },
        { answers: [NaN, ...Array(53).fill(3)] }, { answers: [Infinity, ...Array(53).fill(3)] },
        { answers: [-Infinity, ...Array(53).fill(3)] },
        { top_k: 0 }, { top_k: 34 }, { top_k: true }, { top_k: NaN }, { top_k: Infinity },
        { top_k: null }, { top_k: '3' }, { top_k: 3.5 }, { student_name: 'reject' }
    ]) assert.throws(() => mlModel.validateInput({ ...payload(), ...change }), mlModel.MlInputError);
    for (const invalid of [null, [], 'invalid']) {
        assert.throws(() => mlModel.validateInput(invalid), mlModel.MlInputError);
    }
});

test('equal scores use major code as a deterministic tie breaker', () => {
    const artifact = structuredClone(mlModel.loadVerifiedArtifact());
    for (const profile of artifact.model.profiles) profile.centroid = Array(54).fill(3);
    const result = mlModel.rankF54(artifact, { ...payload(), top_k: 33 });
    const codes = result.recommendations.map((entry) => entry.major_code);
    assert.deepEqual(codes, [...codes].sort());
});

test('Node inference has Python parity without storing response fixtures', () => {
    const queries = syntheticQueries().map((query) => query.answers);
    const script = [
        'import json,sys', 'from pathlib import Path',
        "sys.path.insert(0,str(Path.cwd()/'data/ml_pipeline/python'))",
        'from labanai_ml.inference import load_f54_artifact,rank_f54',
        "a=load_f54_artifact(Path('data/ml_pipeline/artifacts'))",
        "print(json.dumps([rank_f54(a,{'feature_set':'F54','answers':q,'top_k':33}) for q in json.load(sys.stdin)]))"
    ].join('\n');
    const python = spawnSync(process.env.ML_PYTHON || 'python', ['-B', '-c', script], {
        cwd: path.join(__dirname, '..'), input: JSON.stringify(queries), encoding: 'utf8'
    });
    assert.equal(python.status, 0, python.stderr);
    const expected = JSON.parse(python.stdout);
    const artifact = mlModel.loadVerifiedArtifact();
    queries.forEach((answers, index) => {
        const actual = mlModel.rankF54(artifact, { feature_set: 'F54', answers, top_k: 33 });
        assert.deepEqual(actual.recommendations.map((entry) => entry.major_code),
            expected[index].recommendations.map((entry) => entry.major_code));
        actual.recommendations.forEach((entry, position) => {
            assert.ok(Math.abs(entry.similarity_score - expected[index].recommendations[position].similarity_score) <= 1e-6);
        });
    });
});

test('API returns Top-K bounded similarities with a research interpretation and no-store', async () => {
    const response = await post(payload());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const data = await response.json();
    assert.equal(data.recommendations.length, 5);
    assert.equal(data.research_only, true);
    assert.match(data.notice, /không phải xác suất/);
    assert.ok(data.recommendations.every((entry) => entry.similarity_score >= 0 && entry.similarity_score <= 100));
    assert.equal(Object.hasOwn(data, 'answers'), false);
});

test('status exposes evaluation limits without centroid or raw response data', async () => {
    const response = await fetch(`${origin}/api/ml/status`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.evaluation_metrics.kpi_threshold_met, false);
    assert.equal(data.evaluation_metrics.selected_procedure_nested_oof_hit_at_3, 0.291);
    assert.equal(Object.hasOwn(data, 'model'), false);
});

test('API rejects Holland-60, malformed shapes and answer values without reflecting answers', async () => {
    for (const body of [null, [], {}, { ...payload(), answers: Array(60).fill(3) },
        { ...payload(), answers: [false, ...Array(53).fill(3)] }, { ...payload(), top_k: -1 }]) {
        const response = await post(body);
        assert.equal(response.status, 400);
        const data = await response.json();
        assert.equal(Object.hasOwn(data, 'answers'), false);
    }
});

const invalidApiCases = [
    ['53 answers', { answers: Array(53).fill(3) }],
    ['55 answers', { answers: Array(55).fill(3) }],
    ['Holland 60 answers', { answers: Array(60).fill(3) }],
    ['answer below 1', { answers: [0, ...Array(53).fill(3)] }],
    ['answer above 5', { answers: [6, ...Array(53).fill(3)] }],
    ['null answer', { answers: [null, ...Array(53).fill(3)] }],
    ['boolean answer', { answers: [false, ...Array(53).fill(3)] }],
    ['string answer', { answers: ['3', ...Array(53).fill(3)] }],
    ['fractional answer', { answers: [2.5, ...Array(53).fill(3)] }],
    ['missing answers', { answers: undefined }],
    ['null answers field', { answers: null }],
    ['missing instrument', { feature_set: undefined }],
    ['zero Top-K', { top_k: 0 }],
    ['Top-K above class count', { top_k: 34 }],
    ['null Top-K', { top_k: null }],
    ['boolean Top-K', { top_k: true }],
    ['string Top-K', { top_k: '3' }],
    ['fractional Top-K', { top_k: 3.5 }]
];
for (const [name, change] of invalidApiCases) {
    test(`API returns HTTP 400 for ${name}`, async () => {
        const response = await post({ ...payload(), ...change });
        assert.equal(response.status, 400);
        assert.match(response.headers.get('content-type'), /application\/json/);
        const data = await response.json();
        assert.equal(data.error, 'INVALID_F54_INPUT');
        assertSafeError(data);
    });
}

test('missing request body is rejected without filling default answers', async () => {
    const response = await fetch(`${origin}/api/ml/recommendations`, { method: 'POST' });
    assert.equal(response.status, 400);
    assertSafeError(await response.json());
});

test('non-finite JSON tokens are rejected rather than coerced into answers', async () => {
    for (const token of ['NaN', 'Infinity', '-Infinity']) {
        const response = await fetch(`${origin}/api/ml/recommendations`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: `{"feature_set":"F54","answers":[${token},${Array(53).fill(3).join(',')}],"top_k":3}`
        });
        assert.equal(response.status, 400);
        assertSafeError(await response.json());
    }
});

test('official endpoint keeps Top-K boundaries, default and prefix ordering', async () => {
    const allResponse = await post({ ...payload(), top_k: 33 });
    assert.equal(allResponse.status, 200);
    const all = await allResponse.json();
    assert.equal(all.recommendations.length, 33);
    assert.equal(new Set(all.recommendations.map((entry) => entry.major_code)).size, 33);
    for (const topK of [1, 3, 5, 33]) {
        const response = await post({ ...payload(), top_k: topK });
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.deepEqual(data.recommendations, all.recommendations.slice(0, topK));
    }
    const defaultBody = payload();
    delete defaultBody.top_k;
    assert.deepEqual((await (await post(defaultBody)).json()).recommendations, all.recommendations.slice(0, 5));
    const nonexistentVersion = await fetch(`${origin}/api/v1/ml/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload())
    });
    assert.equal(nonexistentVersion.status, 404);
});

test('all six diagnostic vectors are deterministic and match direct inference without default substitution', async () => {
    const artifact = mlModel.loadVerifiedArtifact();
    const observed = [];
    const inputDigests = new Set();
    for (const query of syntheticQueries()) {
        const body = { feature_set: 'F54', answers: query.answers, top_k: 33 };
        inputDigests.add(createHash('sha256').update(JSON.stringify(body)).digest('hex'));
        const first = await post(body);
        assert.equal(first.status, 200, query.name);
        const firstData = await first.json();
        assert.deepEqual(firstData, mlModel.rankF54(artifact, body), query.name);
        for (let repeat = 0; repeat < 2; repeat += 1) {
            const repeated = await post(body);
            assert.equal(repeated.status, 200);
            assert.deepEqual(await repeated.json(), firstData, query.name);
        }
        const top3 = await post({ ...body, top_k: 3 });
        const top5 = await post({ ...body, top_k: 5 });
        assert.deepEqual((await top3.json()).recommendations, firstData.recommendations.slice(0, 3));
        assert.deepEqual((await top5.json()).recommendations, firstData.recommendations.slice(0, 5));
        observed.push(firstData.recommendations);
    }
    assert.equal(inputDigests.size, 6, 'six distinct payloads were sent');
    assert.deepEqual(observed[0], observed[1], 'raw cosine is invariant for all-1 and all-3 vectors');
    assert.deepEqual(observed[1], observed[2], 'raw cosine is invariant for all-3 and all-5 vectors');
    const fixtureTop3 = [observed[0], ...observed.slice(3)]
        .map((result) => result.slice(0, 3).map((entry) => entry.major_code).join('|'));
    assert.equal(new Set(fixtureTop3).size, 4, 'these supplied shape-changing fixtures cross ranking regions');
});

test('malformed JSON and oversized payloads receive safe JSON errors', async () => {
    for (const [body, expectedStatus] of [['{"answers":', 400], [JSON.stringify({ data: 'x'.repeat(11000) }), 413]]) {
        const response = await fetch(`${origin}/api/ml/recommendations`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body
        });
        assert.equal(response.status, expectedStatus);
        assert.match(response.headers.get('content-type'), /application\/json/);
        const data = await response.json();
        assert.equal(Object.hasOwn(data, 'stack'), false);
    }
});

test('artifact tampering fails closed in loader and live API', async (t) => {
    const read = fs.readFileSync;
    t.mock.method(fs, 'readFileSync', (file, ...args) => {
        const content = read(file, ...args);
        return String(file).endsWith('f54_centroid_full1000_v1.json')
            ? Buffer.concat([Buffer.from(content), Buffer.from(' ')]) : content;
    });
    assert.throws(() => mlModel.loadVerifiedArtifact(), mlModel.MlArtifactError);
    const response = await post(payload());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'ML_ARTIFACT_UNAVAILABLE');
});

test('missing model produces a safe failure instead of a fabricated fallback', () => {
    assert.throws(() => mlModel.loadVerifiedArtifact(path.join(__dirname, 'nonexistent-model')), mlModel.MlArtifactError);
});

test('missing artifact returns controlled 503 for POST/status and server recovers', async (t) => {
    const originalRead = fs.readFileSync;
    const missing = t.mock.method(fs, 'readFileSync', (file, ...args) => {
        if (String(file).endsWith('f54_centroid_full1000_v1.json')) {
            const error = new Error('Internal artifact path must not reach the response');
            error.code = 'ENOENT';
            throw error;
        }
        return originalRead(file, ...args);
    });
    const prediction = await post(payload());
    assert.equal(prediction.status, 503);
    const predictionData = await prediction.json();
    assert.equal(predictionData.error, 'ML_ARTIFACT_UNAVAILABLE');
    assertSafeError(predictionData);
    assert.doesNotMatch(JSON.stringify(predictionData), /Internal artifact path/);
    const status = await fetch(`${origin}/api/ml/status`);
    assert.equal(status.status, 503);
    const statusData = await status.json();
    assert.equal(statusData.available, false);
    assertSafeError(statusData);
    missing.mock.restore();
    assert.equal((await post(payload())).status, 200);
});

test('valid hashes cannot bypass feature order, privacy fields or training configuration checks', (t) => {
    const original = mlModel.loadVerifiedArtifact();
    const read = fs.readFileSync;
    for (const mutate of [
        (artifact) => artifact.feature_order.reverse(),
        (artifact) => { artifact.student_name = 'forbidden'; },
        (artifact) => { artifact.training_configuration = {}; },
        (artifact) => { artifact.evaluation_metrics.kpi_threshold_met = true; }
    ]) {
        const artifact = structuredClone(original);
        mutate(artifact);
        const contents = Buffer.from(JSON.stringify(artifact));
        const manifest = JSON.stringify({ model_version: original.model_version,
            files: { 'f54_centroid_full1000_v1.json': createHash('sha256').update(contents).digest('hex') } });
        const mock = t.mock.method(fs, 'readFileSync', (file, ...args) => {
            if (String(file).endsWith('f54_centroid_full1000_v1.json')) return contents;
            if (String(file).endsWith('f54_centroid_full1000_v1.manifest.json')) return manifest;
            return read(file, ...args);
        });
        assert.throws(() => mlModel.loadVerifiedArtifact(), mlModel.MlArtifactError);
        mock.mock.restore();
    }
});

test('existing EJS pages render and evaluation stays safe outside local preview', async () => {
    const oldFlag = process.env.LABANAI_RIASEC27_PREVIEW;
    delete process.env.LABANAI_RIASEC27_PREVIEW;
    try {
        for (const route of ['/', '/about', '/guide', '/news', '/chatbot', '/evaluation', '/admin']) {
            const response = await fetch(`${origin}${route}`);
            assert.equal(response.status, 200, route);
            const html = await response.text();
            assert.match(html, /<!DOCTYPE html>/);
            if (route === '/evaluation') {
                assert.match(html, /Định hướng nghề nghiệp bằng AI/);
                assert.match(html, /Tính năng hiện chưa khả dụng/);
                assert.doesNotMatch(html, /RESEARCH_ONLY|TOP3_NOT_VALIDATED|research_status|Nghiên cứu nội bộ/i);
                assert.doesNotMatch(html, /id="questions-list"|id="btn-submit-riasec"/);
                assert.doesNotMatch(html, /id="ml-f54-form"/);
                assert.doesNotMatch(html, /id="holland-survey-panel"/);
                assert.doesNotMatch(html, /id="input-toan"/);
                assert.doesNotMatch(html, /id="wishlist-drag-container"/);
            }
        }
    } finally {
        if (oldFlag !== undefined) process.env.LABANAI_RIASEC27_PREVIEW = oldFlag;
    }
});

function questionnaireSource() {
    return require('../src/models/f54Questionnaire');
}

test('evaluation and inference do not open the source workbook at runtime', async (t) => {
    const readSync = fs.readFileSync;
    const readAsync = fs.promises.readFile;
    let workbookReads = 0;
    t.mock.method(fs, 'readFileSync', (file, ...args) => {
        if (String(file).toLowerCase().endsWith('.xlsx')) {
            workbookReads++;
            throw new Error('Workbook is not available to the running website');
        }
        return readSync(file, ...args);
    });
    t.mock.method(fs.promises, 'readFile', async (file, ...args) => {
        if (String(file).toLowerCase().endsWith('.xlsx')) {
            workbookReads++;
            throw new Error('Workbook is not available to the running website');
        }
        return readAsync(file, ...args);
    });
    assert.equal((await fetch(`${origin}/evaluation`)).status, 200);
    assert.equal((await post(payload())).status, 200);
    assert.equal(workbookReads, 0);
});

test('F54 question bank keeps all 54 exact workbook headers, IDs and numeric feature order', () => {
    const questionnaire = questionnaireSource();
    assert.equal(questionnaire.questionnaire_version, 'F54-v1');
    assert.equal(questionnaire.source_workbook, 'data_AI_1000_rows.xlsx');
    assert.equal(questionnaire.source_sha256, '13e37affaeca2eaef49ee998acb80efb70de6146ce1ba4f781c215740786ff42');
    assert.equal(questionnaire.source_sheet, 'AUGMENTED_RAW_1000');
    assert.equal(questionnaire.questions.length, 54);
    const expectedOrder = Array.from({ length: 54 }, (_, index) => `q${index + 1}`);
    assert.deepEqual(questionnaire.questions.map((question) => question.question_id), expectedOrder);
    assert.deepEqual(questionnaire.questions.map((question) => question.question_order), Array.from({ length: 54 }, (_, index) => index + 1));
    assert.equal(new Set(questionnaire.questions.map((question) => question.question_id)).size, 54);
    const digest = createHash('sha256').update(questionnaire.questions.map((question) => question.question_text).join('\x1f')).digest('hex');
    assert.equal(digest, '75592454c37c9a3306f22bdec34a98cb016c36fb1e58147c3f39edcf7c29744f');
    assert.equal(questionnaire.question_header_sha256, digest);
    assert.deepEqual(questionnaire.questions.map((question) => question.question_id), mlModel.loadVerifiedArtifact().feature_order);
});

test('F54 question bank preserves the five original truth anchors and contains no default answers', () => {
    const questionnaire = questionnaireSource();
    assert.deepEqual(questionnaire.answer_scale, [
        { value: 1, label: 'Chưa bao giờ đúng' },
        { value: 2, label: 'Chỉ đúng 1 vài trường hợp' },
        { value: 3, label: 'Chỉ đúng 1 nửa' },
        { value: 4, label: 'Gần như là đúng' },
        { value: 5, label: 'Hoàn toàn đúng' }
    ]);
    for (const question of questionnaire.questions) {
        assert.deepEqual(Object.keys(question).sort(), ['question_id', 'question_order', 'question_text']);
        assert.equal(typeof question.question_text, 'string');
        assert.ok(question.question_text.startsWith(`${question.question_order}. `));
    }
    assert.equal(questionnaire.questions[41].question_text, '42. Tôi thường đặt ra các mục tiêu, kế hoạch trong cuộc sống');
    assert.equal(questionnaire.questions[50].question_text, '51. Tôi thường đặt ra mục tiêu, kế hoạch trong cuộc sống');
});

test('new browser script is served by the existing static middleware', async () => {
    const response = await fetch(`${origin}/js/ml-research.js`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /\/api\/ml\/recommendations/);
});

function validFrontendResult(topK = 3) {
    return {
        model_version: 'f54-centroid-full1000-v1', dataset_version: 'owner-declared-real-2026-10-19',
        feature_set: 'F54', task: 'current_major_retrieval', research_only: true,
        score_type: 'cosine_similarity_0_100', notice: 'Điểm tương đồng không phải xác suất.',
        recommendations: Array.from({ length: topK }, (_, index) => ({
            major_code: `fixture_major_${index + 1}`, major_name: `Ngành kiểm thử ${index + 1}`,
            similarity_score: 98.1 - index / 10, n_train: 28
        }))
    };
}
function frontendResponse(data = validFrontendResult()) {
    return { ok: true, status: 200, json: async () => data };
}
function researchForm(fetchResponse = frontendResponse(), config) {
    function element(tagName = 'div') {
        const attributes = new Map(), events = new Map(), classes = new Set();
        return {
            tagName, textContent: '', value: '', disabled: false, hidden: false, checked: false,
            dataset: {}, style: {}, children: [], events,
            classList: { toggle(name, force) { if (force) classes.add(name); else classes.delete(name); }, contains: (name) => classes.has(name) },
            addEventListener(event, handler) { events.set(event, handler); },
            setAttribute(name, value) { attributes.set(name, String(value)); },
            getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
            removeAttribute(name) { attributes.delete(name); },
            replaceChildren() { this.children = []; }, appendChild(row) { this.children.push(row); },
            focus() { this.focused = true; }, scrollIntoView() {}
        };
    }
    const ids = ['ml-f54-form', 'ml-f54-status', 'ml-f54-results', 'ml-f54-submit', 'ml-f54-prev',
        'ml-f54-next', 'ml-f54-reset', 'ml-f54-top-k', 'ml-f54-summary', 'ml-f54-result-panel',
        'ml-f54-questions', 'ml-f54-progress-text', 'ml-f54-progress', 'ml-f54-page', 'f54-data'];
    const nodes = Object.fromEntries(ids.map((id) => [id, element()]));
    const source = questionnaireSource();
    nodes['f54-data'].textContent = JSON.stringify(config || {
        questionnaire_version: source.questionnaire_version, questions: source.questions, answer_scale: source.answer_scale
    });
    nodes['ml-f54-top-k'].value = '3';
    nodes['ml-f54-submit'].textContent = 'Xem kết quả';
    function descendants(node) { return node.children.flatMap((child) => [child, ...descendants(child)]); }
    const calls = [];
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/ml-research.js'), 'utf8'), {
        AbortController, setTimeout, clearTimeout,
        document: { getElementById: (id) => nodes[id] || descendants(nodes['ml-f54-questions']).find((node) => node.id === id), createElement: element },
        fetch: async (...args) => { calls.push(args); return typeof fetchResponse === 'function' ? fetchResponse(...args) : fetchResponse; }
    });
    const radios = () => descendants(nodes['ml-f54-questions']).filter((node) => node.tagName === 'input');
    const click = async (id) => { if (!nodes[id].disabled) await nodes[id].events.get('click')?.({ preventDefault() {} }); };
    function choose(questionId, value) {
        const input = radios().find((node) => node.dataset.questionId === questionId && Number(node.value) === value);
        assert.ok(input, `Missing current radio ${questionId}:${value}`);
        for (const other of radios().filter((node) => node.name === input.name)) other.checked = false;
        input.checked = true; input.events.get('change')();
    }
    async function complete(answers = syntheticQueries()[3].answers) {
        while (!nodes['ml-f54-prev'].disabled) await click('ml-f54-prev');
        for (let page = 0; page < 9; page++) {
            // Reverse selection order proves payload order is not answer insertion order.
            for (let offset = 5; offset >= 0; offset--) {
                const index = page * 6 + offset;
                choose(`q${index + 1}`, answers[index]);
            }
            if (page < 8) await click('ml-f54-next');
        }
    }
    return { nodes, calls, radios, click, choose, complete,
        submit: () => nodes['ml-f54-form'].events.get('submit')({ preventDefault() {} }),
        setTopK(value) { nodes['ml-f54-top-k'].value = String(value); nodes['ml-f54-top-k'].events.get('input')(); } };
}

test('F54 starts with six original questions, exact anchors, no selected answers and Top-3 default', () => {
    const form = researchForm();
    assert.equal(form.nodes['ml-f54-questions'].children.length, 6);
    assert.equal(form.radios().length, 30);
    assert.ok(form.radios().every((radio) => !radio.checked));
    assert.equal(form.nodes['ml-f54-progress'].value, 0);
    assert.equal(form.nodes['ml-f54-progress-text'].textContent, 'Đã trả lời 0/54');
    assert.equal(form.nodes['ml-f54-top-k'].value, '3');
    assert.equal(form.nodes['ml-f54-submit'].disabled, true);
    assert.equal(form.nodes['ml-f54-submit'].hidden, true);
    assert.equal(form.nodes['ml-f54-result-panel'].hidden, true);
    form.nodes['ml-f54-questions'].children.forEach((fieldset, index) => {
        assert.equal(fieldset.children[0].textContent, questionnaireSource().questions[index].question_text);
        assert.deepEqual(fieldset.children[1].children.map((label) => label.children[1].textContent),
            questionnaireSource().answer_scale.map((anchor) => `${anchor.value}. ${anchor.label}`));
    });
    assert.equal(form.calls.length, 0);
});

test('incomplete page warns, incomplete submit sends no request and never supplies defaults', async () => {
    const form = researchForm();
    await form.click('ml-f54-next');
    assert.match(form.nodes['ml-f54-status'].textContent, /còn thiếu/);
    assert.match(form.nodes['ml-f54-page'].textContent, /Trang 1\/9/);
    await form.submit();
    assert.match(form.nodes['ml-f54-status'].textContent, /54/);
    assert.equal(form.calls.length, 0);
    assert.equal(form.nodes['ml-f54-submit'].disabled, true);
});

test('page navigation retains answers and every page shows the original six questions', async () => {
    const form = researchForm();
    for (let i = 1; i <= 6; i++) form.choose(`q${i}`, i % 5 + 1);
    await form.click('ml-f54-next');
    assert.match(form.nodes['ml-f54-page'].textContent, /Trang 2\/9/);
    await form.click('ml-f54-prev');
    for (let i = 1; i <= 6; i++) assert.equal(form.radios().find((r) => r.name === `f54-q${i}` && r.checked).value, String(i % 5 + 1));
    for (let page = 0; page < 9; page++) {
        form.nodes['ml-f54-questions'].children.forEach((fieldset, offset) => {
            assert.equal(fieldset.children[0].textContent, questionnaireSource().questions[page * 6 + offset].question_text);
            form.choose(`q${page * 6 + offset + 1}`, 3);
        });
        if (page < 8) await form.click('ml-f54-next');
    }
    assert.equal(form.nodes['ml-f54-progress'].value, 54);
    assert.equal(form.nodes['ml-f54-submit'].disabled, false);
    assert.equal(form.nodes['ml-f54-submit'].hidden, false);
});

test('complete questionnaire sends numeric q1..q54 order and renders actual response as safe text', async () => {
    const data = validFrontendResult(); data.recommendations[0].major_name = '<img src=x onerror=alert(1)>';
    const form = researchForm(frontendResponse(data));
    const answers = syntheticQueries()[4].answers;
    await form.complete(answers); await form.submit();
    assert.equal(form.calls[0][0], '/api/ml/recommendations');
    const body = JSON.parse(form.calls[0][1].body);
    assert.deepEqual(Object.keys(body).sort(), ['answers', 'feature_set', 'top_k']);
    assert.deepEqual(body.answers, answers);
    assert.equal(body.top_k, 3);
    assert.ok(body.answers.every((answer) => typeof answer === 'number' && Number.isInteger(answer)));
    assert.equal(form.nodes['ml-f54-results'].children.length, 3);
    const row = form.nodes['ml-f54-results'].children[0];
    assert.match(row.textContent, /#1.*<img.*fixture_major_1.*Điểm tương đồng 98\.10\/100/);
    assert.equal(Object.hasOwn(row, 'innerHTML'), false);
    assert.equal(form.nodes['ml-f54-result-panel'].hidden, false);
    assert.match(form.nodes['ml-f54-summary'].textContent, /Top-3.*f54-centroid-full1000-v1/);
});

test('pending questionnaire disables navigation, reset and radios, and rejects duplicate submits', async () => {
    let resolveResponse; const deferred = new Promise((resolve) => { resolveResponse = resolve; });
    const form = researchForm(() => deferred);
    await form.complete(); const first = form.submit();
    assert.equal(form.calls.length, 1);
    assert.equal(form.nodes['ml-f54-form'].getAttribute('aria-busy'), 'true');
    for (const id of ['ml-f54-submit', 'ml-f54-prev', 'ml-f54-next', 'ml-f54-reset', 'ml-f54-top-k']) assert.equal(form.nodes[id].disabled, true);
    assert.ok(form.radios().every((radio) => radio.disabled));
    await form.submit(); assert.equal(form.calls.length, 1);
    resolveResponse(frontendResponse()); await first;
    assert.equal(form.nodes['ml-f54-form'].getAttribute('aria-busy'), 'false');
    assert.equal(form.nodes['ml-f54-status'].dataset.state, 'success');
    assert.equal(form.nodes['ml-f54-reset'].disabled, false);
    assert.ok(form.radios().every((radio) => !radio.disabled));
});

test('editing an answer clears stale output and a second request uses the new answer', async () => {
    let attempt = 0;
    const first = validFrontendResult(), second = validFrontendResult();
    second.recommendations[0].major_name = 'Kết quả từ request mới';
    const form = researchForm(() => frontendResponse(attempt++ ? second : first));
    await form.complete(); await form.submit();
    const old = JSON.parse(form.calls[0][1].body);
    form.choose('q54', old.answers[53] === 1 ? 5 : 1);
    assert.equal(form.nodes['ml-f54-result-panel'].hidden, true);
    assert.equal(form.nodes['ml-f54-results'].children.length, 0);
    await form.submit();
    const next = JSON.parse(form.calls[1][1].body);
    assert.notEqual(next.answers[53], old.answers[53]);
    assert.deepEqual(next.answers.slice(0, 53), old.answers.slice(0, 53));
    assert.match(form.nodes['ml-f54-results'].children[0].textContent, /request mới/);
});

test('reset removes all answers, old results and progress without sending another request', async () => {
    const form = researchForm(); await form.complete(); await form.submit();
    await form.click('ml-f54-reset');
    assert.equal(form.calls.length, 1);
    assert.equal(form.nodes['ml-f54-progress'].value, 0);
    assert.match(form.nodes['ml-f54-page'].textContent, /Trang 1\/9/);
    assert.ok(form.radios().every((radio) => !radio.checked));
    assert.equal(form.nodes['ml-f54-results'].children.length, 0);
    assert.equal(form.nodes['ml-f54-summary'].textContent, '');
    assert.equal(form.nodes['ml-f54-result-panel'].hidden, true);
    assert.equal(form.nodes['ml-f54-submit'].disabled, true);
});

test('invalid Top-K is blocked after 54 valid answers', async () => {
    for (const value of ['0', '34', 'abc', '2.5', '']) {
        const form = researchForm(); await form.complete(); form.setTopK(value); await form.submit();
        assert.equal(form.calls.length, 0);
        assert.equal(form.nodes['ml-f54-status'].dataset.state, 'error');
    }
});

test('untrusted or incomplete API responses do not create fake result rows', async () => {
    for (const mutate of [
        (data) => data.recommendations.pop(),
        (data) => { data.recommendations[0].major_code = ''; },
        (data) => { data.recommendations[0].similarity_score = NaN; },
        (data) => { data.recommendations[0].similarity_score = 101; },
        (data) => { data.recommendations[1].major_code = data.recommendations[0].major_code; },
        (data) => { data.feature_set = 'F60'; }, (data) => { data.research_only = false; }
    ]) {
        const data = validFrontendResult(); mutate(data);
        const form = researchForm(frontendResponse(data)); await form.complete(); await form.submit();
        assert.equal(form.nodes['ml-f54-results'].children.length, 0);
        assert.equal(form.nodes['ml-f54-result-panel'].hidden, true);
        assert.equal(form.nodes['ml-f54-status'].dataset.state, 'error');
    }
});

test('network and API errors preserve answers for retry and restore controls', async () => {
    for (const fail of [() => ({ ok: false, json: async () => ({ message: 'Model không khả dụng.' }) }),
        () => { throw new TypeError('Network unavailable'); }]) {
        let attempt = 0;
        const form = researchForm(() => attempt++ === 0 ? fail() : frontendResponse());
        await form.complete(); await form.submit();
        assert.equal(form.nodes['ml-f54-status'].dataset.state, 'error');
        assert.equal(form.nodes['ml-f54-progress'].value, 54);
        assert.equal(form.nodes['ml-f54-submit'].disabled, false);
        assert.equal(form.nodes['ml-f54-form'].getAttribute('aria-busy'), 'false');
        await form.submit(); assert.equal(form.nodes['ml-f54-results'].children.length, 3);
    }
});

test('invalid questionnaire metadata fails closed without invented questions', () => {
    const source = structuredClone(questionnaireSource()); source.questions[1].question_id = 'q1';
    const form = researchForm(frontendResponse(), source);
    assert.equal(form.nodes['ml-f54-submit'].disabled, true);
    assert.equal(form.nodes['ml-f54-questions'].children.length, 0);
    assert.equal(form.nodes['ml-f54-status'].dataset.state, 'error');
    assert.equal(form.calls.length, 0);
});
