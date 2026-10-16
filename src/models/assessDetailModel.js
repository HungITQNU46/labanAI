// Chi tiết đánh giá
const mongoose = require('mongoose');

const chiTietDanhGiaSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        alias: 'id'
    },
    id_ketQua: {
        type: String,
        required: true,
        unique: true,
        ref: 'KetQuaDanhGia',
        trim: true
    },
    thoiGian: {
        type: Date,
        required: true
    },
    '1tuLap': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '2suyNghiThucTe': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '3thichNghiMoiTruong': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '4vanHanhMayMoc': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '5congViecThuCong': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '6yeuThienNhien': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '7laoDongTayChan': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '8ketQuaTrucTiep': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '9lamViecNgoaiTroi': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '10khamPhaVanDe': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '11phanTichVanDe': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '12suyNghiLogic': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '13nghienCuuThiNghiem': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '14tongHopKhaiQuat': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '15dieuTraDanhGia': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '16tuToChucCongViec': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '17congViecPhucTap': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '18giaiQuyetVanDe': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '19deXucDong': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '20tuongTuongPhongPhu': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '21thichTuDo': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '22thuyetTrinhDienXuat': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '23ngheThuatTaoHinh': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '24nangKhieuAmNhac': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '25kynangVietTrinhBay': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '26congViecSangTao': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '27bocLoSoThich': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '28thanThienGiupDo': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '29lamViecVoiConNguoi': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '30lichSuTuTe': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '31huanLuyenGiangGiai': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '32bietLangNghe': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '33chamSocSucKhoe': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '34viMucTieuCongDong': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '35dongGopXaHoi': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '36hoaGiaiMauThuan': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '37phieuLuuMaoHiem': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '38tinhQuyetDoan': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '39tinhNangDong': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '40dienDatThuyetPhuc': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '41quanLyDanhGia': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '42datMucTieuKeHoach': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '43gayAnhHuong': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '44thichCanhTranh': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '45muonDuocKinhTrong': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '46sapXepToChuc': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '47tinhCanTrong': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '48chuDaoChinhXac': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '49tinhToanSoSach': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '50luuTruThongTin': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '51lapKeHoachCuocSong': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '52duKienThuChi': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '53lapThoiKhoaBieu': {
        type: Number,
        required: true,
        validate: Number.isInteger
    },
    '54lamViecTheoQuyTrinh': {
        type: Number,
        required: true,
        validate: Number.isInteger
    }
}, {
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.models.ChiTietDanhGia || mongoose.model('ChiTietDanhGia', chiTietDanhGiaSchema);
