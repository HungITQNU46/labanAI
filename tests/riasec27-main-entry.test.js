'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');
const ml = require('../src/services/riasec27Service');
let server, origin;
const old = { env: process.env.NODE_ENV, flag: process.env.LABANAI_RIASEC27_PREVIEW };
const preview = () => { process.env.NODE_ENV = 'development'; process.env.LABANAI_RIASEC27_PREVIEW = 'true'; };
before(async () => {
    preview();
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    if (app && typeof app.closeResources === 'function') {
        await app.closeResources();
    }
    if (old.env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = old.env;
    if (old.flag === undefined) delete process.env.LABANAI_RIASEC27_PREVIEW; else process.env.LABANAI_RIASEC27_PREVIEW = old.flag;
});

test('home integration: root renders the original home without redirect, evaluation opens the single gated survey', async t => {
    preview();
    const inference = t.mock.method(ml, 'evaluateProfile', () => { throw Error('Opening a page must not invoke ML'); });
    const home = await fetch(origin + '/', { redirect: 'manual' });
    assert.equal(home.status, 200); assert.equal(home.headers.get('location'), null);
    const homeHtml = await home.text();
    assert.ok(homeHtml.includes('id="btn-hero-riasec27"') && homeHtml.includes('id="canvas-container"'));
    assert.ok(!homeHtml.includes('id="questions-list"'));
    assert.ok(homeHtml.includes('Khám phá bản thân,') && homeHtml.includes('định hướng tương lai'));
    for (const text of ['27 câu RIASEC', '6 mô hình ML Q5', 'Xếp hạng P2', 'Top-3', 'RESEARCH_ONLY', 'KHÁM PHÁ NGÀNH ĐẠI HỌC BẰNG AI']) assert.ok(!homeHtml.includes(text), text);
    let pathname = '/evaluation', chain = [], html;
    for (let hop = 0; hop < 4; hop++) {
        const response = await fetch(origin + pathname, { redirect: 'manual' });
        chain.push([pathname, response.status]);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        if (response.status === 200) { html = await response.text(); break; }
        assert.equal(response.status, 302); pathname = response.headers.get('location');
    }
    assert.deepEqual(chain, [['/evaluation', 200]]);
    assert.ok(html.includes('id="questions-list"') && html.includes('Giải thích kết quả bằng Groq AI'));
    assert.ok(html.includes('data-eval-step="1"') && html.includes('data-eval-step="2"') && html.includes('data-eval-step="3"'));
    assert.ok(html.includes('Khảo sát Holland RIASEC'));
    const questionnaireMatch = html.match(/<script id="riasec27-data" type="application\/json">([\s\S]*?)<\/script>/);
    assert.ok(questionnaireMatch, 'evaluation page should include the questionnaire data');
    assert.equal(JSON.parse(questionnaireMatch[1]).questions.length, 27);
    assert.ok(!html.includes('id="btn-hero-riasec27"'));
    assert.equal(inference.mock.callCount(), 0);

    // Verify /evaluation/riasec27-preview redirects to /evaluation
    const legacyRedirect = await fetch(origin + '/evaluation/riasec27-preview', { redirect: 'manual' });
    assert.equal(legacyRedirect.status, 302);
    assert.equal(legacyRedirect.headers.get('location'), '/evaluation');
});

test('home integration: public home stays available but hostile Host cannot access the research survey', async () => {
    preview();
    for (const [pathname, expected] of [['/', 200], ['/evaluation', 200], ['/evaluation/riasec27-preview', 403], ['/api/riasec27/questions', 403]]) {
        const response = await new Promise((resolve, reject) => {
        const request = http.get(origin + pathname, { headers: { Host: 'attacker.invalid', 'X-Forwarded-For': '127.0.0.1' } }, r => {
            let html = ''; r.setEncoding('utf8'); r.on('data', chunk => { html += chunk; });
            r.on('end', () => resolve({ status: r.statusCode, location: r.headers.location, html }));
        });
        request.on('error', reject);
    });
        assert.equal(response.status, expected); assert.equal(response.location, undefined);
        assert.ok(!response.html.includes('id="questions-list"'));
    }
});

test('home integration: news, guide, about and existing chatbot pages still return 200 without redirect', async () => {
    for (const pathname of ['/news', '/guide', '/about', '/chatbot']) {
        const response = await fetch(origin + pathname, { redirect: 'manual' });
        assert.equal(response.status, 200, pathname); assert.equal(response.headers.get('location'), null);
        const html = await response.text(); assert.ok(html.includes('<html')); assert.ok(!html.includes('id="questions-list"'));
    }
});

test('main entry: preview OFF/default/production keep root and evaluation safe and all RIASEC27 endpoints blocked', async () => {
    try {
        for (const [env, flag] of [['development', 'false'], ['production', 'true'], ['production', 'false'], [undefined, undefined]]) {
            if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
            if (flag === undefined) delete process.env.LABANAI_RIASEC27_PREVIEW; else process.env.LABANAI_RIASEC27_PREVIEW = flag;
            for (const pathname of ['/', '/evaluation']) {
                const response = await fetch(origin + pathname, { redirect: 'manual' });
                assert.equal(response.status, 200, `${env}/${flag} ${pathname}`);
                assert.equal(response.headers.get('location'), null);
                const html = await response.text();
                assert.ok(!html.includes('id="questions-list"') && !html.includes('id="btn-submit-riasec"'));
            }
            for (const pathname of ['/evaluation/riasec27-preview', '/api/riasec27/questions']) {
                assert.equal((await fetch(origin + pathname, { redirect: 'manual' })).status, 404);
            }
            for (const pathname of ['/api/riasec27/evaluate', '/api/riasec27/explain']) {
                const response = await fetch(origin + pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
                assert.equal(response.status, 404);
            }
        }
    } finally { preview(); }
});
