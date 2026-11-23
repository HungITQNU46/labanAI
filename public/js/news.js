renderLayout('nav-news');

const NEWS_SESSION_CACHE_KEY = 'laban_news_cache_v2';
const NEWS_CLIENT_CACHE_TTL = 2 * 60 * 1000;

let articlesData = [];
const articleDetailCache = new Map();
let currentCategory = 'all';
let currentSearchKeyword = '';
let currentIndustry = 'all';
let currentSort = 'newest';
let displayedCount = 6;
let currentViewingArticle = null;
let searchDebounceTimer = null;

function escapeHtml(text = '') {
    return String(text).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[ch]);
}

function highlightKeyword(text, keyword) {
    const safeText = escapeHtml(text);
    const cleanKey = (keyword || '').trim();
    if (!cleanKey) return safeText;

    const escapedRegex = cleanKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedRegex})`, 'gi');
    return safeText.replace(
        regex,
        '<mark class="bg-cyan/20 text-cyan font-extrabold px-1 rounded">$1</mark>'
    );
}

function formatRelativeTime(timestamp) {
    if (!timestamp || Number.isNaN(timestamp)) return 'Gần đây';
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa đăng';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays <= 7) return `${diffDays} ngày trước`;
    return new Date(timestamp).toLocaleDateString('vi-VN');
}

function smartExcerpt(text = '', maxLen = 135) {
    const clean = String(text)
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (clean.length <= maxLen) return clean;
    const cut = clean.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > 75 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:\-–]+$/, '')}…`;
}

function renderLoadingSkeleton(count = 6) {
    const grid = document.getElementById('articles-feed-grid');
    if (!grid) return;

    grid.innerHTML = Array.from({ length: count }).map(() => `
        <div class="glass-card rounded-3xl overflow-hidden border border-navy/5 animate-pulse flex flex-col">
            <div class="h-44 w-full bg-slate-200/70 dark:bg-slate-800/70"></div>
            <div class="p-5 space-y-3 flex-1">
                <div class="flex gap-2">
                    <div class="h-3 w-20 rounded bg-slate-200/80 dark:bg-slate-700/70"></div>
                    <div class="h-3 w-16 rounded bg-slate-200/60 dark:bg-slate-700/50"></div>
                </div>
                <div class="h-4 w-full rounded bg-slate-200/90 dark:bg-slate-700/80"></div>
                <div class="h-4 w-4/5 rounded bg-slate-200/80 dark:bg-slate-700/70"></div>
                <div class="h-3 w-full rounded bg-slate-200/60 dark:bg-slate-800/70 mt-2"></div>
                <div class="h-3 w-2/3 rounded bg-slate-200/60 dark:bg-slate-800/70"></div>
            </div>
        </div>
    `).join('');
}

function mapRawArticles(rawData) {
    return (rawData || []).map((item) => {
        const ts = new Date(item.pubDate).getTime();
        const isFresh = !Number.isNaN(ts) && (Date.now() - ts) < 24 * 60 * 60 * 1000;
        return {
            id: item._id,
            title: item.title || 'Tin tuyển sinh mới',
            link: item.link || '#',
            snippet: smartExcerpt(item.snippet || '', 135),
            category: item.category || 'school',
            categoryName: item.categoryName || 'Nhịp sống học đường',
            industry: item.industry || 'all',
            author: item.author || 'Báo Tuổi Trẻ',
            timestamp: ts || 0,
            date: ts ? new Date(ts).toLocaleDateString('vi-VN') : 'Gần đây',
            relativeTime: formatRelativeTime(ts),
            isFresh,
            readTime: item.readTime || '3 phút đọc',
            image: item.image || '/images/team/dai-hoc-quy-nhon.jpg',
            views: item.views || 0,
            likes: item.likes || 0,
            isLiked: false,
            html_str: item.html_str || null
        };
    });
}

