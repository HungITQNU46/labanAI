'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const ejs = require('ejs');

const template = path.join(__dirname, '../src/views/pages/evaluation-history.ejs');

test('history page renders filters, comparison controls, and escaped saved results', async () => {
    const html = await ejs.renderFile(template, {
        title: 'Lịch sử đánh giá',
        currentUser: null,
        history: [{
            _id: 'history-1',
            nganhHoc: ['<img src=x onerror=alert(1)>'],
            tiLe: [72],
            detail: { thoiGian: 'invalid-date' }
        }]
    });

    assert.match(html, /id="history-search"/);
    assert.match(html, /id="history-period"/);
    assert.match(html, /id="history-sort"/);
    assert.match(html, /id="history-compare-button"/);
    assert.match(html, /id="bottom-nav-bar"/);
    assert.match(html, /href="\/evaluation" class="evaluation-shortcut evaluation-shortcut-prediction"[\s\S]*?Dự đoán trúng tuyển ĐH/);
    assert.match(html, /data-history-date="0"/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
});

test('empty history still renders usable navigation and comparison controls', async () => {
    const html = await ejs.renderFile(template, {
        title: 'Lịch sử đánh giá',
        currentUser: null,
        history: []
    });

    assert.match(html, /id="history-compare-button"/);
    assert.match(html, /id="history-status"/);
    assert.match(html, /Chưa có lịch sử đánh giá/);
    assert.match(html, /href="\/evaluation"/);
});
