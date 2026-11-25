'use strict';

const KetQuaDanhGia = require('../models/assessResultModel');
const ChiTietDanhGia = require('../models/assessDetailModel');

const getEvaluationHistory = async (req, res, next) => {
    try {
        const results = await KetQuaDanhGia.find({ id_nguoiDung: String(req.session.user.id) })
            .select('_id nganhHoc tiLe')
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
            detail: detailByResultId.get(result._id) || null
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
        return next(error);
    }
};

module.exports = { getEvaluationHistory };
