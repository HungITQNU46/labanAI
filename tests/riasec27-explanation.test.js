'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/grokExplanation');
const { createExplanationService, ExplanationError } = service;
const mlService = require('../src/services/riasec27Service');
const answers = [5,5,2,5,5,1,1,2,4,2,1,2,5,2,2,4,4,1,3,5,2,2,4,2,4,5,4];
let ml;
const config = () => ({provider:'groq',apiKey:'gsk_synthetic-test-key',model:'configured-test-model'});
function outputFor(context) {
    return {explanations:context.majors.map(m=>({major_id:m.major_id,rank:m.rank,
        reason:'Hồ sơ tham chiếu được đối chiếu với sở thích đã tổng hợp; chưa đủ thông tin để giải thích một nguyên nhân cụ thể.',
        explore:'Bạn có thể tìm hiểu nhiệm vụ của nghề đại diện và trao đổi với người tư vấn.'
    })),limitations:'Kết quả định hướng nghiên cứu, chưa được kiểm chứng và không thay thế tư vấn hướng nghiệp.'};
}
function responseFor(output) {
    return new Response(JSON.stringify({object:'chat.completion',model:'configured-test-model',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(output)}}]}),{status:200});
}
function fakeProvider(capture=[], transform=value=>value) {
    return async (url,options)=>{const body=JSON.parse(options.body);const context=JSON.parse(body.messages[1].content);capture.push({url,options,body,context});return responseFor(transform(outputFor(context)));};
}
before(async()=>{process.env.NODE_ENV='development';process.env.LABANAI_RIASEC27_PREVIEW='true';ml=(await mlService.evaluateProfile(answers)).ml_ranking;assert.equal(ml.status,'SUCCESS');});

test('explanation: only actual SUCCESS READY results get an expiring context',()=>{
    const s=createExplanationService();
    assert.equal(s.mintContext({status:'ABSTAIN_FLAT_PROFILE',top3:[]}),null);
    assert.equal(s.mintContext({status:'TIED_BOUNDARY',top3:[]}),null);
    const invalid=structuredClone(ml);invalid.top3[0].major_id='OUTSIDE_POOL';
    assert.throws(()=>s.mintContext(invalid),ExplanationError);
    assert.equal(typeof s.mintContext(ml),'string');
});
test('explanation: no configured key/model returns AI_NOT_CONFIGURED without provider fetch',async()=>{
    const s=createExplanationService({config:()=>({provider:'groq'}),fetchImpl:()=>{throw new Error('Must not call provider');}});
    await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='AI_NOT_CONFIGURED');
});
test('explanation: explicit consent required; extra raw answers and arbitrary majors rejected',async()=>{
    const s=createExplanationService({config,fetchImpl:()=>{throw new Error('Must not call provider');}}),token=s.mintContext(ml);
    for(const body of [{context_token:token,consent:false},{context_token:token},{context_token:token,consent:true,answers},{context_token:token,consent:true,top3:ml.top3}])
        await assert.rejects(s.explain(body),e=>e.code==='INVALID_EXPLANATION_INPUT');
});
test('explanation: forged token cannot replace the ranked majors',async()=>{
    const s=createExplanationService({config,fetchImpl:fakeProvider()}),token=s.mintContext(ml);
    const [id,sig]=token.split('.');
    const forged=(id[0]==='a'?'b':'a')+id.slice(1)+'.'+sig;
    await assert.rejects(s.explain({context_token:forged,consent:true}),e=>e.code==='INVALID_CONTEXT');
});
test('explanation: context expires after ten minutes and cannot survive a signing-key restart',async()=>{
    let time=1000000;const s=createExplanationService({now:()=>time,config,fetchImpl:fakeProvider()}),token=s.mintContext(ml);
    time+=600001;
    await assert.rejects(s.explain({context_token:token,consent:true}),e=>e.code==='CONTEXT_EXPIRED');
    await assert.rejects(createExplanationService({config}).explain({context_token:token,consent:true}),e=>e.code==='INVALID_CONTEXT');
});

