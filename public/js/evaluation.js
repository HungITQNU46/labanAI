renderLayout('nav-eval');
if (!checkLoginState()) window.location.href = '/';

let userScores = { toan: 8.5, van: 7.0, anh: 9.0, ly: 8.0, hoa: 7.5, sinh: 6.5, su: 7.0, dia: 7.5, tin: 9.0 };

function calculateBlockScores() {
    return {
        A00: +(userScores.toan + userScores.ly + userScores.hoa).toFixed(2),
        A01: +(userScores.toan + userScores.ly + userScores.anh).toFixed(2),
        D01: +(userScores.toan + userScores.van + userScores.anh).toFixed(2),
        D07: +(userScores.toan + userScores.hoa + userScores.anh).toFixed(2),
        C00: +(userScores.van + userScores.su + userScores.dia).toFixed(2)
    };
}

function updateSummaryDisplay() {
    const blocks = calculateBlockScores();
    document.getElementById('score-a01').innerText = blocks.A01; document.getElementById('score-d01').innerText = blocks.D01;
    document.getElementById('score-a00').innerText = blocks.A00; document.getElementById('score-d07').innerText = blocks.D07; document.getElementById('score-c00').innerText = blocks.C00;
    document.getElementById('disp-toan').innerText = userScores.toan; document.getElementById('disp-van').innerText = userScores.van;
    document.getElementById('disp-anh').innerText = userScores.anh; document.getElementById('disp-ly').innerText = userScores.ly;
    document.getElementById('disp-hoa').innerText = userScores.hoa; document.getElementById('disp-tin').innerText = userScores.tin;
}

const universitiesData = [
    { id: 'QNU-CNTT', schoolName: 'Đại học Quy Nhơn (QNU)', schoolCode: 'DQN', region: 'central', majorName: 'Công nghệ thông tin', majorCode: '7480201', majorGroup: 'it', group: 'A01', method: 'thpt', type: 'Công lập', cutoff2023: 21.50, cutoff2024: 22.00, cutoff2025: 22.50, predictedCutoff: 23.00, probability: 92, risk: 'safe', avatarBg: 'bg-blue-600' },
    { id: 'BKDN-CNTT', schoolName: 'ĐH Bách Khoa - ĐH Đà Nẵng', schoolCode: 'DDK', region: 'central', majorName: 'Kỹ thuật Phần mềm', majorCode: '7480103', majorGroup: 'it', group: 'A01', method: 'thpt', type: 'Công lập', cutoff2023: 25.85, cutoff2024: 26.20, cutoff2025: 26.00, predictedCutoff: 26.15, probability: 58, risk: 'dream', avatarBg: 'bg-red-600' },
    { id: 'UIT-DS', schoolName: 'ĐH Công nghệ Thông tin - TP.HCM', schoolCode: 'QSC', region: 'south', majorName: 'Khoa học Dữ liệu', majorCode: '7480109', majorGroup: 'it', group: 'A01', method: 'thpt', type: 'Công lập', cutoff2023: 25.20, cutoff2024: 25.50, cutoff2025: 25.40, predictedCutoff: 25.35, probability: 74, risk: 'moderate', avatarBg: 'bg-cyan-600' },
    { id: 'UEH-MKT', schoolName: 'Đại học Kinh tế TP.HCM (UEH)', schoolCode: 'KSA', region: 'south', majorName: 'Marketing Số (Digital Marketing)', majorCode: '7340115', majorGroup: 'econ', group: 'D01', method: 'thpt', type: 'Công lập', cutoff2023: 26.50, cutoff2024: 26.80, cutoff2025: 26.70, predictedCutoff: 26.75, probability: 48, risk: 'dream', avatarBg: 'bg-amber-600' },
    { id: 'QNU-KTPM', schoolName: 'Đại học Quy Nhơn (QNU)', schoolCode: 'DQN', region: 'central', majorName: 'Kỹ thuật Điện tử - Viễn thông', majorCode: '7520207', majorGroup: 'eng', group: 'A00', method: 'thpt', type: 'Công lập', cutoff2023: 18.00, cutoff2024: 19.00, cutoff2025: 19.50, predictedCutoff: 20.00, probability: 95, risk: 'safe', avatarBg: 'bg-emerald-600' }
];