async function fetchNewsFromDB() {
    let hasRenderedCache = false;
    try {
        const cachedRaw = sessionStorage.getItem(NEWS_SESSION_CACHE_KEY);
        if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            if (Array.isArray(parsed.data) && parsed.data.length > 0) {
                articlesData = mapRawArticles(parsed.data);
                updateIndustryCounts();
                handleSearchAndFilter(true);
                hasRenderedCache = true;
                if (Date.now() - parsed.savedAt < NEWS_CLIENT_CACHE_TTL) return;
            }
        }
    } catch (_) {}

    if (!hasRenderedCache) {
        renderLoadingSkeleton(6);
    }

    try {
        const res = await fetch('/api/news');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            articlesData = mapRawArticles(json.data);
            try {
                sessionStorage.setItem(NEWS_SESSION_CACHE_KEY, JSON.stringify({
                    savedAt: Date.now(),
                    data: json.data
                }));
            } catch (_) {}

            updateIndustryCounts();
            handleSearchAndFilter(true);
        }
    } catch (err) {
        console.error('Lỗi tải tin tức:', err);
        if (!hasRenderedCache) {
            const grid = document.getElementById('articles-feed-grid');
            if (grid) {
                grid.innerHTML = `<div class="col-span-full p-10 text-center glass-card rounded-3xl"><p class="text-sm font-bold text-navy">Không thể tải tin tức lúc này. Vui lòng thử lại sau.</p></div>`;
            }
        }
    }
}

function updateIndustryCounts() {
    ['tech', 'business', 'medical', 'design'].forEach((ind) => {
        const el = document.getElementById(`count-${ind}`);
        if (el) {
            const count = articlesData.filter((a) => a.industry === ind).length;
            el.innerText = `${count} bài`;
        }
    });
}

