/**
 * evaluationController.js
 *
 * Controller for Career Evaluation page and ML inference endpoints.
 * Direction B: RIASEC27 + 6 ML models + Top-3 majors.
 */

'use strict';

const mongoose = require('mongoose');
const KetQuaDanhGia = require('../models/assessResultModel');
const ChiTietDanhGia = require('../models/assessDetailModel');
const mlModel = require('../models/mlModel');
const riasec27Service = require('../services/riasec27Service');
const { isPreviewEnabled, isLoopbackAddress, isValidLocalhostHost } = require('../middleware/riasec27PreviewGate');

const jsonForHtml = (value) => JSON.stringify(value).replace(/[<>&]/g, (character) => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026'
})[character]);

const getEvaluation = (req, res) => {
    res.set('Cache-Control', 'no-store');
    const remoteIp = req.socket?.remoteAddress || req.connection?.remoteAddress;
    const isLoopback = isLoopbackAddress(remoteIp);
    const isValidHost = isValidLocalhostHost(req.headers.host);
    const isAllowedPreview = isPreviewEnabled() && isLoopback && isValidHost;

    if (isAllowedPreview) {
        const questionnaire = riasec27Service.getQuestionnaire();
        return res.render('pages/evaluation', {
            title: 'Định hướng nghề nghiệp bằng AI',
            questionnaireData: jsonForHtml(questionnaire),
            researchStatus: 'RESEARCH_ONLY — TOP3_NOT_VALIDATED',
            isAllowedPreview: true
        });
    }

    return res.render('pages/evaluation', {
        title: 'Định hướng nghề nghiệp bằng AI',
        questionnaireData: 'null',
        researchStatus: 'RESEARCH_ONLY — TOP3_NOT_VALIDATED',
        isAllowedPreview: false
    });
};

const submitEvaluation = async (req, res) => {
    try {
        const userId = req.session?.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để lưu kết quả đánh giá.' });
        }

        const { nganhHoc, tiLe, chiTietDiem } = req.body;
        if (!Array.isArray(nganhHoc) || !Array.isArray(tiLe) || nganhHoc.length === 0) {
            return res.status(400).json({ success: false, message: 'Dữ liệu kết quả ngành học và tỷ lệ không hợp lệ.' });
        }

        const idKetQua = `KQ_${new mongoose.Types.ObjectId().toString()}`;
        const idChiTiet = `CT_${new mongoose.Types.ObjectId().toString()}`;

        await KetQuaDanhGia.create({
            _id: idKetQua,
            id_nguoiDung: String(userId),
            nganhHoc: nganhHoc.map((nganh) => String(nganh).trim()),
            tiLe: tiLe.map(Number)
        });

        const fieldKeys = [
            '1tuLap', '2suyNghiThucTe', '3thichNghiMoiTruong', '4vanHanhMayMoc', '5congViecThuCong',
            '6yeuThienNhien', '7laoDongTayChan', '8ketQuaTrucTiep', '9lamViecNgoaiTroi', '10khamPhaVanDe',
            '11phanTichVanDe', '12suyNghiLogic', '13nghienCuuThiNghiem', '14tongHopKhaiQuat', '15dieuTraDanhGia',
            '16tuToChucCongViec', '17congViecPhucTap', '18giaiQuyetVanDe', '19deXucDong', '20tuongTuongPhongPhu',
            '21thichTuDo', '22thuyetTrinhDienXuat', '23ngheThuatTaoHinh', '24nangKhieuAmNhac', '25kynangVietTrinhBay',
            '26congViecSangTao', '27bocLoSoThich', '28thanThienGiupDo', '29lamViecVoiConNguoi', '30lichSuTuTe',
            '31huanLuyenGiangGiai', '32bietLangNghe', '33chamSocSucKhoe', '34viMucTieuCongDong', '35dongGopXaHoi',
            '36hoaGiaiMauThuan', '37phieuLuuMaoHiem', '38tinhQuyetDoan', '39tinhNangDong', '40dienDatThuyetPhuc',
            '41quanLyDanhGia', '42datMucTieuKeHoach', '43gayAnhHuong', '44thichCanhTranh', '45muonDuocKinhTrong',
            '46sapXepToChuc', '47tinhCanTrong', '48chuDaoChinhXac', '49tinhToanSoSach', '50luuTruThongTin',
            '51lapKeHoachCuocSong', '52duKienThuChi', '53lapThoiKhoaBieu', '54lamViecTheoQuyTrinh'
        ];
        const detailData = {
            _id: idChiTiet,
            id_ketQua: idKetQua,
            thoiGian: new Date()
        };

        fieldKeys.forEach((key) => {
            detailData[key] = chiTietDiem && typeof chiTietDiem[key] !== 'undefined'
                ? parseInt(chiTietDiem[key], 10)
                : 3;
        });

        await ChiTietDanhGia.create(detailData);

        return res.status(201).json({
            success: true,
            message: 'Đã lưu kết quả đánh giá thành công.',
            resultId: idKetQua
        });
    } catch (error) {
        console.error('Lỗi lưu kết quả đánh giá:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lưu kết quả đánh giá.' });
    }
};

const getMlStatus = (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        res.json(mlModel.getStatus());
    } catch (error) {
        res.status(503).json({ available: false, error: 'ML_ARTIFACT_UNAVAILABLE', message: 'Model F54 đã xác minh hiện không khả dụng.' });
    }
};

const recommendMajors = (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        res.json(mlModel.recommend(req.body));
    } catch (error) {
        const invalidInput = error instanceof mlModel.MlInputError;
        res.status(invalidInput ? 400 : 503).json({
            error: invalidInput ? 'INVALID_F54_INPUT' : 'ML_ARTIFACT_UNAVAILABLE',
            message: invalidInput ? error.message : 'Model F54 đã xác minh hiện không khả dụng.'
        });
    }
};

module.exports = { getEvaluation, submitEvaluation, getMlStatus, recommendMajors };
