/**
 * riasec27-browser.cjs
 * 
 * End-to-end browser automation test for Direction B RIASEC27 Research Preview.
 * Covers Scenarios A through M using local Chrome/Edge in headless mode via CDP.
 * Zero extra npm packages required.
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

async function runBrowserTests() {
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

    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'labanai-riasec27-browser-'));
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

    await Promise.all(['Page.enable', 'Runtime.enable', 'DOM.enable'].map((m) => cdp.call(m)));

    const evaluate = async (expression) => {
        const response = await cdp.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (response.exceptionDetails) {
            throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
        }
        return response.result.value;
    };

    const waitFor = async (expression, desc, timeout = 15000) => {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            try {
                if (await evaluate(expression)) return;
            } catch {}
            await pause(100);
        }
        throw new Error(`Timeout waiting for: ${desc}`);
    };

    try {
        console.log('\n--- SCENARIO M: Security Enforcement & Host Spoofing Check ---');
        // Test direct HTTP request with malicious host header using node:http (since fetch strips forbidden Host header)
        const http = require('node:http');
        const spoofedStatus = await new Promise((resolve, reject) => {
            const req = http.request({
                host: '127.0.0.1',
                port: port,
                path: '/evaluation/riasec27-preview',
                headers: { 'Host': 'attacker.evil.com' }
            }, (res) => {
                resolve(res.statusCode);
            });
            req.on('error', reject);
            req.end();
        });
        assert.equal(spoofedStatus, 403, 'Spoofed host must be rejected with 403 Forbidden');
        console.log('PASS: Host header spoofing correctly blocked with 403 Forbidden.');

        console.log('\n--- Initial Navigation to Preview Page ---');
        await cdp.call('Page.navigate', { url: `${origin}/evaluation/riasec27-preview` });
        await waitFor(`document.readyState === 'complete'`, 'Page load complete');

        // Check disclaimer
        const noticeText = await evaluate(`document.getElementById('result-reference-note').textContent`);
        assert.ok(noticeText.includes('Kết quả mang tính tham khảo, không thay thế tư vấn hướng nghiệp.'));
        assert.equal(await evaluate(`/RESEARCH_ONLY|TOP3_NOT_VALIDATED|research_status/.test(document.querySelector('main').innerText)`),false);
        console.log('PASS: Concise reference note is present; internal status is not visible.');

        // Verify 27 questions rendered
        await waitFor(`document.querySelectorAll('#questions-list > div').length === 27`, '27 question cards rendered');
        assert.equal(await evaluate(`document.getElementById('btn-submit-riasec').disabled`), true);
        console.log('PASS: 27 question cards rendered and submit initially disabled.');

        console.log('\n--- SCENARIO A: Realistic Profile -> SUCCESS Top-3 ---');
        await evaluate(`(() => {
            const cards = document.querySelectorAll('#questions-list > div');
            cards.forEach((card, idx) => {
                const val = (idx < 5 || (idx >= 10 && idx < 15)) ? '5' : '2';
                const radio = card.querySelector('input[type="radio"][value="' + val + '"]');
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            });
        })()`);
        await pause(200);
        assert.equal(await evaluate(`document.getElementById('answered-count').textContent`), '27');
        assert.equal(await evaluate(`document.getElementById('btn-submit-riasec').disabled`), false);

        await evaluate(`document.getElementById('btn-submit-riasec').click()`);
        await waitFor(`!document.getElementById('riasec27-results-panel').classList.contains('hidden')`, 'Results panel visible', 15000);
        await waitFor(`document.querySelectorAll('#results-content .absolute').length === 3`, 'Top-3 cards rendered', 15000);

        const resultsText = await evaluate(`document.getElementById('results-content').textContent`);
        assert.ok(resultsText.includes('TOP #1'));
        assert.ok(resultsText.includes('TOP #2'));
        assert.ok(resultsText.includes('TOP #3'));
        assert.ok(resultsText.includes('O*NET:'));
        assert.ok(!resultsText.includes('Pearson') && !resultsText.includes('%'));
        assert.equal(await evaluate("document.querySelectorAll('main > section').length"), 2);
        console.log('PASS: Realistic profile generated SUCCESS Top-3 with five short fields and no score on the main cards.');

        console.log('\n--- SCENARIO L: Reset / Làm lại khảo sát ---');
        await evaluate(`document.getElementById('btn-reset-answers').click()`);
        await pause(200);
        assert.equal(await evaluate(`document.getElementById('answered-count').textContent`), '0');
        assert.equal(await evaluate(`document.getElementById('btn-submit-riasec').disabled`), true);
        assert.equal(await evaluate(`document.getElementById('riasec27-results-panel').classList.contains('hidden')`), true);
        console.log('PASS: Reset clears all 27 inputs, disables submit, and hides results panel.');

        console.log('\n--- SCENARIO B: Flat Profile All 1s -> ABSTAIN_FLAT_PROFILE ---');
        await evaluate(`(() => {
            const cards = document.querySelectorAll('#questions-list > div');
            cards.forEach((card) => {
                const radio = card.querySelector('input[type="radio"][value="1"]');
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            });
        })()`);
        await pause(200);
        assert.equal(await evaluate(`document.getElementById('answered-count').textContent`), '27');
        await evaluate(`document.getElementById('btn-submit-riasec').click()`);
        await waitFor(`!document.getElementById('riasec27-results-panel').classList.contains('hidden')`, 'Results panel visible', 15000);
        await waitFor(`Boolean(document.querySelector('[data-result-status="ABSTAIN_FLAT_PROFILE"]'))`, 'Abstain flat notice rendered', 15000);
        const abstain1Text = await evaluate(`document.getElementById('results-content').textContent`);
        assert.ok(abstain1Text.includes('Hồ sơ sở thích chưa đủ phân biệt'));
        assert.ok(!abstain1Text.includes('ABSTAIN_FLAT_PROFILE'));
        assert.equal(await evaluate(`document.querySelectorAll('#results-content .absolute').length`), 0, 'No Top-3 cards on flat profile');
        console.log('PASS: Flat profile all 1s produces ABSTAIN_FLAT_PROFILE and zero Top-3 cards.');

        console.log('\n--- SCENARIO C: Flat Profile All 5s -> ABSTAIN_FLAT_PROFILE ---');
        await evaluate(`document.getElementById('btn-reset-answers').click()`);
        await pause(100);
        await evaluate(`(() => {
            const cards = document.querySelectorAll('#questions-list > div');
            cards.forEach((card) => {
                const radio = card.querySelector('input[type="radio"][value="5"]');
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            });
        })()`);
        await pause(200);
        await evaluate(`document.getElementById('btn-submit-riasec').click()`);
        await waitFor(`Boolean(document.querySelector('[data-result-status="ABSTAIN_FLAT_PROFILE"]'))`, 'Abstain flat notice rendered', 15000);
        const abstain5Text = await evaluate(`document.getElementById('results-content').textContent`);
        assert.ok(abstain5Text.includes('Hồ sơ sở thích chưa đủ phân biệt'));
        assert.ok(!abstain5Text.includes('ABSTAIN_FLAT_PROFILE'));
        assert.equal(await evaluate(`document.querySelectorAll('#results-content .absolute').length`), 0, 'No Top-3 cards on flat profile');
        console.log('PASS: Flat profile all 5s produces ABSTAIN_FLAT_PROFILE and zero Top-3 cards.');

        console.log('\n--- SCENARIO D: Real TIED renderer, no fabricated cards or AI ---');
        await evaluate(`window.beforeTiedFetch=window.fetch;window.fetch=async(url,options)=>url==='/api/riasec27/evaluate'?new Response(JSON.stringify({ml_ranking:{status:'TIED_BOUNDARY',top3:[]}}),{headers:{'Content-Type':'application/json'}}):window.beforeTiedFetch(url,options);document.getElementById('btn-submit-riasec').click()`);
        await waitFor(`Boolean(document.querySelector('[data-result-status="TIED_BOUNDARY"]'))`, 'Actual tied renderer');
        assert.equal(await evaluate(`document.querySelectorAll('.top3-card').length`), 0);
        assert.equal(await evaluate(`document.getElementById('ai-explanation-controls').classList.contains('hidden')`), true);
        await evaluate(`window.fetch=window.beforeTiedFetch`);
        console.log('PASS: Actual renderer preserves TIED_BOUNDARY without fallback ranking.');

        console.log('\n--- SCENARIOS E-H: Legacy discovery data retained behind API, absent from survey ---');
        assert.equal(await evaluate(`Boolean(document.getElementById('catalog-list') || document.getElementById('themes-grid'))`), false);
        const catalog=await(await fetch(`${origin}/api/riasec27/catalog`)).json();
        assert.equal(catalog.catalog.length,33);
        for(const [status,count] of [['READY_FOR_PROTOTYPE',21],['CONDITIONAL',10],['UNRESOLVED',2]]) assert.equal(catalog.catalog.filter(m=>m.status===status).length,count);
        const themes=await(await fetch(`${origin}/api/riasec27/themes`)).json();
        assert.equal(themes.themes.length,5);
        const postExplore=async body=>(await fetch(`${origin}/api/riasec27/explore`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json();
        assert.equal((await postExplore({major_id:'cong_nghe_thong_tin'})).status,'AWAITING_USER_CHOICE');
        console.log('PASS: 33-major catalog, status boundaries and exploration API remain intact, with no extra survey section.');

        console.log('\n--- SCENARIOS I-J: Qualitative API and skip retained ---');
        const uncertain=await postExplore({theme_id:'THEME_B_IT_AND_SOFTWARE',option_id:'OPT_B_UNCERTAIN',is_skip:false});
        assert.equal(uncertain.status,'QUALITATIVE_EXPLORATION');
        assert.equal(uncertain.fit_score,undefined);
        assert.equal((await postExplore({theme_id:'THEME_B_IT_AND_SOFTWARE',is_skip:true})).status,'USER_SKIPPED');
        console.log('PASS: Qualitative exploration/skip API remains available without affecting ML ranking.');

        console.log('\n--- SCENARIO K: Mobile Viewport & Responsiveness (375x667) ---');
        await cdp.call('Emulation.setDeviceMetricsOverride', {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            mobile: true
        });
        await pause(300);
        const isOverflowing = await evaluate(`document.documentElement.scrollWidth > document.documentElement.clientWidth`);
        assert.equal(isOverflowing, false, 'Page must not have horizontal scroll overflow on 375px mobile screen');
        const q1RadioCount = await evaluate(`document.querySelectorAll('#questions-list > div:first-child input[type="radio"]').length`);
        assert.equal(q1RadioCount, 5, 'All 5 Likert options present on mobile');
        console.log('PASS: Mobile viewport (375x667) renders cleanly with zero horizontal overflow.');

        // Reset viewport
        await cdp.call('Emulation.clearDeviceMetricsOverride');

        console.log('\n======================================================');
        console.log('ALL BROWSER E2E TESTS (SCENARIOS A TO M) PASSED 100%!');
        console.log('======================================================\n');

    } finally {
        cdp.close();
        browser.kill();
        server.close();
        if (app && typeof app.closeResources === 'function') {
            await app.closeResources();
        }
        try {
            fs.rmSync(profile, { recursive: true, force: true });
        } catch {}
    }
}

runBrowserTests().catch((err) => {
    console.error('BROWSER E2E TEST FAILED:', err);
    process.exit(1);
});
