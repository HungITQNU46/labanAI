const Parser = require('rss-parser');
const cheerio = require('cheerio');
const crypto = require('crypto');
const TinTuc = require('../models/newsModel');

const parser = new Parser();
const TUOITRE_EDU_RSS = 'https://tuoitre.vn/rss/giao-duc.rss';
const DEFAULT_IMAGE = 'https://cdn2.tuoitre.vn/thumb_w/600/2020/5/18/logo-tuoitre-15897865225631257359436.png';

// Hàm cào toàn bộ nội dung chi tiết bài báo bằng Cheerio
async function scrapeArticleHtml(url, fallbackSnippet) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (!res.ok) return `<p>${fallbackSnippet}</p>`;

        const html = await res.text();
        const $ = cheerio.load(html);

        // Khối nội dung chính của báo Tuổi Trẻ
        const contentEl = $('.detail-content').first();
        if (!contentEl.length) return `<p>${fallbackSnippet}</p>`;

        // Xóa các thành phần thừa (quảng cáo, tin liên quan, script)
        contentEl.find('script, style, .VCSortableInPreviewMode[type="RelatedOneNews"], .VCSortableInPreviewMode[type="RelatedNewsBox"], .kbwscwl-relatedbox, .readmore-body-box').remove();

        // Chuẩn hóa ảnh bên trong bài viết (xử lý lazy-load nếu có và thêm class đẹp cho Modal)
        contentEl.find('img').each((_, img) => {
            const $img = $(img);
            const realSrc = $img.attr('data-original') || $img.attr('data-src') || $img.attr('src');
            if (realSrc) $img.attr('src', realSrc);
            $img.addClass('w-full rounded-xl my-3 object-cover');
        });

        // Thêm khoảng cách cho các đoạn văn và chú thích ảnh
        contentEl.find('p').addClass('mb-3');
        contentEl.find('figcaption, .PhotoCMS_Caption').addClass('text-xs text-muted italic text-center mb-4');

        const cleanHtml = contentEl.html()?.trim();
        return cleanHtml || `<p>${fallbackSnippet}</p>`;
    } catch (error) {
        console.warn(`Không cào được chi tiết bài ${url}:`, error.message);
        return `<p>${fallbackSnippet}</p>`;
    }
}

// Tự động phân loại
function autoClassify(text) {
    const t = text.toLowerCase();
    let category = 'school', categoryName = 'Nhịp sống học đường';
    let industry = 'all';

    if (t.includes('tuyển sinh') || t.includes('điểm chuẩn') || t.includes('thi tốt nghiệp') || t.includes('đại học') || t.includes('xét tuyển')) {
        category = 'admission'; categoryName = 'Tuyển sinh';
    } else if (t.includes('du học') || t.includes('học bổng') || t.includes('quốc tế') || t.includes('ielts')) {
        category = 'study-abroad'; categoryName = 'Du học & Học bổng';
    } else if (/\bai\b/.test(t) || t.includes('trí tuệ nhân tạo') || t.includes('công nghệ') || t.includes('chuyển đổi số')) {
        category = 'tech-ai'; categoryName = 'Công nghệ & AI';
    } else if (t.includes('thầy') || t.includes('cô giáo') || t.includes('giáo viên') || t.includes('giảng viên') || t.includes('nhà giáo')) {
        category = 'teacher'; categoryName = 'Chân dung nhà giáo';
    }

    if (t.includes('cntt') || t.includes('công nghệ') || /\bai\b/.test(t) || t.includes('phần mềm')) industry = 'tech';
    else if (t.includes('kinh tế') || t.includes('marketing') || t.includes('quản trị') || t.includes('kinh doanh')) industry = 'business';
    else if (t.includes('y khoa') || t.includes('dược') || t.includes('bác sĩ') || t.includes('y tế')) industry = 'medical';
    else if (t.includes('thiết kế') || t.includes('mỹ thuật') || t.includes('kiến trúc')) industry = 'design';
    else if (t.includes('ngôn ngữ') || t.includes('tiếng anh') || t.includes('truyền thông') || t.includes('báo chí')) industry = 'language';

    return { category, categoryName, industry };
}

async function syncTuoiTreNews() {
    try {
        console.log('Đang kiểm tra tin tức mới từ Tuổi Trẻ RSS...');
        const feed = await parser.parseURL(TUOITRE_EDU_RSS);
        const items = feed.items.slice(0, 60);// Giới hạn cào 25 bài mới nhất để tránh quá tải

        // 1. Lấy toàn bộ link từ RSS và kiểm tra xem link nào ĐÃ CÓ trong MongoDB
        const rssLinks = items.map(item => item.link);
        const existingDocs = await TinTuc.find({ link: { $in: rssLinks } }).select('link').lean();
        const existingLinks = new Set(existingDocs.map(doc => doc.link));

        // 2. Lọc ra CHỈ những bài chưa từng cào
        const newItems = items.filter(item => !existingLinks.has(item.link));

        if (newItems.length === 0) {
            console.log('Không có tin tức mới nào để cào.');
            return { total: 0, added: 0 };
        }

        console.log(` Phát hiện ${newItems.length} bài viết mới. Đang cào nội dung chi tiết...`);
        const newDocs = [];

        // 3. Chỉ chạy Cheerio cho các bài mới
        for (const item of newItems) {
            const snippet = (item.contentSnippet || item.content || '').trim();
            const image = item.enclosure?.url || DEFAULT_IMAGE;
            const author = item.author || item.creator || 'Báo Tuổi Trẻ';
            const pubDate = item.isoDate ? new Date(item.isoDate) : new Date();
            const { category, categoryName, industry } = autoClassify(item.title + ' ' + snippet);

            const fullHtml = await scrapeArticleHtml(item.link, snippet);
            const docId = 'tt_' + crypto.createHash('md5').update(item.link).digest('hex').slice(0, 12);

            newDocs.push({
                _id: docId,
                title: item.title,
                link: item.link,
                snippet,
                image,
                author,
                pubDate,
                category,
                categoryName,
                industry,
                views: Math.floor(Math.random() * 300) + 50,
                likes: Math.floor(Math.random() * 50) + 5,
                html_str: fullHtml,
                trangThai: true
            });
        }

        // 4. Lưu hàng loạt các bài mới vào MongoDB
        await TinTuc.insertMany(newDocs, { ordered: false });
        console.log(`Đã cào và lưu thêm ${newDocs.length} bài viết mới!`);
        return { total: items.length, added: newDocs.length };

    } catch (error) {
        console.error(' Lỗi khi cào RSS Tuổi Trẻ:', error.message);
        throw error;
    }
}

module.exports = { syncTuoiTreNews };