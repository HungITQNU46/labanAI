/**
 * evaluation-single-survey-browser.cjs
 * 
 * End-to-end browser test for LabanAI single RIASEC27 survey architecture on /evaluation.
 * Verifies prompt requirements 1-9:
 * 1. Clean '/' home page with no F54/Holland references, CTA pointing to /evaluation.
 * 2. Direct 27 RIASEC questions on /evaluation without tabs/mode selection.
 * 3. Complete absence of F54, Holland 60, THPT scores, Wishlist drag.
 * 4. 27 differentiated answers -> Top-3 READY majors + decimal Pearson + B-11 explanation.
 * 5. 27 flat answers -> ABSTAIN_FLAT_PROFILE.
 * 6. Responsive layout at 1440px, 375px, 320px.
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

process.env.LABANAI_RIASEC27_PREVIEW = 'true';
process.env.NODE_ENV = 'development';

const app = require('../server');
const explanationService = require('../src/services/grokExplanation');
const mlService = require('../src/services/riasec27Service');
let providerCalls = 0, mlCalls = 0, providerFailure = false, providerReordered = false, lastProviderContext = null;
const realEvaluate = mlService.evaluateProfile.bind(mlService);
mlService.evaluateProfile = (...args) => { mlCalls++; return realEvaluate(...args); };
const mockExplanation = explanationService.createExplanationService({
    config: () => ({ provider: 'groq', apiKey: 'gsk_synthetic-browser-key', model: 'synthetic-model' }),
    fetchImpl: async (url, options) => {
        assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
        providerCalls++;
        const body = JSON.parse(options.body);
        lastProviderContext = JSON.parse(body.messages[1].content);
        assert.equal(body.store, false);
        await new Promise(resolve => setTimeout(resolve, 150));
        if (providerFailure) return new Response('private provider error', { status: 429 });
        const reply = { explanations: lastProviderContext.majors.map(m => ({ major_id: m.major_id, rank: m.rank,
            reason: 'Hồ sơ tham chiếu được đối chiếu với sở thích đã tổng hợp; chưa đủ thông tin để giải thích nguyên nhân cụ thể.',
            explore: 'Bạn có thể tìm hiểu nhiệm vụ của nghề đại diện và trao đổi thêm với người tư vấn.'
        })), limitations: 'Kết quả định hướng nghiên cứu, chưa được kiểm chứng và không thay thế tư vấn hướng nghiệp. RESEARCH_ONLY — TOP3_NOT_VALIDATED' };
        if (providerReordered) reply.explanations.reverse();
        return new Response(JSON.stringify({ object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(reply) } }] }));
    }
});
explanationService.mintContext = mockExplanation.mintContext;
explanationService.explain = mockExplanation.explain;

const CHROME_CANDIDATES = [
    process.env.ML_BROWSER_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

const CHROME = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
    constructor(url) {
        this.socket = new WebSocket(url);
        this.counter = 0;
        this.pending = new Map();
        this.listeners = new Map();
        this.ready = new Promise((resolve, reject) => {
            this.socket.addEventListener('open', resolve, { once: true });
            this.socket.addEventListener('error', reject, { once: true });
        });
        this.socket.addEventListener('message', ({ data }) => {
            const message = JSON.parse(data);
            if (message.id && this.pending.has(message.id)) {
                const { resolve, reject, timer } = this.pending.get(message.id);
                clearTimeout(timer);
                this.pending.delete(message.id);
                if (message.error) reject(new Error(`${message.error.code}: ${message.error.message}`));
                else resolve(message.result || {});
            } else if (message.method) {
                for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
            }
        });
    }

    async call(method, params = {}) {
        await this.ready;
        const id = ++this.counter;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`CDP timeout: ${method}`));
            }, 25000);
            this.pending.set(id, { resolve, reject, timer });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }

    close() {
        this.socket.close();
    }
}

async function runEvaluationTests() {
    if (!CHROME) {
        console.log('STATUS: NOT_RUN (No Chrome or Edge executable found)');
        process.exit(0);
    }

    console.log(`Starting ephemeral test server on loopback (127.0.0.1)...`);
    const server = await new Promise((resolve) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const port = server.address().port;
    const origin = `http://127.0.0.1:${port}`;
    console.log(`Test server running at: ${origin}`);

    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'labanai-eval-browser-'));
    let chromeStderr = '';

    console.log(`Launching browser: ${CHROME}`);
    const browser = spawn(CHROME, [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-sync',
        '--remote-debugging-address=127.0.0.1',
        '--remote-debugging-port=0',
        `--user-data-dir=${profile}`,
        'about:blank'
    ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });

    browser.stderr.on('data', (chunk) => { chromeStderr += chunk.toString(); });

    const activePortFile = path.join(profile, 'DevToolsActivePort');
    const deadline = Date.now() + 20000;
    while (!fs.existsSync(activePortFile) && Date.now() < deadline) {
        await pause(100);
    }

    if (!fs.existsSync(activePortFile)) {
        server.close();
        throw new Error(`Chrome failed to expose CDP: ${chromeStderr.slice(-500)}`);
    }

    const cdpPort = Number(fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0]);
    const target = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' })).json();
    const cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.ready;
    const scriptErrors = [];
    cdp.listeners.set('Runtime.exceptionThrown', [() => scriptErrors.push('Uncaught JavaScript exception')]);
    cdp.listeners.set('Runtime.consoleAPICalled', [event => { if (event.type === 'error') scriptErrors.push('console.error'); }]);

    await Promise.all(['Page.enable', 'Runtime.enable', 'DOM.enable'].map((m) => cdp.call(m)));

    try {
        const evaluate = async (expression) => {
            const res = await cdp.call('Runtime.evaluate', {
                expression,
                returnByValue: true,
                awaitPromise: true
            });
            if (res.exceptionDetails) {
                throw new Error(`Eval error: ${res.exceptionDetails.text} (${expression})`);
            }
            return res.result.value;
        };

        const waitFor = async (predicateExpr, description, timeoutMs = 15000) => {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                try {
                    const ok = await evaluate(predicateExpr);
                    if (ok) return true;
                } catch {}
                await pause(100);
            }
            throw new Error(`Timeout waiting for: ${description}`);
        };

        // =========================================================================
        // STEP 1: The original home remains separate from the gated RIASEC27 feature.
        // =========================================================================
        console.log('\n--- STEP 1: Checking Home Page / ---');
        await cdp.call('Page.navigate', { url: `${origin}/` });
        await waitFor("Boolean(document.getElementById('canvas-container') && document.getElementById('btn-hero-riasec27') && document.querySelector('#layout-container header'))", 'Original home and menu');
        assert.equal(await evaluate('location.pathname'), '/');
        assert.equal(await evaluate("Boolean(document.getElementById('questions-list'))"), false);
        assert.equal(await evaluate("document.getElementById('btn-hero-riasec27').getAttribute('href')"), '/evaluation');
        assert.equal(await evaluate("document.querySelector('main h1').textContent.replace(/\\s+/g,' ').trim()"), 'Khám phá bản thân, định hướng tương lai');
        assert.equal(await evaluate("document.querySelector('main p').textContent.trim()"), 'LabanAI giúp bạn khám phá sở thích cá nhân, tìm hiểu các ngành đại học và có thêm thông tin tham khảo để lựa chọn hướng đi phù hợp với bản thân.');
        assert.equal(await evaluate("document.querySelectorAll('main a').length"), 1, 'Exactly one hero CTA');
        assert.equal(await evaluate("document.getElementById('btn-hero-riasec27').textContent.trim()"), 'Khám phá ngay');
        assert.equal(await evaluate("/RIASEC|ML Q5|P2|Top-3|RESEARCH_ONLY|TOP3_NOT_VALIDATED|27 câu|mô hình|thuật toán/i.test(document.querySelector('main').innerText)"), false);
        assert.ok(await evaluate("Array.from(document.querySelectorAll('a[href]')).filter(a=>a.textContent.trim()==='Trang chủ').every(a=>a.getAttribute('href')==='/')"));
        for (const width of [1440,375,320]) {
            await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
            await pause(200);
            assert.equal(await evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"), false, `Home layout at ${width}px`);
            assert.ok(await evaluate("(()=>{const r=document.getElementById('btn-hero-riasec27').getBoundingClientRect();return r.width>=120&&r.height>=44&&r.left>=0&&r.right<=document.documentElement.clientWidth;})()"), `Home CTA remains usable at ${width}px`);
            if (process.argv.includes('--capture')) {
                const screenshot = await cdp.call('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
                const screenshotPath = path.join(os.tmpdir(),`labanai-simplified-home-${width}-${Date.now()}.png`);
                fs.writeFileSync(screenshotPath,Buffer.from(screenshot.data,'base64'));
                console.log('HOME_SCREENSHOT',screenshotPath);
            }
        }
        assert.deepEqual(scriptErrors, [], 'No uncaught JavaScript or console.error on home');
        console.log('PASS: Minimal hero has one heading, description and CTA; no technical labels or JavaScript/console errors.');
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await evaluate("localStorage.setItem('isLoggedIn','true'); renderLayout('nav-home')");
        for (const pathname of ['/', '/evaluation', '/news', '/guide', '/about', '/chatbot']) {
            assert.ok(await evaluate(`Boolean(document.querySelector('#sidebar a[href="${pathname}"]'))`), `Sidebar retains ${pathname}`);
        }
        await evaluate("localStorage.removeItem('isLoggedIn'); renderLayout('nav-home')");

        const bodyText = await evaluate("document.body.innerText");
        assert.ok(!bodyText.includes('F54'), 'Home page must not mention F54');
        assert.ok(!bodyText.includes('54 câu'), 'Home page must not mention 54 questions');
        assert.ok(!bodyText.includes('Holland (60 câu)'), 'Home page must not mention Holland 60');
        assert.ok(!bodyText.includes('Phương pháp tham khảo'), 'Home page must not have reference method link');
        console.log('PASS: / renders original home without survey or redirect; home/evaluation links, existing menus and desktop/mobile layouts are intact.');

        // =========================================================================
        // STEP 2: Verify /evaluation Opens Directly to RIASEC27 Survey
        // =========================================================================
        console.log('\n--- STEP 2: Checking /evaluation Direct RIASEC27 Survey ---');
        await evaluate("Array.from(document.querySelectorAll('#layout-container a[href=\"/evaluation\"]')).find(a=>a.textContent.includes('Định hướng AI')).click()");
        await waitFor("document.getElementById('questions-list')?.children?.length === 27", '27 questions rendered');
        assert.equal(await evaluate('location.pathname'), '/evaluation');
        await evaluate("document.querySelector('main a[href=\"/\"]').click()");
        await waitFor("location.pathname==='/' && Boolean(document.getElementById('btn-hero-riasec27'))", 'Survey back to home without redirect loop');
        await evaluate("document.getElementById('btn-hero-riasec27').click()");
        await waitFor("document.getElementById('questions-list')?.children?.length === 27", 'Home CTA opens the same 27-question survey');
        assert.equal(await evaluate('location.pathname'), '/evaluation');

        // Check required elements
        const titleText = await evaluate("document.querySelector('h1')?.innerText");
        assert.ok(titleText.includes('Định hướng nghề nghiệp bằng AI'));

        assert.ok(await evaluate("document.getElementById('result-reference-note').textContent.includes('Kết quả mang tính tham khảo, không thay thế tư vấn hướng nghiệp.')"));
        assert.equal(await evaluate("/RESEARCH_ONLY|TOP3_NOT_VALIDATED|research_status|BẢN THỬ NGHIỆM NỘI BỘ/.test(document.querySelector('main').innerText)"),false);

        const questionCount = await evaluate("document.querySelectorAll('#questions-list > div').length");
        assert.equal(questionCount, 27, 'Must have exactly 27 questions rendered');

        const submitDisabled = await evaluate("document.getElementById('btn-submit-riasec')?.disabled");
        assert.equal(submitDisabled, true, 'Submit button must initially be disabled');

        // Verify complete absence of legacy UI
        const hasLegacyF54 = await evaluate("Boolean(document.getElementById('ml-f54-form'))");
        const hasF54Tab = await evaluate("Boolean(document.getElementById('tab-btn-f54'))");
        const hasHollandPanel = await evaluate("Boolean(document.getElementById('holland-survey-panel'))");
        const hasHollandTab = await evaluate("Boolean(document.getElementById('tab-btn-holland'))");
        const hasThptInput = await evaluate("Boolean(document.getElementById('input-toan'))");
        const hasWishlist = await evaluate("Boolean(document.getElementById('wishlist-drag-container'))");
        const hasBottomBar = await evaluate("Boolean(document.getElementById('bottom-nav-bar'))");

        assert.equal(hasLegacyF54, false, 'No F54 form');
        assert.equal(hasF54Tab, false, 'No F54 tab');
        assert.equal(hasHollandPanel, false, 'No Holland panel');
        assert.equal(hasHollandTab, false, 'No Holland tab');
        assert.equal(hasThptInput, false, 'No THPT input');
        assert.equal(hasWishlist, false, 'No Wishlist container');
        assert.equal(hasBottomBar, false, 'No legacy bottom bar');
        console.log('PASS: /evaluation directly opens 27 questions with zero legacy elements.');

        // =========================================================================
        // STEP 3: Fill 27 Differentiated Answers -> Top-3 SUCCESS + B-11
        // =========================================================================
        console.log('\n--- STEP 3: Submitting 27 Differentiated Answers ---');
        const diffAnswers = [
            5, 5, 2, 5, 4, 2, 2, 2, 5, 2,
            2, 2, 5, 2, 2, 5, 5, 2, 2, 4,
            2, 2, 1, 2, 1, 1, 1
        ];

        await evaluate(`
            const answers = ${JSON.stringify(diffAnswers)};
            const qCards = document.querySelectorAll('#questions-list > div');
            qCards.forEach((card, idx) => {
                const val = answers[idx];
                const radio = card.querySelector('input[value="' + val + '"]');
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        `);

        await waitFor("document.getElementById('answered-count')?.innerText === '27'", 'Answer count 27');
        const isSubmitEnabled = await evaluate("!document.getElementById('btn-submit-riasec')?.disabled");
        assert.ok(isSubmitEnabled, 'Submit button should now be enabled');

        // Click submit
        await evaluate("document.getElementById('btn-submit-riasec').click()");
        await waitFor("!document.getElementById('riasec27-results-panel').classList.contains('hidden')", 'Results panel visible', 20000);
        await waitFor("document.querySelectorAll('#results-content .absolute').length === 3", 'Top-3 cards rendered', 20000);

        const cardCount = await evaluate("document.querySelectorAll('#results-content .absolute').length");
        assert.equal(cardCount, 3, 'Must render exactly 3 Top-3 cards');

        const resultsText = await evaluate("document.getElementById('results-content').textContent");
        assert.ok(resultsText.includes('TOP #1'), 'Must contain TOP #1');
        assert.ok(resultsText.includes('TOP #2'), 'Must contain TOP #2');
        assert.ok(resultsText.includes('TOP #3'), 'Must contain TOP #3');
        assert.ok(resultsText.includes('O*NET:'), 'Must contain O*NET');
        assert.ok(!resultsText.includes('%') && !resultsText.includes('Pearson'), 'Main cards contain no score or long explanation');
        assert.equal(await evaluate("document.querySelectorAll('main > section').length"), 2);
        assert.equal(await evaluate("Boolean(document.getElementById('top3-process-explanation') || document.getElementById('riasec27-catalog-panel') || document.getElementById('riasec27-tier2-panel'))"), false);
        assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.top3-card')).map(c=>c.querySelectorAll('[data-result-field]').length)"), [5,5,5]);
        const rankingBefore = await evaluate("Array.from(document.querySelectorAll('.top3-card')).map(c=>c.dataset.majorId)");
        const countBefore = mlCalls;
        assert.equal(providerCalls, 0, 'No automatic provider call');
        await evaluate("document.getElementById('btn-explain-ai').click()");
        assert.equal(await evaluate("document.getElementById('ai-explanation-heading').innerText"), 'Giải thích kết quả bằng Groq AI');
        assert.equal(await evaluate("document.getElementById('btn-create-ai-explanation').disabled"), true);
        assert.equal(providerCalls, 0);
        assert.ok(await evaluate("document.getElementById('ai-data-disclosure').innerText.includes('Không gửi 27 đáp án thô')"));
        await evaluate("document.getElementById('ai-explanation-consent').click(); document.getElementById('btn-create-ai-explanation').click()");
        await waitFor("document.getElementById('ai-explanation-content').children.length === 4", 'Mock provider explanation renders');
        assert.equal(providerCalls, 1); assert.equal(mlCalls, countBefore, 'No repeated ML inference');
        assert.equal(await evaluate("/RESEARCH_ONLY|TOP3_NOT_VALIDATED|research_status/.test(document.getElementById('ai-explanation-content').innerText)"),false);
        assert.deepEqual(lastProviderContext.majors.map(m=>m.major_id), rankingBefore);
        for (const key of ['answers','email','phone','participant_id','ml_probabilities']) assert.ok(!Object.hasOwn(lastProviderContext,key));
        assert.ok(!await evaluate("document.documentElement.innerHTML.includes('synthetic-browser-key')"));
        assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.top3-card')).map(c=>c.dataset.majorId)"), rankingBefore);
        for (const width of [1440,375,320]) {
            await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: width < 600 });
            await pause(200);
            assert.equal(await evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"), false, `Expanded AI panel at ${width}px`);
            if (process.argv.includes('--capture')) {
                await evaluate("document.getElementById('riasec27-results-panel').scrollIntoView({behavior:'instant',block:'start'})");
                const screenshot=await cdp.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
                const screenshotPath=path.join(os.tmpdir(),`labanai-minimal-${width}-${Date.now()}.png`);
                fs.writeFileSync(screenshotPath,Buffer.from(screenshot.data,'base64'));
                console.log('SCREENSHOT',screenshotPath);
            }
        }
        providerReordered = true;
        await evaluate("document.getElementById('btn-create-ai-explanation').click()");
        await waitFor("document.getElementById('ai-explanation-status').innerText === 'Chưa thể tạo lời giải thích bằng AI lúc này'", 'Provider error shown safely');
        assert.equal(providerCalls, 2); assert.equal(mlCalls, countBefore);
        assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.top3-card')).map(c=>c.dataset.majorId)"), rankingBefore);
        providerFailure = true; providerReordered = false;
        await waitFor("!document.getElementById('btn-create-ai-explanation').disabled", 'Retry enabled');
        await evaluate("document.getElementById('btn-create-ai-explanation').click()");
        await waitFor("!document.getElementById('btn-create-ai-explanation').disabled", 'Quota response rejected');
        assert.equal(providerCalls, 3); assert.equal(mlCalls, countBefore);
        assert.equal(await evaluate("document.getElementById('ai-explanation-content').children.length"), 0);
        assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.top3-card')).map(c=>c.dataset.majorId)"), rankingBefore);
        console.log('PASS: Two sections; consent -> real ML/P2 -> mocked Groq Chat Completions, no raw answers or extra ML; ranking mismatch and 429 preserve Top-3.');
        await evaluate("window.beforeTiedFetch=window.fetch;window.fetch=async(url,options)=>url==='/api/riasec27/evaluate'?new Response(JSON.stringify({ml_ranking:{status:'TIED_BOUNDARY',top3:[]}}),{headers:{'Content-Type':'application/json'}}):window.beforeTiedFetch(url,options);document.getElementById('btn-submit-riasec').click()");
        await waitFor("Boolean(document.querySelector('[data-result-status=\"TIED_BOUNDARY\"]'))", 'Tied boundary rendering');
        assert.equal(await evaluate("document.querySelectorAll('.top3-card').length"), 0);
        assert.equal(await evaluate("document.getElementById('ai-explanation-controls').classList.contains('hidden')"), true);
        assert.equal(providerCalls,3); assert.equal(mlCalls,countBefore);
        await evaluate('window.fetch=window.beforeTiedFetch');
        console.log('PASS: TIED_BOUNDARY has no fabricated Top-3 or AI request.');

        // =========================================================================
        // STEP 4: Reset and Flat Profile -> ABSTAIN_FLAT_PROFILE
        // =========================================================================
        console.log('\n--- STEP 4: Reset & Flat Profile All 3s ---');
        await evaluate("document.getElementById('btn-reset-answers').click()");
        await waitFor("document.getElementById('answered-count')?.innerText === '0'", 'Reset counter to 0');

        const resultsHiddenAfterReset = await evaluate("document.getElementById('riasec27-results-panel')?.classList.contains('hidden')");
        assert.ok(resultsHiddenAfterReset, 'Results hidden after reset');

        // Fill all 3s
        await evaluate(`(() => {
            const qCards = document.querySelectorAll('#questions-list > div');
            qCards.forEach((card) => {
                const radio = card.querySelector('input[value="3"]');
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        })()`);
        await waitFor("document.getElementById('answered-count')?.innerText === '27'", 'Answer count 27 for flat');
        await evaluate("document.getElementById('btn-submit-riasec').click()");

        await waitFor("Boolean(document.querySelector('[data-result-status=\"ABSTAIN_FLAT_PROFILE\"]'))", 'Abstain message rendered', 20000);
        const abstainCardCount = await evaluate("document.querySelectorAll('#results-content .absolute').length");
        assert.equal(abstainCardCount, 0, 'No Top-3 cards on flat profile abstain');

        const abstainText = await evaluate("document.getElementById('results-content')?.innerText");
        assert.ok(abstainText.includes('Hồ sơ sở thích chưa đủ phân biệt'), 'Abstain title matches');
        assert.ok(abstainText.includes('Hệ thống không tạo Top-3 thay thế'), 'Neutral scientific message without blaming user');
        console.log('PASS: Flat profile produces ABSTAIN_FLAT_PROFILE with 0 cards and neutral explanation.');

        // =========================================================================
        // STEP 5: Viewport Responsiveness at 1440px, 375px, 320px
        // =========================================================================
        console.log('\n--- STEP 5: Checking Responsiveness (1440px, 375px, 320px) ---');
        const viewports = [
            { width: 1440, height: 900, name: 'Desktop (1440x900)' },
            { width: 375, height: 667, name: 'Mobile (375x667)' },
            { width: 320, height: 568, name: 'Small Mobile (320x568)' }
        ];

        for (const vp of viewports) {
            await cdp.call('Emulation.setDeviceMetricsOverride', {
                width: vp.width,
                height: vp.height,
                deviceScaleFactor: 1,
                mobile: vp.width <= 400
            });
            await pause(200);

            const hasOverflow = await evaluate("document.documentElement.scrollWidth > window.innerWidth");
            assert.equal(hasOverflow, false, `Viewport ${vp.name} must have zero horizontal overflow`);
            console.log(`PASS: Viewport ${vp.name} renders cleanly with zero horizontal overflow.`);
        }

        console.log('\n======================================================');
        console.log('ALL /evaluation E2E REAL BROWSER TESTS PASSED 100%!');
        console.log('======================================================\n');

    } finally {
        cdp.close();
        browser.kill();
        server.close();
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
    }
}

runEvaluationTests().catch((err) => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});
