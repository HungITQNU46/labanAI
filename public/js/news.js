renderLayout('nav-news');

const articlesData = [
    {
        id: 'news-1',
        title: 'Học Kỹ Thuật Phần Mềm Năm 2026: Cần Trình Độ Tiếng Anh & Thuật Toán Như Thế Nào?',
        snippet: 'Nhu cầu nhân lực phần mềm chất lượng cao tại Việt Nam tiếp tục bùng nổ, đặc biệt ở phân khúc lập trình viên kết hợp AI và xử lý ngôn ngữ tự nhiên.',
        category: 'trend',
        categoryName: 'Xu hướng nghề & AI',
        block: 'A01',
        industry: 'tech',
        targetMajor: 'Kỹ thuật phần mềm',
        author: 'ThS. Trần Quang Huy',
        date: '30/09/2026',
        readTime: '5 phút đọc',
        image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
        views: 2450,
        likes: 182,
        isLiked: false,
        content: `<p>Trong năm 2026, các doanh nghiệp công nghệ hàng đầu đang chuyển dịch tiêu chuẩn tuyển dụng kỹ sư phần mềm từ việc "viết code thủ công" sang "tối ưu kiến trúc hệ thống".</p>`
    },
    {
        id: 'news-2',
        title: 'Bí Quyết Phân Bổ Nguyện Vọng Đại Học 2026: Tránh Rủi Ro Bằng Chiến Lược Bậc Thang',
        snippet: 'Hướng dẫn chi tiết cách chia cơ cấu nguyện vọng thành 3 tầng: Ước mơ (NV1-2), Vừa sức (NV3-5) và Lót nền chắc chắn đỗ (NV6 trở đi).',
        category: 'admission',
        categoryName: 'Thông tin tuyển sinh',
        block: 'A00',
        industry: 'business',
        targetMajor: 'Quản trị kinh doanh',
        author: 'Ban Tuyển Sinh Laban',
        date: '27/09/2026',
        readTime: '6 phút đọc',
        image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
        views: 3120,
        likes: 295,
        isLiked: false,
        content: `<p>Chiến lược bậc thang được Laban.ai tối ưu hoá tự động giúp bạn phân lớp điểm số chênh lệch dự kiến từ 0.5 đến 2 điểm để đạt hiệu quả trúng tuyển 100%.</p>`
    }
];

let currentCategory = 'all', currentSearchKeyword = '', currentBlock = 'all', currentIndustry = 'all', currentSort = 'newest', displayedCount = 6, currentViewingArticle = null;

function renderArticlesFeed(items) {
    const grid = document.getElementById('articles-feed-grid');
    document.getElementById('news-count').innerText = items.length;
    grid.innerHTML = '';

    if (items.length === 0) return grid.innerHTML = `<div class="col-span-full p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm"><h4 class="font-bold text-navy text-base">Không tìm thấy bài viết phù hợp</h4></div>`;

    items.slice(0, displayedCount).forEach(item => {
        const card = document.createElement('div');
        card.className = 'glass-card bg-white/95 rounded-3xl overflow-hidden border border-navy/5 hover:border-cyan/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer';
        card.onclick = () => openArticleModal(item.id);
        card.innerHTML = `
            <div>
                <div class="relative h-44 w-full overflow-hidden"><img src="${item.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"><span class="absolute top-3 left-3 bg-white/90 text-navy text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">${item.categoryName}</span></div>
                <div class="p-5"><h3 class="font-black text-sm text-navy group-hover:text-cyan line-clamp-2">${item.title}</h3><p class="text-xs text-muted line-clamp-2 mt-2">${item.snippet}</p></div>
            </div>
            <div class="px-5 pb-5 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-muted">
                <div class="flex items-center gap-3">
                    <span class="flex items-center gap-1"><i data-lucide="eye" class="w-3.5 h-3.5"></i> ${item.views}</span>
                    <button onclick="toggleArticleLike('${item.id}', event)" class="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-red-50 ${item.isLiked ? 'text-red-500 font-bold' : 'hover:text-red-500'}"><i data-lucide="heart" class="w-3.5 h-3.5 ${item.isLiked ? 'fill-red-500 text-red-500' : 'text-red-400'}"></i> <span>${item.likes}</span></button>
                </div>
                <span class="text-cyan font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">Đọc tiếp <i data-lucide="arrow-right" class="w-3 h-3"></i></span>
            </div>
        `;
        grid.appendChild(card);
    });
    lucide.createIcons();
}

