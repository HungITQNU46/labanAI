const User = require('../models/accModel');
const KetQuaDanhGia = require('../models/assessResultModel');
const ChiTietDanhGia = require('../models/assessDetailModel');
const Admission = require('../models/admModel');
const riasec27 = require('../models/riasec27Questionnaire');

// Danh sách 54 trường câu hỏi cũ (mỗi nhóm RIASEC 9 câu)
const F54_GROUPS = {
    R: ['1tuLap', '2suyNghiThucTe', '3thichNghiMoiTruong', '4vanHanhMayMoc', '5congViecThuCong', '6yeuThienNhien', '7laoDongTayChan', '8ketQuaTrucTiep', '9lamViecNgoaiTroi'],
    I: ['10khamPhaVanDe', '11phanTichVanDe', '12suyNghiLogic', '13nghienCuuThiNghiem', '14tongHopKhaiQuat', '15dieuTraDanhGia', '16tuToChucCongViec', '17congViecPhucTap', '18giaiQuyetVanDe'],
    A: ['19deXucDong', '20tuongTuongPhongPhu', '21thichTuDo', '22thuyetTrinhDienXuat', '23ngheThuatTaoHinh', '24nangKhieuAmNhac', '25kynangVietTrinhBay', '26congViecSangTao', '27bocLoSoThich'],
    S: ['28thanThienGiupDo', '29lamViecVoiConNguoi', '30lichSuTuTe', '31huanLuyenGiangGiai', '32bietLangNghe', '33chamSocSucKhoe', '34viMucTieuCongDong', '35dongGopXaHoi', '36hoaGiaiMauThuan'],
    E: ['37phieuLuuMaoHiem', '38tinhQuyetDoan', '39tinhNangDong', '40dienDatThuyetPhuc', '41quanLyDanhGia', '42datMucTieuKeHoach', '43gayAnhHuong', '44thichCanhTranh', '45muonDuocKinhTrong'],
    C: ['46sapXepToChuc', '47tinhCanTrong', '48chuDaoChinhXac', '49tinhToanSoSach', '50luuTruThongTin', '51lapKeHoachCuocSong', '52duKienThuChi', '53lapThoiKhoaBieu', '54lamViecTheoQuyTrinh']
};

function summarizeDetail(detailDoc) {
    if (!detailDoc) return null;

    const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    const answers = [];

    // Tự động nhận diện bộ 27 câu (nếu có) hoặc bộ 54 câu hiện tại
    const is27 = typeof detailDoc.R1 === 'number';
    if (is27) {
        riasec27.questions.forEach((q) => {
            const val = Number(detailDoc[q.question_id]);
            if (!Number.isNaN(val)) {
                scores[q.domain] += val;
                answers.push({ label: q.vietnamese_text, val });
            }
        });
    } else {
        Object.entries(F54_GROUPS).forEach(([domain, keys]) => {
            keys.forEach((key) => {
                const val = Number(detailDoc[key]);
                if (!Number.isNaN(val)) {
                    scores[domain] += val;
                    answers.push({ label: key.replace(/^\d+/, ''), val });
                }
            });
        });
    }

    const sortedDomains = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const hollandCode = sortedDomains.slice(0, 3).map(([d]) => d).join('');

    const topLiked = answers.filter((a) => a.val >= 4).sort((a, b) => b.val - a.val).slice(0, 5).map((a) => `${a.label} (${a.val}/5)`);
    const topDisliked = answers.filter((a) => a.val <= 2).sort((a, b) => a.val - b.val).slice(0, 3).map((a) => `${a.label} (${a.val}/5)`);

    return { scores, hollandCode, topLiked, topDisliked };
}

