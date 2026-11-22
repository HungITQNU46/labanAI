/* Real Chrome/CDP integration checks; no browser package, data writes or training.
 * Start the existing app on localhost:3000, then run: node tests/ml-browser.cjs
 * Browser automation uses only Node's built-in fetch/WebSocket and local Chrome.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = process.env.ML_BROWSER_URL || 'http://localhost:3000';
const REPORTS = path.join(ROOT, 'data', 'ml_pipeline', 'reports');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const PREFIX = `f54_phase1b_2026-11-14.browser-${RUN_ID}`;
const REPORT_PATH = path.join(REPORTS, `${PREFIX}.json`);
const CHROME_CANDIDATES = [process.env.ML_BROWSER_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
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
                clearTimeout(timer); this.pending.delete(message.id);
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
            const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
            this.pending.set(id, { resolve, reject, timer });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }
    on(method, listener) {
        const listeners = this.listeners.get(method) || [];
        listeners.push(listener); this.listeners.set(method, listeners);
    }
    close() { this.socket.close(); }
}

const report = {
    task_date: '2026-11-14', run_id: RUN_ID,
    scope: 'REAL_LOCAL_CHROME_HEADLESS_CDP_NO_NEW_PACKAGES',
    origin: ORIGIN, browser_executable: CHROME || null,
    cases: [], network_requests: [], console_errors: [], network_failures: [], screenshots: [],
    no_training: true, no_database_connection_or_write: true,
    test_answers_are_synthetic_and_not_added_to_dataset: true,
    status: 'RUNNING'
};
let browser;
let profile;
let cdp;
let caseName = 'startup';
let chromeStderr = '';
const protectedPaths = [
    'src/models/f54Questionnaire.js', 'src/controllers/evaluationController.js', 'package.json', 'package-lock.json',
    'data_AI_1000_rows.xlsx', 'data/ml_pipeline/artifacts/f54_centroid_full1000_v1.json',
    'data/ml_pipeline/artifacts/f54_centroid_full1000_v1.manifest.json',
    'data/ml_pipeline/configs/major_family_mapping.proposed.json',
    'public/js/ml-research.js', 'public/js/evaluation.js',
    'src/views/partials/ml-research.ejs', 'src/views/pages/evaluation.ejs'
];
const beforeHashes = Object.fromEntries(protectedPaths.map((relative) => [relative, sha256(fs.readFileSync(path.join(ROOT, relative)))]));

async function evaluate(expression) {
    const response = await cdp.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
}
async function waitFor(expression, description, timeout = 20000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
        try { if (await evaluate(expression)) return; } catch { /* Navigating can briefly destroy the JS context. */ }
        await pause(100);
    }
    throw new Error(`Browser wait failed: ${description}`);
}
async function runCase(name, callback) {
    caseName = name;
    const start = Date.now();
    try {
        const detail = await callback();
        report.cases.push({ name, status: 'PASS', processing_ms: Date.now() - start, ...detail });
        console.log(`PASS browser: ${name}`);
        return detail;
    } catch (error) {
        report.cases.push({ name, status: 'FAIL', processing_ms: Date.now() - start, error: error.message });
        console.log(`FAIL browser: ${name}: ${error.message}`);
        throw error;
    }
}
function posts() { return report.network_requests.filter((request) => request.method === 'POST' && request.path === '/api/ml/recommendations'); }
async function formSnapshot() {
    return evaluate(`(() => ({
        status:document.getElementById('ml-f54-status').textContent,
        state:document.getElementById('ml-f54-status').dataset.state,
        summary:document.getElementById('ml-f54-summary').textContent,
        busy:document.getElementById('ml-f54-form').getAttribute('aria-busy'),
        disabled:document.getElementById('ml-f54-submit').disabled,
        page:document.getElementById('ml-f54-page').textContent,
        progress:document.getElementById('ml-f54-progress').value,
        current_checked:document.querySelectorAll('#ml-f54-questions .f54-radio:checked').length,
        results_hidden:document.getElementById('ml-f54-result-panel').hidden,
        rows:Array.from(document.querySelectorAll('#ml-f54-results > li'),e=>e.textContent)
    }))()`);
}
async function clickControl(selector) {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
    await pause(40);
    const point=await evaluate(`(() => {
        const element=document.querySelector(${JSON.stringify(selector)}),r=element.getBoundingClientRect();
        const x=r.left+r.width/2,y=r.top+r.height/2;
        return {x,y,unobscured:document.elementFromPoint(x,y)?.closest(${JSON.stringify(selector)})===element,disabled:element.disabled};
    })()`);
    assert.equal(point.unobscured,true,`${selector} must not be obscured`);
    assert.equal(point.disabled,false,`${selector} must be enabled`);
    await cdp.call('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
    await cdp.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
}
async function resetSurvey() {
    await clickControl('#ml-f54-reset');
    await waitFor("document.getElementById('ml-f54-progress').value===0 && document.getElementById('ml-f54-page').textContent.includes('Trang 1/9')",'survey reset');
    const view=await formSnapshot();
    assert.equal(view.current_checked,0);assert.equal(view.rows.length,0);assert.equal(view.results_hidden,true);
}
async function fillPage(answers) {
    const page=await evaluate(`(() => {
        const bank=JSON.parse(document.getElementById('f54-data').textContent);
        return Array.from(document.querySelectorAll('#ml-f54-questions > fieldset'),e=>({id:e.dataset.questionId,text:e.querySelector('legend').textContent,
            original:bank.questions.find(q=>q.question_id===e.dataset.questionId).question_text}));
    })()`);
    assert.equal(page.length,6);
    for(const question of page) assert.equal(question.text,question.original,'Original wording must be unchanged');
    const last=page.at(-1);const lastValue=answers[Number(last.id.slice(1))-1];
    // A native pointer click on every page verifies the rendered choices are usable.
    await clickControl(`#f54-${last.id}-${lastValue}`);
    const selections=page.slice(0,-1).reverse().map(q=>({id:q.id,value:answers[Number(q.id.slice(1))-1]}));
    await evaluate(`(() => {for(const item of ${JSON.stringify(selections)}) document.getElementById('f54-'+item.id+'-'+item.value).click();})()`);
}
async function fillSurvey(answers,checkBack=false) {
    await resetSurvey();
    for(let page=0;page<9;page++) {
        await fillPage(answers);
        assert.equal((await formSnapshot()).progress,(page+1)*6);
        if(page<8) {
            await clickControl('#ml-f54-next');
            await waitFor(`document.getElementById('ml-f54-page').textContent.includes('Trang ${page+2}/9')`,'next questionnaire page');
            if(page===0 && checkBack) {
                await clickControl('#ml-f54-prev');
                const selected=await evaluate("Array.from(document.querySelectorAll('#ml-f54-questions .f54-radio:checked'),e=>({id:e.dataset.questionId,value:Number(e.value)}))");
                assert.equal(selected.length,6);
                for(const item of selected) assert.equal(item.value,answers[Number(item.id.slice(1))-1]);
                await clickControl('#ml-f54-next');
            }
        }
    }
    const final=await formSnapshot();assert.equal(final.progress,54);assert.equal(final.disabled,false);
    assert.match(final.page,/Trang 9\/9/);
}
async function submitCurrent(answers,topK=3) {
    const startCount=posts().length;
    await evaluate(`document.getElementById('ml-f54-top-k').value=${JSON.stringify(String(topK))};document.getElementById('ml-f54-top-k').dispatchEvent(new Event('input',{bubbles:true}));`);
    await clickControl('#ml-f54-submit');
    await waitFor(`document.querySelectorAll('#ml-f54-results > li').length===${topK} && !document.getElementById('ml-f54-submit').disabled`,'real API results rendered');
    const deadline=Date.now()+10000;
    while(Date.now()<deadline && !(posts().length>startCount && posts().at(-1).response)) await pause(30);
    assert.equal(posts().length,startCount+1);
    const request=posts().at(-1);assert.equal(request.http_status,200);assert.equal(request.element_count,54);
    assert.equal(request.answers_sha256,sha256(JSON.stringify(answers)),'q1..q54 payload must preserve the selected numeric order');
    const view=await formSnapshot();assert.equal(view.results_hidden,false);assert.equal(view.rows.length,topK);
    request.response.recommendations.forEach((item,index)=>{
        assert.ok(view.rows[index].includes(item.major_name));assert.ok(view.rows[index].includes(item.major_code));
        assert.ok(view.rows[index].includes(item.similarity_score.toFixed(2)+'/100'));assert.match(view.rows[index],/Điểm tương đồng/);
    });
    assert.ok(view.summary.includes(request.response.model_version));assert.ok(view.summary.includes('Top-'+topK));
    return {request,view};
}
async function screenshot(label) {
    const result = await cdp.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const filename = path.join(REPORTS, `${PREFIX}.${label}.png`);
    fs.writeFileSync(filename, Buffer.from(result.data, 'base64'), { flag: 'wx' });
    report.screenshots.push(path.relative(ROOT, filename).split(path.sep).join('/'));
}
async function navigate(route) {
    await cdp.call('Page.navigate', { url: ORIGIN + route });
    await waitFor("document.readyState==='complete' && typeof checkLoginState==='function'", `page ${route}`, 45000);
}
async function cleanup() {
    if (cdp) {
        try { await cdp.call('Browser.close'); } catch { /* Browser closes its transport before replying on some versions. */ }
        cdp.close();
    }
    if (browser && browser.exitCode === null) {
        await Promise.race([new Promise((resolve) => browser.once('exit', resolve)), pause(3000)]);
        if (browser.exitCode === null) browser.kill();
    }
    if (profile && fs.existsSync(profile)) {
        const resolved = fs.realpathSync(profile);
        const temp = fs.realpathSync(os.tmpdir());
        // This is the exact isolated profile created by this process, never a user's browser profile.
        if (path.dirname(resolved) !== temp || !path.basename(resolved).startsWith('labanai-f54-browser-')) {
            throw new Error('Refusing cleanup of a profile outside the verified temporary directory');
        }
        await pause(200);
        fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
        report.isolated_profile_removed = !fs.existsSync(profile);
    }
}

async function main() {
    if (!CHROME) throw new Error('No existing Chrome/Edge executable; no package will be installed');
    const status = await fetch(`${ORIGIN}/api/ml/status`);
    assert.equal(status.status, 200, 'Start the existing Express app before browser QA');
    profile = fs.mkdtempSync(path.join(os.tmpdir(), 'labanai-f54-browser-'));
    browser = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--disable-background-networking', '--disable-component-update', '--disable-sync',
        '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    browser.stderr.on('data', (chunk) => { chromeStderr = (chromeStderr + chunk.toString()).slice(-6000); });
    browser.on('error', (error) => { chromeStderr += error.message; });
    const activePort = path.join(profile, 'DevToolsActivePort');
    const deadline = Date.now() + 20000;
    while (!fs.existsSync(activePort) && Date.now() < deadline) await pause(100);
    if (!fs.existsSync(activePort)) throw new Error(`Chrome did not expose CDP: ${chromeStderr.slice(-1000)}`);
    const port = Number(fs.readFileSync(activePort, 'utf8').split(/\r?\n/)[0]);
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.ready;
    report.browser_version = await cdp.call('Browser.getVersion');
    await Promise.all(['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable'].map((method) => cdp.call(method)));
    const network = new Map();
    cdp.on('Network.requestWillBeSent', (event) => {
        const request = event.request;
        const record = { request_id: event.requestId, case: caseName, method: request.method,
            path: new URL(request.url).pathname, url: request.url, started_at: event.timestamp };
        if (request.method === 'POST' && record.path === '/api/ml/recommendations') {
            try {
                const payload = JSON.parse(request.postData || 'null');
                record.element_count = Array.isArray(payload?.answers) ? payload.answers.length : 0;
                record.distinct_value_count = Array.isArray(payload?.answers) ? new Set(payload.answers).size : 0;
                record.payload_sha256 = sha256(request.postData || '');
                record.answers_sha256 = sha256(JSON.stringify(payload?.answers ?? null));
                record.top_k = payload?.top_k;
            } catch { record.invalid_json = true; }
        }
        network.set(event.requestId, record);
        if (record.path === '/api/ml/recommendations') report.network_requests.push(record);
    });
    cdp.on('Network.responseReceived', (event) => {
        const record = network.get(event.requestId);
        if (record) { record.http_status = event.response.status; record.mime_type = event.response.mimeType; }
    });
    cdp.on('Network.loadingFinished', (event) => {
        const record = network.get(event.requestId);
        if (record?.path === '/api/ml/recommendations') {
            record.processing_ms = (event.timestamp - record.started_at) * 1000;
            cdp.call('Network.getResponseBody', { requestId: event.requestId }).then((response) => {
                const body = response.base64Encoded ? Buffer.from(response.body, 'base64').toString('utf8') : response.body;
                const data = JSON.parse(body);
                // Response contains derived results only; raw request bodies are deliberately not retained.
                record.response = data;
                record.output_sha256 = sha256(body);
            }).catch((error) => { record.response_capture_error = error.message; });
        }
    });
    cdp.on('Network.loadingFailed', (event) => {
        const record = network.get(event.requestId);
        report.network_failures.push({ case: caseName, url: record?.url || null,
            error: event.errorText, blocked_reason: event.blockedReason || null });
    });
    cdp.on('Runtime.exceptionThrown', (event) => {
        report.console_errors.push({ case: caseName, message: event.exceptionDetails.exception?.description || event.exceptionDetails.text });
    });
    cdp.on('Log.entryAdded', ({ entry }) => {
        if (entry.level === 'error') report.console_errors.push({ case: caseName, source: entry.source, message: entry.text, url: entry.url || null });
    });
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });

    await runCase('main_F54_load_and_existing_demo_login',async()=>{
        await navigate('/');
        await evaluate("openAuthModal();document.querySelector('#form-login input[type=email]').value='qa@example.invalid';document.querySelector('#form-login input[type=password]').value='browser-qa-only';document.querySelector('#form-login button[type=submit]').click()");
        await waitFor("document.readyState==='complete' && localStorage.getItem('isLoggedIn')==='true'",'existing mock login');
        await navigate('/evaluation');
        await waitFor("document.querySelectorAll('#ml-f54-questions > fieldset').length===6",'F54 first page');
        const bank=await evaluate("JSON.parse(document.getElementById('f54-data').textContent)");
        assert.equal(bank.questions.length,54);assert.equal(bank.questionnaire_version,'F54-v1');
        assert.equal(sha256(bank.questions.map(q=>q.question_text).join('\x1f')),'75592454c37c9a3306f22bdec34a98cb016c36fb1e58147c3f39edcf7c29744f');
        assert.deepEqual(bank.questions.map(q=>q.question_id),Array.from({length:54},(_,i)=>'q'+(i+1)));
        assert.equal(await evaluate("document.getElementById('holland-survey-panel').open"),false);
        assert.equal(await evaluate("getComputedStyle(document.getElementById('bottom-nav-bar')).display"),'none');
        const initial=await formSnapshot();assert.equal(initial.current_checked,0);assert.equal(initial.progress,0);assert.equal(initial.rows.length,0);
        await evaluate("document.getElementById('ml-research-panel').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-10)");
        await screenshot('desktop-questions');
        return {questionnaire_version:bank.questionnaire_version,question_count:54,pages:9,first_page_questions:6,default_answers:0,holland_separate:true};
    });
    await runCase('incomplete_answers_never_send_request',async()=>{
        const before=posts().length;
        await clickControl('#ml-f54-next');
        let view=await formSnapshot();assert.match(view.page,/Trang 1\/9/);assert.match(view.status,/còn thiếu/);
        await evaluate("document.getElementById('ml-f54-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
        await pause(100);view=await formSnapshot();assert.equal(posts().length,before);assert.equal(view.progress,0);assert.equal(view.disabled,true);
        return {request_count:0,no_defaults:true,validation_message:view.status};
    });
    const fixtures=[['A_all_1',Array(54).fill(1)],['B_all_3',Array(54).fill(3)],['C_all_5',Array(54).fill(5)],
        ['D_alternating_1_5',Array.from({length:54},(_,i)=>i%2?5:1)],
        ['E_first27_5_last27_1',[...Array(27).fill(5),...Array(27).fill(1)]],
        ['F_first27_1_last27_5',[...Array(27).fill(1),...Array(27).fill(5)]]];
    const results=[];
    for(const [name,answers] of fixtures) {
        results.push(await runCase(name+'_full_9page_questionnaire',async()=>{
            await fillSurvey(answers,true);
            const result=await submitCurrent(answers,3);
            if(name==='D_alternating_1_5') {
                await evaluate("document.getElementById('ml-f54-result-panel').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-20)");
                await screenshot('desktop-results');
            }
            return {payload_sha256:result.request.payload_sha256,answers_sha256:result.request.answers_sha256,element_count:54,
                distinct_value_count:result.request.distinct_value_count,progress:54,back_navigation_retains_answers:true,
                recommendations:result.request.response.recommendations,rendered_text:result.view.rows};
        }));
    }
    await runCase('cosine_invariance_and_different_shape_results',async()=>{
        assert.deepEqual(results[0].recommendations,results[1].recommendations);assert.deepEqual(results[0].recommendations,results[2].recommendations);
        assert.notDeepEqual(results[3].recommendations,results[4].recommendations);assert.notDeepEqual(results[4].recommendations,results[5].recommendations);
        return {A_B_C_scale_invariant:true,D_E_F_new_payload_new_results:true};
    });
    await runCase('repeat_payload_and_top5_use_real_response',async()=>{
        const same=await submitCurrent(fixtures[5][1],3);assert.deepEqual(same.request.response.recommendations,results[5].recommendations);
        const top5=await submitCurrent(fixtures[5][1],5);assert.deepEqual(top5.request.response.recommendations.slice(0,3),results[5].recommendations);
        return {deterministic:true,top5_count:5};
    });
    await runCase('invalid_top_k_does_not_send',async()=>{
        const before=posts().length;
        await evaluate("document.getElementById('ml-f54-top-k').value='34';document.getElementById('ml-f54-top-k').dispatchEvent(new Event('input',{bubbles:true}))");
        await clickControl('#ml-f54-submit');const view=await formSnapshot();assert.equal(posts().length,before);assert.equal(view.state,'error');
        await evaluate("document.getElementById('ml-f54-top-k').value='3';document.getElementById('ml-f54-top-k').dispatchEvent(new Event('input',{bubbles:true}))");
        return {request_count:0,validation_message:view.status};
    });
    await runCase('loading_and_duplicate_submission_guard',async()=>{
        const paused=[];
        cdp.on('Fetch.requestPaused',event=>paused.push(event.requestId));
        await cdp.call('Fetch.enable',{patterns:[{urlPattern:'*api/ml/recommendations',requestStage:'Request'}]});
        const before=posts().length;
        await clickControl('#ml-f54-submit');
        await evaluate("document.getElementById('ml-f54-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));document.getElementById('ml-f54-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
        const end=Date.now()+5000;while(!paused.length && Date.now()<end)await pause(30);
        const loading=await formSnapshot();
        assert.equal(loading.busy,'true');assert.equal(loading.disabled,true);
        assert.equal(await evaluate("document.getElementById('ml-f54-reset').disabled && Array.from(document.querySelectorAll('#ml-f54-questions input')).every(e=>e.disabled)"),true);
        assert.equal(paused.length,1);
        for(const requestId of paused)await cdp.call('Fetch.continueRequest',{requestId});
        await cdp.call('Fetch.disable');
        await waitFor("!document.getElementById('ml-f54-submit').disabled && document.querySelectorAll('#ml-f54-results > li').length===3",'pending request completed');
        assert.equal(posts().length,before+1);return {pending_guard:true,requests_sent:1};
    });
    await runCase('reset_clears_previous_answers_and_results',async()=>{
        const before=posts().length;await resetSurvey();const view=await formSnapshot();
        assert.equal(posts().length,before);assert.equal(view.summary,'');assert.equal(view.disabled,true);
        return {progress:0,selected_defaults:0,results:0,request_count:0};
    });
    await runCase('mobile_375_full_questionnaire_and_results',async()=>{
        await cdp.call('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:true});await pause(350);
        await evaluate("document.getElementById('ml-research-panel').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-12)");
        await screenshot('mobile-375-questions');
        await fillSurvey(fixtures[4][1],true);const actual=await submitCurrent(fixtures[4][1],3);
        const geometry=await evaluate("({viewport:innerWidth,document_width:document.documentElement.scrollWidth,sidebar_right:document.getElementById('sidebar').getBoundingClientRect().right})");
        assert.equal(geometry.viewport,375);assert.ok(geometry.document_width<=376);assert.ok(geometry.sidebar_right<=1);
        await evaluate("document.getElementById('ml-f54-result-panel').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-30)");
        await screenshot('mobile-375-results');
        return {...geometry,pages_completed:9,answers_sent:54,rendered_top3:actual.request.response.recommendations};
    });
    await runCase('refresh_has_no_old_answers_or_fake_results',async()=>{
        await cdp.call('Page.reload',{ignoreCache:true});
        await waitFor("document.readyState==='complete' && document.querySelectorAll('#ml-f54-questions > fieldset').length===6",'fresh survey');
        const view=await formSnapshot();assert.equal(view.progress,0);assert.equal(view.current_checked,0);assert.equal(view.rows.length,0);
        return {answers:0,results:0,page:1};
    });
    await runCase('Holland60_remains_separate_and_unchanged',async()=>{
        await cdp.call('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
        await evaluate("document.getElementById('holland-survey-panel').open=true");
        const before=posts().length;
        const questions=await evaluate("JSON.parse(document.getElementById('holland-data').textContent).map(q=>({id:q.id,type:q.type}))");
        assert.equal(questions.length,60);assert.equal(new Set(questions.map(q=>q.id)).size,60);
        assert.equal(await evaluate("document.querySelectorAll('#questions-container .eval-radio').length"),300);
        await clickControl('#btn-next');
        await waitFor("!document.getElementById('step-2').classList.contains('hidden')",'Holland step2');
        await evaluate("const qs=JSON.parse(document.getElementById('holland-data').textContent);document.querySelector('input[name=\"'+qs[0].id+'\"][value=\"2\"]').click();document.querySelector('input[name=\"'+qs[59].id+'\"][value=\"4\"]').click()");
        assert.equal(await evaluate("document.getElementById('q-progress').textContent"),'2');
        await clickControl('#btn-submit');
        await waitFor("!document.getElementById('step-3').classList.contains('hidden')",'Holland demo results');
        assert.match(await evaluate("document.getElementById('step-3').innerText"),/demo|minh họa/i);
        assert.equal(posts().length,before);
        assert.equal((await formSnapshot()).progress,0);
        await resetSurvey();assert.equal(await evaluate("document.querySelectorAll('.eval-radio:checked').length"),2);
        await evaluate("document.getElementById('holland-survey-panel').open=false");
        return {questions:60,radio_options:300,holland_selected:2,F54_posts:0,F54_reset_preserves_Holland_answers:true};
    });
    report.status = 'PASS';
}

main().catch((error) => {
    report.status = 'FAIL'; report.error = error.message;
    process.exitCode = 1;
}).finally(async () => {
    try { await cleanup(); } catch (error) { report.cleanup_error = error.message; process.exitCode = 1; report.status = 'FAIL'; }
    const changed = protectedPaths.filter((relative) => sha256(fs.readFileSync(path.join(ROOT, relative))) !== beforeHashes[relative]);
    report.protected_files_unchanged = changed.length === 0;
    report.changed_protected_files = changed;
    if (changed.length) { report.status = 'FAIL'; process.exitCode = 1; }
    report.browser_closed = !browser || browser.exitCode !== null;
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(`Browser evidence: ${path.relative(ROOT, REPORT_PATH)}`);
});