test('grok module: compatibility import resolves to the same singleton',()=>{
    assert.equal(require('../src/services/riasec27ExplanationService'),service);
});
test('grok module: bounded RAM contexts evict oldest, retain no raw answers and are immutable',()=>{
    const {createContextStore}=require('../src/services/grokExplanation/explanationContext');
    const store=createContextStore({maxContexts:2});
    const first=store.mintContext(ml),second=store.mintContext(ml),third=store.mintContext(ml);
    assert.deepEqual(store.stats(),{count:2,capacity:2,ttlMs:600000});
    assert.throws(()=>store.verifyContext(first),e=>e.code==='CONTEXT_EXPIRED');
    const context=store.verifyContext(second);
    assert.ok(Object.isFrozen(context)&&Object.isFrozen(context.majors[0]));
    assert.ok(!Object.hasOwn(context,'answers'));
    assert.throws(()=>{context.majors[0].rank=9;},TypeError);
    assert.ok(store.verifyContext(third));store.clear();assert.equal(store.stats().count,0);
});
test('grok module: expired contexts are removed by timer without another request',async()=>{
    const {createContextStore}=require('../src/services/grokExplanation/explanationContext');
    const store=createContextStore({ttlMs:10,now:()=>1000}),token=store.mintContext(ml);
    await new Promise(resolve=>setTimeout(resolve,30));
    assert.equal(store.stats().count,0);
    assert.throws(()=>store.verifyContext(token),e=>e.code==='CONTEXT_EXPIRED');
});
test('Groq: xAI keys and incomplete configuration are rejected without provider calls',async()=>{
    for(const settings of [{...config(),apiKey:'xai_synthetic'},{...config(),model:''},{...config(),apiKey:'bad key'}]){
        const s=createExplanationService({config:()=>settings,fetchImpl:()=>{throw Error('Must not fetch');}});
        await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='AI_NOT_CONFIGURED');
    }
});
test('grok module: changed major id or rank is rejected at its exact array position',async()=>{
    for(const change of [out=>{out.explanations[1].major_id='FAKE';return out;},out=>{out.explanations[1].rank=99;return out;}]){
        const s=createExplanationService({config,fetchImpl:fakeProvider([],change)});
        await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='PROVIDER_RANKING_MISMATCH');
    }
});
test('grok module: schema locks each major id and rank and requires exactly three entries',()=>{
    const {createContextStore}=require('../src/services/grokExplanation/explanationContext');
    const {buildGroqRequest}=require('../src/services/grokExplanation/explanationPrompt');
    const {responseSchema}=require('../src/services/grokExplanation/explanationValidator');
    const store=createContextStore(),context=store.verifyContext(store.mintContext(ml));
    const schema=responseSchema(context.majors),request=buildGroqRequest(context,'configured-test-model');
    assert.ok(request.messages[0].content.includes(JSON.stringify(schema)));
    const array=schema.properties.explanations;
    assert.equal(array.minItems,3);assert.equal(array.maxItems,3);
    assert.deepEqual(array.prefixItems.map(e=>[e.properties.major_id.const,e.properties.rank.const]),ml.top3.map(m=>[m.major_id,m.rank]));
    store.clear();
});
test('grok module: grade/admission claims or missing research limitation are rejected',async()=>{
    for(const change of [out=>{out.explanations[0].reason='Điểm học tập của bạn đạt 9 và khả năng trúng tuyển rất cao.';return out;},out=>({...out,limitations:'Bạn có thể chọn ngay một trong ba ngành này.'})]){
        const s=createExplanationService({config,fetchImpl:fakeProvider([],change)});
        await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>['PROVIDER_UNSAFE_RESPONSE','PROVIDER_INVALID_RESPONSE'].includes(e.code));
    }
});
test('grok module: a context expiring during provider request cannot display a response',async()=>{
    let time=1000;
    const s=createExplanationService({now:()=>time,contextTtlMs:100,config,fetchImpl:async(url,options)=>{
        const context=JSON.parse(JSON.parse(options.body).messages[1].content);time+=101;return responseFor(outputFor(context));
    }});
    await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='CONTEXT_EXPIRED');
});
test('grok module: direct service access also fails closed outside development preview',async()=>{
    const old=process.env.NODE_ENV;
    try{
        process.env.NODE_ENV='production';
        const s=createExplanationService({config,fetchImpl:()=>{throw Error('Must not fetch');}});
        await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='AI_PREVIEW_DISABLED');
    }finally{process.env.NODE_ENV=old;}
});
test('Groq: sends minimal aggregate context to Chat Completions with JSON mode, no storage or key in body',async()=>{
    const calls=[],s=createExplanationService({config,fetchImpl:fakeProvider(calls)});
    const result=await s.explain({context_token:s.mintContext(ml),consent:true});
    assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(calls[0].body.model,'configured-test-model');assert.equal(calls[0].body.store,false);
    assert.equal(calls[0].body.response_format.type,'json_object');assert.equal(calls[0].options.redirect,'error');
    assert.equal(calls[0].options.headers.Authorization,'Bearer gsk_synthetic-test-key');
    assert.equal(calls[0].body.stream,false);assert.equal(calls[0].body.n,1);assert.equal(result.provider,'groq');
    assert.ok(!JSON.stringify(calls[0].body).includes(config().apiKey));
    assert.deepEqual(Object.keys(calls[0].context).sort(),['highest_standardized_domains','majors','p2_standardized_profile','research_status']);
    assert.deepEqual(calls[0].context.p2_standardized_profile,ml.standardized_vector);
    assert.equal(calls[0].context.majors.length,3);
    for(const key of ['answers','participant_id','email','phone','ml_probabilities','user','safety_identifier'])assert.ok(!Object.hasOwn(calls[0].context,key)&&!Object.hasOwn(calls[0].body,key));
    assert.deepEqual(result.explanations.map(m=>m.major_id),ml.top3.map(m=>m.major_id));
    assert.ok(!JSON.stringify(result).includes('synthetic-test-key'));
});
test('explanation: reversed provider ranking is rejected rather than silently reordered',async()=>{
    const s=createExplanationService({config,fetchImpl:fakeProvider([],out=>({...out,explanations:out.explanations.reverse()}))});
    await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='PROVIDER_RANKING_MISMATCH');
});
test('explanation: additional fourth major and ranking fields rejected',async()=>{
    for(const change of [out=>({...out,explanations:[...out.explanations,{major_id:'FOURTH_MAJOR',rank:4,reason:'invalid',explore:'invalid'}]}),out=>({...out,ranking:[]})]){
        const s=createExplanationService({config,fetchImpl:fakeProvider([],change)});
        await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='PROVIDER_INVALID_RESPONSE');
    }
});
test('explanation: unsafe HTML, percentage claims and invented abilities rejected',async()=>{
    for(const text of ['<script>alert(1)</script>','Mức phù hợp 90% với ngành này.','Bạn có năng lực đặc biệt và chắc chắn phù hợp.']){
        const s=createExplanationService({config,fetchImpl:fakeProvider([],out=>{out.explanations[0].reason=text;return out;})});
        await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='PROVIDER_UNSAFE_RESPONSE');
    }
});
test('explanation: unknown provider is not configured and does not create an arbitrary external endpoint',async()=>{
    const s=createExplanationService({config:()=>({provider:'arbitrary',apiKey:'test',model:'test'}),fetchImpl:()=>{throw Error('No fetch');}});
    await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='AI_NOT_CONFIGURED');
});
test('explanation: an upstream response cannot expose the API key even as escaped JSON text',async()=>{
    const s=createExplanationService({config,fetchImpl:fakeProvider([],out=>{out.limitations='Do not expose gsk_synthetic-test-key in any response.';return out;})});
    await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='PROVIDER_UNSAFE_RESPONSE'&&!e.message.includes(config().apiKey));
});
test('explanation: provider errors/quota are safe and never expose upstream contents',async()=>{
    for(const status of [400,401,403,404,429,500]){
        const s=createExplanationService({config,fetchImpl:async()=>new Response('PRIVATE_PROVIDER_CONTENT',{status})});
        await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>!e.message.includes('PRIVATE')&&e.code.startsWith('PROVIDER_'));
    }
});
test('Groq: Retry-After seconds/date/default suppress requests without automatic retries',async()=>{
    for(const [header,delay] of [['2',2000],['Thu, 01 Jan 1970 00:17:00 GMT',20000],[null,60000],['invalid-header',60000]]){
        let time=1000000,calls=0;
        const s=createExplanationService({now:()=>time,config,fetchImpl:async(url,options)=>{
            calls++;
            if(calls===1)return new Response('PRIVATE_QUOTA_DETAIL',{status:429,headers:header===null?{}:{'Retry-After':header}});
            return responseFor(outputFor(JSON.parse(JSON.parse(options.body).messages[1].content)));
        }}),body={context_token:s.mintContext(ml),consent:true};
        await assert.rejects(s.explain(body),e=>e.code==='PROVIDER_QUOTA_OR_RATE_LIMIT'&&e.status===429&&e.retryAfterSeconds===delay/1000);
        time+=delay-1;
        await assert.rejects(s.explain(body),e=>e.code==='PROVIDER_QUOTA_OR_RATE_LIMIT');
        assert.equal(calls,1,'No early call, retry loop, key rotation or provider fallback');
        time+=2;assert.equal((await s.explain(body)).status,'SUCCESS');assert.equal(calls,2);
    }
});
test('Groq: environment uses GROQ key and requested/default model; never falls back to XAI',async()=>{
    const names=['AI_EXPLANATION_PROVIDER','GROQ_API_KEY','GROQ_MODEL','XAI_API_KEY'],old=Object.fromEntries(names.map(n=>[n,process.env[n]]));
    try{
        process.env.AI_EXPLANATION_PROVIDER='groq';process.env.XAI_API_KEY='xai_synthetic-not-used';
        delete process.env.GROQ_API_KEY;delete process.env.GROQ_MODEL;
        const missing=createExplanationService({fetchImpl:()=>{throw Error('Must not fetch using XAI');}});
        await assert.rejects(missing.explain({context_token:missing.mintContext(ml),consent:true}),e=>e.code==='AI_NOT_CONFIGURED');
        process.env.GROQ_API_KEY='gsk_synthetic-env-key';
        for(const model of [undefined,'org/configured-model']){
            if(model===undefined)delete process.env.GROQ_MODEL;else process.env.GROQ_MODEL=model;
            const calls=[],s=createExplanationService({fetchImpl:fakeProvider(calls)});
            assert.equal((await s.explain({context_token:s.mintContext(ml),consent:true})).provider,'groq');
            assert.equal(calls[0].body.model,model||'llama-3.3-70b-versatile');
            assert.equal(calls[0].options.headers.Authorization,'Bearer gsk_synthetic-env-key');
        }
        process.env.AI_EXPLANATION_PROVIDER='xai';
        const unsupported=createExplanationService({fetchImpl:()=>{throw Error('Must not switch providers');}});
        await assert.rejects(unsupported.explain({context_token:unsupported.mintContext(ml),consent:true}),e=>e.code==='AI_NOT_CONFIGURED');
    }finally{for(const name of names)if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name];}
});
test('Groq: rejects truncated, multi-choice, tool/refusal, Responses API and malformed content',async()=>{
    const good={object:'chat.completion',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'{}'}}]};
    const cases=[
        {status:'completed',output:[]},
        {...good,choices:[]}, {...good,choices:[good.choices[0],good.choices[0]]},
        {...good,choices:[{...good.choices[0],finish_reason:'length'}]},
        {...good,choices:[{...good.choices[0],message:{role:'assistant',content:'{}',tool_calls:[{}]}}]},
        {...good,choices:[{...good.choices[0],message:{role:'assistant',content:'{}',refusal:'Refused'}}]},
        {...good,choices:[{...good.choices[0],index:1}]},
        {...good,choices:[{...good.choices[0],message:{role:'user',content:'{}'}}]},
        {...good,choices:[{...good.choices[0],message:{role:'assistant',content:'```json\n{}\n```'}}]}
    ];
    for(const data of cases){
        const s=createExplanationService({config,fetchImpl:async()=>new Response(JSON.stringify(data))});
        await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code.startsWith('PROVIDER_'));
    }
});
test('explanation: provider timeout is bounded',async()=>{
    const s=createExplanationService({config,timeoutMs:20,fetchImpl:(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted'))))});
    await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code==='PROVIDER_TIMEOUT');
});
test('explanation: rate limit enforced before provider request',async()=>{
    const calls=[],s=createExplanationService({config,maxCallsPerMinute:1,fetchImpl:fakeProvider(calls)}),body={context_token:s.mintContext(ml),consent:true};
    await s.explain(body);
    await assert.rejects(s.explain(body),e=>e.status===429);assert.equal(calls.length,1);
});
test('explanation: concurrent provider requests are bounded',async()=>{
    let release,entered;
    const ready=new Promise(resolve=>{entered=resolve;});
    const s=createExplanationService({config,fetchImpl:async(url,options)=>{const context=JSON.parse(JSON.parse(options.body).messages[1].content);entered();return new Promise(resolve=>{release=()=>resolve(responseFor(outputFor(context)));});}});
    const body={context_token:s.mintContext(ml),consent:true},first=s.explain(body);
    await ready;
    try { await assert.rejects(s.explain(body),e=>e.code==='EXPLANATION_RATE_LIMIT'); }
    finally { release(); }
    assert.equal((await first).status,'SUCCESS');
});
test('explanation: incomplete, oversized and invalid provider payloads rejected',async()=>{
    for(const response of [()=>new Response(JSON.stringify({status:'incomplete',output:[]})),()=>new Response('x'.repeat(33000)),()=>new Response('{broken}')]){
        const s=createExplanationService({config,fetchImpl:async()=>response()});
        await assert.rejects(s.explain({context_token:s.mintContext(ml),consent:true}),e=>e.code.startsWith('PROVIDER_'));
    }
});

let server,origin;
before(async()=>{const app=require('../server');server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});origin=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
test('explanation HTTP: same preview gate blocks disabled/production/foreign Host without provider calls',async()=>{
    const old={env:process.env.NODE_ENV,flag:process.env.LABANAI_RIASEC27_PREVIEW};
    try{
        for(const [env,flag] of [['production','true'],['development','false']]){
            process.env.NODE_ENV=env;process.env.LABANAI_RIASEC27_PREVIEW=flag;
            const r=await fetch(origin+'/api/riasec27/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,404);
        }
        process.env.NODE_ENV='development';process.env.LABANAI_RIASEC27_PREVIEW='true';
        const http=require('node:http');
        const status=await new Promise((resolve,reject)=>{const request=http.request(origin+'/api/riasec27/explain',{method:'POST',headers:{Host:'attacker.invalid','Content-Type':'application/json'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end('{}');});
        assert.equal(status,403);
    }finally{if(old.env===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old.env;if(old.flag===undefined)delete process.env.LABANAI_RIASEC27_PREVIEW;else process.env.LABANAI_RIASEC27_PREVIEW=old.flag;}
});
test('explanation HTTP: binds a real P2 result, requires consent, preserves Top-3 on provider failure',async t=>{
    process.env.NODE_ENV='development';process.env.LABANAI_RIASEC27_PREVIEW='true';
    const calls=[],s=createExplanationService({config,fetchImpl:fakeProvider(calls)});
    t.mock.method(service,'mintContext',s.mintContext);t.mock.method(service,'explain',s.explain);
    const spy=t.mock.method(mlService,'evaluateProfile',mlService.evaluateProfile);
    const post=(route,body)=>fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const evaluated=await(await post('/api/riasec27/evaluate',{answers})).json();
    assert.equal(evaluated.ml_ranking.status,'SUCCESS');assert.equal(typeof evaluated.explanation_context_token,'string');
    const before=JSON.stringify(evaluated.ml_ranking.top3);
    assert.equal((await post('/api/riasec27/explain',{context_token:evaluated.explanation_context_token,consent:false})).status,400);
    const response=await post('/api/riasec27/explain',{context_token:evaluated.explanation_context_token,consent:true});assert.equal(response.status,200);
    const data=await response.json();assert.deepEqual(data.explanations.map(m=>m.major_id),evaluated.ml_ranking.top3.map(m=>m.major_id));
    assert.equal(spy.mock.callCount(),1);assert.equal(calls.length,1);assert.equal(JSON.stringify(evaluated.ml_ranking.top3),before);
    t.mock.method(service,'explain',async()=>{throw new ExplanationError('PROVIDER_UNAVAILABLE');});
    const failed=await post('/api/riasec27/explain',{context_token:evaluated.explanation_context_token,consent:true});assert.equal(failed.status,503);
    assert.equal((await failed.json()).message,'Chưa thể tạo lời giải thích bằng AI lúc này');
    assert.equal(spy.mock.callCount(),1);assert.equal(JSON.stringify(evaluated.ml_ranking.top3),before);
});
test('explanation HTTP: oversized requests fail before provider processing',async()=>{
    process.env.NODE_ENV='development';process.env.LABANAI_RIASEC27_PREVIEW='true';
    for(const [size,status] of [[8500,400],[11000,413]]){
        const response=await fetch(origin+'/api/riasec27/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({context_token:'x'.repeat(size),consent:true})});
        assert.equal(response.status,status);
        const result=await response.json();assert.ok(!JSON.stringify(result).includes('x'.repeat(20)));
    }
});
test('Groq HTTP: quota yields safe 429 and Retry-After cooldown prevents another provider call',async t=>{
    let calls=0;
    const s=createExplanationService({config,fetchImpl:async()=>{calls++;return new Response('PRIVATE_QUOTA_DETAIL',{status:429,headers:{'Retry-After':'5'}});}});
    t.mock.method(service,'explain',s.explain);
    const body={context_token:s.mintContext(ml),consent:true};
    for(let i=0;i<2;i++){
        const response=await fetch(origin+'/api/riasec27/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        assert.equal(response.status,429);
        const data=await response.json();assert.equal(data.error,'PROVIDER_QUOTA_OR_RATE_LIMIT');
        assert.ok(!JSON.stringify(data).includes('PRIVATE_QUOTA_DETAIL'));
    }
    assert.equal(calls,1);
});