let wishlist = [ { priority: 1, ...universitiesData[1] }, { priority: 2, ...universitiesData[2] }, { priority: 3, ...universitiesData[0] } ];

// 1. ĐỌC DỮ LIỆU JSON TỪ BACKEND (EJS) TRUYỀN SANG
const hollandDataElement = document.getElementById('holland-data');
let riasecQuestions = [];
if (hollandDataElement && hollandDataElement.textContent.trim() !== '') {
    riasecQuestions = JSON.parse(hollandDataElement.textContent);
}

const likertScale = [ 
    { value: 1, label: 'Rất không thích' }, 
    { value: 2, label: 'Không thích' }, 
    { value: 3, label: 'Phân vân / Không rõ' }, 
    { value: 4, label: 'Thích' }, 
    { value: 5, label: 'Rất thích' } 
];

// 2. VẼ DANH SÁCH 60 CÂU HỎI THẬT
function renderQuestions() {
    const questionsContainer = document.getElementById('questions-container');
    questionsContainer.innerHTML = '';

    // Kiểm tra nếu không có dữ liệu
    if (!riasecQuestions || riasecQuestions.length === 0) {
        questionsContainer.innerHTML = '<p class="text-sm text-muted mb-4 text-center">Không tải được dữ liệu câu hỏi từ máy chủ. Vui lòng tải lại trang.</p>';
        return;
    }
    
    riasecQuestions.forEach((q, index) => {
        const div = document.createElement('div');
        div.className = 'p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-cyan/50 hover:shadow-md transition-all';
        
        let optionsHTML = '';
        likertScale.forEach(scale => {
            optionsHTML += `
                <label class="likert-option group relative flex flex-col items-center cursor-pointer">
                    <input type="radio" name="${q.id}" value="${scale.value}" class="peer hidden eval-radio" onchange="updateProgress()">
                    <div class="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-sm font-bold text-gray-400 peer-checked:border-cyan peer-checked:bg-cyan peer-checked:text-white transition-all hover:border-cyan/50">
                        ${scale.value}
                    </div>
                    <span class="absolute -bottom-8 whitespace-nowrap bg-navy text-white text-[11px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-medium shadow-lg">${scale.label}</span>
                </label>
            `;
        });
        
        div.innerHTML = `
            <h4 class="text-navy font-semibold mb-6 text-lg leading-relaxed">
                <span class="text-cyan font-black mr-2">Câu ${index + 1}:</span> ${q.text}
            </h4>
            <div class="flex justify-between max-w-xl mx-auto px-4">${optionsHTML}</div>
        `;
        questionsContainer.appendChild(div);
    });
}

function updateProgress() { document.getElementById('q-progress').innerText = document.querySelectorAll('.eval-radio:checked').length; }

let currentStep = 1;
function updateUI() {
    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`step-${currentStep}`).classList.remove('hidden');

    document.getElementById('btn-prev').classList.toggle('hidden', currentStep === 1);
    document.getElementById('btn-next').classList.toggle('hidden', currentStep >= 2);
    document.getElementById('btn-submit').classList.toggle('hidden', currentStep !== 2);
    document.getElementById('progress-line').style.width = currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%';

    for (let i = 1; i <= 3; i++) {
        const stepIcon = document.querySelector(`#indicator-step-${i} div`), stepText = document.querySelector(`#indicator-step-${i} span`);
        if (i <= currentStep) { stepIcon.classList.replace('bg-gray-200', 'bg-cyan'); stepIcon.classList.replace('text-gray-400', 'text-white'); stepText.classList.replace('text-gray-400', 'text-navy'); } 
        else { stepIcon.classList.replace('bg-cyan', 'bg-gray-200'); stepIcon.classList.replace('text-white', 'text-gray-400'); stepText.classList.replace('text-navy', 'text-gray-400'); }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('btn-next').addEventListener('click', () => { 
    if (currentStep === 1) {
        userScores.toan = +document.getElementById('input-toan').value || 8.5; userScores.van = +document.getElementById('input-van').value || 7.0; userScores.anh = +document.getElementById('input-anh').value || 9.0;
        userScores.ly = +document.getElementById('input-ly').value || 8.0; userScores.hoa = +document.getElementById('input-hoa').value || 7.5; userScores.tin = +document.getElementById('input-tin').value || 9.0;
        updateSummaryDisplay();
    }
    if (currentStep < 2) { currentStep++; updateUI(); } 
});
document.getElementById('btn-prev').addEventListener('click', () => { if (currentStep > 1) { currentStep--; updateUI(); } });

document.getElementById('btn-cancel').addEventListener('click', () => { document.getElementById('cancel-modal').classList.remove('hidden'); document.getElementById('cancel-modal').classList.add('flex'); });
document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
    document.getElementById('cancel-modal').classList.add('hidden'); document.getElementById('cancel-modal').classList.remove('flex');
    document.querySelectorAll('.eval-input').forEach(input => input.value = ''); document.querySelectorAll('.eval-radio').forEach(radio => radio.checked = false);
    updateProgress(); currentStep = 1; updateUI();
});

