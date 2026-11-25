renderLayout('nav-news');

let articlesData = [];
let currentCategory = 'all';
let currentSearchKeyword = '';
let currentIndustry = 'all';
let currentSort = 'newest';
let displayedCount = 6;
let currentViewingArticle = null;

// Tính thời gian đọc ước lượng từ độ dài nội dung HTML
function estimateReadTime(html) {
    const text = (html || '').replace(/<[^>]*>?/gm, '');
    const words = text.trim().split(/\s+/).length;
    const mins = Math.max(2, Math.ceil(words / 200));
    return `${mins} phút đọc`;
}

// 1. Gọi API lấy dữ liệu từ MongoDB
async function fetchNewsFromDB() {
    try {
        const res = await fetch('/api/news');
        const json = await res.json();
        if (json.success) {
            articlesData = json.data.map(item => ({
                id: item._id,
                title: item.title,
                link: item.link,
                snippet: item.snippet,
                category: item.category || 'school',
                categoryName: item.categoryName || 'Nhịp sống học đường',
                industry: item.industry || 'all',
                author: item.author || 'Báo Tuổi Trẻ',
                timestamp: new Date(item.pubDate).getTime(),
                date: new Date(item.pubDate).toLocaleDateString('vi-VN'),
                readTime: estimateReadTime(item.html_str),
                image: item.image,
                views: item.views || 0,
                likes: item.likes || 0,
                isLiked: false,
                content: null // sẽ được load khi mở modal
            }));
            updateIndustryCounts();
            handleSearchAndFilter();
        }
    } catch (err) {
        console.error('Lỗi tải tin tức:', err);
    }
}

// Cập nhật số lượng bài viết thật cho Widget 3
function updateIndustryCounts() {
    ['tech', 'business', 'medical', 'design'].forEach(ind => {
        const el = document.getElementById(`count-${ind}`);
        if (el) {
            const count = articlesData.filter(a => a.industry === ind).length;
            el.innerText = `${count} bài`;
        }
    });
}

function renderArticlesFeed(items) {
    const grid = document.getElementById('articles-feed-grid');
    const btnLoadMore = document.getElementById('btn-load-more');
    document.getElementById('news-count').innerText = items.length;
    grid.innerHTML = '';

    if (items.length === 0) {
        if (btnLoadMore) btnLoadMore.style.display = 'none';
        grid.innerHTML = `<div class="col-span-full p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm"><h4 class="font-bold text-navy text-base">Không tìm thấy bài viết phù hợp</h4></div>`;
        return;
    }

    items.slice(0, displayedCount).forEach(item => {
        const card = document.createElement('div');
        card.className = 'glass-card bg-white/95 rounded-3xl overflow-hidden border border-navy/5 hover:border-cyan/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer';
        card.onclick = () => openArticleModal(item.id);
        card.innerHTML = `
            <div>
                <div class="relative h-44 w-full overflow-hidden">
                    <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <span class="absolute top-3 left-3 bg-white/90 text-navy text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">${item.categoryName}</span>
                </div>
                <div class="p-5">
                    <h3 class="font-black text-sm text-navy group-hover:text-cyan line-clamp-2">${item.title}</h3>
                    <p class="text-xs text-muted line-clamp-2 mt-2">${item.snippet}</p>
                </div>
            </div>
            <div class="px-5 pb-5 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-muted">
                <div class="flex items-center gap-3">
                    <span class="flex items-center gap-1"><i data-lucide="eye" class="w-3.5 h-3.5"></i> ${item.views}</span>
                    <button onclick="toggleArticleLike('${item.id}', event)" class="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-red-50 ${item.isLiked ? 'text-red-500 font-bold' : 'hover:text-red-500'}">
                        <i data-lucide="heart" class="w-3.5 h-3.5 ${item.isLiked ? 'fill-red-500 text-red-500' : 'text-red-400'}"></i> <span>${item.likes}</span>
                    </button>
                </div>
                <span class="text-cyan font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">Đọc tiếp <i data-lucide="arrow-right" class="w-3 h-3"></i></span>
            </div>
        `;
        grid.appendChild(card);
    });

    // Tự động ẩn/hiện nút "Xem thêm bài viết khác"
    if (btnLoadMore) {
        btnLoadMore.style.display = displayedCount >= items.length ? 'none' : 'flex';
    }
    lucide.createIcons();
}

function toggleArticleLike(id, event) {
    if (event) event.stopPropagation();
    const article = articlesData.find(a => a.id === id);
    if (!article) return;
    article.isLiked = !article.isLiked;
    article.likes += article.isLiked ? 1 : -1;
    handleSearchAndFilter();
}