function toggleArticleLike(id, event) {
    if (event) event.stopPropagation();
    const article = articlesData.find(a => a.id === id); if (!article) return;
    article.isLiked = !article.isLiked; article.likes += article.isLiked ? 1 : -1;
    handleSearchAndFilter();
}

function handleSearchAndFilter() {
    currentSearchKeyword = document.getElementById('news-search-input').value.trim().toLowerCase();
    currentBlock = document.getElementById('filter-block').value; currentIndustry = document.getElementById('filter-industry').value; currentSort = document.getElementById('news-sort-select').value;
    let filtered = articlesData.filter(item => {
        const matchKeyword = !currentSearchKeyword || item.title.toLowerCase().includes(currentSearchKeyword) || item.snippet.toLowerCase().includes(currentSearchKeyword);
        return matchKeyword && (currentCategory === 'all' || item.category === currentCategory) && (currentBlock === 'all' || item.block === currentBlock) && (currentIndustry === 'all' || item.industry === currentIndustry);
    });
    if (currentSort === 'newest') filtered.sort((a, b) => b.id.localeCompare(a.id));
    else if (currentSort === 'views') filtered.sort((a, b) => b.views - a.views);
    else if (currentSort === 'likes') filtered.sort((a, b) => b.likes - a.likes);
    renderArticlesFeed(filtered);
}

function selectCategory(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(b => b.className = 'cat-pill px-4 py-2 rounded-xl bg-white border border-gray-200 text-muted hover:text-cyan hover:border-cyan whitespace-nowrap transition-all');
    btn.className = 'cat-pill active px-4 py-2 rounded-xl bg-cyan text-white shadow-sm whitespace-nowrap transition-all font-bold';
    handleSearchAndFilter();
}
function filterByIndustryShortcut(ind) { document.getElementById('filter-industry').value = ind; handleSearchAndFilter(); }
function loadMoreArticles() { displayedCount += 4; handleSearchAndFilter(); }

function openArticleModal(id) {
    let article = articlesData.find(a => a.id === id);
    if (!article) article = articlesData[0];
    currentViewingArticle = article;
    document.getElementById('modal-category-badge').innerText = article.categoryName; document.getElementById('modal-title').innerText = article.title;
    document.getElementById('modal-author').innerText = article.author; document.getElementById('modal-image').src = article.image;
    document.getElementById('modal-content').innerHTML = article.content;
    const modal = document.getElementById('article-detail-modal'); modal.classList.remove('hidden'); modal.classList.add('flex');
    setTimeout(() => { document.getElementById('article-modal-box').classList.remove('scale-95', 'opacity-0'); document.getElementById('article-modal-box').classList.add('scale-100', 'opacity-100'); }, 10);
    lucide.createIcons();
}
function closeArticleModal() {
    document.getElementById('article-modal-box').classList.remove('scale-100', 'opacity-100'); document.getElementById('article-modal-box').classList.add('scale-95', 'opacity-0');
    setTimeout(() => { document.getElementById('article-detail-modal').classList.add('hidden'); document.getElementById('article-detail-modal').classList.remove('flex'); }, 200);
}
function copyArticleLink() { alert('Đã sao chép liên kết bài viết vào bộ nhớ tạm!'); }

window.addEventListener('DOMContentLoaded', () => { handleSearchAndFilter(); });