// Real Chrome/CDP checks for the shipped preview. Synthetic inputs only, no .env.
'use strict';
require('./safe_test_bootstrap.cjs');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const children = require('node:child_process');
const { once } = require('node:events');
const root = path.resolve(__dirname, '../..');
process.env.NODE_ENV = 'development';
process.env.LABANAI_RIASEC27_PREVIEW = 'true';
const audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'case_audit.json'), 'utf8'));
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync);
assert.ok(chrome, 'A local Chrome or Edge executable is required');
const workerCounts = {};
const originalSpawn = children.spawn;
children.spawn = function(command, args, options) {
    const child = originalSpawn(command, args, options);
    if (args?.some(arg => String(arg).endsWith('riasec27_bridge.py'))) {
        const write = child.stdin.write.bind(child.stdin);
        child.stdin.write = function(chunk, ...rest) {
            const action = JSON.parse(String(chunk)).action;
            workerCounts[action] = (workerCounts[action] || 0) + 1;
            return write(chunk, ...rest);
        };
    }
    return child;
};
const app = require(path.join(root, 'server'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
class Cdp {
    constructor(url) {
        this.socket = new WebSocket(url); this.id = 0; this.pending = new Map();
        this.ready = new Promise((resolve, reject) => {
            this.socket.addEventListener('open', resolve, { once: true });
            this.socket.addEventListener('error', reject, { once: true });
        });
        this.socket.addEventListener('message', ({data}) => {
            const msg = JSON.parse(data), pending = this.pending.get(msg.id);
            if (!pending) return;
            this.pending.delete(msg.id); clearTimeout(pending.timer);
            if (msg.error) pending.reject(new Error(msg.error.message));
            else pending.resolve(msg.result || {});
        });
    }
    async call(method, params = {}) {
        await this.ready; const id = ++this.id;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
            this.pending.set(id, { resolve, reject, timer });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }
}
async function main() {
    const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    assert.equal(server.address().address, '127.0.0.1');
    const origin = `http://127.0.0.1:${server.address().port}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'labanai-b11-browser-'));
    const browser = originalSpawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--disable-component-update', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let cdp;
    const passed = [];
    const pass = name => { passed.push(name); console.log('PASS:', name); };
    try {
        const active = path.join(profile, 'DevToolsActivePort');
        for (let i=0; i<200 && !fs.existsSync(active); i++) await pause(100);
        assert.ok(fs.existsSync(active), 'Browser exposes local CDP');
        const port = Number(fs.readFileSync(active,'utf8').split(/\r?\n/)[0]);
        const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method:'PUT' })).json();
        cdp = new Cdp(target.webSocketDebuggerUrl);
        await cdp.call('Page.enable'); await cdp.call('Runtime.enable');
        const evaluate = async expression => {
            const r = await cdp.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
            if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
            return r.result.value;
        };
        const wait = async (expression, label) => {
            for (let i=0; i<300; i++) { if (await evaluate(expression)) return; await pause(100); }
            throw new Error('Timeout: ' + label);
        };
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
        await cdp.call('Page.navigate', { url: origin + '/evaluation/riasec27-preview' });
        await wait("document.querySelectorAll('#questions-list > div').length === 27", '27 questions');
        await wait("document.querySelectorAll('#catalog-list > div').length === 33", 'catalog');
        await wait("document.querySelectorAll('#themes-grid > div').length === 5", 'themes');
        pass('Real preview renders 27 questions, 33 majors, five themes');
        const fillAndSubmit = async answers => {
            await evaluate(`(() => { const values=${JSON.stringify(answers)}; document.querySelectorAll('#questions-list > div').forEach((card,i)=>{ const radio=card.querySelector('input[value="'+values[i]+'"]'); radio.checked=true; radio.dispatchEvent(new Event('change')); }); document.getElementById('btn-submit-riasec').click(); })()`);
            await wait("document.getElementById('btn-submit-riasec').textContent === 'Gửi tính điểm ML Top-3'", 'inference done');
        };
        const checkNoLeak = async () => {
            const text = await evaluate("document.getElementById('riasec27-results-panel').textContent");
            for (const token of ['Traceback', 'PRIVATE_PATH', 'BAD_SCRIPT', 'model.joblib']) assert.ok(!text.includes(token));
            assert.ok(!/phù hợp\s*\d+[.,]?\d*\s*%/i.test(text));
            assert.ok(!text.includes('xác suất thành công 90%'));
        };
        const first = audit.cases.find(c => c.case_id === 'balanced_small_C:S1');
        assert.ok(first);
        const workerBefore = workerCounts.evaluate || 0;
        await fillAndSubmit(Object.values(first.answers_before));
        assert.equal(workerCounts.evaluate-workerBefore, 1, 'Exactly one bridge evaluation per submission');
        await wait("document.querySelectorAll('.major-ranking-explanation').length === 3", 'explanation cards');
        for (const item of first.fresh_outputs.before.P2.top3) {
            const text = await evaluate("document.getElementById('results-content').textContent");
            assert.ok(text.includes(item.pearson_r.toFixed(4)));
        }
        await evaluate("document.getElementById('top3-process-explanation').open=true; document.querySelectorAll('.major-ranking-explanation').forEach(e=>e.open=true)");
        const processText = await evaluate("document.getElementById('top3-process-explanation').innerText");
        for (const text of ['LabanAI tạo gợi ý như thế nào?', 'Q5', 'Pearson', '21/33', '12 ngành', 'không phải kết luận về năng lực']) assert.ok(processText.includes(text));
        assert.equal(await evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"), false);
        assert.ok(await evaluate("document.getElementById('top3-process-explanation').getBoundingClientRect().width > 0"));
        await checkNoLeak();
        pass('Desktop 1440px: actual audited SUCCESS, native r, three explanations, no overflow');
        await pause(1000); assert.equal(workerCounts.evaluate-workerBefore, 1);
        pass('Opening explanations causes zero extra ML calls');
        for (const width of [375, 320]) {
            await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: true });
            await pause(200);
            if (await evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")) {
                console.log('OVERFLOW_DIAGNOSTIC', await evaluate("({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,elements:Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,15).map(e=>({tag:e.tagName,id:e.id,classes:typeof e.className==='string'?e.className:'svg',right:e.getBoundingClientRect().right,text:e.textContent.trim().slice(0,80)}))})"));
            }
            assert.equal(await evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"), false, `No overflow at ${width}px`);
            const count = await evaluate("document.querySelectorAll('.major-ranking-explanation[open]').length");
            assert.equal(count, 3);
            pass(`Mobile ${width}px: expanded process and industry explanations, no horizontal overflow`);
        }
        const beforeAfter = workerCounts.evaluate;
        await fillAndSubmit(Object.values(first.answers_after));
        assert.equal(workerCounts.evaluate-beforeAfter, 1);
        const textAfter = await evaluate("document.getElementById('results-content').textContent");
        for (const row of first.fresh_outputs.after.P2.top3) assert.ok(textAfter.includes(row.pearson_r.toFixed(4)));
        pass('Second real submission reproduces changed Top-3 using one evaluation');
        await fillAndSubmit(Array(27).fill(3));
        let state = await evaluate("document.getElementById('results-content').textContent");
        assert.ok(state.includes('ABSTAIN_FLAT_PROFILE')); assert.ok(state.includes('không phải lỗi của bạn'));
        assert.equal(await evaluate("document.querySelectorAll('.major-ranking-explanation').length"), 0);
        pass('Real flat input: safe ABSTAIN, no alternative Top-3');
        // Mock only network responses, never insert result HTML: the real submit/render path runs.
        await evaluate("window.b11OriginalFetch=window.fetch; window.b11MockCalls=0; window.fetch=async function(url,options){ if(url==='/api/riasec27/evaluate'){window.b11MockCalls++; if(window.b11NetworkError)throw new Error('PRIVATE_PATH'); return new Response(JSON.stringify(window.b11Fixture),{status:200,headers:{'Content-Type':'application/json'}});} return window.b11OriginalFetch(url,options); }");
        const countBeforeMocks = workerCounts.evaluate;
        for (const status of ['TIED_BOUNDARY', 'ERROR', 'DEPENDENCY_ERROR', 'INTERNAL_ERROR']) {
            await evaluate(`window.b11Fixture=${JSON.stringify({ml_ranking:{status,message:'Traceback PRIVATE_PATH/model.joblib <script>BAD_SCRIPT</script>',top3:first.fresh_outputs.before.P2.top3}})}`);
            await fillAndSubmit(Object.values(first.answers_before));
            state = await evaluate("document.getElementById('results-content').textContent");
            assert.ok(status==='TIED_BOUNDARY' ? state.includes('không phá hòa tùy tiện') : state.includes('Hệ thống chưa thể tạo gợi ý'));
            assert.equal(await evaluate("document.querySelectorAll('.major-ranking-explanation').length"), 0);
            await checkNoLeak();
            pass(`Real renderer handles mocked ${status} without ranking or diagnostics leakage`);
        }
        await evaluate('window.b11NetworkError=true');
        await fillAndSubmit(Object.values(first.answers_before));
        await checkNoLeak(); assert.equal(workerCounts.evaluate, countBeforeMocks);
        pass('Network error is safe; mocked branches cause no Python evaluation');
        await evaluate('window.fetch=window.b11OriginalFetch; delete window.b11Fixture; document.getElementById("btn-reset-answers").click()');
        assert.equal(await evaluate("document.getElementById('riasec27-results-panel').classList.contains('hidden')"), true);
        assert.equal(await evaluate("document.getElementById('answered-count').textContent"), '0');
        assert.equal(await evaluate('localStorage.length + sessionStorage.length'), 0);
        pass('Reset hides explanations and clears answers; no local/session storage');
        console.log(JSON.stringify({ status: 'PASS', passed: passed.length, checks: passed, real_evaluate_workers: workerCounts.evaluate, mock_evaluate_responses: 5 }));
    } finally {
        if (cdp) cdp.socket.close();
        browser.kill();
        await Promise.race([once(browser,'exit').catch(()=>{}), pause(3000)]);
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
        // Delete only this run's unique ephemeral browser directory, after checking bounds.
        const resolved = path.resolve(profile), temporary = path.resolve(os.tmpdir());
        if (path.dirname(resolved) === temporary && path.basename(resolved).startsWith('labanai-b11-browser-')) {
            try { fs.rmSync(resolved, { recursive: true, force: true }); } catch { console.log('Browser profile cleanup deferred: file lock'); }
        }
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
