'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 process.env.NODE_ENV='development';process.env.LABANAI_RIASEC27_PREVIEW='true';
 const express=require('express'),app=express(),service=require('../src/services/riasec27Service');
 const gate=require('../src/middleware/riasec27PreviewGate').riasec27PreviewGate;
 app.set('view engine','ejs');app.set('views',path.join(__dirname,'../src/views'));app.use(express.json());app.use(express.static(path.join(__dirname,'../public')));
 app.get('/evaluation',gate,(req,res)=>res.render('pages/evaluation',{title:'Evaluation',currentUser:null,isAllowedPreview:true,questionnaireData:JSON.stringify(service.getQuestionnaire())}));
 let calls=0,result,evaluationResponse;
 app.post('/api/riasec27/evaluate',gate,async(req,res)=>{
  calls++;const started=performance.now();
  try{
   result=await service.evaluateProfile(req.body.answers);
   evaluationResponse={http:200,mlStatus:result.ml_ranking?.status,elapsedMs:Math.round(performance.now()-started)};
   res.json(result);
  }catch(error){
   // Preserve a safe bridge code so a backend failure is not mistaken for a UI timeout.
   const code=error instanceof service.Riasec27ServiceError?error.code:'TEST_ERROR';
   evaluationResponse={http:503,code,elapsedMs:Math.round(performance.now()-started)};
   res.status(503).json({error:code});
  }
 });
 const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'labanai-validation-'));
 const browser=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let socket;
 try{
 const active=path.join(dir,'DevToolsActivePort');for(let i=0;i<150&&!fs.existsSync(active);i++)await pause(100);
 const port=fs.readFileSync(active,'utf8').split(/\r?\n/)[0];
 const target=await(await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'})).json();
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error('CDP timeout')),20000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}));});
 const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const wait=async expr=>{for(let i=0;i<200;i++){if(await ev(expr))return;await pause(100);}throw Error('UI timeout: '+expr);};
 await call('Page.enable');await call('Runtime.enable');await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/evaluation'});
 await wait("document.querySelectorAll('#questions-list > div').length===27");
 assert.ok(await ev("!document.getElementById('riasec27-incomplete-alert') || document.getElementById('riasec27-incomplete-alert').hidden"));
 await ev("document.querySelectorAll('.academic-score-input').forEach(e=>{e.value='7';e.dispatchEvent(new Event('input',{bubbles:true}));});document.getElementById('btn-next-to-survey').click();document.getElementById('btn-submit-riasec').click()");
 assert.equal(calls,0);assert.equal(await ev("document.querySelectorAll('.riasec-question-missing').length"),27);
 assert.ok(await ev("document.getElementById('questions-list').nextElementSibling.id==='riasec27-incomplete-alert'"));
 assert.ok(await ev("Boolean(document.getElementById('riasec27-incomplete-alert').compareDocumentPosition(document.getElementById('btn-submit-riasec')) & Node.DOCUMENT_POSITION_FOLLOWING)"));
 assert.ok(await ev("document.getElementById('riasec27-validation-count').textContent.includes('0/27')"));
 assert.equal(await ev("document.querySelectorAll('#questions-list input:checked').length"),0);
 assert.equal(await ev("document.getElementById('riasec27-missing-list').textContent"),Array.from({length:27},(_,i)=>'Câu '+(i+1)).join(', '));
 console.log('PASS: 0/27 warns, all 27 missing, no defaults and no API request');
 const answers=[5,5,2,5,5,1,1,2,4,2,1,2,5,2,2,4,4,1,3,5,2,2,4,2,4,5,4];
 await ev(`document.querySelectorAll('#questions-list > div').forEach((card,i)=>{if(i!==7&&i!==18)card.querySelector('input[value="'+${JSON.stringify(answers)}[i]+'"]')?.click();});document.getElementById('btn-submit-riasec').click()`);
 assert.equal(calls,0);assert.equal(await ev("document.getElementById('riasec27-missing-list').textContent"),'Câu 8, Câu 19');
 assert.ok(await ev("document.getElementById('riasec27-validation-count').textContent.includes('25/27')"));
 await ev("document.getElementById('riasec27-jump-missing').click()");await pause(700);
 assert.equal(await ev('document.activeElement.id'),'riasec-question-'+service.getQuestionnaire().questions[7].question_id);
 assert.ok(await ev("(()=>{const r=document.activeElement.getBoundingClientRect();return r.top>=0&&r.top<innerHeight;})()"));
 for(const width of [1440,375,320]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
  await ev("window.scrollTo(0,0);document.getElementById('btn-submit-riasec').click()");await pause(900);
  assert.equal(await ev('document.documentElement.scrollWidth>document.documentElement.clientWidth'),false);
  await wait("(()=>{const r=document.getElementById('riasec27-incomplete-alert').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})()");
  assert.ok(await ev("document.getElementById('questions-list').nextElementSibling.id==='riasec27-incomplete-alert'"));
  assert.equal(await ev("document.querySelectorAll('#questions-list input:checked').length"),25);
  await ev("document.getElementById('riasec27-jump-missing').click()");await pause(900);
  assert.ok(await ev("document.activeElement.classList.contains('riasec-question-missing') && document.activeElement.id==='riasec-question-S2'"));
  assert.ok(await ev("(()=>{const r=document.activeElement.getBoundingClientRect();return r.top>=0&&r.top<innerHeight;})()"));
 }
 console.log('PASS: warning directly after question 27 and before submit; hidden until attempted; auto-scroll and highlighted first missing question on desktop/mobile');
 for(const invalid of ['0','null','undefined','6','1.5','']){
  await ev(`(()=>{const e=document.querySelectorAll('#questions-list > div')[7].querySelector('input[value="2"]');e.checked=true;e.value=${JSON.stringify(invalid)};e.dispatchEvent(new Event('change',{bubbles:true}));e.value='2';})()`);
  assert.ok(await ev("document.getElementById('riasec27-validation-count').textContent.includes('25/27')"));
 }
 await ev("(()=>{const e=document.querySelectorAll('#questions-list > div')[7].querySelector('input[value=\"2\"]');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));})()");
 assert.equal(await ev("document.getElementById('riasec27-missing-list').textContent"),'Câu 19');
 assert.equal(await ev("document.querySelectorAll('.riasec-question-missing').length"),1);
 console.log('PASS: ordered missing list, jump focus/scroll, live updates, invalid answers rejected, responsive');
 await ev("document.querySelectorAll('#questions-list > div')[18].querySelector('input[value=\"3\"]').click()");
 assert.equal(await ev("document.getElementById('riasec27-incomplete-alert').hidden"),true);
 assert.equal(await ev("document.querySelectorAll('.riasec-question-missing').length"),0);
 assert.equal(await ev("document.querySelectorAll('#questions-list input:checked').length"),27);
 await ev("document.getElementById('btn-submit-riasec').click()");
 await wait("!document.getElementById('btn-submit-riasec').disabled && (document.querySelectorAll('.top3-card').length===3 || Boolean(document.querySelector('[data-error-code]')))");
 assert.equal(evaluationResponse?.http,200,'ML request failed: '+JSON.stringify(evaluationResponse));
 assert.equal(await ev("document.querySelectorAll('.top3-card').length"),3);
 assert.equal(calls,1);assert.equal(result.ml_ranking.status,'SUCCESS');
 assert.deepEqual(await ev("Array.from(document.querySelectorAll('.top3-card [data-result-field=pearson_r]')).map(e=>e.textContent)"),result.ml_ranking.top3.map(m=>'Pearson r: '+m.pearson_r.toFixed(2)));
 assert.ok(await ev("Boolean(document.getElementById('btn-explain-ai'))"));assert.deepEqual(errors,[]);
 console.log('PASS: 27/27 -> real ML/P2 -> three cards, correct Pearson and Groq control; no JavaScript errors; '+JSON.stringify(evaluationResponse));
 }finally{if(socket)socket.close();browser.kill();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
