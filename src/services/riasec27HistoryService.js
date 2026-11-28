'use strict';
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const Result=require('../models/assessResultModel');
const pipeline=require('./riasec27Service');
const domains=['R','I','A','S','E','C'];
const sha=value=>createHash('sha256').update(value).digest('hex');
class HistoryInputError extends Error {}
// Return only allowlisted diagnostics, never MongoDB messages, URIs or user data.
function failureCode(error){
    if(error.code===18 || error.code===13)return 'HISTORY_DB_ACCESS_DENIED';
    if(error.name==='ValidationError' || error.code===121)return 'HISTORY_VALIDATION_FAILED';
    if(error.name==='MongoServerSelectionError' || error.name==='MongoNetworkError' || error.name==='MongoNetworkTimeoutError')return 'HISTORY_DB_UNAVAILABLE';
    if(error.name==='MongoWriteConcernError' || error.code===64)return 'HISTORY_WRITE_UNCONFIRMED';
    return 'HISTORY_WRITE_FAILED';
}
function parseOptions(body,user){
    if (!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(k=>!['answers','history'].includes(k))) throw new HistoryInputError('INVALID_HISTORY_INPUT');
    if (!user || typeof user.id!=='string' || !user.id) throw new HistoryInputError('HISTORY_AUTH_REQUIRED');
    const h=body.history;
    if (!h || typeof h!=='object' || Array.isArray(h) || Object.keys(h).some(k=>!['includeAnswers','requestId'].includes(k)) || (h.includeAnswers!==undefined && h.includeAnswers!==false) || typeof h.requestId!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(h.requestId)) throw new HistoryInputError('INVALID_HISTORY_INPUT');
    return {requestId:h.requestId,includeAnswers:false};
}
function versions(){
    const root=path.resolve(__dirname,'../..');
    const files={ranking_config:'research/riasec27_ml_top3_v0/ranking_config.json',models_manifest:'research/riasec27_q5_models_v1/models_manifest.json',reference:'research/riasec27_top3_b1_v0/reference.json'};
    return {...Object.fromEntries(Object.entries(files).map(([name,file])=>[name+'_sha256',sha(fs.readFileSync(path.join(root,file)))])),
        ranking_config_version:JSON.parse(fs.readFileSync(path.join(root,files.ranking_config),'utf8')).config_version};
}
function validRanking(ml){
    return ml?.status==='SUCCESS' && Array.isArray(ml.top3) && ml.top3.length===3 && new Set(ml.top3.map(m=>m.major_id)).size===3 &&
        domains.every(d=>Number.isFinite(ml.ml_probabilities?.[d]) && ml.ml_probabilities[d]>=0 && ml.ml_probabilities[d]<=1 && Number.isFinite(ml.standardized_vector?.[d])) &&
        ml.top3.every(m=>typeof m.major_id==='string' && typeof m.major_name_vi==='string' && typeof m.soc_code==='string' && typeof m.occupation_title_en==='string' && Number.isInteger(m.rank) && m.rank>0 && Number.isFinite(m.pearson_r) && Math.abs(m.pearson_r)<=1);
}
function createHistoryService(Model=Result){
    async function save(user,options,rawAnswers,ml){
        options=parseOptions({history:options},user);
        if(!validRanking(ml))return {status:'NOT_SAVED'};
        const answers=pipeline.validateAndOrderAnswers(rawAnswers);
        const owner=String(user.id),id=sha(owner+'\0'+options.requestId.toLowerCase());
        const digest=sha(JSON.stringify({answers,includeAnswers:options.includeAnswers}));
        try{
            if(Model.db.readyState!==1)return {status:'FAILED',code:'HISTORY_DB_UNAVAILABLE'};
            const snapshot={schemaVersion:2,summaryStorage:{mode:'automatic',noticeVersion:'automatic-summary-v1'},ml:JSON.parse(JSON.stringify(ml)),versions:{...versions(),questionnaire_sha256:sha(JSON.stringify(pipeline.getQuestionnaire()))},questionOrder:pipeline.getQuestionnaire().questions.map(q=>q.question_id),consent:{answers:options.includeAnswers,at:new Date()}};
            const document={_id:id,id_nguoiDung:owner,instrument:'RIASEC27',thoiGian:new Date(),inputDigest:digest,nganhHoc:ml.top3.map(m=>m.major_name_vi),tiLe:[],riasec27:snapshot};
            let stored;
            try{
                stored=await Model.findOneAndUpdate({_id:id,id_nguoiDung:owner},{$setOnInsert:document},{upsert:true,new:true,runValidators:true,maxTimeMS:3000,writeConcern:{w:'majority',wtimeoutMS:3000}}).select('+inputDigest').lean();
            }catch(error){
                if(error.code!==11000)throw error;
                stored=await Model.findOne({_id:id,id_nguoiDung:owner}).select('+inputDigest').maxTimeMS(3000).lean();
            }
            if(!stored || stored.inputDigest!==digest)return {status:'CONFLICT'};
            return {status:'SAVED',id:stored._id,snapshot:stored.riasec27.ml};
        }catch(error){return {status:'FAILED',code:failureCode(error)};}
    }
    return {save};
}
module.exports={...createHistoryService(),createHistoryService,parseOptions,HistoryInputError,validRanking};
