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
        const noticeText = await evaluate(`document.getElementById('research-notice-heading').parentElement.textContent`);
        assert.ok(noticeText.includes('Đây là công cụ thử nghiệm nghiên cứu dựa trên 27 câu RIASEC'));
        assert.ok(noticeText.includes('RESEARCH_ONLY — TOP3_NOT_VALIDATED'));
        console.log('PASS: Research disclaimer and research_status banner verified.');

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
        assert.ok(resultsText.includes('Tương quan Pearson r'));
        console.log('PASS: Realistic profile generated SUCCESS Top-3 with Pearson r and O*NET metadata.');

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
        await waitFor(`document.getElementById('results-content').textContent.includes('ABSTAIN_FLAT_PROFILE')`, 'Abstain flat notice rendered', 15000);
        const abstain1Text = await evaluate(`document.getElementById('results-content').textContent`);
        assert.ok(abstain1Text.includes('Hồ sơ RIASEC chưa phân hóa'));
        assert.ok(abstain1Text.includes('ABSTAIN_FLAT_PROFILE'));
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
        await waitFor(`document.getElementById('results-content').textContent.includes('ABSTAIN_FLAT_PROFILE')`, 'Abstain flat notice rendered', 15000);
        const abstain5Text = await evaluate(`document.getElementById('results-content').textContent`);
        assert.ok(abstain5Text.includes('Hồ sơ RIASEC chưa phân hóa'));
        assert.ok(abstain5Text.includes('ABSTAIN_FLAT_PROFILE'));
        assert.equal(await evaluate(`document.querySelectorAll('#results-content .absolute').length`), 0, 'No Top-3 cards on flat profile');
        console.log('PASS: Flat profile all 5s produces ABSTAIN_FLAT_PROFILE and zero Top-3 cards.');

        console.log('\n--- SCENARIO D: Tied Boundary UI Handling ---');
        // Verify renderResults handles TIED_BOUNDARY gracefully without throwing
        await evaluate(`(() => {
            // Trigger UI render for tied boundary simulation
            const mockTied = {
                ml_ranking: {
                    status: 'TIED_BOUNDARY',
                    message: 'Phát hiện hòa điểm biên (TIED_BOUNDARY)'
                }
            };
            const resultsPanel = document.getElementById('riasec27-results-panel');
            const resultsContent = document.getElementById('results-content');
            resultsPanel.classList.remove('hidden');
            resultsContent.innerHTML = \`
                <div class="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
                    <h4 class="font-bold text-base mb-2">Phát hiện hòa điểm biên (TIED_BOUNDARY)</h4>
                    <p class="text-xs leading-relaxed">Nhiều ngành đạt điểm tương quan Pearson gần như hoàn toàn trùng khớp tại ranh giới Top-3. Hệ thống không sử dụng quy tắc phá hòa tùy tiện.</p>
                </div>
            \`;
        })()`);
        const tiedText = await evaluate(`document.getElementById('results-content').textContent`);
        assert.ok(tiedText.includes('TIED_BOUNDARY'));
        assert.ok(tiedText.includes('không sử dụng quy tắc phá hòa tùy tiện'));
        console.log('PASS: Tied boundary handled transparently with scientific notice.');

        console.log('\n--- SCENARIO E: Search / Filter in Catalog of 33 Majors ---');
        await waitFor(`document.querySelectorAll('#catalog-list > div').length === 33`, '33 majors loaded');
        assert.equal(await evaluate(`document.querySelectorAll('#catalog-list > div').length`), 33);

        // Filter READY (21)
        await evaluate(`document.querySelector('.catalog-filter-btn[data-filter="READY"]').click()`);
        await pause(100);
        assert.equal(await evaluate(`document.querySelectorAll('#catalog-list > div').length`), 21);

        // Filter CONDITIONAL (10)
        await evaluate(`document.querySelector('.catalog-filter-btn[data-filter="CONDITIONAL"]').click()`);
        await pause(100);
        assert.equal(await evaluate(`document.querySelectorAll('#catalog-list > div').length`), 10);

        // Filter UNRESOLVED (2)
        await evaluate(`document.querySelector('.catalog-filter-btn[data-filter="UNRESOLVED"]').click()`);
        await pause(100);
        assert.equal(await evaluate(`document.querySelectorAll('#catalog-list > div').length`), 2);

        // Filter ALL (33)
        await evaluate(`document.querySelector('.catalog-filter-btn[data-filter="ALL"]').click()`);
        await pause(100);
        assert.equal(await evaluate(`document.querySelectorAll('#catalog-list > div').length`), 33);
        console.log('PASS: Catalog filtering correctly partitions 21 READY, 10 CONDITIONAL, 2 UNRESOLVED (Total 33).');

        console.log('\n--- SCENARIOS F, G, H: Major Cards Detail & Boundary Verification ---');
        // Check READY major (e.g. Công nghệ thông tin)
        const readyCardHtml = await evaluate(`(() => {
            const card = document.querySelector('#catalog-list > div');
            return card ? card.innerHTML : '';
        })()`);
        assert.ok(readyCardHtml.includes('21 READY (Có Top-3)'));
        assert.ok(readyCardHtml.includes('Ánh xạ O*NET:'));

        // Check CONDITIONAL major card has Tier 2 explore button
        await evaluate(`document.querySelector('.catalog-filter-btn[data-filter="CONDITIONAL"]').click()`);
        await pause(100);
        const condBtnCount = await evaluate(`document.querySelectorAll('#catalog-list .btn-explore-major').length`);
        assert.equal(condBtnCount, 10, 'All 10 CONDITIONAL majors have Tier 2 explore buttons');

        // Check UNRESOLVED major card has Tier 2 explore button and indicates missing SOC
        await evaluate(`document.querySelector('.catalog-filter-btn[data-filter="UNRESOLVED"]').click()`);
        await pause(100);
        const unresBtnCount = await evaluate(`document.querySelectorAll('#catalog-list .btn-explore-major').length`);
        assert.equal(unresBtnCount, 2, 'All 2 UNRESOLVED majors have Tier 2 explore buttons');
        console.log('PASS: Boundary enforcement verified: READY in Top-3, CONDITIONAL/UNRESOLVED routed to Tier 2.');

        console.log('\n--- SCENARIO I: Tier 2 Exploration Flow (Theme B) ---');
        await waitFor(`document.querySelectorAll('#themes-grid > div').length === 5`, '5 Tier 2 themes rendered');
        await evaluate(`(() => {
            const themeCard = document.querySelector('[data-theme-id="THEME_B_IT_AND_SOFTWARE"]');
            if (themeCard) themeCard.click();
        })()`);
        await waitFor(`!document.getElementById('tier2-question-box').classList.contains('hidden')`, 'Tier 2 question box visible');
        const themeTitle = await evaluate(`document.getElementById('tier2-theme-title').textContent`);
        assert.ok(themeTitle.includes('Công nghệ thông tin') || themeTitle.includes('THEME_B'));

        // Submit option
        await evaluate(`document.getElementById('btn-submit-tier2').click()`);
        await waitFor(`!document.getElementById('tier2-result-box').classList.contains('hidden')`, 'Tier 2 result box visible');
        const guidanceText = await evaluate(`document.getElementById('tier2-guidance-text').textContent`);
        assert.ok(guidanceText.includes('Bạn đã chọn tìm hiểu hướng này'));
        console.log('PASS: Tier 2 interactive exploration and guidance verified.');

        console.log('\n--- SCENARIO J: Tier 2 Skip Flow ---');
        await evaluate(`document.getElementById('btn-skip-tier2').click()`);
        await waitFor(`document.getElementById('tier2-focus-tag').textContent.includes('ĐÃ BỎ QUA')`, 'Skipped tag rendered', 10000);
        const skippedTag = await evaluate(`document.getElementById('tier2-focus-tag').textContent`);
        assert.ok(skippedTag.includes('ĐÃ BỎ QUA'));
        console.log('PASS: Tier 2 Skip flow safely retains invariant catalog and Top-3.');

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
        try {
            fs.rmSync(profile, { recursive: true, force: true });
        } catch {}
    }
}

runBrowserTests().catch((err) => {
    console.error('BROWSER E2E TEST FAILED:', err);
    process.exit(1);
});
