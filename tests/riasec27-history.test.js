'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const history=require('../src/services/riasec27HistoryService');
const pipeline=require('../src/services/riasec27Service');
const Result=require('../src/models/assessResultModel');
const Detail=require('../src/models/assessDetailModel');
const controller=require('../src/controllers/riasec27Controller');
const historyController=require('../src/controllers/evaluationHistoryController');
const answers=[5,5,2,5,5,1,1,2,4,2,1,2,5,2,2,4,4,1,3,5,2,2,4,2,4,5,4];
const answers2=[1,2,5,2,3,4,5,5,1,5,5,3,2,5,2,1,2,4,3,3,5,2,2,3,3,2,3];
const rows=new Map();
const matches=(row,filter)=>Object.entries(filter).every(([k,v])=>row[k]===v);
function query(value){return {select(){return this;},sort(){return this;},limit(){return this;},maxTimeMS(){return this;},async lean(){return structuredClone(value);}};}
const Model={db:{readyState:1},fail:false,findOneAndUpdate(filter,update){
 if(this.fail)throw this.fail instanceof Error?this.fail:Error('DB_DOWN');let row=rows.get(filter._id);
 if(!row){row=structuredClone(update.$setOnInsert);rows.set(row._id,row);}return query(matches(row,filter)?row:null);
},findOne(filter){return query([...rows.values()].find(r=>matches(r,filter))||null);}};
const store=history.createHistoryService(Model);
let realResult,realResult2,server,origin,originals;
const options=()=>({requestId:randomUUID()});
const post=(cookie,body)=>fetch(origin+'/api/riasec27/evaluate',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie||''},body:JSON.stringify(body)});
async function login(name){const r=await fetch(origin+'/test/login/'+name);return r.headers.get('set-cookie').split(';')[0];}
before(async()=>{
 process.env.NODE_ENV='development';process.env.LABANAI_RIASEC27_PREVIEW='true';
 realResult=await pipeline.evaluateProfile(answers);realResult2=await pipeline.evaluateProfile(answers2);
 assert.equal(realResult.ml_ranking.status,'SUCCESS');assert.equal(realResult2.ml_ranking.status,'SUCCESS');
 const express=require('express'),session=require('express-session'),app=express();
 app.set('view engine','ejs');app.set('views',require('node:path').join(__dirname,'../src/views'));app.use(express.json());
 app.use(session({secret:randomUUID(),resave:false,saveUninitialized:false}));
 app.use((req,res,next)=>{res.locals.currentUser=req.session.user||null;next();});
 app.get('/test/login/:name',(req,res)=>{req.session.user={id:req.params.name==='A'?'synthetic-A':'synthetic-B'};res.json({ok:true});});
 app.get('/test/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
 const {riasec27PreviewGate}=require('../src/middleware/riasec27PreviewGate');
 app.post('/api/riasec27/evaluate',riasec27PreviewGate,controller.evaluateAnswers);
 app.get('/evaluation/history',require('../src/middleware/authMiddleware').requireAuth,historyController.getEvaluationHistory);
 app.get('/api/riasec27/history/:id',historyController.getHistoryResult);
 originals={save:history.save,evaluate:pipeline.evaluateProfile,find:Result.find,findOne:Result.findOne,detailFind:Detail.find};
 history.save=store.save;
 pipeline.evaluateProfile=async raw=>{const ordered=pipeline.validateAndOrderAnswers(raw);return structuredClone(ordered[0]===1?realResult2:realResult);};
 Result.find=filter=>{if(Model.readFail)throw Error('PRIVATE_DB_ERROR');return query([...rows.values()].filter(r=>matches(r,filter)));};
 Result.findOne=filter=>{if(Model.readFail)throw Error('PRIVATE_DB_ERROR');return Model.findOne(filter);};
 Detail.find=()=>query([]);
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});origin='http://127.0.0.1:'+server.address().port;
});
after(async()=>{
 if(originals){history.save=originals.save;pipeline.evaluateProfile=originals.evaluate;Result.find=originals.find;Result.findOne=originals.findOne;Detail.find=originals.detailFind;}
 if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('automatic summary requires a session and valid requestId; forged identity and legacy consent are rejected',async()=>{
 const count=rows.size;
 assert.equal((await post('',{answers})).status,401);
 assert.equal((await post('',{answers,history:options()})).status,401);
 assert.equal((await post('',{answers,userId:'synthetic-A',top3:[]})).status,400);
 const cookie=await login('A');
 assert.equal((await post(cookie,{answers})).status,400);
 for(const h of [{...options(),consent:false},{...options(),consent:true},{...options(),includeAnswers:true},{...options(),includeAnswers:'true'},{...options(),requestId:'invalid'}])assert.equal((await post(cookie,{answers,history:h})).status,400);
 assert.equal(rows.size,count);
});
test('A saves one immutable real ML snapshot; concurrent replay creates no duplicates or raw answers',async()=>{
 const cookie=await login('A'),h=options(),before=rows.size;
 const results=await Promise.all(Array.from({length:4},async()=>{const r=await post(cookie,{answers,history:h});assert.equal(r.status,200);return r.json();}));
 assert.equal(rows.size,before+1);assert.equal(new Set(results.map(r=>r.history.id)).size,1);
 const record=rows.get(results[0].history.id);
 assert.equal(record.id_nguoiDung,'synthetic-A');assert.ok(!Object.hasOwn(record.riasec27,'answers'));
 assert.equal(record.riasec27.summaryStorage.mode,'automatic');assert.equal(record.riasec27.consent.answers,false);
 assert.ok(!Object.hasOwn(record.riasec27.consent,'results'));
 assert.deepEqual(record.riasec27.ml.top3,realResult.ml_ranking.top3);
 assert.deepEqual(record.riasec27.ml.ml_probabilities,realResult.ml_ranking.ml_probabilities);
 assert.ok(record.thoiGian instanceof Date);assert.equal(record.riasec27.versions.ranking_config_sha256.length,64);
 const snapshot=JSON.stringify(record.riasec27);
 const conflict=await(await post(cookie,{answers:answers2,history:h})).json();assert.equal(conflict.history.status,'CONFLICT');assert.equal(JSON.stringify(record.riasec27),snapshot);
 await new Result(record).validate();
});

test('omitted raw-answer consent defaults to summary-only; caller cannot disable session validation',async()=>{
 const cookie=await login('A');
 const response=await(await post(cookie,{answers,history:{requestId:randomUUID()}})).json();
 assert.equal(response.history.status,'SAVED');const record=rows.get(response.history.id);
 assert.ok(!Object.hasOwn(record.riasec27,'answers'));assert.equal(record.riasec27.consent.answers,false);
 await assert.rejects(store.save(null,options(),answers,realResult.ml_ranking),error=>error.message==='HISTORY_AUTH_REQUIRED');
});

test('SAVED waits for database acknowledgement and preserves majority write concern',async()=>{
 let acknowledge,settled=false;
 const delayedModel={db:{readyState:1},findOneAndUpdate(filter,update,settings){
  assert.deepEqual(settings.writeConcern,{w:'majority',wtimeoutMS:3000});
  assert.equal(settings.upsert,true);assert.deepEqual(Object.keys(update),['$setOnInsert']);
  return {select(){return this;},lean(){return new Promise(resolve=>{acknowledge=()=>resolve(structuredClone(update.$setOnInsert));});}};
 }};
 const pending=history.createHistoryService(delayedModel).save({id:'synthetic-ack'},options(),answers,realResult.ml_ranking).then(result=>{settled=true;return result;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
 acknowledge();assert.equal((await pending).status,'SAVED');
});
test('reload and relogin preserve A history; B cannot get or list A records',async()=>{
 let cookie=await login('A');const record=[...rows.values()].find(r=>r.id_nguoiDung==='synthetic-A');
 for(let i=0;i<2;i++){const page=await fetch(origin+'/evaluation/history',{headers:{Cookie:cookie}});assert.equal(page.status,200);assert.ok((await page.text()).includes(record.nganhHoc[0]));}
 await fetch(origin+'/test/logout',{headers:{Cookie:cookie}});cookie=await login('A');
 assert.equal((await fetch(origin+'/api/riasec27/history/'+record._id,{headers:{Cookie:cookie}})).status,200);
 const b=await login('B');assert.equal((await fetch(origin+'/api/riasec27/history/'+record._id,{headers:{Cookie:b}})).status,404);
 const bPage=await(await fetch(origin+'/evaluation/history',{headers:{Cookie:b}})).text();assert.ok(!bPage.includes(record.nganhHoc[0]));
 assert.equal((await fetch(origin+'/api/riasec27/history/'+record._id)).status,401);
 assert.equal((await fetch(origin+'/api/riasec27/history/not-an-id',{headers:{Cookie:cookie}})).status,404);
});
test('second survey saves a separate summary without raw answers; raw storage requests are rejected',async()=>{
 const cookie=await login('A'),before=rows.size;
 assert.equal((await post(cookie,{answers:answers2,history:{...options(),includeAnswers:true}})).status,400);assert.equal(rows.size,before);
 const response=await(await post(cookie,{answers:answers2,history:options()})).json();assert.equal(response.history.status,'SAVED');
 assert.equal(rows.size,before+1);const record=rows.get(response.history.id);assert.ok(!Object.hasOwn(record.riasec27,'answers'));
 const page=await(await fetch(origin+'/evaluation/history',{headers:{Cookie:cookie}})).text();assert.ok(page.includes('data-history-probs'));assert.ok(page.includes('data-history-standardized'));assert.ok(page.includes('Xem chi tiết kết quả'));assert.ok(page.includes(record.nganhHoc[0]));
});
test('DB disconnected/down still returns real ML results, never SAVED; invalid input never inserts',async()=>{
 const cookie=await login('A'),before=rows.size;
 try{Model.db.readyState=0;const result=await(await post(cookie,{answers,history:options()})).json();assert.equal(result.history.status,'FAILED');assert.deepEqual(result.ml_ranking.top3,realResult.ml_ranking.top3);
 Model.db.readyState=1;Model.fail=true;assert.equal((await(await post(cookie,{answers,history:options()})).json()).history.status,'FAILED');
 }finally{Model.db.readyState=1;Model.fail=false;}
 for(const invalid of [answers.slice(1),answers.map(()=>0),answers.map(()=>null)])assert.equal((await post(cookie,{answers:invalid,history:options()})).status,400);
 assert.equal(rows.size,before);
});
test('abstain/tied are never saved',async()=>{
 for(const status of ['ABSTAIN_FLAT_PROFILE','TIED_BOUNDARY','ERROR'])assert.equal((await store.save({id:'synthetic-A'},options(),answers,{status,top3:[]})).status,'NOT_SAVED');
});

test('ML bridge timeout returns safe HTTP 503 and never attempts a history write',async()=>{
 const cookie=await login('A'),before=rows.size,previous=pipeline.evaluateProfile;
 let saveCalls=0;const previousSave=history.save;
 try{
  pipeline.evaluateProfile=async()=>{throw new pipeline.Riasec27ServiceError('PRIVATE_BRIDGE_DIAGNOSTIC','TIMEOUT_ERROR');};
  history.save=async(...args)=>{saveCalls++;return previousSave(...args);};
  const response=await post(cookie,{answers,history:options()});
  assert.equal(response.status,503);const body=await response.json();assert.equal(body.error,'TIMEOUT_ERROR');
  assert.ok(!JSON.stringify(body).includes('PRIVATE_BRIDGE_DIAGNOSTIC'));
  assert.equal(body.history,undefined);assert.equal(saveCalls,0);assert.equal(rows.size,before);
 }finally{pipeline.evaluateProfile=previous;history.save=previousSave;}
});

test('save failure diagnostics distinguish connection, permissions, validation and unconfirmed writes without leaking details',async()=>{
 const cookie=await login('A'),before=rows.size;
 const cases=[
  ['MongoServerSelectionError',undefined,'HISTORY_DB_UNAVAILABLE'],
  ['MongoServerError',13,'HISTORY_DB_ACCESS_DENIED'],
  ['MongoServerError',18,'HISTORY_DB_ACCESS_DENIED'],
  ['ValidationError',undefined,'HISTORY_VALIDATION_FAILED'],
  ['MongoServerError',121,'HISTORY_VALIDATION_FAILED'],
  ['MongoWriteConcernError',64,'HISTORY_WRITE_UNCONFIRMED'],
  ['Error',undefined,'HISTORY_WRITE_FAILED']
 ];
 try{
  for(const [name,code,expected] of cases){
   Model.fail=Object.assign(new Error('PRIVATE_DATABASE_DIAGNOSTIC'),{name,code});
   const response=await post(cookie,{answers,history:options()});
   assert.equal(response.status,200);const body=await response.json();
   assert.deepEqual(body.history,{status:'FAILED',code:expected});
   assert.deepEqual(body.ml_ranking.top3,realResult.ml_ranking.top3);
   assert.ok(!JSON.stringify(body).includes('PRIVATE_DATABASE_DIAGNOSTIC'));
  }
 }finally{Model.fail=false;}
 assert.equal(rows.size,before);
});

test('failed save can retry the same survey token and then appears once in owner history',async()=>{
 const cookie=await login('A'),h=options(),before=rows.size;
 try{
  Model.db.readyState=0;
  const failed=await(await post(cookie,{answers,history:h})).json();
  assert.deepEqual(failed.history,{status:'FAILED',code:'HISTORY_DB_UNAVAILABLE'});
 }finally{Model.db.readyState=1;}
 const saved=await(await post(cookie,{answers,history:h})).json();
 assert.equal(saved.history.status,'SAVED');
 const replay=await(await post(cookie,{answers,history:h})).json();
 assert.equal(replay.history.id,saved.history.id);assert.equal(rows.size,before+1);
 const response=await fetch(origin+'/api/riasec27/history/'+saved.history.id,{headers:{Cookie:cookie}});
 assert.equal(response.status,200);assert.deepEqual((await response.json()).riasec27.ml.top3,saved.ml_ranking.top3);
});
test('history read failures return safe 503 and never masquerade as an empty successful history',async()=>{
 const cookie=await login('A'),record=[...rows.values()][0];
 try{
  Model.readFail=true;
  const detail=await fetch(origin+'/api/riasec27/history/'+record._id,{headers:{Cookie:cookie}});
  assert.equal(detail.status,503);const body=await detail.json();assert.equal(body.error,'HISTORY_UNAVAILABLE');assert.ok(!JSON.stringify(body).includes('PRIVATE_DB_ERROR'));
  const page=await fetch(origin+'/evaluation/history',{headers:{Cookie:cookie}});assert.equal(page.status,503);
  const html=await page.text();assert.ok(html.includes('Chưa tải được lịch sử'));assert.ok(!html.includes('PRIVATE_DB_ERROR'));assert.ok(!html.includes('Chưa có lịch sử đánh giá'));
 }finally{Model.readFail=false;}
});
test('replayed request returns its original snapshot rather than replacing it with later ML outputs',async()=>{
 const h=options(),user={id:'synthetic-replay'};
 const first=await store.save(user,h,answers,realResult.ml_ranking);
 const second=await store.save(user,h,answers,realResult2.ml_ranking);
 assert.equal(first.status,'SAVED');assert.equal(second.id,first.id);assert.deepEqual(second.snapshot,realResult.ml_ranking);
});
// Real writes are opt-in AND require an explicitly supplied test database.
// Never derive a new database from the application's Atlas MONGO_URI.
test('MongoDB integration (explicit approved test database only)',{skip:!process.env.LABANAI_TEST_MONGO_URI||process.env.LABANAI_TEST_MONGO_WRITE_APPROVED!=='true'},async()=>{
 const mongoose=require('mongoose'),{MongoClient}=require('mongodb');
 const client=new MongoClient(process.env.LABANAI_TEST_MONGO_URI),dbName=client.options.dbName;
 await client.close();
 assert.ok(dbName && dbName!=='labanAI' && /test/i.test(dbName),'An explicit dedicated test database is required');
 const connection=await mongoose.createConnection(process.env.LABANAI_TEST_MONGO_URI,{dbName,autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:3000}).asPromise();
 const ids=[];
 try{const model=connection.model('HistoryIntegration',Result.schema,'ketquadanhgias');await model.createCollection();const dbStore=history.createHistoryService(model),h=options();
 const saved=await Promise.all([dbStore.save({id:'synthetic-A'},h,answers,realResult.ml_ranking),dbStore.save({id:'synthetic-A'},h,answers,realResult.ml_ranking)]);
 ids.push(...new Set(saved.map(r=>r.id).filter(Boolean)));
 assert.ok(saved.every(r=>r.status==='SAVED'));assert.equal(await model.countDocuments({_id:saved[0].id}),1);
 assert.equal(await model.countDocuments({_id:saved[0].id,id_nguoiDung:'synthetic-B'}),0);
 }finally{if(ids.length)await connection.collection('ketquadanhgias').deleteMany({_id:{$in:ids}});await connection.close();}
});
