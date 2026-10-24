const User = require('../models/accModel');
const KetQuaDanhGia = require('../models/assessResultModel');
const ChiTietDanhGia = require('../models/assessDetailModel');
const TinTuc = require('../models/newsModel');
const Admission = require('../models/admModel');

function formatDateVN(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
}

function parseDateInput(str) {
    if (!str) return new Date();
    if (str.includes('/')) {
        const [d, m, y] = str.split('/').map(Number);
        return new Date(y, m - 1, d);
    }
    if (str.includes('-')) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(str);
}

function getTimeframeInfo(timeframe, query = {}) {
    const now = new Date();
    let startDate = new Date(now);
    let endDate = new Date(now);
    let subtitle = '';
    let isSingleDay = false;
    const prefix = 'Số lượt hoàn thành bài đánh giá hướng nghiệp Hollands<br>';

    if (timeframe === 'today') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        isSingleDay = true;
        subtitle = `${prefix}hôm nay (ngày ${formatDateVN(now)})`;
    } else if (timeframe === '1month') {
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        subtitle = `${prefix}trong 1 tháng qua (${formatDateVN(startDate)} - ${formatDateVN(now)})`;
    } else if (timeframe === 'custom') {
        startDate = query.startDate ? parseDateInput(query.startDate) : new Date(now);
        endDate = query.endDate ? parseDateInput(query.endDate) : new Date(now);

        if (startDate > endDate) {
            const temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const startStr = formatDateVN(startDate);
        const endStr = formatDateVN(endDate);

        if (startStr === endStr) {
            isSingleDay = true;
            subtitle = `${prefix}trong ngày ${startStr}`;
        } else {
            isSingleDay = false;
            subtitle = `${prefix} ${startStr} - ${endStr}`;
        }
    } else {
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        subtitle = `${prefix}trong 7 ngày gần nhất (${formatDateVN(startDate)} - ${formatDateVN(now)})`;
    }

    return { startDate, endDate, subtitle, isSingleDay };
}

