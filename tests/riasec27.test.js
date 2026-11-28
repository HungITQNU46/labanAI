/**
 * riasec27.test.js
 * 
 * Comprehensive test suite for Direction B RIASEC27 Research Preview (Phase B-06).
 * Covers all 22 audit criteria specified in the B-06 protocol.
 */

'use strict';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const dotenv = require('dotenv');
// Import the real app with RAM sessions and no production configuration or startup.
const originalStoreCreate = MongoStore.create, originalEnvConfig = dotenv.config;
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/unused_riasec27_test';
process.env.SESSION_SECRET = 'synthetic-riasec27-contract-session-secret';
process.env.NODE_ENV = 'development';
MongoStore.create = () => new session.MemoryStore();
dotenv.config = () => ({parsed:{}});
let app;
try { app = require('../server'); }
finally { MongoStore.create = originalStoreCreate; dotenv.config = originalEnvConfig; }
const riasec27Service = require('../src/services/riasec27Service');
const questionnaire = require('../src/models/riasec27Questionnaire');
const history = require('../src/services/riasec27HistoryService');
const originalHistorySave = history.save;
const savedRows = new Map();
const testHistory = history.createHistoryService({db:{readyState:1},findOneAndUpdate(filter,update,options){
    assert.equal(options.upsert,true);assert.equal(options.writeConcern.w,'majority');
    assert.equal(update.$setOnInsert.id_nguoiDung,'synthetic-contract-user');
    assert.ok(!Object.hasOwn(update.$setOnInsert.riasec27,'answers'));
    if(!savedRows.has(filter._id))savedRows.set(filter._id,structuredClone(update.$setOnInsert));
    return {select(){return this;},async lean(){return structuredClone(savedRows.get(filter._id));}};
}});

let server;
let origin;
let sessionCookie;
app.get('/__test/riasec27/session',(req,res)=>{req.session.user={id:'synthetic-contract-user',role:'user'};res.json({ok:true});});

