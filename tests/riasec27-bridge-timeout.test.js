'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {PassThrough}=require('node:stream');
const children=require('node:child_process');

test('bridge deadline remains 8000ms and rejects a silent worker with TIMEOUT_ERROR',async t=>{
 const servicePath=require.resolve('../src/services/riasec27Service');
 const cached=require.cache[servicePath];
 const worker=new EventEmitter(),signals=[];
 worker.stdin=new PassThrough();worker.stdout=new PassThrough();worker.stderr=new PassThrough();
 worker.kill=signal=>{signals.push(signal);return true;};
 t.mock.method(children,'spawn',()=>worker);
 t.mock.timers.enable({apis:['setTimeout']});
 delete require.cache[servicePath];
 try{
  const service=require(servicePath);
  const pending=service.evaluateProfile(Array(27).fill(3));
  const rejected=assert.rejects(pending,error=>error.code==='TIMEOUT_ERROR');
  t.mock.timers.tick(7999);assert.deepEqual(signals,[]);
  t.mock.timers.tick(1);await rejected;assert.deepEqual(signals,['SIGTERM']);
  worker.emit('close',null);
 }finally{
  delete require.cache[servicePath];if(cached)require.cache[servicePath]=cached;
  t.mock.timers.reset();t.mock.restoreAll();
 }
});