document.getElementById('btn-submit').addEventListener('click', () => {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.remove('hidden'); loadingScreen.classList.add('flex');
    setTimeout(() => { loadingScreen.classList.add('hidden'); loadingScreen.classList.remove('flex'); currentStep = 3; updateUI(); renderChart(); }, 1800);
});

let myChart = null;
function renderChart() {
    const ctx = document.getElementById('riasecChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'radar',
        data: { labels: ['Thực tế (R)', 'Nghiên cứu (I)', 'Sáng tạo (A)', 'Xã hội (S)', 'Quản lý (E)', 'Nghiệp vụ (C)'], datasets: [{ data: [38, 44, 31, 40, 35, 28], backgroundColor: 'rgba(0, 180, 216, 0.25)', borderColor: 'rgba(0, 180, 216, 1)', pointBackgroundColor: 'rgba(123, 44, 191, 1)', borderWidth: 2, pointRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: 25 }, scales: { r: { angleLines: { color: 'rgba(15, 23, 42, 0.1)' }, grid: { color: 'rgba(15, 23, 42, 0.1)', circular: true }, pointLabels: { font: { size: 12, family: "'Inter', sans-serif", weight: 'bold' }, color: '#0F172A', padding: 15 }, min: 0, max: 50, ticks: { display: false } } }, plugins: { legend: { display: false } } }
    });
}

function triggerChatbotModal() { window.location.href = '/chatbot'; }