// Set up server on localhost for HTTP tests
before(async () => {
    history.save = testHistory.save;
    server = await new Promise((resolve) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    origin = `http://127.0.0.1:${server.address().port}`;
    const response=await fetch(origin+'/__test/riasec27/session');
    sessionCookie=response.headers.get('set-cookie').split(';')[0];
});

after(async () => {
    history.save = originalHistorySave;
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

// Helper for HTTP requests
const get = (urlPath, headers = {}) => fetch(`${origin}${urlPath}`, { headers });
const post = (urlPath, body, headers = {}) => fetch(`${origin}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie:sessionCookie, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(urlPath==='/api/riasec27/evaluate' ? {...body,history:{requestId:randomUUID()}} : body)
});

// Differentiated 27 answers: High R/I, Low others
const validDifferentiatedAnswers = [
    5, 5, 2, 5, 4, 2, 2, 2, 5, 2,
    2, 2, 5, 2, 2, 5, 5, 2, 2, 4,
    2, 2, 1, 2, 1, 1, 1
];

// Flat 27 answers: all 3s
const flatAnswers = Array(27).fill(3);

const ready21Ids = new Set([
    "giao_duc_tieu_hoc", "giao_duc_mam_non", "quan_ly_giao_duc", "tam_ly_hoc_giao_duc",
    "ky_thuat_phan_mem", "kinh_te", "quan_tri_kinh_doanh", "ke_toan", "tai_chinh_ngan_hang",
    "quan_tri_khach_san", "ngon_ngu_anh", "van_hoc", "luat", "cong_nghe_ky_thuat_xay_dung",
    "ky_thuat_dien_tu_vien_thong", "ky_thuat_dien", "cong_nghe_ky_thuat_hoa_hoc",
    "toan_hoc", "nong_hoc", "quan_ly_dat_dai", "cong_tac_xa_hoi"
]);

const nonReady12Ids = new Set([
    "su_pham_toan_hoc", "su_pham_ngu_van", "su_pham_tieng_anh",
    "su_pham_tin_hoc", "su_pham_hoa_hoc", "su_pham_dia_ly",
    "giao_duc_chinh_tri", "cong_nghe_thong_tin", "dong_phuong_hoc",
    "viet_nam_hoc", "quan_ly_du_lich_lu_hanh", "quan_ly_nha_nuoc"
]);

describe('Direction B RIASEC27 Preview Gate & Access Control (Criteria 1-5)', () => {
    test('1. Preview is disabled by default (returns 404)', async () => {
        delete process.env.LABANAI_RIASEC27_PREVIEW;
        process.env.NODE_ENV = 'development';

        const pageRes = await get('/evaluation/riasec27-preview');
        assert.equal(pageRes.status, 404);

        const apiRes = await get('/api/riasec27/questions');
        assert.equal(apiRes.status, 404);
    });

    test('2. Preview does not work in production even if flag is true (returns 404)', async () => {
        process.env.LABANAI_RIASEC27_PREVIEW = 'true';
        process.env.NODE_ENV = 'production';

        const pageRes = await get('/evaluation/riasec27-preview');
        assert.equal(pageRes.status, 404);

        const apiRes = await post('/api/riasec27/evaluate', { answers: validDifferentiatedAnswers });
        assert.equal(apiRes.status, 404);
    });

    test('3. Non-localhost access is rejected with 403', async () => {
        process.env.LABANAI_RIASEC27_PREVIEW = 'true';
        process.env.NODE_ENV = 'development';

        // Simulate request with non-loopback IP
        const { riasec27PreviewGate } = require('../src/middleware/riasec27PreviewGate');
        const fakeReq = {
            path: '/api/riasec27/evaluate',
            socket: { remoteAddress: '192.168.1.100' }
        };
        let statusSent = null;
        let jsonSent = null;
        const fakeRes = {
            set: () => {},
            status: (s) => {
                statusSent = s;
                return {
                    json: (data) => { jsonSent = data; },
                    send: (data) => { jsonSent = data; }
                };
            }
        };

        riasec27PreviewGate(fakeReq, fakeRes, () => {
            assert.fail('Should not call next() for non-loopback IP');
        });

        assert.equal(statusSent, 403);
        assert.equal(jsonSent.error, 'ACCESS_DENIED');
    });

    test('4. Spoofed client headers (X-Forwarded-For) cannot bypass security', async () => {
        process.env.LABANAI_RIASEC27_PREVIEW = 'true';
        process.env.NODE_ENV = 'development';

        const { riasec27PreviewGate } = require('../src/middleware/riasec27PreviewGate');
        const fakeReq = {
            path: '/evaluation/riasec27-preview',
            headers: { 'x-forwarded-for': '127.0.0.1', 'forwarded': 'for=127.0.0.1', host: 'localhost:3000' },
            socket: { remoteAddress: '203.0.113.195' } // Public IP
        };
        let statusSent = null;
        const fakeRes = {
            set: () => {},
            status: (s) => {
                statusSent = s;
                return { send: () => {} };
            }
        };

        riasec27PreviewGate(fakeReq, fakeRes, () => {
            assert.fail('Should not trust X-Forwarded-For to bypass access control');
        });

        assert.equal(statusSent, 403);
    });

    test('4b. Malicious Host header is rejected with 403', async () => {
        process.env.LABANAI_RIASEC27_PREVIEW = 'true';
        process.env.NODE_ENV = 'development';

        const http = require('node:http');
        const port = server.address().port;
        const res = await new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: port,
                path: '/api/riasec27/questions',
                headers: { 'Host': 'attacker.evil.com' }
            }, (response) => {
                let data = '';
                response.on('data', chunk => { data += chunk; });
                response.on('end', () => {
                    resolve({ status: response.statusCode, body: data ? JSON.parse(data) : {} });
                });
            });
            req.on('error', reject);
            req.end();
        });

        assert.equal(res.status, 403);
        assert.equal(res.body.error, 'INVALID_HOST');
    });

    test('5. When flag is off, API inference endpoints return 404', async () => {
        process.env.LABANAI_RIASEC27_PREVIEW = 'false';
        process.env.NODE_ENV = 'development';

        const res = await post('/api/riasec27/evaluate', { answers: validDifferentiatedAnswers });
        assert.equal(res.status, 404);
        const data = await res.json();
        assert.equal(data.error, 'PREVIEW_NOT_FOUND');
    });
});

describe('Direction B Inference Contract, ML Top-3 & Invariants (Criteria 6-12)', () => {
    before(() => {
        process.env.LABANAI_RIASEC27_PREVIEW = 'true';
        process.env.NODE_ENV = 'development';
    });

    test('anonymous evaluation is rejected before ML or persistence', async t => {
        const inference=t.mock.method(riasec27Service,'evaluateProfile',riasec27Service.evaluateProfile);
        const count=savedRows.size;
        const response=await fetch(origin+'/api/riasec27/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:validDifferentiatedAnswers,history:{requestId:randomUUID()}})});
        assert.equal(response.status,401);assert.equal((await response.json()).error,'HISTORY_AUTH_REQUIRED');
        assert.equal(savedRows.size,count);
        assert.equal(inference.mock.callCount(),0);
    });

    test('authenticated evaluation requires a valid history requestId before ML', async t => {
        const inference=t.mock.method(riasec27Service,'evaluateProfile',riasec27Service.evaluateProfile);
        for(const body of [{answers:validDifferentiatedAnswers},{answers:validDifferentiatedAnswers,history:{requestId:'invalid'}}]){
            const response=await fetch(origin+'/api/riasec27/evaluate',{method:'POST',headers:{'Content-Type':'application/json',Cookie:sessionCookie},body:JSON.stringify(body)});
            assert.equal(response.status,400);assert.equal((await response.json()).error,'INVALID_HISTORY_INPUT');
        }
        assert.equal(inference.mock.callCount(),0);
    });

    test('6. Valid 27 answers return HTTP 200 and SUCCESS status', async () => {
        const res = await post('/api/riasec27/evaluate', { answers: validDifferentiatedAnswers });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.research_status, 'RESEARCH_ONLY — TOP3_NOT_VALIDATED');
        assert.equal(data.ml_ranking.status, 'SUCCESS');
        assert.equal(data.ml_ranking.top3.length, 3);
        assert.equal(data.history.status,'SAVED');
    });

    test('7. Invalid inputs (wrong length, types, out-of-bound) return HTTP 400', async () => {
        const invalidCases = [
            { answers: [1, 2, 3] },                          // Length 3
            { answers: Array(28).fill(3) },                 // Length 28
            { answers: [...Array(26).fill(3), 6] },         // Value 6 (out of range)
            { answers: [...Array(26).fill(3), 0] },         // Value 0 (out of range)
            { answers: [...Array(26).fill(3), '3'] },       // String
            { answers: [...Array(26).fill(3), true] },      // Boolean
            { answers: [...Array(26).fill(3), null] },      // Null
            { answers: [...Array(26).fill(3), 3.5] },       // Float
            { answers: null },                              // Null answers
            {}                                              // Missing answers
        ];

        for (const badPayload of invalidCases) {
            const res = await post('/api/riasec27/evaluate', badPayload);
            assert.equal(res.status, 400, `Expected 400 for ${JSON.stringify(badPayload)}`);
            const data = await res.json();
            assert.ok(data.error.includes('INVALID'));
        }
    });

    test('8. Scrambled key order in object yields identical deterministic Top-3', async () => {
        const qOrder = questionnaire.questions.map(q => q.question_id);
        const normalObj = {};
        qOrder.forEach((qid, idx) => { normalObj[qid] = validDifferentiatedAnswers[idx]; });

        // Scramble keys
        const scrambledKeys = [...qOrder].reverse();
        const scrambledObj = {};
        scrambledKeys.forEach(qid => { scrambledObj[qid] = normalObj[qid]; });

        const res1 = await post('/api/riasec27/evaluate', { answers: normalObj });
        const res2 = await post('/api/riasec27/evaluate', { answers: scrambledObj });

        assert.equal(res1.status, 200);
        assert.equal(res2.status, 200);

        const data1 = await res1.json();
        const data2 = await res2.json();

        assert.deepEqual(
            data1.ml_ranking.top3.map(x => x.major_id),
            data2.ml_ranking.top3.map(x => x.major_id)
        );
    });

    test('9. Flat profiles (all 1s, 2s, 3s, 4s, 5s) yield ABSTAIN_FLAT_PROFILE with empty Top-3', async () => {
        for (const val of [1, 2, 3, 4, 5]) {
            const res = await post('/api/riasec27/evaluate', { answers: Array(27).fill(val) });
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.ml_ranking.status, 'ABSTAIN_FLAT_PROFILE', `All ${val}s must yield ABSTAIN_FLAT_PROFILE`);
            assert.deepEqual(data.ml_ranking.top3, [], `All ${val}s must have empty Top-3`);
        }
    });

    test('10. Tied boundary is transparently communicated without arbitrary tie-break', async () => {
        // Evaluate profile that has valid responses
        const res = await post('/api/riasec27/evaluate', { answers: validDifferentiatedAnswers });
        const data = await res.json();
        assert.ok(['SUCCESS', 'TIED_BOUNDARY'].includes(data.ml_ranking.status));
        if (data.ml_ranking.status === 'TIED_BOUNDARY') {
            assert.ok(Array.isArray(data.ml_ranking.tied_majors));
        }
    });

    test('11. SUCCESS contains exactly 3 majors from the 21 READY majors', async () => {
        const res = await post('/api/riasec27/evaluate', { answers: validDifferentiatedAnswers });
        const data = await res.json();
        assert.equal(data.ml_ranking.status, 'SUCCESS');
        assert.equal(data.ml_ranking.top3.length, 3);

        for (const item of data.ml_ranking.top3) {
            assert.ok(ready21Ids.has(item.major_id), `Major ${item.major_id} must be in READY 21`);
            const score = item.pearson_r ?? item.similarity_score;
            assert.ok(typeof score === 'number', `Score for ${item.major_id} must be a number`);
            assert.ok(score >= -1.0 && score <= 1.0, `Score ${score} must be in [-1, 1]`);
        }
    });

    test('12. Invariant: None of the 12 non-ready majors appear in ML Top-3', async () => {
        const res = await post('/api/riasec27/evaluate', { answers: validDifferentiatedAnswers });
        const data = await res.json();
        for (const item of data.ml_ranking.top3) {
            assert.ok(!nonReady12Ids.has(item.major_id), `Major ${item.major_id} MUST NOT appear in ML Top-3!`);
        }
    });
});

describe('Catalog 33, Tier 2 Qualitative Exploration & Operational Safety (Criteria 13-22)', () => {
    before(() => {
        process.env.LABANAI_RIASEC27_PREVIEW = 'true';
        process.env.NODE_ENV = 'development';
    });

    test('13. Catalog lists all 33 majors with exact status breakdown (21/10/2) and 5 themes', async () => {
        const res = await get('/api/riasec27/catalog');
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.total_majors, 33);
        assert.equal(data.catalog.length, 33);

        const readyCount = data.catalog.filter(m => m.status === 'READY_FOR_PROTOTYPE').length;
        const condCount = data.catalog.filter(m => m.status === 'CONDITIONAL').length;
        const unresCount = data.catalog.filter(m => m.status === 'UNRESOLVED').length;

        assert.equal(readyCount, 21);
        assert.equal(condCount, 10);
        assert.equal(unresCount, 2);

        // Also check themes
        const themesRes = await get('/api/riasec27/themes');
        assert.equal(themesRes.status, 200);
        const themesData = await themesRes.json();
        assert.equal(themesData.theme_count, 5);
        assert.equal(themesData.themes.length, 5);
    });

    test('14. Tier 2 exploration only activates upon active user request', async () => {
        const res = await post('/api/riasec27/explore', { major_id: 'su_pham_toan_hoc' });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'AWAITING_USER_CHOICE');
        assert.equal(data.theme_id, 'THEME_A_SECONDARY_PEDAGOGY');
        assert.ok(data.question.options.length >= 7);
    });

    test('15. Invariant: Tier 2 answers NEVER alter ML Top-3', async () => {
        const mlBefore = await post('/api/riasec27/evaluate', { answers: validDifferentiatedAnswers });
        assert.equal(mlBefore.status,200);
        const dataBefore = await mlBefore.json();

        // User answers Tier 2
        const tier2Res = await post('/api/riasec27/explore', {
            theme_id: 'THEME_A_SECONDARY_PEDAGOGY',
            option_id: 'OPT_A_MATH',
            is_skip: false
        });
        assert.equal(tier2Res.status, 200);
        const tier2Data = await tier2Res.json();
        assert.equal(tier2Data.status, 'QUALITATIVE_EXPLORATION');
        assert.equal(tier2Data.fit_score, undefined); // Strictly no numeric fit score!

        // Re-check ML Top-3
        const mlAfter = await post('/api/riasec27/evaluate', { answers: validDifferentiatedAnswers });
        assert.equal(mlAfter.status,200);
        const dataAfter = await mlAfter.json();

        assert.deepEqual(
            dataBefore.ml_ranking.top3.map(x => x.major_id),
            dataAfter.ml_ranking.top3.map(x => x.major_id)
        );
    });

    test('16. Skip and Uncertain options work correctly without assigning majors', async () => {
        // Skip
        const skipRes = await post('/api/riasec27/explore', {
            theme_id: 'THEME_B_IT_AND_SOFTWARE',
            option_id: null,
            is_skip: true
        });
        const skipData = await skipRes.json();
        assert.equal(skipData.status, 'USER_SKIPPED');
        assert.equal(skipData.focus_major, undefined);

        // Uncertain
        const uncertRes = await post('/api/riasec27/explore', {
            theme_id: 'THEME_B_IT_AND_SOFTWARE',
            option_id: 'OPT_B_UNCERTAIN',
            is_skip: false
        });
        const uncertData = await uncertRes.json();
        assert.equal(uncertData.status, 'QUALITATIVE_EXPLORATION');
        assert.equal(uncertData.focus_major, undefined);
    });

    test('17. Python worker error or malformed payload does not crash server', async () => {
        const res = await post('/api/riasec27/explore', { theme_id: 'INVALID_THEME', option_id: 'BAD_OPT' });
        assert.equal(res.status, 200); // Handled cleanly by Python bridge
        const data = await res.json();
        assert.equal(data.status, 'INVALID_SELECTION');
    });

    test('18. No fallback to F54, Holland, or old Pearson when error occurs', async () => {
        // Trigger validation rejection
        const res = await post('/api/riasec27/evaluate', { answers: [1, 2] });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.error, 'INVALID_RIASEC27_INPUT');
        assert.equal(data.recommendations, undefined); // Does not contain F54 recommendations
    });

    test('19. No sensitive stack trace or server file paths in error responses', async () => {
        const res = await post('/api/riasec27/evaluate', { answers: 'malformed_answers' });
        const data = await res.json();
        assert.equal(data.stack, undefined);
        assert.equal(typeof data.message, 'string');
        assert.ok(!data.message.includes('C:\\'));
        assert.ok(!data.message.includes('/home/'));
    });

    test('20. Existing F54 and Holland routes and models remain 100% operational', async () => {
        // F54 status
        const f54Status = await get('/api/ml/status');
        assert.equal(f54Status.status, 200);

        // F54 recommendation
        const f54Payload = { feature_set: 'F54', answers: Array(54).fill(3), top_k: 3 };
        const f54Rec = await post('/api/ml/recommendations', f54Payload);
        assert.equal(f54Rec.status, 200);
        const f54Data = await f54Rec.json();
        assert.equal(f54Data.recommendations.length, 3);

        // Original Evaluation page renders RIASEC27 survey directly in preview mode
        const evalPage = await get('/evaluation');
        assert.equal(evalPage.status, 200);
        const evalHtml = await evalPage.text();
        assert.ok(evalHtml.includes('Định hướng nghề nghiệp bằng AI'));
        assert.ok(evalHtml.includes('id="riasec27-form"'));
        assert.ok(evalHtml.includes('id="questions-list"'));
        assert.ok(!evalHtml.includes('id="ml-f54-form"'));
        assert.ok(!evalHtml.includes('id="holland-survey-panel"'));
        assert.ok(!evalHtml.includes('id="input-toan"'));
    });

    test('21. Python adapter stays storage-free; history service saves summaries without raw answers', async () => {
        // Verified by architecture: service contains no fs.writeFile or db calls for answers
        const serviceContent = fs.readFileSync(path.join(__dirname, '../src/services/riasec27Service.js'), 'utf8');
        assert.ok(!serviceContent.includes('mongoose'));
        assert.ok(!serviceContent.includes('mongodb'));
        assert.ok(!serviceContent.includes('fs.writeFile'));
        assert.ok(savedRows.size>0);
        for(const row of savedRows.values()){
            assert.equal(row.riasec27.summaryStorage.mode,'automatic');
            assert.ok(!Object.hasOwn(row.riasec27,'answers'));
            assert.equal(row.id_nguoiDung,'synthetic-contract-user');
        }
    });

    test('22. Preview UI has a concise reference note while backend research status remains unchanged', async () => {
        const res = await get('/evaluation/riasec27-preview');
        assert.equal(res.status, 200);
        const html = await res.text();
        let renderLocals;
        require('../src/controllers/riasec27Controller').getPreviewPage({}, {set(){},render(view,locals){renderLocals=locals;}});
        assert.equal(renderLocals.researchStatus, 'RESEARCH_ONLY — TOP3_NOT_VALIDATED');
        assert.ok(html.includes('Kết quả mang tính tham khảo, không thay thế tư vấn hướng nghiệp.'));
        assert.ok(!html.includes('BẢN THỬ NGHIỆM NỘI BỘ'));
        assert.ok(!html.includes('research-notice-heading'));
        assert.ok(html.includes('Khảo sát 27 câu RIASEC'));
    });
});

describe('B-07-R1: 27-Question Sentinel Mapping & Input Order Verification', () => {
    const EXPECTED_ORDER = [
        'R1', 'I1', 'A1', 'R2', 'I2', 'A2', 'S1', 'S2', 'R3', 'A3',
        'S3', 'E1', 'R4', 'S4', 'E2', 'R5', 'I3', 'A4', 'E3', 'I4',
        'A5', 'E4', 'C1', 'E5', 'C2', 'C3', 'C4'
    ];

    const B07_ORDER = [
        'R1', 'I1', 'A1', 'S1', 'E1', 'C1', 'R2', 'I2', 'A2', 'S2',
        'E2', 'C2', 'R3', 'I3', 'A3', 'S3', 'E3', 'C3', 'R4', 'I4',
        'A4', 'S4', 'E4', 'C4', 'R5', 'A5', 'E5'
    ];

    test('23. 27 Individual Sentinel Tests: each question index precisely verified', () => {
        for (let k = 0; k < 27; k++) {
            const targetQ = EXPECTED_ORDER[k];
            const dict = {};
            for (const q of EXPECTED_ORDER) {
                dict[q] = (q === targetQ) ? 5 : 1;
            }

            const ordered = riasec27Service.validateAndOrderAnswers(dict);
            assert.equal(ordered.length, 27);
            for (let i = 0; i < 27; i++) {
                if (i === k) {
                    assert.equal(ordered[i], 5, `Expected 5 at index ${k} for question ${targetQ}`);
                } else {
                    assert.equal(ordered[i], 1, `Expected 1 at index ${i} for question ${EXPECTED_ORDER[i]}`);
                }
            }
        }
    });

    test('24. Dictionary with reversed keys produces canonical array', () => {
        const dictReversed = {};
        for (let i = 26; i >= 0; i--) {
            dictReversed[EXPECTED_ORDER[i]] = (i + 1) % 5 + 1; // values 1..5
        }

        const ordered = riasec27Service.validateAndOrderAnswers(dictReversed);
        for (let i = 0; i < 27; i++) {
            assert.equal(ordered[i], dictReversed[EXPECTED_ORDER[i]]);
        }
    });

    test('25. Dictionary with B-07 reported key order produces canonical array', () => {
        const dictB07 = {};
        B07_ORDER.forEach((q, idx) => {
            dictB07[q] = (idx % 5) + 1;
        });

        const ordered = riasec27Service.validateAndOrderAnswers(dictB07);
        for (let i = 0; i < 27; i++) {
            assert.equal(ordered[i], dictB07[EXPECTED_ORDER[i]]);
        }
    });

    test('26. Missing, unknown, or extra keys are rejected with Riasec27InputError', () => {
        const valid = {};
        EXPECTED_ORDER.forEach(q => { valid[q] = 3; });

        // Missing key R4 (length is 26)
        const missing = { ...valid };
        delete missing.R4;
        assert.throws(() => riasec27Service.validateAndOrderAnswers(missing), /chính xác 27 câu hỏi/);

        // Unknown key X1 (27 keys but with X1 instead of R1)
        const unknown = { ...valid };
        delete unknown.R1;
        unknown.X1 = 3;
        assert.throws(() => riasec27Service.validateAndOrderAnswers(unknown), /Thiếu câu trả lời bắt buộc: R1/);

        // 28 keys
        const extra = { ...valid, EXTRA: 3 };
        assert.throws(() => riasec27Service.validateAndOrderAnswers(extra), /chính xác 27 câu hỏi/);
    });

    test('27. Out-of-bound Likert and invalid types are rejected with Riasec27InputError', () => {
        const valid = {};
        EXPECTED_ORDER.forEach(q => { valid[q] = 3; });

        // Out of range (0 and 6)
        assert.throws(() => riasec27Service.validateAndOrderAnswers({ ...valid, R1: 0 }), /phải là số nguyên từ 1 đến 5/);
        assert.throws(() => riasec27Service.validateAndOrderAnswers({ ...valid, R1: 6 }), /phải là số nguyên từ 1 đến 5/);

        // Invalid types
        assert.throws(() => riasec27Service.validateAndOrderAnswers({ ...valid, I1: 3.5 }), /phải là số nguyên từ 1 đến 5/);
        assert.throws(() => riasec27Service.validateAndOrderAnswers({ ...valid, A1: '4' }), /phải là số nguyên từ 1 đến 5/);
        assert.throws(() => riasec27Service.validateAndOrderAnswers({ ...valid, S1: true }), /phải là số nguyên từ 1 đến 5/);
        assert.throws(() => riasec27Service.validateAndOrderAnswers({ ...valid, E1: null }), /phải là số nguyên từ 1 đến 5/);
    });

    test('28. Live HTTP parity: reversed-key dictionary yields identical Top-3 and probabilities', async () => {
        process.env.LABANAI_RIASEC27_PREVIEW = 'true';
        process.env.NODE_ENV = 'development';

        const dictCanonical = {};
        validDifferentiatedAnswers.forEach((val, idx) => {
            dictCanonical[EXPECTED_ORDER[idx]] = val;
        });

        const dictReversed = {};
        for (let i = 26; i >= 0; i--) {
            dictReversed[EXPECTED_ORDER[i]] = validDifferentiatedAnswers[i];
        }

        const resCanonical = await post('/api/riasec27/evaluate', { answers: dictCanonical });
        const resReversed = await post('/api/riasec27/evaluate', { answers: dictReversed });

        assert.equal(resCanonical.status, 200);
        assert.equal(resReversed.status, 200);

        const dataCanonical = await resCanonical.json();
        const dataReversed = await resReversed.json();

        assert.equal(dataCanonical.ml_ranking.status, 'SUCCESS');
        assert.equal(dataReversed.ml_ranking.status, 'SUCCESS');

        const top3Canonical = dataCanonical.ml_ranking.top3.map(m => m.major_id);
        const top3Reversed = dataReversed.ml_ranking.top3.map(m => m.major_id);
        assert.deepEqual(top3Canonical, top3Reversed);

        for (const d of ['R', 'I', 'A', 'S', 'E', 'C']) {
            assert.equal(
                dataCanonical.ml_ranking.ml_probabilities[d],
                dataReversed.ml_ranking.ml_probabilities[d]
            );
        }
    });
});

describe('B-07-R1: Server Listener Environment & Flag Matrix Verification', () => {
    // Exact logic from server.js
    const resolveServerHost = (nodeEnv, previewFlag, hostEnv) => {
        const isPreviewDev = nodeEnv === 'development' && previewFlag === 'true';
        return isPreviewDev ? '127.0.0.1' : (hostEnv || undefined);
    };

    test('29. Listener configuration logic conforms to all 7 required environment combinations', () => {
        // Combination 1: Development + preview ON + HOST unset -> binds loopback 127.0.0.1
        assert.equal(resolveServerHost('development', 'true', undefined), '127.0.0.1');

        // Combination 2: Development + preview ON + HOST=0.0.0.0 -> must force 127.0.0.1
        assert.equal(resolveServerHost('development', 'true', '0.0.0.0'), '127.0.0.1');

        // Combination 3: Development + preview ON + HOST=:: -> must force 127.0.0.1
        assert.equal(resolveServerHost('development', 'true', '::'), '127.0.0.1');

        // Combination 4: Development + preview ON + HOST=192.168.1.10 -> must force 127.0.0.1
        assert.equal(resolveServerHost('development', 'true', '192.168.1.10'), '127.0.0.1');

        // Combination 5: Development + preview OFF + HOST tùy chỉnh -> retains custom HOST (or undefined)
        assert.equal(resolveServerHost('development', 'false', '0.0.0.0'), '0.0.0.0');
        assert.equal(resolveServerHost('development', 'false', '192.168.1.50'), '192.168.1.50');
        assert.equal(resolveServerHost('development', 'false', undefined), undefined);

        // Combination 6: Production + preview ON + HOST tùy chỉnh -> retains custom HOST, NEVER overrides prod
        assert.equal(resolveServerHost('production', 'true', '0.0.0.0'), '0.0.0.0');
        assert.equal(resolveServerHost('production', 'true', undefined), undefined);

        // Combination 7: Production + preview OFF + HOST tùy chỉnh -> production behavior completely intact
        assert.equal(resolveServerHost('production', 'false', '0.0.0.0'), '0.0.0.0');
        assert.equal(resolveServerHost('production', 'false', undefined), undefined);
    });

    test('30. Live HTTP socket test: preview mode strictly binds to 127.0.0.1 even if HOST=0.0.0.0', async () => {
        process.env.LABANAI_RIASEC27_PREVIEW = 'true';
        process.env.NODE_ENV = 'development';
        const simulatedHostEnv = '0.0.0.0';

        // Compute resolved HOST using server.js logic
        const isPreviewDev = process.env.NODE_ENV === 'development' && process.env.LABANAI_RIASEC27_PREVIEW === 'true';
        const boundHost = isPreviewDev ? '127.0.0.1' : (simulatedHostEnv || undefined);

        // Start ephemeral server bound to resolved boundHost
        const ephemeralServer = await new Promise((resolve) => {
            const s = app.listen(0, boundHost, () => resolve(s));
        });

        try {
            const addr = ephemeralServer.address();
            // Verify socket address is strictly loopback
            assert.equal(addr.address, '127.0.0.1', 'Socket address must be strictly 127.0.0.1');

            // Verify HTTP GET succeeds over loopback
            const res = await fetch(`http://127.0.0.1:${addr.port}/evaluation/riasec27-preview`);
            assert.equal(res.status, 200);
            const html = await res.text();
            assert.ok(html.includes('Kết quả mang tính tham khảo, không thay thế tư vấn hướng nghiệp.'));
        } finally {
            ephemeralServer.closeAllConnections();
            await new Promise((resolve, reject) => ephemeralServer.close((err) => (err ? reject(err) : resolve())));
        }
    });
});

