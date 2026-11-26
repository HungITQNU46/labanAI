const crypto = require('crypto');
const TinTuc = require('../models/newsModel');
const { invalidateNewsCache } = require('./newsController');

const CATEGORIES = new Set(['admission', 'school', 'study-abroad', 'tech-ai', 'teacher']);
const INDUSTRIES = new Set(['all', 'tech', 'business', 'medical', 'design', 'language']);
const ARTICLE_FIELDS = ['title', 'link', 'snippet', 'image', 'author', 'pubDate', 'category', 'categoryName', 'industry', 'block', 'trangThai', 'content'];
const ARTICLE_SELECT = 'title link snippet image author pubDate category categoryName industry block views likes trangThai createdAt updatedAt';

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function toArticleHtml(content) {
    return content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join('');
}

function isHttpUrl(value) {
    try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
        return false;
    }
}

function isValidImage(value) {
    return isHttpUrl(value) || /^\/(?!\/)[^\s"'<>\\]*$/.test(value);
}

function normalizeArticlePayload(payload, { partial = false } = {}) {
    const data = {};
    const errors = [];
    const input = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

    for (const key of Object.keys(input)) {
        if (!ARTICLE_FIELDS.includes(key)) errors.push(`Trường "${key}" không được hỗ trợ.`);
    }

    if (!partial || has('title')) {
        if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 200) {
            errors.push('Tiêu đề phải có từ 1 đến 200 ký tự.');
        } else data.title = input.title.trim();
    }

    if (!partial || has('link')) {
        if (typeof input.link !== 'string' || !isHttpUrl(input.link.trim())) {
            errors.push('Liên kết bài viết phải là URL http hoặc https hợp lệ.');
        } else data.link = input.link.trim();
    }

    for (const [field, maxLength] of [['snippet', 1000], ['author', 120], ['categoryName', 80], ['block', 32]]) {
        if (!partial && !has(field)) continue;
        if (has(field)) {
            if (typeof input[field] !== 'string' || input[field].trim().length > maxLength) {
                errors.push(`${field} không hợp lệ hoặc vượt quá ${maxLength} ký tự.`);
            } else data[field] = input[field].trim();
        }
    }

    if (!partial || has('image')) {
        if (has('image') && (typeof input.image !== 'string' || input.image.trim().length > 1000 || (input.image.trim() && !isValidImage(input.image.trim())))) {
            errors.push('Ảnh đại diện phải là URL http/https hoặc đường dẫn tương đối.');
        } else if (has('image')) data.image = input.image.trim();
    }

    if (!partial || has('category')) {
        if (has('category') && !CATEGORIES.has(input.category)) errors.push('Danh mục tin tức không hợp lệ.');
        else if (has('category')) data.category = input.category;
    }

    if (!partial || has('industry')) {
        if (has('industry') && !INDUSTRIES.has(input.industry)) errors.push('Nhóm ngành không hợp lệ.');
        else if (has('industry')) data.industry = input.industry;
    }

    if (!partial || has('pubDate')) {
        if (has('pubDate')) {
            const date = new Date(input.pubDate);
            if (Number.isNaN(date.getTime())) errors.push('Ngày đăng không hợp lệ.');
            else data.pubDate = date;
        }
    }

    if (has('trangThai')) {
        if (typeof input.trangThai !== 'boolean') errors.push('Trạng thái bài viết phải là true hoặc false.');
        else data.trangThai = input.trangThai;
    } else if (!partial) {
        data.trangThai = true;
    }

    if (has('content')) {
        if (typeof input.content !== 'string' || !input.content.trim() || input.content.length > 8000) {
            errors.push('Nội dung bài viết phải là văn bản không quá 8.000 ký tự.');
        } else data.html_str = toArticleHtml(input.content);
    } else if (!partial) {
        if (typeof input.snippet !== 'string' || !input.snippet.trim()) {
            errors.push('Nội dung bài viết không được để trống.');
        } else data.html_str = toArticleHtml(input.snippet);
    }

    return { data, errors };
}

function parsePage(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

exports.listNews = async (req, res) => {
    try {
        const page = parsePage(req.query.page, 1);
        const limit = Math.min(parsePage(req.query.limit, 20), 100);
        const filter = {};
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { title: { $regex: escapedSearch, $options: 'i' } },
                { snippet: { $regex: escapedSearch, $options: 'i' } },
                { author: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        if (req.query.status === 'published') filter.trangThai = true;
        else if (req.query.status === 'hidden') filter.trangThai = false;
        else if (req.query.status && req.query.status !== 'all') {
            return res.status(400).json({ success: false, message: 'Bộ lọc trạng thái không hợp lệ.' });
        }

        const [total, items] = await Promise.all([
            TinTuc.countDocuments(filter),
            TinTuc.find(filter)
                .select(ARTICLE_SELECT)
                .sort({ pubDate: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        return res.json({
            success: true,
            data: items,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách tin quản trị:', error);
        return res.status(500).json({ success: false, message: 'Không thể lấy danh sách tin tức.' });
    }
};

exports.getNews = async (req, res) => {
    try {
        const article = await TinTuc.findById(req.params.id).lean();
        if (!article) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
        return res.json({ success: true, data: article });
    } catch (error) {
        console.error('Lỗi lấy chi tiết tin quản trị:', error);
        return res.status(500).json({ success: false, message: 'Không thể lấy bài viết.' });
    }
};

exports.createNews = async (req, res) => {
    const { data, errors } = normalizeArticlePayload(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

    try {
        const article = await TinTuc.create({ _id: crypto.randomUUID(), ...data });
        invalidateNewsCache();
        return res.status(201).json({ success: true, data: article });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: 'Liên kết bài viết đã tồn tại.' });
        console.error('Lỗi tạo tin tức:', error);
        return res.status(500).json({ success: false, message: 'Không thể tạo bài viết.' });
    }
};

exports.updateNews = async (req, res) => {
    const { data, errors } = normalizeArticlePayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });
    if (!Object.keys(data).length) return res.status(400).json({ success: false, message: 'Không có nội dung hợp lệ để cập nhật.' });

    try {
        const article = await TinTuc.findByIdAndUpdate(
            req.params.id,
            { $set: data },
            { new: true, runValidators: true }
        );
        if (!article) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
        invalidateNewsCache();
        return res.json({ success: true, data: article });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: 'Liên kết bài viết đã tồn tại.' });
        console.error('Lỗi cập nhật tin tức:', error);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật bài viết.' });
    }
};

exports.setNewsStatus = async (req, res) => {
    if (typeof req.body?.trangThai !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Trạng thái bài viết phải là true hoặc false.' });
    }

    try {
        const article = await TinTuc.findByIdAndUpdate(
            req.params.id,
            { $set: { trangThai: req.body.trangThai } },
            { new: true, runValidators: true }
        ).select('_id trangThai');
        if (!article) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
        invalidateNewsCache();
        return res.json({ success: true, data: article });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái tin tức:', error);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái bài viết.' });
    }
};

exports.deleteNews = async (req, res) => {
    try {
        const article = await TinTuc.findByIdAndDelete(req.params.id).select('_id');
        if (!article) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
        invalidateNewsCache();
        return res.json({ success: true, message: 'Đã xóa bài viết.' });
    } catch (error) {
        console.error('Lỗi xóa tin tức:', error);
        return res.status(500).json({ success: false, message: 'Không thể xóa bài viết.' });
    }
};

exports.normalizeArticlePayload = normalizeArticlePayload;