function renderArticlesFeed(items) {
    const grid = document.getElementById('articles-feed-grid');
    const btnLoadMore = document.getElementById('btn-load-more');
    const countEl = document.getElementById('news-count');
    if (!grid) return;

    const visibleItems = items.slice(0, displayedCount);
    if (countEl) {
        countEl.innerText = items.length > visibleItems.length
            ? `${visibleItems.length}/${items.length}`
            : `${items.length}`;
    }

    if (items.length === 0) {
        if (btnLoadMore) btnLoadMore.style.display = 'none';
        const hint = currentSearchKeyword
            ? `Không có bài viết nào chứa từ khóa "${escapeHtml(currentSearchKeyword)}". Thử từ khóa ngắn hơn như "tuyển sinh", "AI" hoặc "học bổng".`
            : 'Hãy thử đổi chuyên mục hoặc nhóm ngành khác.';
        grid.innerHTML = `
            <div class="col-span-full p-12 text-center glass-card rounded-3xl border border-navy/5 shadow-sm">
                <h4 class="font-bold text-navy text-base">Không tìm thấy bài viết phù hợp</h4>
                <p class="text-xs text-muted mt-1.5">${hint}</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    visibleItems.forEach((item, index) => {
        const card = document.createElement('article');
        card.className = 'glass-card rounded-3xl overflow-hidden border border-navy/5 hover:border-cyan/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer';
        card.onclick = () => openArticleModal(item.id);

        const titleHtml = highlightKeyword(item.title, currentSearchKeyword);
        const snippetHtml = highlightKeyword(item.snippet, currentSearchKeyword);
        const loadingAttr = index < 2 ? 'eager' : 'lazy';

        card.innerHTML = `
            <div>
                <div class="relative h-44 w-full overflow-hidden bg-slate-200/60 dark:bg-slate-800/60">
                    <img
                        src="${escapeHtml(item.image)}"
                        alt="${escapeHtml(item.title)}"
                        loading="${loadingAttr}"
                        decoding="async"
                        onerror="this.onerror=null;this.src='/images/team/dai-hoc-quy-nhon.jpg';"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    >
                    <div class="absolute inset-x-0 top-0 p-3 flex items-center justify-between gap-2 pointer-events-none">
                        <span class="bg-white/90 dark:bg-slate-900/85 backdrop-blur-md text-navy text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg shadow-sm">
                            ${escapeHtml(item.categoryName)}
                        </span>
                        ${item.isFresh ? '<span class="bg-cyan text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm">Mới</span>' : ''}
                    </div>
                </div>
                <div class="p-5">
                    <div class="flex items-center gap-2 text-[11px] font-semibold text-muted mb-2">
                        <span class="text-cyan font-bold">${escapeHtml(item.relativeTime)}</span>
                        <span>•</span>
                        <span>${escapeHtml(item.readTime)}</span>
                    </div>
                    <h3 class="font-extrabold text-[15px] text-navy group-hover:text-cyan transition-colors leading-snug line-clamp-2">
                        ${titleHtml}
                    </h3>
                    <p class="text-xs text-muted leading-relaxed line-clamp-2 mt-2">
                        ${snippetHtml}
                    </p>
                </div>
            </div>
            <div class="px-5 pb-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] text-muted">
                <div class="flex items-center gap-3">
                    <span class="flex items-center gap-1"><i data-lucide="eye" class="w-3.5 h-3.5"></i> ${item.views}</span>
                    <button onclick="toggleArticleLike('${item.id}', event)" class="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 ${item.isLiked ? 'text-red-500 font-bold' : 'hover:text-red-500'}">
                        <i data-lucide="heart" class="w-3.5 h-3.5 ${item.isLiked ? 'fill-red-500 text-red-500' : 'text-red-400'}"></i>
                        <span>${item.likes}</span>
                    </button>
                </div>
                <span class="text-cyan font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Đọc tiếp <i data-lucide="arrow-right" class="w-3 h-3"></i>
                </span>
            </div>
        `;
        fragment.appendChild(card);
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);

    if (btnLoadMore) {
        btnLoadMore.style.display = displayedCount >= items.length ? 'none' : 'flex';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleArticleLike(id, event) {
    if (event) event.stopPropagation();
    const article = articlesData.find((a) => a.id === id);
    if (!article) return;
    article.isLiked = !article.isLiked;
    article.likes += article.isLiked ? 1 : -1;
    handleSearchAndFilter(true);
}

function handleSearchAndFilter(immediate = false) {
    const runFilter = () => {
        const searchEl = document.getElementById('news-search-input');
        const indEl = document.getElementById('filter-industry');
        const sortEl = document.getElementById('news-sort-select');

        currentSearchKeyword = (searchEl?.value || '').trim().toLowerCase();
        currentIndustry = indEl?.value || 'all';
        currentSort = sortEl?.value || 'newest';

        const filtered = articlesData.filter((item) => {
            const matchKeyword = !currentSearchKeyword
                || item.title.toLowerCase().includes(currentSearchKeyword)
                || item.snippet.toLowerCase().includes(currentSearchKeyword);
            return matchKeyword
                && (currentCategory === 'all' || item.category === currentCategory)
                && (currentIndustry === 'all' || item.industry === currentIndustry);
        });

        if (currentSort === 'newest') filtered.sort((a, b) => b.timestamp - a.timestamp);
        else if (currentSort === 'views') filtered.sort((a, b) => b.views - a.views);
        else if (currentSort === 'likes') filtered.sort((a, b) => b.likes - a.likes);

        renderArticlesFeed(filtered);
    };

    if (immediate) {
        clearTimeout(searchDebounceTimer);
        runFilter();
    } else {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(runFilter, 180);
    }
}

function selectCategory(cat, btn) {
    currentCategory = cat;
    displayedCount = 6;
    document.querySelectorAll('.cat-pill').forEach((b) => {
        b.className = 'cat-pill px-4 py-2 rounded-xl bg-white border border-gray-200 text-muted hover:text-cyan hover:border-cyan whitespace-nowrap transition-all';
    });
    btn.className = 'cat-pill active px-4 py-2 rounded-xl bg-cyan text-white shadow-sm whitespace-nowrap transition-all font-bold';
    handleSearchAndFilter(true);
}

function searchByTag(tag) {
    const input = document.getElementById('news-search-input');
    if (input) {
        input.value = tag;
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    displayedCount = 6;
    handleSearchAndFilter(true);
}

function filterByIndustryShortcut(ind) {
    const el = document.getElementById('filter-industry');
    if (el) el.value = ind;
    displayedCount = 6;
    handleSearchAndFilter(true);
}

function loadMoreArticles() {
    displayedCount += 6;
    handleSearchAndFilter(true);
}

function sanitizeArticleHtml(htmlStr, articleLink) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlStr || '';

    wrapper.querySelectorAll('a').forEach((a) => {
        const rawHref = (a.getAttribute('href') || '').trim();
        const text = (a.textContent || '').trim().toLowerCase();

        // 1. Nút "Đọc tiếp" -> mở trang chính của bài báo đó
        if (text.includes('đọc tiếp')) {
            a.setAttribute('href', articleLink || '#');
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.className = 'inline-flex items-center gap-1.5 text-cyan font-bold hover:underline mr-4';
            return;
        }

        // 2. Nút "Về trang Chủ đề" / "Về trang chủ" -> đóng popup, quay lại trang Tin tức
        if (text.includes('về trang chủ') || rawHref.includes('nhom-chu-de')) {
            a.setAttribute('href', '/news');
            a.removeAttribute('target');
            a.setAttribute('onclick', 'event.preventDefault(); closeArticleModal();');
            a.className = 'inline-flex items-center gap-1.5 text-muted hover:text-cyan font-semibold cursor-pointer';
            return;
        }

        // 3. Các link tương đối khác từ Tuổi Trẻ (/...) -> ghép tên miền gốc để tránh lỗi Cannot GET
        if (rawHref.startsWith('/')) {
            a.setAttribute('href', `https://tuoitre.vn${rawHref}`);
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        } else if (rawHref.startsWith('http')) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        }
    });

    // Xử lý luôn ảnh dùng đường dẫn tương đối (nếu có) và bật tải lười
    wrapper.querySelectorAll('img').forEach((img) => {
        const src = (img.getAttribute('src') || '').trim();
        if (src.startsWith('/')) {
            img.setAttribute('src', `https://tuoitre.vn${src}`);
        }
        img.setAttribute('loading', 'lazy');
    });

    return wrapper.innerHTML;
}

