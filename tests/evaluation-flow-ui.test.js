'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const ejs = require('ejs');

const template = path.join(__dirname, '../src/views/pages/evaluation.ejs');

test('evaluation opens on the academic profile and places the RIASEC survey in step two', async () => {
    const html = await ejs.renderFile(template, {
        title: 'Đánh giá năng lực',
        currentUser: null,
        isAllowedPreview: true,
        questionnaireData: JSON.stringify({ questions: [], answer_scale: [] })
    });

    assert.match(html, /data-eval-step="1"[\s\S]*?Hồ sơ học tập/);
    assert.match(html, /data-eval-step="2"[\s\S]*?Trắc nghiệm Holland/);
    assert.match(html, /data-eval-step="3"[\s\S]*?Kết quả AI/);
    assert.match(html, /id="academic-profile-panel"/);
    assert.match(html, /id="riasec27-survey-panel" class="hidden/);
    assert.match(html, /id="btn-next-to-survey"/);
    assert.match(html, /id="btn-submit-riasec" form="riasec27-form"/);
    assert.equal((html.match(/class="academic-score-input"/g) || []).length, 9);
    assert.match(html, /id="admission-prediction-panel"/);
    assert.match(html, /Dự đoán trúng tuyển ĐH/);
    assert.match(html, /id="btn-open-admission" href="#admission-prediction-panel" class="evaluation-shortcut evaluation-shortcut-prediction"/);
    assert.match(html, /không phải dự báo tuyển sinh chính thức/);
});