function openPredictionView() {
    document.getElementById('assessment-container').classList.add('hidden');
    document.getElementById('history-view').classList.add('hidden');
    document.getElementById('prediction-container').classList.remove('hidden');
    document.getElementById('bottom-assessment-controls').classList.add('hidden');
    document.getElementById('bottom-return-control').classList.remove('hidden');
    document.getElementById('page-heading').innerText = "Dự Đoán Khả Năng Trúng Tuyển Đại Học AI";
    document.getElementById('page-subheading').innerText = "Đối chiếu điểm số của bạn với phổ điểm thi, chỉ tiêu và điểm chuẩn dự kiến các trường ĐH.";
    updateSummaryDisplay(); applyPredictionFilters(); renderWishlist(); lucide.createIcons(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function returnToAssessment() {
    document.getElementById('prediction-container').classList.add('hidden');
    document.getElementById('history-view').classList.add('hidden');
    document.getElementById('assessment-container').classList.remove('hidden');
    document.getElementById('bottom-return-control').classList.add('hidden');
    document.getElementById('bottom-assessment-controls').classList.remove('hidden');
    document.getElementById('page-heading').innerText = "Đánh giá Năng lực & Định hướng";
    document.getElementById('page-subheading').innerText = "Khảo sát năng lực học tập và khám phá nghề nghiệp theo chuẩn Holland RIASEC.";
    lucide.createIcons(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPredictionCards(items) {
    const container = document.getElementById('prediction-cards-container');
    document.getElementById('pred-result-count').innerText = items.length;
    container.innerHTML = '';
    if (items.length === 0) return container.innerHTML = `<div class="col-span-full p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm"><h4 class="font-bold text-navy text-lg">Không tìm thấy ngành phù hợp</h4></div>`;
    const blockScores = calculateBlockScores();

    items.forEach(item => {
        const yourScore = blockScores[item.group] || 25.50, diff = +(yourScore - item.predictedCutoff).toFixed(2);
        const card = document.createElement('div');
        card.className = 'glass-card rounded-3xl p-6 hover:border-cyan/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative bg-white/95';
        card.innerHTML = `
            <div>
                <div class="flex items-center gap-3 mb-4"><div class="w-11 h-11 rounded-2xl ${item.avatarBg} text-white font-black text-sm flex items-center justify-center">${item.schoolCode}</div><div><span class="text-[10px] font-bold text-muted uppercase tracking-wider">${item.schoolCode} • ${item.type}</span><h4 class="font-bold text-navy text-sm line-clamp-1">${item.schoolName}</h4></div></div>
                <div class="mb-4"><h3 class="font-black text-navy text-base group-hover:text-cyan">${item.majorName}</h3><div class="text-xs text-muted mt-1">Mã: <b>${item.majorCode}</b> • Khối: <b>${item.group}</b></div></div>
                <div class="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 mb-4 text-xs"><div class="flex justify-between"><span>Điểm của bạn:</span><span class="font-black text-navy">${yourScore}</span></div><div class="flex justify-between"><span>Điểm chuẩn dự kiến:</span><span class="font-bold text-navy">${item.predictedCutoff}</span></div></div>
            </div>
            <div class="pt-3 border-t border-gray-100 space-y-3">
                <div class="flex justify-between items-center"><button onclick="openExplainModal('${item.id}')" class="text-xs font-bold text-cyan hover:underline flex items-center gap-1">Chi tiết AI <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></button></div>
                <button onclick="addToWishlist('${item.id}')" class="w-full py-2.5 rounded-xl border border-gray-200 font-bold text-xs text-navy hover:bg-cyan/10 hover:border-cyan hover:text-cyan transition-all flex items-center justify-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Thêm vào Nguyện vọng</button>
            </div>
        `;
        container.appendChild(card);
    });
    lucide.createIcons();
}

function applyPredictionFilters() {
    const keyword = document.getElementById('pred-filter-search').value.trim().toLowerCase(), region = document.getElementById('pred-filter-region').value, method = document.getElementById('pred-filter-method').value, majorGroup = document.getElementById('pred-filter-group').value, risk = document.getElementById('pred-filter-risk').value;
    let filtered = universitiesData.filter(item => {
        const matchKeyword = !keyword || item.schoolName.toLowerCase().includes(keyword) || item.majorName.toLowerCase().includes(keyword) || item.majorCode.toLowerCase().includes(keyword);
        return matchKeyword && (region === 'all' || item.region === region) && (method === 'all' || item.method === method) && (majorGroup === 'all' || item.majorGroup === majorGroup) && (risk === 'all' || item.risk === risk);
    });
    renderPredictionCards(filtered);
}

let trendChart = null, currentExplainItem = null;
function openExplainModal(id) {
    const item = universitiesData.find(u => u.id === id); if (!item) return; currentExplainItem = item;
    const yourScore = calculateBlockScores()[item.group] || 25.50;
    
    document.getElementById('explain-school-name').innerText = item.schoolName; document.getElementById('explain-major-title').innerText = item.majorName;
    document.getElementById('explain-major-code').innerText = item.majorCode; document.getElementById('explain-your-score').innerText = yourScore;
    document.getElementById('explain-cutoff').innerText = item.predictedCutoff; document.getElementById('explain-prob-text').innerText = `${item.probability}%`;

    const modal = document.getElementById('explain-modal'); modal.classList.remove('hidden'); modal.classList.add('flex');
    setTimeout(() => { document.getElementById('explain-modal-box').classList.remove('scale-95', 'opacity-0'); document.getElementById('explain-modal-box').classList.add('scale-100', 'opacity-100'); }, 10);
    setTimeout(() => { renderScoreTrendChart(item, yourScore); }, 120);
}
function closeExplainModal() {
    const box = document.getElementById('explain-modal-box'); box.classList.remove('scale-100', 'opacity-100'); box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { document.getElementById('explain-modal').classList.add('hidden'); document.getElementById('explain-modal').classList.remove('flex'); }, 200);
}

function renderScoreTrendChart(item, yourScore) {
    const ctx = document.getElementById('scoreTrendChart').getContext('2d'); if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
        type: 'line',
        data: { labels: ['Năm 2023', 'Năm 2024', 'Năm 2025', 'Dự kiến 2026'], datasets: [{ label: 'Điểm chuẩn trường', data: [item.cutoff2023, item.cutoff2024, item.cutoff2025, item.predictedCutoff], borderColor: '#00B4D8', backgroundColor: 'rgba(0, 180, 216, 0.15)', borderWidth: 3, fill: true, tension: 0.3, pointBackgroundColor: '#0077B6', pointRadius: 5 }, { label: 'Điểm của bạn', data: [yourScore, yourScore, yourScore, yourScore], borderColor: '#7B2CBF', borderWidth: 2, borderDash: [6, 6], pointRadius: 0, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: Math.floor(Math.min(item.cutoff2023, yourScore) - 2), max: Math.ceil(Math.max(item.predictedCutoff, yourScore) + 2) } } }
    });
}

function renderWishlist() {
    const container = document.getElementById('wishlist-drag-container'); container.innerHTML = '';
    if (wishlist.length === 0) return container.innerHTML = `<div class="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-sm text-muted">Bạn chưa thêm nguyện vọng nào.</div>`;
    wishlist.forEach((item, index) => {
        const row = document.createElement('div'); row.className = 'p-4 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between gap-4 cursor-grab hover:border-cyan transition-all';
        row.innerHTML = `<div class="flex items-center gap-4"><div class="text-gray-400 hover:text-navy"><i data-lucide="grip-vertical" class="w-5 h-5"></i></div><div class="w-8 h-8 rounded-xl bg-cyan/10 text-cyan font-black text-sm flex items-center justify-center shrink-0">NV ${index + 1}</div><div><h4 class="font-bold text-navy text-sm">${item.majorName}</h4><p class="text-xs text-muted">${item.schoolName} • Khối ${item.group}</p></div></div><button onclick="removeFromWishlist(${index})" class="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"><i data-lucide="x" class="w-4 h-4"></i></button>`;
        container.appendChild(row);
    });
    lucide.createIcons();
}
function addToWishlist(id) {
    const item = universitiesData.find(u => u.id === id); if (!item) return;
    if (wishlist.some(w => w.id === id)) return alert('Ngành học này đã có trong danh sách!');
    wishlist.push({ ...item }); renderWishlist(); alert(`Đã thêm ${item.majorName} vào danh sách nguyện vọng!`);
}
function addCurrentMajorToWishlist() { if (currentExplainItem) { addToWishlist(currentExplainItem.id); closeExplainModal(); } }
function removeFromWishlist(index) { wishlist.splice(index, 1); renderWishlist(); }
function autoOptimizeWishlist() { wishlist.sort((a, b) => a.probability - b.probability); renderWishlist(); alert('AI đã tự động tối ưu danh sách theo cơ cấu bậc thang!'); }

function openEditScoreModal() {
    document.getElementById('edit-toan').value = userScores.toan; document.getElementById('edit-van').value = userScores.van; document.getElementById('edit-anh').value = userScores.anh;
    document.getElementById('edit-score-modal').classList.remove('hidden'); document.getElementById('edit-score-modal').classList.add('flex');
}
function closeEditScoreModal() { document.getElementById('edit-score-modal').classList.add('hidden'); document.getElementById('edit-score-modal').classList.remove('flex'); }
function saveUpdatedScores() {
    userScores.toan = +document.getElementById('edit-toan').value; userScores.van = +document.getElementById('edit-van').value; userScores.anh = +document.getElementById('edit-anh').value;
    updateSummaryDisplay(); closeEditScoreModal(); applyPredictionFilters(); alert('Đã cập nhật điểm số!');
}

function toggleHistoryView() {
    document.getElementById('prediction-container').classList.add('hidden');
    document.getElementById('assessment-container').classList.add('hidden');
    document.getElementById('history-view').classList.remove('hidden');
    document.getElementById('bottom-assessment-controls').classList.add('hidden');
    document.getElementById('bottom-return-control').classList.remove('hidden');
    document.getElementById('page-heading').innerText = "Lịch Sử Đánh Giá & Tư Vấn";
}
function toggleMoreMenu(event) { if (event) event.stopPropagation(); document.getElementById('floating-more-menu').classList.toggle('hidden'); }

renderQuestions(); updateUI();
const urlParams = new URLSearchParams(window.location.search); if (urlParams.get('view') === 'prediction') openPredictionView();