renderLayout('nav-chat');

let chatSessions = JSON.parse(localStorage.getItem('laban_chat_sessions')) || [
    { id: 'session-1', title: 'Tư vấn khối A01 & ngành CNTT', timestamp: 'Hôm nay', messages: [] },
    { id: 'session-2', title: 'So sánh ngành Marketing vs QTKD', timestamp: 'Hôm qua', messages: [] }
];

let currentSessionId = chatSessions[0] ? chatSessions[0].id : null;
let currentConsultantMode = 'general';

let compassScene, compassCamera, compassRenderer, compassGroup;

function initWelcomeCompass() {
    const container = document.getElementById('compass-canvas-container');
    if (!container) return;

    container.innerHTML = '';
    compassScene = new THREE.Scene();
    compassCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    compassCamera.position.z = 8;

    compassRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    compassRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(compassRenderer.domElement);

    compassGroup = new THREE.Group();
    
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.04, 16, 100), new THREE.MeshPhysicalMaterial({ color: 0x00B4D8, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.85 }));
    ring1.rotation.x = Math.PI / 2; compassGroup.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.02, 16, 100), new THREE.MeshBasicMaterial({ color: 0x7B2CBF, side: THREE.DoubleSide }));
    ring2.rotation.x = Math.PI / 3; compassGroup.add(ring2);

    const needle = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), new THREE.MeshPhysicalMaterial({ color: 0x10B981, metalness: 0.8, roughness: 0.2, clearcoat: 1.0 }));
    needle.scale.set(0.35, 1.8, 0.35); compassGroup.add(needle);

    compassScene.add(compassGroup);
    compassScene.add(new THREE.AmbientLight(0xffffff, 0.9));
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(5, 10, 7);
    compassScene.add(dirLight);

    let mouseX = 0, mouseY = 0;
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) - rect.width / 2) * 0.002;
        mouseY = ((e.clientY - rect.top) - rect.height / 2) * 0.002;
    });

    function animateCompass() {
        requestAnimationFrame(animateCompass);
        ring1.rotation.z -= 0.003; ring2.rotation.y += 0.005; needle.rotation.y -= 0.008;
        compassGroup.rotation.y += 0.05 * (mouseX * 2 - compassGroup.rotation.y);
        compassGroup.rotation.x += 0.05 * (mouseY * 2 - compassGroup.rotation.x);
        compassGroup.position.y = Math.sin(Date.now() * 0.0015) * 0.15;
        compassRenderer.render(compassScene, compassCamera);
    }
    animateCompass();
}

function toggleHistoryDrawer() {
    const backdrop = document.getElementById('history-drawer-backdrop');
    const drawer = document.getElementById('history-drawer');
    if (drawer.classList.contains('translate-y-full')) {
        renderDrawerSessions();
        backdrop.classList.remove('hidden');
        setTimeout(() => { backdrop.classList.remove('opacity-0'); drawer.classList.remove('translate-y-full'); }, 10);
    } else {
        backdrop.classList.add('opacity-0'); drawer.classList.add('translate-y-full');
        setTimeout(() => { backdrop.classList.add('hidden'); }, 300);
    }
}

