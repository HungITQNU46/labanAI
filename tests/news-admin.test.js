'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeArticlePayload } = require('../src/controllers/newsAdminController');
const { requireAdmin } = require('../src/middleware/authMiddleware');

test('news admin accepts article metadata and stores content as escaped paragraphs', () => {
    const { data, errors } = normalizeArticlePayload({
        title: '  Tin hướng nghiệp  ',
        link: 'https://example.com/news',
        content: 'Đoạn một\n<script>alert(1)</script>',
        category: 'tech-ai',
        industry: 'tech'
    });

    assert.deepEqual(errors, []);
    assert.equal(data.title, 'Tin hướng nghiệp');
    assert.equal(data.html_str, '<p>Đoạn một</p><p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    assert.equal(data.trangThai, true);
});

test('news admin rejects invalid required fields and unsupported status values', () => {
    const { errors } = normalizeArticlePayload({
        title: '',
        link: 'javascript:alert(1)',
        category: 'unknown',
        trangThai: 'false'
    });

    assert.equal(errors.length, 5);
});

test('news admin partial updates validate only supplied fields', () => {
    const valid = normalizeArticlePayload({ trangThai: false }, { partial: true });
    assert.deepEqual(valid.errors, []);
    assert.deepEqual(valid.data, { trangThai: false });

    const invalid = normalizeArticlePayload({ content: '<b>too long</b>'.repeat(700) }, { partial: true });
    assert.equal(invalid.errors.length, 1);
});

test('news admin rejects empty content instead of creating a schema-invalid document', () => {
    const { errors } = normalizeArticlePayload({
        title: 'Tin mới',
        link: 'https://example.com/news',
        content: '   '
    });

    assert.equal(errors.length, 1);
});

test('unauthenticated admin API requests receive JSON instead of an HTML login redirect', async () => {
    let status;
    let body;
    const response = {
        status(code) {
            status = code;
            return this;
        },
        json(value) {
            body = value;
            return this;
        },
        redirect() {
            assert.fail('API requests must not be redirected to an HTML page');
        }
    };

    await requireAdmin({ originalUrl: '/api/admin/news', session: {} }, response, assert.fail);
    assert.equal(status, 401);
    assert.deepEqual(body, {
        success: false,
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    });
});