// 1. Render Dashboard
const getAdminDashboard = async (req, res) => {
    try {
        const [usersList, totalEvaluations, dbNewsCount] = await Promise.all([
            User.find().sort({ _id: -1 }).lean(),
            KetQuaDanhGia.countDocuments(),
            TinTuc.countDocuments()
        ]);

        const totalUsers = usersList.length; // Số lượng người dùng thật 100%
        const totalNews = Math.max(dbNewsCount, 5);

        // Truy vấn dữ liệu thật: ghép cặp song song giữa tên ngành và tỷ lệ phù hợp AI
        const majorAgg = await KetQuaDanhGia.aggregate([
            {
                $project: {
                    pairs: {
                        $zip: {
                            inputs: [
                                { $ifNull: ["$nganhHoc", []] },
                                { $ifNull: ["$tiLe", []] }
                            ]
                        }
                    }
                }
            },
            { $unwind: "$pairs" },
            {
                $group: {
                    _id: { $arrayElemAt: ["$pairs", 0] },
                    count: { $sum: 1 },
                    avgMatch: { $avg: { $arrayElemAt: ["$pairs", 1] } }
                }
            },
            { $sort: { count: -1, avgMatch: -1 } }
        ]);

        const totalHits = majorAgg.reduce((sum, item) => sum + item.count, 0) || 1;

        
        let popularMajors = [];
        if (majorAgg.length > 0) {
            popularMajors = majorAgg.slice(0, 3).map((item, index) => ({
                rank: `0${index + 1}`,
                name: item._id,
                count: item.count,
                percentage: Math.round((item.count / totalHits) * 100),
                avgMatch: item.avgMatch ? item.avgMatch.toFixed(1) : '0'
            }));
        } else {
            popularMajors = []; // Để mảng rỗng khi chưa có bài đánh giá nào
        }

        const { startDate, endDate, subtitle } = getTimeframeInfo('7days');
        const chartRecords = await ChiTietDanhGia.aggregate([
            { $match: { thoiGian: { $gte: startDate,$lte: endDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: "\%d/\%m/\%Y", date: "$thoiGian", timezone: "+07:00" } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const daysMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const chartData = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const dateStr = formatDateVN(d);
            const found = chartRecords.find(r => r._id === dateStr);

            chartData.push({
                date: dateStr,
                label: daysMap[d.getDay()],
                fullLabel: `${daysMap[d.getDay()]} (${dateStr})`,
                count: found ? found.count : 0
            });
        }

        res.render('pages/admin-dashboard', {
            title: 'Trung tâm điều khiển',
            stats: { totalUsers, totalEvaluations, totalNews },
            popularMajors,
            chartData,
            chartSubtitle: subtitle,
            users: usersList
        });
    } catch (error) {
        console.error('Lỗi lấy dữ liệu Admin Dashboard:', error);
        res.status(500).send('Lỗi máy chủ nội bộ');
    }
};

// 2. API lấy biểu đồ hoạt động tư vấn
const getConsultationStatsAPI = async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '7days';
        const { startDate, endDate, subtitle, isSingleDay } = getTimeframeInfo(timeframe, req.query);

        if (isSingleDay) {
            const hourlyRecords = await ChiTietDanhGia.aggregate([
                { $match: { thoiGian: { $gte: startDate,$lte: endDate } } },
                {
                    $group: {
                        _id: { $hour: { date: "$thoiGian", timezone: "+07:00" } },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const chartData = [];
            const dayStr = formatDateVN(startDate);
            for (let h = 0; h < 24; h += 2) {
                const h1 = hourlyRecords.find(r => r._id === h)?.count || 0;
                const h2 = hourlyRecords.find(r => r._id === h + 1)?.count || 0;
                const hourLabel = `${String(h).padStart(2, '0')}:00`;
                chartData.push({
                    label: hourLabel,
                    fullLabel: `${hourLabel} - ${String(h + 2).padStart(2, '0')}:00 (${dayStr})`,
                    count: h1 + h2
                });
            }
            return res.json({ success: true, subtitle, chartData, isSingleDay: true });
        }

        const dailyRecords = await ChiTietDanhGia.aggregate([
            { $match: { thoiGian: { $gte: startDate,$lte: endDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: "\%d/\%m/\%Y", date: "$thoiGian", timezone: "+07:00" } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = Math.max(diffDays, 1);
        const daysMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const chartData = [];

        for (let i = 0; i < totalDays; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            if (d > endDate) break;

            const dateStr = formatDateVN(d);
            const found = dailyRecords.find(r => r._id === dateStr);
            const shortDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

            chartData.push({
                label: totalDays <= 7 ? daysMap[d.getDay()] : shortDate,
                fullLabel: `${daysMap[d.getDay()]}, ngày ${dateStr}`,
                count: found ? found.count : 0
            });
        }

        return res.json({ success: true, subtitle, chartData, isSingleDay: false });
    } catch (error) {
        console.error('Lỗi API Consultation Stats:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// 3. API lấy TẤT CẢ các ngành AI từng đề xuất (Cho nút "Chi tiết ↗")
const getAllRecommendedMajorsAPI = async (req, res) => {
    try {
        const majorAgg = await KetQuaDanhGia.aggregate([
            {
                $project: {
                    pairs: {
                        $zip: {
                            inputs: [
                                { $ifNull: ["$nganhHoc", []] },
                                { $ifNull: ["$tiLe", []] }
                            ]
                        }
                    }
                }
            },
            { $unwind: "$pairs" },
            {
                $group: {
                    _id: { $arrayElemAt: ["$pairs", 0] },
                    count: { $sum: 1 },
                    avgMatch: { $avg: { $arrayElemAt: ["$pairs", 1] } }
                }
            },
            { $sort: { count: -1, avgMatch: -1 } }
        ]);

        const totalHits = majorAgg.reduce((sum, item) => sum + item.count, 0) || 1;

        const allMajors = majorAgg.map((item, index) => ({
            rank: index + 1 < 10 ? `0${index + 1}` : `${index + 1}`,
            name: item._id,
            count: item.count,
            percentage: Math.round((item.count / totalHits) * 100),
            avgMatch: item.avgMatch ? item.avgMatch.toFixed(1) : '85.0'
        }));

        return res.json({
            success: true,
            totalHits,
            totalDistinctMajors: allMajors.length,
            majors: allMajors
        });
    } catch (error) {
        console.error('Lỗi API All Recommended Majors:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// 4. API xem thông tin tuyển sinh ngành học
const getMajorDetailAPI = async (req, res) => {
    try {
        const majorName = decodeURIComponent(req.params.majorName);
        const admissions = await Admission.find({
            tenNganh: { $regex: new RegExp(majorName, 'i') }
        }).limit(6);

        const evalStats = await KetQuaDanhGia.aggregate([
            { $unwind: "$nganhHoc" },
            { $match: { nganhHoc: {$regex: new RegExp(majorName, 'i') } } },
            { $count: "totalMatches" }
        ]);

        return res.json({
            success: true,
            majorName,
            totalMatches: evalStats[0]?.totalMatches || 0,
            admissions
        });
    } catch (error) {
        console.error('Lỗi API Major Detail:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ==========================================
// 5. API REALTIME METRICS (SỐ LIỆU TỰ ĐỘNG & BẢN GHI MỚI)
// ==========================================
const getRealtimeMetricsAPI = async (req, res) => {
    try {
        const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [totalUsers, totalEvaluations, totalNews, newUsers, newEvaluations] = await Promise.all([
            User.countDocuments(),
            KetQuaDanhGia.countDocuments(),
            TinTuc.countDocuments(),
            User.countDocuments({ createdAt: { $gt: since } }),
            ChiTietDanhGia.countDocuments({ thoiGian: { $gt: since } })
        ]);

        return res.json({
            success: true,
            timestamp: new Date().toISOString(),
            totals: {
                totalUsers,
                totalEvaluations,
                totalNews
            },
            newCounts: {
                newUsers,
                newEvaluations,
                newNews: 0 // TinTuc không có trường createdAt nên giữ 0
            }
        });
    } catch (error) {
        console.error('Lỗi API Realtime Metrics:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

// ==========================================
// 6. API KHÓA / MỞ KHÓA 1 TÀI KHOẢN (LƯU VÀO MONGODB)
// ==========================================
const toggleUserStatusAPI = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
        }

        const newStatus = !user.trangThai;
        await User.findByIdAndUpdate(id, { $set: { trangThai: newStatus } });

        return res.json({
            success: true,
            message: `Đã ${newStatus ? 'mở khóa' : 'khóa'} tài khoản ${user.hoTen} thành công.`,
            trangThai: newStatus
        });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái người dùng:', error);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái.' });
    }
};

// ==========================================
// 7. API XỬ LÝ HÀNG LOẠT (KHÓA / MỞ KHÓA NHIỀU TÀI KHOẢN)
// ==========================================
const batchUpdateUserStatusAPI = async (req, res) => {
    try {
        const { userIds, status } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Danh sách tài khoản không hợp lệ.' });
        }

        const boolStatus = Boolean(status);
        await User.updateMany(
            { _id: { $in: userIds } },
            { $set: { trangThai: boolStatus } }
        );

        return res.json({
            success: true,
            message: `Đã ${boolStatus ? 'mở khóa' : 'khóa'} ${userIds.length} tài khoản thành công.`,
            updatedCount: userIds.length,
            newStatus: boolStatus
        });
    } catch (error) {
        console.error('Lỗi xử lý hàng loạt tài khoản:', error);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật hàng loạt.' });
    }
};


module.exports = {
    getAdminDashboard,
    getConsultationStatsAPI,
    getAllRecommendedMajorsAPI,
    getMajorDetailAPI,
    getRealtimeMetricsAPI,
    toggleUserStatusAPI,
    batchUpdateUserStatusAPI
};
