'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const children = require('node:child_process');
const servicePath = require.resolve('../src/services/riasec27Service');
const service = require(servicePath);
const answers = [5,5,2,5,5,1,1,2,4,2,1,2,5,2,2,4,4,1,3,5,2,2,4,2,4,5,4];

async function withMockWorker(t, chunks, exitCode, run) {
    let spawnOptions;
    t.mock.method(children, 'spawn', (command, args, options) => {
        spawnOptions = options;
        const worker = new EventEmitter();
        worker.stdin = new PassThrough(); worker.stdout = new PassThrough(); worker.stderr = new PassThrough();
        worker.kill = () => {};
        process.nextTick(() => {
            for (const chunk of chunks) worker.stdout.write(chunk);
            worker.stdout.end(); worker.emit('close', exitCode);
        });
        return worker;
    });
    delete require.cache[servicePath];
    const fresh = require(servicePath);
    try { return await run(fresh, () => spawnOptions); }
    finally { require.cache[servicePath].exports = service; t.mock.restoreAll(); }
}

test('hotfix: real Python succeeds without terminal UTF-8 settings and returns six Q5 outputs', async () => {
    const old = { encoding: process.env.PYTHONIOENCODING, utf8: process.env.PYTHONUTF8 };
    delete process.env.PYTHONIOENCODING; delete process.env.PYTHONUTF8;
    try {
        const result = await service.evaluateProfile(answers);
        assert.equal(result.ml_ranking.status, 'SUCCESS');
        assert.deepEqual(Object.keys(result.ml_ranking.ml_probabilities), ['R','I','A','S','E','C']);
        assert.equal(result.ml_ranking.top3.length, 3);
        assert.equal(result.ml_ranking.top3[0].major_name_vi, 'Kỹ thuật điện');
        assert.ok(!JSON.stringify(result).includes('\uFFFD'));
    } finally {
        if(old.encoding===undefined)delete process.env.PYTHONIOENCODING;else process.env.PYTHONIOENCODING=old.encoding;
        if(old.utf8===undefined)delete process.env.PYTHONUTF8;else process.env.PYTHONUTF8=old.utf8;
    }
});

test('hotfix: inherited cp1252 does not corrupt real bridge JSON', async () => {
    const previous = process.env.PYTHONIOENCODING; process.env.PYTHONIOENCODING = 'cp1252';
    try {
        const result = await service.evaluateProfile(answers);
        assert.equal(result.ml_ranking.status, 'SUCCESS');
        assert.equal(result.research_status, 'RESEARCH_ONLY — TOP3_NOT_VALIDATED');
    } finally { if(previous===undefined)delete process.env.PYTHONIOENCODING;else process.env.PYTHONIOENCODING=previous; }
});

test('hotfix: JSON pipe explicitly uses UTF-8 while retaining the parent environment', async t => {
    await withMockWorker(t, [Buffer.from('{"status":"SUCCESS","catalog":[]}')], 0, async (fresh, options) => {
        await fresh.getCatalog();
        assert.equal(options().env.PYTHONIOENCODING, 'utf-8');
        assert.equal(options().shell, false);
        assert.equal(options().windowsHide, true);
        assert.equal(options().env.PATH, process.env.PATH);
    });
});

for (const [status, exitCode, expected] of [['INTERNAL_ERROR',0,'PYTHON_INTERNAL_ERROR'], ['IMPORT_ERROR',1,'PYTHON_IMPORT_ERROR']]) {
    test(`hotfix: ${status} is a controlled error rather than HTTP-success data`, async t => {
        await withMockWorker(t, [Buffer.from(JSON.stringify({status,error:'UnicodeEncodeError',message:'PRIVATE_PATH'}))], exitCode, async fresh => {
            await assert.rejects(fresh.evaluateProfile(answers), error => error.code === expected && !error.message.includes('PRIVATE_PATH'));
        });
    });
}

