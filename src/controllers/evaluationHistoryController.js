'use strict';

const KetQuaDanhGia = require('../models/assessResultModel');
const ChiTietDanhGia = require('../models/assessDetailModel');

const getEvaluationHistory = async (req, res, next) => {
    try {
        const results = await KetQuaDanhGia.find({ id_nguoiDung: String(req.session.user.id) })
            .select('_id nganhHoc tiLe instrument thoiGian riasec27')
            .sort({thoiGian:-1,_id:-1})
            .limit(100)
            .lean();

        const details = results.length
            ? await ChiTietDanhGia.find({ id_ketQua: { $in: results.map((result) => result._id) } })
                .sort({ thoiGian: -1 })
                .lean()
            : [];
        const detailByResultId = new Map(details.map((detail) => [detail.id_ketQua, detail]));

        const history = results.map((result) => ({
            ...result,
            detail: result.instrument === 'RIASEC27' ? {thoiGian:result.thoiGian} : detailByResultId.get(result._id) || null
        })).sort((a, b) => {
            const dateA = a.detail?.thoiGian ? new Date(a.detail.thoiGian).getTime() : 0;
            const dateB = b.detail?.thoiGian ? new Date(b.detail.thoiGian).getTime() : 0;
            return dateB - dateA;
        });

        res.set('Cache-Control', 'no-store');
        return res.render('pages/evaluation-history', {
            title: 'Lịch sử hướng nghiệp',
            history
        });
    } catch (error) {
        res.set('Cache-Control','no-store');
        return res.status(503).render('pages/evaluation-history',{title:'Lịch sử hướng nghiệp',history:[],historyError:true});
    }
};

const getHistoryResult = async (req,res,next) => {
    res.set('Cache-Control','no-store');
    if(!req.session?.user)return res.status(401).json({error:'AUTH_REQUIRED'});
    if(!/^[a-f0-9]{64}$/.test(req.params.id))return res.status(404).json({error:'NOT_FOUND'});
    try{
        const record=await KetQuaDanhGia.findOne({_id:req.params.id,id_nguoiDung:String(req.session.user.id),instrument:'RIASEC27'}).select('_id thoiGian instrument riasec27').lean();
        if(!record)return res.status(404).json({error:'NOT_FOUND'});
        return res.json(record);
    }catch(error){return res.status(503).json({error:'HISTORY_UNAVAILABLE',message:'Chưa tải được lịch sử. Vui lòng thử lại sau.'});}
};
module.exports = { getEvaluationHistory, getHistoryResult };
