const mongoose = require('mongoose');
const hollandQuestionStore = require('../services/hollandQuestionService');
const Admission = require('../models/admModel');
const KetQuaDanhGia = require('../models/assessResultModel');
const ChiTietDanhGia = require('../models/assessDetailModel');

const getEvaluation = async (req, res) => {
    const [hollandQuestions, admissions] = await Promise.all([
        hollandQuestionStore.getQuestions(),
        Admission.find().sort({ maTruong: 1, maNganh: 1 })
    ]);
    const serializeForInlineJson = (value) => JSON.stringify(value).replace(/[<>&]/g, (character) => ({
        '<': '\\u003c',
        '>': '\\u003e',
        '&': '\\u0026'
    })[character]);

    res.render('pages/evaluation', {
        title: 'Đánh giá năng lực & Dự đoán trúng tuyển',
        questionsData: serializeForInlineJson(hollandQuestions),
        admissionsData: serializeForInlineJson(admissions.map((admission) => admission.toJSON()))
    });
};

// Lưu kết quả đánh giá hướng nghiệp và chi tiết 54 câu hỏi vào MongoDB
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

        // Tạo mã ID chuỗi cho KetQuaDanhGia
        const idKetQua = 'KQ_' + new mongoose.Types.ObjectId().toString();
        const idChiTiet = 'CT_' + new mongoose.Types.ObjectId().toString();

        // 1. Lưu kết quả đề xuất AI vào KetQuaDanhGia
        const ketQua = await KetQuaDanhGia.create({
            _id: idKetQua,
            id_nguoiDung: String(userId),
            nganhHoc: nganhHoc.map(n => String(n).trim()),
            tiLe: tiLe.map(Number)
        });

        // 2. Chuẩn bị 54 câu trả lời cho ChiTietDanhGia (mặc định điểm 1 nếu không truyền)
        const detailData = {
            _id: idChiTiet,
            id_ketQua: idKetQua,
            thoiGian: new Date()
        };

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

        fieldKeys.forEach(key => {
            detailData[key] = (chiTietDiem && typeof chiTietDiem[key] !== 'undefined') 
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

module.exports = { getEvaluation, submitEvaluation };