test('hotfix: model dependency failure receives a safe technical code', async t => {
    await withMockWorker(t, [Buffer.from(JSON.stringify({ml_ranking:{status:'DEPENDENCY_ERROR',message:'PRIVATE_PATH'}}))], 0, async fresh => {
        await assert.rejects(fresh.evaluateProfile(answers), error => error.code==='MODEL_DEPENDENCY_ERROR'&&!error.message.includes('PRIVATE_PATH'));
    });
});

test('hotfix: a nonzero worker exit never becomes a successful result', async t => {
    await withMockWorker(t, [Buffer.from('{"status":"SUCCESS"}')], 1, async fresh => {
        await assert.rejects(fresh.getCatalog(), error => error.code==='PYTHON_EXIT_ERROR');
    });
});

test('hotfix: UTF-8 characters split across stdout chunks decode without replacement characters', async t => {
    const text = JSON.stringify({status:'SUCCESS',catalog:[{name_vi:'Kỹ thuật điện'}]});
    const bytes=Buffer.from(text,'utf8'); const split=bytes.indexOf(Buffer.from('ỹ'))+1;
    await withMockWorker(t, [bytes.subarray(0,split),bytes.subarray(split)], 0, async fresh => {
        assert.deepEqual(await fresh.getCatalog(), JSON.parse(text));
    });
});

test('hotfix: HTTP route reports a bridge failure as 503 with a safe diagnostic code', async t => {
    const app = require('../server');
    const previous = { env: process.env.NODE_ENV, flag: process.env.LABANAI_RIASEC27_PREVIEW };
    process.env.NODE_ENV='development'; process.env.LABANAI_RIASEC27_PREVIEW='true';
    t.mock.method(service, 'evaluateProfile', async () => { throw new service.Riasec27ServiceError('PRIVATE_PATH', 'PYTHON_INTERNAL_ERROR'); });
    const server = await new Promise(resolve => {const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    try {
        const response=await fetch(`http://127.0.0.1:${server.address().port}/api/riasec27/evaluate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers})});
        const result=await response.json();
        assert.equal(response.status,503);assert.equal(result.error,'PYTHON_INTERNAL_ERROR');
        assert.ok(!JSON.stringify(result).includes('PRIVATE_PATH'));
        assert.equal(result.answers,undefined);assert.equal(result.stack,undefined);
    } finally {
        server.closeAllConnections();await new Promise(resolve=>server.close(resolve));t.mock.restoreAll();
        if(previous.env===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous.env;
        if(previous.flag===undefined)delete process.env.LABANAI_RIASEC27_PREVIEW;else process.env.LABANAI_RIASEC27_PREVIEW=previous.flag;
    }
});

test('hotfix: frontend reads safe API codes without exposing backend diagnostics', () => {
    const source=fs.readFileSync(path.join(__dirname,'../public/js/riasec27-preview.js'),'utf8');
    const resultsContent={innerHTML:''};
    const context={resultsContent,resultsPanel:{classList:{remove(){}},scrollIntoView(){}},clearExplanation(){},aiControls:null,aiOpen:null,escapeHtml:value=>String(value??'').replace(/</g,'&lt;')};
    vm.runInNewContext(source.slice(source.indexOf('    function renderResults('),source.indexOf('    // --- SECTION 3:')),context);
    context.renderResults({error:'PYTHON_INTERNAL_ERROR',message:'PRIVATE_PATH'});
    assert.ok(resultsContent.innerHTML.includes('PYTHON_INTERNAL_ERROR'));
    assert.ok(!resultsContent.innerHTML.includes('PRIVATE_PATH'));
    context.renderResults({error:'PRIVATE_PATH<script>',message:'PRIVATE_PATH'});
    assert.ok(resultsContent.innerHTML.includes('RIASEC27_EVALUATION_ERROR'));
    assert.ok(!resultsContent.innerHTML.includes('PRIVATE_PATH'));
});