function handleSearchAndFilter() {
    currentSearchKeyword = document.getElementById('news-search-input').value.trim().toLowerCase();
    currentIndustry = document.getElementById('filter-industry').value;
    currentSort = document.getElementById('news-sort-select').value;

    let filtered = articlesData.filter(item => {
        const matchKeyword = !currentSearchKeyword ||
            item.title.toLowerCase().includes(currentSearchKeyword) ||
            item.snippet.toLowerCase().includes(currentSearchKeyword);
        return matchKeyword &&
            (currentCategory === 'all' || item.category === currentCategory) &&
            (currentIndustry === 'all' || item.industry === currentIndustry);
    });

    if (currentSort === 'newest') filtered.sort((a, b) => b.timestamp - a.timestamp);
    else if (currentSort === 'views') filtered.sort((a, b) => b.views - a.views);
    else if (currentSort === 'likes') filtered.sort((a, b) => b.likes - a.likes);

    renderArticlesFeed(filtered);
}

function selectCategory(cat, btn) {
    currentCategory = cat;
    displayedCount = 6;
    document.querySelectorAll('.cat-pill').forEach(b => {
        b.className = 'cat-pill px-4 py-2 rounded-xl bg-white border border-gray-200 text-muted hover:text-cyan hover:border-cyan whitespace-nowrap transition-all';
    });
    btn.className = 'cat-pill active px-4 py-2 rounded-xl bg-cyan text-white shadow-sm whitespace-nowrap transition-all font-bold';
    handleSearchAndFilter();
}

// Hàm xử lý khi bấm vào các thẻ #Từ khóa nổi bật
function searchByTag(tag) {
    const input = document.getElementById('news-search-input');
    input.value = tag;
    displayedCount = 6;
    handleSearchAndFilter();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function filterByIndustryShortcut(ind) {
    document.getElementById('filter-industry').value = ind;
    displayedCount = 6;
    handleSearchAndFilter();
}

function loadMoreArticles() {
    displayedCount += 6;
    handleSearchAndFilter();
}

async function openArticleModal(id) {
    const article = articlesData.find(a => a.id === id) || articlesData[0];
    if (!article) return;
    currentViewingArticle = article;

    document.getElementById('modal-category-badge').innerText = article.categoryName;
    document.getElementById('modal-title').innerText = article.title;
    document.getElementById('modal-author').innerText = article.author;
    document.getElementById('modal-date').innerText = article.date;
    document.getElementById('modal-read-time').innerText = article.readTime;
    document.getElementById('modal-image').src = article.image;

    const modalContentEl = document.getElementById('modal-content');
    const modal = document.getElementById('article-detail-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        document.getElementById('article-modal-box').classList.remove('scale-95', 'opacity-0');
        document.getElementById('article-modal-box').classList.add('scale-100', 'opacity-100');
    }, 10);
    lucide.createIcons();

    // Nếu bài này đã tải nội dung rồi thì hiển thị luôn (không gọi lại API)
    if (article.content) {
        modalContentEl.innerHTML = article.content;
        return;
    }

    // Hiển thị trạng thái đang tải trong lúc gọi /api/news/:id
    modalContentEl.innerHTML = `<p class="text-center text-muted py-8">Đang tải nội dung bài viết...</p>`;

    try {
        const res = await fetch(`/api/news/${encodeURIComponent(article.id)}`);
        const json = await res.json();

        if (json.success && json.data) {
            const detailHtml = json.data.html_str || `<p>${article.snippet}</p>`;
            article.content = `
                ${detailHtml}
                <div class="pt-4">
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer" 
                       class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan/10 text-cyan hover:bg-cyan hover:text-white font-bold text-xs transition-all">
                        Đọc toàn bộ bài viết gốc trên Báo Tuổi Trẻ ↗
                    </a>
                </div>
            `;
            // Cập nhật lại lượt xem mới tăng từ server
            if (typeof json.data.views === 'number') {
                article.views = json.data.views;
                handleSearchAndFilter();
            }
            // Chỉ đổ nội dung nếu người dùng vẫn đang mở đúng bài này
            if (currentViewingArticle?.id === article.id) {
                modalContentEl.innerHTML = article.content;
            }
        } else {
            modalContentEl.innerHTML = `<p class="text-red-500">Không thể tải nội dung bài viết.</p>`;
        }
    } catch (err) {
        console.error('Lỗi tải chi tiết bài viết:', err);
        modalContentEl.innerHTML = `<p class="text-red-500">Có lỗi xảy ra khi tải nội dung.</p>`;
    }
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