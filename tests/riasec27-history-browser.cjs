'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{randomUUID}=require('node:crypto');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 process.env.NODE_ENV='development';process.env.LABANAI_RIASEC27_PREVIEW='true';
 const pipeline=require('../src/services/riasec27Service');
 const answers=[5,5,2,5,5,1,1,2,4,2,1,2,5,2,2,4,4,1,3,5,2,2,4,2,4,5,4],answers2=[1,2,5,2,3,4,5,5,1,5,5,3,2,5,2,1,2,4,3,3,5,2,2,3,3,2,3];
 const real=[await pipeline.evaluateProfile(answers),await pipeline.evaluateProfile(answers2)];
 const explanation=require('../src/services/grokExplanation');let providerMode='success',providerCalls=0,explainRequests=0,lastExplanationBody;
 const groq=explanation.createExplanationService({config:()=>({provider:'groq',apiKey:providerMode==='missing'?undefined:'gsk_synthetic-browser',model:'synthetic-browser-model'}),fetchImpl:async(url,options)=>{
  providerCalls++;const body=JSON.parse(options.body),context=JSON.parse(body.messages[1].content);
  for(const key of ['answers','user','userId','sessionId','email','phone'])assert.equal(Object.hasOwn(context,key),false);
  assert.ok(!JSON.stringify(body).includes('synthetic-A'));assert.ok(!JSON.stringify(body).includes('gsk_synthetic-browser'));
  if(['401','500'].includes(providerMode))return new Response('PRIVATE_PROVIDER_DETAIL',{status:Number(providerMode)});
  const output={explanations:context.majors.map(m=>({major_id:m.major_id,rank:m.rank,evidence_domains:['E','S'],reason:providerMode==='html'?'<script>window.groqInjected=true</script>':'Hồ sơ RIASEC đã xử lý có nét tương đồng với nghề đại diện được cung cấp.',explore:'Tìm hiểu chương trình đào tạo, học thử môn nền tảng và trao đổi với người tư vấn.'})),limitations:'Kết quả định hướng nghiên cứu, chưa được kiểm chứng; Pearson không phải phần trăm phù hợp và không dự đoán trúng tuyển.'};
  return new Response(JSON.stringify({object:'chat.completion',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(output)}}]}));
 }});explanation.mintContext=groq.mintContext;explanation.explain=groq.explain;
 const rows=new Map(),q=value=>({select(){return this;},sort(){return this;},limit(){return this;},maxTimeMS(){return this;},async lean(){return structuredClone(value);}});
 const matches=(r,f)=>Object.entries(f).every(([k,v])=>r[k]===v);
 const Model={db:{readyState:1},findOneAndUpdate(f,u){if(!rows.has(f._id))rows.set(f._id,structuredClone(u.$setOnInsert));return q(rows.get(f._id));}};
 const history=require('../src/services/riasec27HistoryService');history.save=history.createHistoryService(Model).save;
 pipeline.evaluateProfile=async raw=>{const values=pipeline.validateAndOrderAnswers(raw);return structuredClone(real[values[0]===1?1:0]);};
 const Result=require('../src/models/assessResultModel'),Detail=require('../src/models/assessDetailModel');
 Result.find=f=>q([...rows.values()].filter(r=>matches(r,f)));Result.findOne=f=>q([...rows.values()].find(r=>matches(r,f))||null);Detail.find=()=>q([]);
 const express=require('express'),session=require('express-session'),app=express(),controller=require('../src/controllers/riasec27Controller'),historyController=require('../src/controllers/evaluationHistoryController');
 app.set('view engine','ejs');app.set('views',path.join(__dirname,'../src/views'));app.use(express.json());app.use(express.static(path.join(__dirname,'../public')));
 app.use(session({secret:randomUUID(),resave:false,saveUninitialized:false}));app.use((req,res,next)=>{res.locals.currentUser=req.session.user||null;next();});
 app.get('/test/login/:user',(req,res)=>{req.session.user={id:'synthetic-'+req.params.user,name:'Test user',role:'user'};res.json({ok:true});});
 app.get('/test/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
 const submissions=[];let holdEvaluation=false,releaseEvaluation;
 const gate=require('../src/middleware/riasec27PreviewGate').riasec27PreviewGate,auth=require('../src/middleware/authMiddleware').requireAuth;
 app.get('/evaluation',auth,gate,(req,res)=>res.render('pages/evaluation',{title:'Evaluation',isAllowedPreview:true,questionnaireData:JSON.stringify(pipeline.getQuestionnaire())}));
 app.post('/api/riasec27/evaluate',gate,async(req,res)=>{
  submissions.push({authenticated:!!req.session?.user,id:req.session?.user?.id,body:structuredClone(req.body)});
  if(holdEvaluation)await new Promise(resolve=>{releaseEvaluation=resolve;});
  return controller.evaluateAnswers(req,res);
 });
 app.post('/api/riasec27/explain',gate,(req,res)=>{explainRequests++;lastExplanationBody=structuredClone(req.body);return controller.explainResult(req,res);});
 app.get('/evaluation/history',auth,historyController.getEvaluationHistory);app.get('/api/riasec27/history/:id',historyController.getHistoryResult);
 const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));}),origin='http://127.0.0.1:'+server.address().port;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'labanai-history-browser-'));
 const browser=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let socket;
 try{
 const active=path.join(dir,'DevToolsActivePort');for(let i=0;i<150&&!fs.existsSync(active);i++)await pause(100);
 const port=fs.readFileSync(active,'utf8').split(/\r?\n/)[0],target=await(await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'})).json();
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));let id=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error('CDP timeout')),20000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}));});
 const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const wait=async expr=>{for(let i=0;i<200;i++){if(await ev(expr))return;await pause(100);}throw Error('UI timeout: '+expr);};
 const navigate=async p=>{await call('Page.navigate',{url:origin+p});await wait('document.readyState==="complete"');};
 const login=async user=>{await navigate('/test/login/'+user);await wait("document.body.textContent.includes('ok')");};
 const fill=async(values,waitForResult=true,expireBeforeSubmit=false)=>{
  await navigate('/evaluation');await wait("document.querySelectorAll('#questions-list > div').length===27");
  assert.equal(await ev("document.getElementById('history-save-consent')"),null);
  assert.equal(await ev("document.getElementById('riasec27-form').textContent.includes('hệ thống tự động lưu hồ sơ RIASEC')"),false);
  assert.equal(await ev("document.getElementById('riasec27-form').textContent.includes('Dữ liệu lịch sử không được dùng để huấn luyện mô hình')"),false);
  assert.equal(await ev("document.getElementById('history-answers-consent')"),null);
  await ev("document.querySelectorAll('.academic-score-input').forEach(e=>{e.value='7';e.dispatchEvent(new Event('input',{bubbles:true}));});document.getElementById('btn-next-to-survey').click()");
  await ev(`document.querySelectorAll('#questions-list > div').forEach((card,i)=>{const e=card.querySelector('input[value="'+${JSON.stringify(values)}[i]+'"]');e.click();});`);
  assert.equal(await ev("document.getElementById('ai-explanation-consent').checked"),false);
  if(expireBeforeSubmit)await ev("fetch('/test/logout').then(r=>r.json())");
  await ev("document.getElementById('btn-submit-riasec').click()");
  if(waitForResult)await wait("!document.getElementById('btn-submit-riasec').disabled && document.getElementById('history-save-status').textContent.length>0");
 };
 await call('Page.enable');await call('Runtime.enable');await login('A');
 await fill(answers,true,true);
 assert.equal(rows.size,0);assert.equal(submissions.at(-1).authenticated,false);
 assert.ok(await ev("document.getElementById('history-save-status').textContent.includes('Phiên đăng nhập không hợp lệ')"));
 await login('A');holdEvaluation=true;await fill(answers,false);
 await wait("document.getElementById('history-save-status').textContent.includes('chờ xác nhận tự động lưu')");
 const pendingVisible=await ev("document.getElementById('history-save-status').getClientRects().length>0");
 // Always release the pending handler, even when the visibility assertion fails.
 for(let i=0;i<100&&!releaseEvaluation;i++)await pause(20);
 holdEvaluation=false;releaseEvaluation();
 assert.equal(pendingVisible,true,'pending save status must be visible before ML response');
 await wait("!document.getElementById('btn-submit-riasec').disabled");
 assert.equal(submissions.at(-1).id,'synthetic-A');
 assert.equal(Object.hasOwn(submissions.at(-1).body.history,'consent'),false);
 assert.equal(Object.hasOwn(submissions.at(-1).body.history,'includeAnswers'),false);
 assert.match(submissions.at(-1).body.history.requestId,/^[a-f0-9-]{36}$/);
 assert.equal(rows.size,1);assert.equal([...rows.values()][0].riasec27.answers,undefined);
 assert.ok(await ev("document.getElementById('history-save-status').textContent.startsWith('Đã tự động lưu')"));
 const top3Before=await ev("document.getElementById('results-content').textContent");
 const snapshotBefore=JSON.stringify([...rows.values()][0].riasec27);
 await ev("document.getElementById('btn-explain-ai').click();document.getElementById('btn-create-ai-explanation').click()");
 assert.equal(explainRequests,0);assert.equal(providerCalls,0);
 await ev("document.getElementById('ai-explanation-consent').click()");
 assert.equal(await ev("document.getElementById('ai-explanation-consent').checked"),true);
 assert.equal(await ev("document.getElementById('history-answers-consent')"),null);
 assert.equal(rows.size,1);
 await ev("document.getElementById('btn-create-ai-explanation').click()");
 await wait("document.getElementById('ai-explanation-content').children.length===3 && !document.getElementById('btn-create-ai-explanation').disabled");
 assert.equal(await ev("document.querySelectorAll('#ai-explanation-content > div h5').length"),3);
 assert.equal(await ev("document.querySelectorAll('#ai-explanation-content > div p').length"),6);
 assert.equal(await ev("document.querySelectorAll('#ai-explanation-content > p').length"),0);
 assert.equal(await ev("document.getElementById('ai-explanation-content').textContent.includes('Kết quả định hướng nghiên cứu, chưa được kiểm chứng; Pearson không phải phần trăm phù hợp và không dự đoán trúng tuyển.')"),false);
 assert.ok(await ev("document.getElementById('result-reference-note').textContent.length>0"));
 const explainedText=await ev("document.getElementById('ai-explanation-content').textContent");
 for(const d of ['E','S'])assert.ok(explainedText.includes(real[0].ml_ranking.domain_means[d].toFixed(2)+'/5'));
 for(const major of real[0].ml_ranking.top3){assert.ok(explainedText.includes(major.soc_code));assert.ok(explainedText.includes(major.pearson_r.toFixed(2)));}
 assert.equal(providerCalls,1);assert.deepEqual(Object.keys(lastExplanationBody).sort(),['consent','context_token']);
 const firstToken=lastExplanationBody.context_token;
 assert.equal(await ev("document.getElementById('results-content').textContent"),top3Before);
 assert.equal(JSON.stringify([...rows.values()][0].riasec27),snapshotBefore);
 for(const width of [1440,375,320]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});await pause(100);
  assert.equal(await ev('document.documentElement.scrollWidth>document.documentElement.clientWidth'),false);
  assert.equal(await ev("document.getElementById('ai-explanation-content').children.length"),3);
 }
 await ev("document.getElementById('btn-create-ai-explanation').click()");await wait("!document.getElementById('btn-create-ai-explanation').disabled");assert.equal(providerCalls,1);
 await ev("document.getElementById('riasec27-form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}))");await wait("!document.getElementById('btn-submit-riasec').disabled");assert.equal(rows.size,1);
 const first=[...rows.values()][0];await navigate('/evaluation/history');await wait("document.querySelectorAll('[data-history-card]').length===1");
 await call('Page.reload');await wait("document.querySelectorAll('[data-history-card]').length===1");
 await navigate('/test/logout');await login('A');await navigate('/evaluation/history');await wait("document.querySelectorAll('[data-history-card]').length===1");
 await fill(answers2);assert.equal(rows.size,2);assert.ok(!Object.hasOwn([...rows.values()][1].riasec27,'answers'));
 const allSnapshotsBefore=JSON.stringify([...rows.values()]);const mlCallsBefore=submissions.length;
 await ev("document.getElementById('btn-explain-ai').click();document.getElementById('ai-explanation-consent').click()");
 for(const mode of ['missing','401','html','500']){
  providerMode=mode;const callsBefore=providerCalls;
  await ev("document.getElementById('btn-create-ai-explanation').click()");
  await wait("!document.getElementById('btn-create-ai-explanation').disabled && document.getElementById('ai-explanation-status').textContent.includes('Chưa thể tạo')");
  assert.equal(providerCalls,callsBefore+(mode==='missing'?0:1));
  assert.equal(await ev("document.querySelectorAll('.top3-card').length"),3);
  assert.equal(await ev("Boolean(window.groqInjected)"),false);
  assert.equal(await ev("document.querySelectorAll('#ai-explanation-content script').length"),0);
 }
 assert.equal(submissions.length,mlCallsBefore);assert.equal(JSON.stringify([...rows.values()]),allSnapshotsBefore);
 // Date fixture in the mock DB exercises filtering; no real user/database is modified.
 first.thoiGian=new Date(Date.now()-60*86400000);
 await navigate('/evaluation/history');await wait("document.querySelectorAll('[data-history-card]').length===2");
 await ev("document.getElementById('history-period').value='30';document.getElementById('history-period').dispatchEvent(new Event('change'))");
 assert.equal(await ev("document.querySelectorAll('[data-history-card]:not(.is-filtered)').length"),1);
 await ev("document.getElementById('history-period').value='all';document.getElementById('history-period').dispatchEvent(new Event('change'));document.getElementById('history-sort').value='oldest';document.getElementById('history-sort').dispatchEvent(new Event('change'))");
 assert.equal(await ev("document.querySelector('[data-history-card] .history-select-checkbox').value"),first._id);
 const query=first.nganhHoc[0];await ev(`document.getElementById('history-search').value=${JSON.stringify(query)};document.getElementById('history-search').dispatchEvent(new Event('input'))`);
 assert.equal(await ev("document.querySelectorAll('[data-history-card]:not(.is-filtered)').length"),1);
 await ev("document.getElementById('history-search').value='';document.getElementById('history-search').dispatchEvent(new Event('input'));document.querySelectorAll('.history-select-checkbox').forEach(e=>{e.checked=true;e.dispatchEvent(new Event('change'));});document.getElementById('history-compare-button').click()");
 assert.ok(await ev("!document.getElementById('history-compare-modal').classList.contains('hidden')"));
 const comparison=await ev("document.getElementById('history-compare-content').textContent");for(const row of rows.values()){assert.ok(comparison.includes(row.nganhHoc[0]));assert.ok(comparison.includes(row.riasec27.ml.ml_probabilities.R.toFixed(4)));}
 await ev("document.getElementById('history-compare-close').click()");
 for(const width of [1440,375,320]){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});await pause(100);assert.equal(await ev('document.documentElement.scrollWidth>document.documentElement.clientWidth'),false);}
 await login('B');await navigate('/evaluation/history');await wait("document.body.textContent.includes('Chưa có lịch sử đánh giá')");
 assert.equal(await ev(`fetch('/api/riasec27/history/${first._id}').then(r=>r.status)`),404);
 const callsBeforeForeignToken=providerCalls;
 assert.equal(await ev(`fetch('/api/riasec27/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({context_token:${JSON.stringify(firstToken)},consent:true})}).then(r=>r.status)`),400);
 assert.equal(providerCalls,callsBeforeForeignToken);
 await login('A');Model.db.readyState=0;await fill(answers);assert.equal(rows.size,2);
 assert.ok(await ev("document.getElementById('history-save-status').textContent.includes('chưa lưu thành công')"));
 assert.ok(await ev("document.getElementById('history-save-status').textContent.includes('HISTORY_DB_UNAVAILABLE')"));
 assert.deepEqual(errors,[]);
 console.log('GROQ_BROWSER_PASS: explicit consent, Vietnamese response in existing panel, cached duplicate, missing config/401/unsafe HTML/500, cross-account token rejection, no ML rerun or history mutation.');
 console.log('HISTORY_BROWSER_PASS: summary-only automatic save, no raw-answer checkbox/payload/storage, independent Groq consent, session, pending/SAVED/FAILED, replay, isolation, reload/relogin, desktop/mobile; mock DB.');
 }finally{if(socket)socket.close();browser.kill();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