function buildArticleModalContent(htmlStr, link) {
    const cleanHtml = sanitizeArticleHtml(htmlStr, link);
    return `
        <div class="space-y-4 leading-relaxed">${cleanHtml}</div>
        <div class="pt-5">
            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan/10 text-cyan hover:bg-cyan hover:text-white font-bold text-xs transition-all">
                Đọc toàn bộ bài viết gốc trên Báo Tuổi Trẻ ↗
            </a>
        </div>
    `;
}

async function openArticleModal(id) {
    const article = articlesData.find((a) => a.id === id) || articlesData[0];
    if (!article) return;
    currentViewingArticle = article;

    document.getElementById('modal-category-badge').innerText = article.categoryName;
    document.getElementById('modal-title').innerText = article.title;
    document.getElementById('modal-author').innerText = article.author;
    document.getElementById('modal-date').innerText = `${article.relativeTime} (${article.date})`;
    document.getElementById('modal-read-time').innerText = article.readTime;
    document.getElementById('modal-image').src = article.image;

    const contentEl = document.getElementById('modal-content');
    const modal = document.getElementById('article-detail-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        document.getElementById('article-modal-box').classList.remove('scale-95', 'opacity-0');
        document.getElementById('article-modal-box').classList.add('scale-100', 'opacity-100');
    }, 10);

    const cachedHtml = articleDetailCache.get(article.id) || article.html_str;
    if (cachedHtml) {
        contentEl.innerHTML = buildArticleModalContent(cachedHtml, article.link);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    contentEl.innerHTML = `
        <p class="text-sm text-navy/85 leading-relaxed mb-4">${escapeHtml(article.snippet)}</p>
        <div class="flex items-center gap-2 text-xs text-cyan font-semibold py-2">
            <span class="w-4 h-4 border-2 border-cyan border-t-transparent rounded-full animate-spin inline-block"></span>
            Đang tải nội dung chi tiết...
        </div>
    `;

    try {
        const res = await fetch(`/api/news/${encodeURIComponent(article.id)}`);
        const json = await res.json();
        if (json.success && json.data?.html_str) {
            articleDetailCache.set(article.id, json.data.html_str);
            article.views = json.data.views || (article.views + 1);
            if (currentViewingArticle?.id === article.id) {
                contentEl.innerHTML = buildArticleModalContent(json.data.html_str, article.link);
            }
        } else {
            contentEl.innerHTML = buildArticleModalContent(`<p>${escapeHtml(article.snippet)}</p>`, article.link);
        }
    } catch (_) {
        contentEl.innerHTML = buildArticleModalContent(`<p>${escapeHtml(article.snippet)}</p>`, article.link);
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeArticleModal() {
    document.getElementById('article-modal-box').classList.remove('scale-100', 'opacity-100');
    document.getElementById('article-modal-box').classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        document.getElementById('article-detail-modal').classList.add('hidden');
        document.getElementById('article-detail-modal').classList.remove('flex');
    }, 200);
}

function copyArticleLink() {
    const linkToCopy = currentViewingArticle?.link || window.location.href;
    navigator.clipboard.writeText(linkToCopy).then(() => {
        document.getElementById('modal-copy-text').innerText = 'Đã sao chép!';
        setTimeout(() => { document.getElementById('modal-copy-text').innerText = 'Sao chép liên kết'; }, 2000);
    });
}

window.addEventListener('DOMContentLoaded', () => { fetchNewsFromDB(); });