function renderDrawerSessions() {
    const list = document.getElementById('drawer-sessions-list');
    list.innerHTML = '';
    if (chatSessions.length === 0) {
        list.innerHTML = `<div class="py-8 text-center text-muted text-xs">Chưa có lịch sử cuộc trò chuyện nào.</div>`;
        return;
    }
    chatSessions.forEach((session) => {
        const isActive = session.id === currentSessionId;
        const item = document.createElement('div');
        item.className = `group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer text-xs font-semibold transition-all border ${isActive ? 'bg-cyan/10 text-cyan border-cyan/30 shadow-sm' : 'bg-white border-gray-100 hover:border-cyan/50 text-navy hover:bg-gray-50'}`;
        item.innerHTML = `
            <div class="flex items-center gap-3 truncate flex-1" onclick="selectSessionFromDrawer('${session.id}')">
                <i data-lucide="message-square" class="w-4 h-4 shrink-0 ${isActive ? 'text-cyan' : 'text-muted'}"></i>
                <div class="truncate"><div class="truncate font-bold">${session.title}</div><div class="text-[10px] text-muted font-normal mt-0.5">${session.timestamp || 'Gần đây'} • ${session.messages.length} tin nhắn</div></div>
            </div>
            <div class="flex items-center gap-1.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="renameChatSession('${session.id}', event)" class="p-1.5 hover:text-cyan text-muted" title="Đổi tên"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
                <button onclick="deleteChatSession('${session.id}', event)" class="p-1.5 hover:text-red-500 text-muted" title="Xóa"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
    lucide.createIcons();
}

function selectSessionFromDrawer(id) { currentSessionId = id; toggleHistoryDrawer(); renderCurrentMessages(); }
function startNewChatSession() {
    const newSession = { id: 'session-' + Date.now(), title: 'Hội thoại mới', timestamp: 'Vừa xong', messages: [] };
    chatSessions.unshift(newSession); currentSessionId = newSession.id; saveSessions(); renderCurrentMessages(); document.getElementById('chat-input').focus();
}
function renameChatSession(id, event) {
    event.stopPropagation(); const session = chatSessions.find(s => s.id === id); if (!session) return;
    const newTitle = prompt('Nhập tiêu đề mới cho cuộc trò chuyện:', session.title);
    if (newTitle && newTitle.trim()) { session.title = newTitle.trim(); saveSessions(); renderDrawerSessions(); renderCurrentMessages(); }
}
function deleteChatSession(id, event) {
    event.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) {
        chatSessions = chatSessions.filter(s => s.id !== id);
        if (currentSessionId === id) currentSessionId = chatSessions.length > 0 ? chatSessions[0].id : null;
        saveSessions(); renderDrawerSessions(); renderCurrentMessages();
    }
}
function clearAllChatSessions() {
    if (confirm('Xóa sạch toàn bộ lịch sử tư vấn?')) {
        chatSessions = []; currentSessionId = null; saveSessions();
        const titleHeader = document.getElementById('current-chat-title'); if (titleHeader) titleHeader.innerText = 'Cuộc trò chuyện mới';
        renderDrawerSessions(); renderCurrentMessages(); toggleHistoryDrawer();
    }
}
function saveSessions() { localStorage.setItem('laban_chat_sessions', JSON.stringify(chatSessions)); }

function toggleModeMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('mode-popup-menu'), chevron = document.getElementById('mode-chevron');
    if (menu.classList.contains('hidden')) { menu.classList.remove('hidden'); menu.classList.add('flex'); chevron?.classList.add('rotate-180'); } 
    else { menu.classList.add('hidden'); menu.classList.remove('flex'); chevron?.classList.remove('rotate-180'); }
}

function selectConsultantMode(mode, label) {
    currentConsultantMode = mode;
    document.getElementById('btn-mode-toggle').title = `Chế độ: ${label}`;
    toggleModeMenu();
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('mode-popup-menu'), btn = document.getElementById('btn-mode-toggle');
    if (menu && !menu.classList.contains('hidden')) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) toggleModeMenu();
    }
});

function renderCurrentMessages() {
    const welcomeScreen = document.getElementById('welcome-screen'), messagesList = document.getElementById('messages-list');
    const titleHeader = document.getElementById('current-chat-title'), session = chatSessions.find(s => s.id === currentSessionId);
    if (titleHeader) titleHeader.innerText = session ? session.title : 'Cuộc trò chuyện mới';

    if (!session || session.messages.length === 0) {
        welcomeScreen.classList.remove('hidden'); messagesList.classList.add('hidden'); messagesList.innerHTML = ''; return;
    }

    welcomeScreen.classList.add('hidden'); messagesList.classList.remove('hidden'); messagesList.innerHTML = '';
    session.messages.forEach((msg, idx) => {
        const bubble = document.createElement('div');
        if (msg.role === 'user') {
            bubble.className = 'flex justify-end';
            bubble.innerHTML = `<div class="max-w-[85%] bg-gradient-to-r from-cyan to-violet text-white px-5 py-3 rounded-2xl rounded-tr-sm text-sm font-medium shadow-md leading-relaxed">${msg.content}</div>`;
        } else {
            bubble.className = 'flex items-start gap-3';
            bubble.innerHTML = `
                <div class="w-8 h-8 rounded-xl bg-gradient-to-b from-[#00B4D8] to-[#7B2CBF] text-white flex items-center justify-center shrink-0 shadow-sm mt-1"><i data-lucide="compass" class="w-4 h-4 stroke-[2.2]"></i></div>
                <div class="flex-1 max-w-[90%] space-y-2.5">
                    <div class="glass-card bg-white/95 p-5 rounded-2xl rounded-tl-sm border border-navy/5 text-sm leading-relaxed text-navy shadow-sm">${formatAIMessage(msg.content)}</div>
                    <div class="flex items-center gap-3 text-muted text-xs px-2">
                        <button onclick="copyMessageText(this)" class="hover:text-cyan flex items-center gap-1 transition-colors"><i data-lucide="copy" class="w-3.5 h-3.5"></i> Sao chép</button>
                        <button onclick="regenerateAIResponse(${idx})" class="hover:text-cyan flex items-center gap-1 transition-colors"><i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Tạo lại</button>
                        <div class="h-3 w-px bg-gray-200"></div>
                        <button onclick="voteFeedback(this, 'like')" class="hover:text-emerald p-1 transition-colors" title="Hữu ích"><i data-lucide="thumbs-up" class="w-3.5 h-3.5"></i></button>
                        <button onclick="voteFeedback(this, 'dislike')" class="hover:text-red-500 p-1 transition-colors" title="Chưa hài lòng"><i data-lucide="thumbs-down" class="w-3.5 h-3.5"></i></button>
                    </div>
                </div>
            `;
        }
        messagesList.appendChild(bubble);
    });
    lucide.createIcons(); scrollChatToBottom();
}

function formatAIMessage(text) {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-navy">$1</strong>').replace(/\n\n/g, '<br><br>').replace(/\n- (.*?)/g, '<br>• $1');
    if (formatted.includes('|')) {
        const lines = formatted.split('<br>'); let inTable = false, tableHTML = '<div class="overflow-x-auto my-3"><table class="w-full text-xs border-collapse rounded-xl overflow-hidden shadow-sm">';
        lines.forEach(line => {
            if (line.includes('|')) {
                const cols = line.split('|').filter(c => c.trim().length > 0);
                if (line.includes('---')) return;
                if (!inTable) {
                    inTable = true; tableHTML += '<tr class="bg-cyan/10 font-bold text-navy">';
                    cols.forEach(c => tableHTML += `<th class="p-2.5 text-left border border-cyan/20">${c.trim()}</th>`); tableHTML += '</tr>';
                } else {
                    tableHTML += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
                    cols.forEach(c => tableHTML += `<td class="p-2.5 border border-gray-100">${c.trim()}</td>`); tableHTML += '</tr>';
                }
            }
        });
        tableHTML += '</table></div>'; formatted = formatted.replace(/\|.*?\|/gs, '') + tableHTML;
    }
    return formatted;
}

function handleSendMessage() {
    const input = document.getElementById('chat-input'), text = input.value.trim();
    if (!text) return;
    if (!currentSessionId) startNewChatSession();
    
    const session = chatSessions.find(s => s.id === currentSessionId);
    session.messages.push({ role: 'user', content: text });
    if (session.messages.length === 1) {
        session.title = text.length > 25 ? text.substring(0, 25) + '...' : text;
        const titleHeader = document.getElementById('current-chat-title'); if (titleHeader) titleHeader.innerText = session.title;
    }

    input.value = ''; autoResizeTextarea(input); renderCurrentMessages();
    const typing = document.getElementById('typing-indicator'); typing.classList.remove('hidden'); scrollChatToBottom();

    setTimeout(() => {
        typing.classList.add('hidden');
        session.messages.push({ role: 'assistant', content: generateSimulatedAIResponse(text) });
        saveSessions(); renderCurrentMessages();
    }, 1100);
}

function generateSimulatedAIResponse(query) {
    const lower = query.toLowerCase();
    if (lower.includes('toán') || lower.includes('lý') || lower.includes('khối a')) return `Dựa trên thế mạnh vượt trội về **Toán học và Vật lý** của bạn, hệ thống AI đề xuất các hướng đi nghề nghiệp tối ưu sau:\n- **Công nghệ thông tin & Trí tuệ nhân tạo (AI):** Cần tư duy thuật toán chặt chẽ và logic logic cao.\n- **Kỹ thuật Điện tử - Viễn thông / Tự động hóa:** Ứng dụng sâu kiến thức vật lý đại cương và mạch điện.\n- **Khoa học Dữ liệu (Data Science):** Giao thoa giữa toán xác suất thống kê và công nghệ phần mềm.\nDưới đây là bảng so sánh nhanh các ngành theo khối xét tuyển:\n\n| Ngành Học | Khối Xét | Điểm Chuẩn Tham Khảo | Cơ Hội Nghề Nghiệp |\n| Công nghệ thông tin | A00, A01 | 23.5 - 27.5 | Kỹ sư phần mềm, AI Engineer |\n| Tự động hóa | A00, A01 | 22.0 - 26.0 | Kỹ sư robot, vận hành hệ thống |\n| Khoa học Dữ liệu | A01, D01 | 24.0 - 26.5 | Chuyên viên phân tích dữ liệu |\n\nBạn có muốn mình so sánh chi tiết điểm chuẩn các trường tại khu vực bạn đang quan tâm không?`;
    if (lower.includes('so sánh') && (lower.includes('cntt') || lower.includes('khoa học dữ liệu') || lower.includes('it'))) return `Dưới đây là phân tích đối chiếu chuyên sâu giữa **Công nghệ thông tin (CNTT)** và **Khoa học dữ liệu (Data Science)**:\n\n1. **Bản chất ngành:**\n- **CNTT:** Tập trung vào kỹ thuật lập trình, xây dựng ứng dụng web/app, hệ thống mạng và kiến trúc phần mềm.\n- **Khoa học Dữ liệu:** Tập trung vào phân tích, khai phá quy luật từ dữ liệu lớn để hỗ trợ ra quyết định kinh doanh hoặc huấn luyện mô hình AI.\n\n2. **Yêu cầu năng lực:**\n- CNTT đòi hỏi tư duy lập trình và giải quyết bài toán hệ thống tốt.\n- Khoa học Dữ liệu đòi hỏi nền tảng Toán xác suất, thống kê và tư duy phân tích sâu.\n\nBạn thiên về thích tạo ra sản phẩm hoàn chỉnh (App/Web) hay thích nghiên cứu tìm quy luật từ các con số hơn?`;
    if (lower.includes('marketing')) return `Ngành **Marketing** hiện nay đã phát triển mạnh mẽ theo hướng công nghệ và dữ liệu (Digital & Data-driven Marketing). Ra trường bạn có thể đảm nhận các vị trí:\n\n- **Digital Marketing Specialist:** Lên chiến dịch quảng cáo, tối ưu chuyển đổi số trên Facebook, Google, TikTok.\n- **Content Creator / Copywriter:** Sáng tạo câu chuyện thương hiệu và kịch bản truyền thông.\n- **Brand Manager:** Quản trị và định vị hình ảnh thương hiệu dài hạn cho doanh nghiệp.\n- **Market Research Analyst:** Phân tích nhu cầu khách hàng và xu hướng thị trường.\n\nNgành này đặc biệt phù hợp với các bạn có nhóm tính cách **Artistic (Sáng tạo)** và **Enterprising (Kinh doanh / Thuyết phục)** theo mã Holland.`;
    return `Cảm ơn câu hỏi của bạn! Với câu hỏi này, **Laban.ai** nhận thấy bạn đang tìm hiểu theo hướng phù hợp với xu thế phát triển hiện nay.\n\nĐể có thể đưa ra phân tích chính xác nhất, bạn có thể chia sẻ thêm:\n- Bạn dự kiến thi các môn thi nào (hoặc điểm số học tập hiện tại)?\n- Bạn đã làm bài đánh giá tính cách Holland RIASEC trên hệ thống chưa?\n\nMình sẽ dựa vào đó để tính toán xác suất trúng tuyển và gợi ý lộ trình đại học tốt nhất cho bạn!`;
}

function sendSuggestedPrompt(card) { document.getElementById('chat-input').value = card.querySelector('.text-navy').innerText.replace(/"/g, ''); handleSendMessage(); }
function handleInputKeydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }
function autoResizeTextarea(textarea) { textarea.style.height = 'auto'; textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'; }
function scrollChatToBottom() { const container = document.getElementById('chat-messages-container'); setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50); }

function copyMessageText(btn) {
    navigator.clipboard.writeText(btn.closest('.space-y-2.5').querySelector('.glass-card').innerText);
    btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald"></i> Đã sao chép`; lucide.createIcons();
    setTimeout(() => { btn.innerHTML = `<i data-lucide="copy" class="w-3.5 h-3.5"></i> Sao chép`; lucide.createIcons(); }, 2000);
}
function voteFeedback(btn, type) { if (type === 'like') btn.classList.toggle('text-emerald'); else btn.classList.toggle('text-red-500'); }
function regenerateAIResponse(index) {
    const session = chatSessions.find(s => s.id === currentSessionId); if (!session || index <= 0) return;
    const userQuery = session.messages[index - 1].content, typing = document.getElementById('typing-indicator');
    typing.classList.remove('hidden'); scrollChatToBottom();
    setTimeout(() => { typing.classList.add('hidden'); session.messages[index].content = generateSimulatedAIResponse(userQuery); saveSessions(); renderCurrentMessages(); }, 1000);
}
function toggleVoiceInput() {
    const btn = document.getElementById('btn-voice'); btn.classList.toggle('text-red-500'); btn.classList.toggle('animate-pulse');
    document.getElementById('chat-input').placeholder = btn.classList.contains('text-red-500') ? "Đang lắng nghe giọng nói của bạn..." : "Nhập câu hỏi hoặc băn khoăn về ngành học của bạn...";
}

window.addEventListener('DOMContentLoaded', () => { initWelcomeCompass(); renderCurrentMessages(); });