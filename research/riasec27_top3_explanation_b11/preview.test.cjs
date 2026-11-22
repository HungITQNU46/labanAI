'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const script = fs.readFileSync(path.join(root, 'public/js/riasec27-preview.js'), 'utf8');
const ejs = fs.readFileSync(path.join(root, 'src/views/pages/riasec27Preview.ejs'), 'utf8');
const audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'case_audit.json'), 'utf8'));

function renderer() {
    const resultsContent = { innerHTML: '' };
    const resultsPanel = { classList: { remove() {} }, scrollIntoView() {} };
    const context = { resultsContent, resultsPanel, clearExplanation() {}, aiControls: null, aiOpen: null, escapeHtml: (value) => String(value ?? '').replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`) };
    // Exercise the shipped functions without adding a browser-facing testing API.
    const functions = script.slice(script.indexOf('    function renderResults('), script.indexOf('    // --- SECTION 3:'));
    vm.runInNewContext(functions, context);
    return { render: (ml) => { context.renderResults({ ml_ranking: ml }); return resultsContent.innerHTML; } };
}

test('current UI: explanation is explicitly requested inside the two-section survey', () => {
    for (const text of ['Giải thích kết quả bằng Groq AI', 'ai-explanation-consent', '27 câu', 'Không gửi 27 đáp án thô']) assert.ok(ejs.includes(text), text);
    assert.ok(!ejs.includes('top3-process-explanation'));
    assert.ok(!ejs.includes('riasec27-catalog-panel'));
    assert.ok(!ejs.includes('riasec27-tier2-panel'));
});
test('current UI: research limits and external-data consent remain visible', () => {
    for (const text of ['Kết quả mang tính tham khảo', 'không thay thế tư vấn hướng nghiệp', 'thông tin định danh', 'Nhà cung cấp có chính sách lưu giữ']) assert.ok(ejs.includes(text), text);
});
test('current UI: real audited result shows native ranks and five fields without score explanations', () => {
    const result = audit.cases[0].fresh_outputs.before.P2;
    const html = renderer().render(result);
    assert.equal((html.match(/data-result-field=/g) || []).length, 15);
    for (const item of result.top3) {
        assert.ok(html.includes(`TOP #${item.rank}`));
        assert.ok(html.includes(item.major_id));
        assert.ok(!html.includes(item.pearson_r.toFixed(4)));
    }
    assert.ok(!html.includes('%'));
    assert.ok(!html.includes('major-ranking-explanation'));
});
test('B11: tied ranks inside a determined Top-3 preserve native ranks', () => {
    const result = structuredClone(audit.cases[0].fresh_outputs.before.P2);
    result.top3[0].rank = 1; result.top3[1].rank = 1; result.top3[2].rank = 3;
    const html = renderer().render(result);
    assert.equal((html.match(/TOP #1/g) || []).length, 2);
    assert.ok(!html.includes('TOP #2'));
});
test('B11: missing rank/score is N/A, never invented from list position or another metric', () => {
    const result = structuredClone(audit.cases[0].fresh_outputs.before.P2);
    delete result.top3[0].rank; delete result.top3[0].pearson_r;
    result.top3[0].similarity_score = .98765;
    const html = renderer().render(result);
    assert.ok(html.includes('TOP #N/A'));
    assert.ok(!html.includes('0.9877'));
});
test('B11: ABSTAIN does not blame the student or fabricate alternatives', () => {
    const html = renderer().render({ status: 'ABSTAIN_FLAT_PROFILE', top3: audit.cases[0].fresh_outputs.before.P2.top3, message: 'UNSAFE_DIAGNOSTIC' });
    assert.ok(html.includes('không phải lỗi của bạn'));
    assert.ok(html.includes('không tạo Top-3 thay thế'));
    assert.ok(!html.includes('TOP #'));
    assert.ok(!html.includes('UNSAFE_DIAGNOSTIC'));
});
test('B11: boundary ties use actual renderer and do not select a Top-3', () => {
    const html = renderer().render({ status: 'TIED_BOUNDARY', top3: audit.cases[0].fresh_outputs.before.P2.top3 });
    assert.ok(html.includes('TIED_BOUNDARY'));
    assert.ok(html.includes('giữ nguyên kết quả hòa'));
    assert.ok(!html.includes('TOP #'));
});
test('B11: errors and unknown statuses never reflect backend diagnostics or HTML', () => {
    for (const status of ['ERROR', 'DEPENDENCY_ERROR', 'INTERNAL_ERROR', 'UNKNOWN']) {
        const html = renderer().render({ status, message: 'Traceback C:\\private\\model.joblib <script>BAD</script>', top3: [] });
        for (const forbidden of ['Traceback', 'private', 'joblib', '<script>', 'BAD']) assert.ok(!html.includes(forbidden), status);
        assert.ok(html.includes('Hệ thống chưa thể tạo gợi ý'));
    }
});
test('B11: probabilities are not displayed as fit scores; names are escaped', () => {
    const result = structuredClone(audit.cases[0].fresh_outputs.before.P2);
    result.ml_probabilities = { R: .123456789 };
    result.top3[0].major_name_vi = '<img src=x onerror=BAD>';
    const html = renderer().render(result);
    assert.ok(!html.includes('0.123456789'));
    assert.ok(!html.includes('<img'));
    assert.ok(!/phù hợp\s+\d+\s*%/i.test(html));
});
test('B11: preview client has one evaluate fetch and no persistence/online perturbation', () => {
    assert.equal((script.match(/fetch\('\/api\/riasec27\/evaluate'/g) || []).length, 1);
    assert.ok(!/localStorage|sessionStorage|indexedDB|sendBeacon|perturb/i.test(script));
    assert.ok(!/console\.(log|debug|info)\s*\(/.test(script));
    const service = fs.readFileSync(path.join(root, 'src/services/riasec27Service.js'), 'utf8');
    assert.ok(!/writeFile|appendFile|mongoose|mongodb|console\.(log|debug)/.test(service));
});
