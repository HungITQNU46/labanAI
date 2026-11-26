const TinTuc = require('../models/newsModel');
const { syncTuoiTreNews } = require('../services/newsRssService');

// Bộ nhớ đệm RAM nhẹ (3 phút) giúp /api/news phản hồi tức thì
let newsListCache = { data: null, expiresAt: 0 };
const NEWS_CACHE_TTL_MS = 3 * 60 * 1000;

function invalidateNewsCache() {
    newsListCache = { data: null, expiresAt: 0 };
}

function estimateReadTimeFromHtml(html = '') {
    const plainText = String(html).replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    const words = plainText ? plainText.split(' ').length : 0;
    const mins = Math.max(2, Math.ceil(words / 220));
    return `${mins} phút đọc`;
}

function cleanSnippetText(snippet = '', html = '') {
    const raw = (snippet || html || '')
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&amp;/gi, '&')
        .replace(/^(TTO|Tuổi Trẻ Online)\s*[-–:]\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (raw.length <= 155) return raw;
    // Cắt gọn theo ranh giới từ, tránh đứt giữa chữ hoặc giữa con số
    const cut = raw.slice(0, 155);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > 90 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:\-–]+$/, '')}…`;
}

// GET /api/news -> Trả danh sách tin NHẸ (không gửi html_str) + Cache RAM
exports.getAllNews = async (req, res) => {
    try {
        const now = Date.now();
        if (newsListCache.data && now < newsListCache.expiresAt) {
            return res.json({ success: true, cached: true, data: newsListCache.data });
        }

        const rawList = await TinTuc.find({ trangThai: true })
            .sort({ pubDate: -1 })
            .limit(50)
            .select('title link snippet category categoryName industry author pubDate image views likes')
            .lean();

        const lightweightList = rawList.map((item) => ({
            _id: item._id,
            title: item.title,
            link: item.link,
            snippet: cleanSnippetText(item.snippet, ''),
            category: item.category || 'school',
            categoryName: item.categoryName || 'Nhịp sống học đường',
            industry: item.industry || 'all',
            author: item.author || 'Báo Tuổi Trẻ',
            pubDate: item.pubDate,
            readTime: '3 phút đọc',
            image: item.image,
            views: item.views || 0,
            likes: item.likes || 0
        }));

        newsListCache = {
            data: lightweightList,
            expiresAt: now + NEWS_CACHE_TTL_MS
        };

        return res.json({ success: true, cached: false, data: lightweightList });
    } catch (error) {
        console.error('Lỗi lấy danh sách tin tức:', error);
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tin tức' });
    }
};

// GET /api/news/:id -> Chỉ tải nội dung html_str khi người dùng bấm đọc bài + tăng lượt xem
exports.getNewsDetail = async (req, res) => {
    try {
        const article = await TinTuc.findOneAndUpdate(
            { _id: req.params.id, trangThai: true },
            { $inc: { views: 1 } },
            { new: true }
        ).select('title link html_str snippet author pubDate image views likes').lean();

        if (!article) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
        }

        return res.json({ success: true, data: article });
    } catch (error) {
        console.error('Lỗi lấy chi tiết tin tức:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải nội dung bài viết' });
    }
};

// POST /api/news/sync -> Cào tin mới và làm mới cache
exports.syncNews = async (req, res) => {
    try {
        const result = await syncTuoiTreNews();
        invalidateNewsCache();
        return res.json({ success: true, message: 'Đồng bộ tin tức thành công!', result });
    } catch (error) {
        console.error('Lỗi API đồng bộ tin tức:', error);
        return res.status(500).json({ success: false, message: 'Lỗi đồng bộ RSS' });
    }
};

exports.invalidateNewsCache = invalidateNewsCache;