async function buildPersonalizedSystemPrompt(userId, mode = 'general') {
    const [user, latestResult, admissions] = await Promise.all([
        User.findById(userId).select('hoTen gioiTinh profile').lean(),
        KetQuaDanhGia.findOne({ id_nguoiDung: String(userId) }).sort({ _id: -1 }).lean(),
        mode === 'score' || mode === 'general'
            ? Admission.find().select('tenTruong tenNganh toHop diemChuan2025 diemChuanDuKien').limit(30).lean()
            : Promise.resolve([])
    ]);

    let detailSummary = null;
    if (latestResult) {
        const detailDoc = await ChiTietDanhGia.findOne({ id_ketQua: latestResult._id }).lean();
        detailSummary = summarizeDetail(detailDoc);
    }

    const modeInstructions = {
        general: 'Tư vấn hướng nghiệp tổng quan: kết hợp tính cách, năng lực, xu hướng việc làm và lộ trình học tập.',
        score: 'Tập trung phân tích điểm số, khối thi và đối chiếu với dữ liệu điểm chuẩn thực tế bên dưới để gợi ý chiến lược chọn nguyện vọng (An toàn - Cạnh tranh - Ước mơ).',
        holland: 'Tập trung phân tích sâu mã Holland RIASEC và các đặc điểm nổi bật từ bài khảo sát để giải thích vì sao người dùng hợp hoặc không hợp với từng ngành nghề.'
    };

    let profileSection = `- Họ tên: ${user?.hoTen || 'Học sinh'}\n- Giới tính: ${user?.gioiTinh || 'Chưa rõ'}`;
    if (user?.profile && Object.keys(user.profile).length > 0) {
        profileSection += `\n- Thông tin bổ sung: ${JSON.stringify(user.profile)}`;
    }

    let assessmentSection = 'Người dùng CHƯA làm bài đánh giá hướng nghiệp trên hệ thống. Hãy tư vấn nhiệt tình và khéo léo gợi ý họ vào mục "Đánh giá năng lực" (/evaluation) để có phân tích chính xác hơn.';
    if (latestResult) {
        const majorsText = latestResult.nganhHoc
            .map((name, i) => `${name} (${latestResult.tiLe?.[i] ?? '?'}%)`)
            .join(', ');
        assessmentSection = `- Top ngành/khối ngành đề xuất gần nhất: ${majorsText}`;
        if (detailSummary) {
            assessmentSection += `\n- Mã Holland nổi trội: ${detailSummary.hollandCode}`;
            assessmentSection += `\n- Điểm 6 nhóm RIASEC: R=${detailSummary.scores.R}, I=${detailSummary.scores.I}, A=${detailSummary.scores.A}, S=${detailSummary.scores.S}, E=${detailSummary.scores.E}, C=${detailSummary.scores.C}`;
            if (detailSummary.topLiked.length) assessmentSection += `\n- Đặc điểm nổi bật nhất: ${detailSummary.topLiked.join('; ')}`;
            if (detailSummary.topDisliked.length) assessmentSection += `\n- Đặc điểm ít hứng thú: ${detailSummary.topDisliked.join('; ')}`;
        }
    }

    let admissionSection = '';
    if (admissions.length > 0) {
        const rows = admissions.map((a) => `• ${a.tenTruong} - ${a.tenNganh} (Khối ${a.toHop}): ĐC 2025=${a.diemChuan2025}, Dự kiến=${a.diemChuanDuKien}`).join('\n');
        admissionSection = `\n[DỮ LIỆU ĐIỂM CHUẨN THAM KHẢO TRONG HỆ THỐNG]\n${rows}\n(Chỉ trích dẫn số liệu có thật ở trên, không tự bịa điểm chuẩn nếu trường không có trong danh sách.)`;
    }

    return `Bạn là **la bàn.ai** — trợ lý AI tư vấn hướng nghiệp và tuyển sinh đại học thân thiện, thực tế, dành cho học sinh Việt Nam.
Chế độ hiện tại: ${modeInstructions[mode] || modeInstructions.general}

[HỒ SƠ NGƯỜI DÙNG]
${profileSection}

[KẾT QUẢ ĐÁNH GIÁ HƯỚNG NGHIỆP]
${assessmentSection}
${admissionSection}

[QUY TẮC TRẢ LỜI]
- Xưng hô gần gũi ("mình" - "bạn" hoặc gọi tên người dùng).
- Trả lời rõ ràng, có cấu trúc (dùng in đậm **...**, gạch đầu dòng - hoặc bảng Markdown khi so sánh).
- Dựa sát vào dữ liệu hồ sơ và bài đánh giá của người dùng khi họ hỏi về bản thân.`;
}

module.exports = { buildPersonalizedSystemPrompt };