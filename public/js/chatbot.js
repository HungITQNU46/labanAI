renderLayout('nav-chat');

let chatSessions = [];
let currentSessionId = null;
let currentConsultantMode = 'general';
let isSendingMessage = false;

function mapSessionFromServer(s) {
    return {
        id: s._id,
        title: s.tieuDe,
        mode: s.cheDo || 'general',
        timestamp: new Date(s.ngayCapNhat || s.ngayTao).toLocaleDateString('vi-VN'),
        messages: s.tinNhan || []
    };
}

async function loadChatSessionsFromDB() {
    try {
        const res = await fetch('/api/chatbot/sessions');
        const json = await res.json();
        if (json.success) {
            chatSessions = json.data.map(mapSessionFromServer);
            currentSessionId = chatSessions[0] ? chatSessions[0].id : null;
            renderCurrentMessages();
        }
    } catch (err) {
        console.error('Lỗi tải lịch sử chat:', err);
    }
}

let compassScene, compassCamera, compassRenderer, compassGroup;
let compassAnimId = null;

function initWelcomeCompass() {
    const container = document.getElementById('compass-canvas-container');
    if (!container) return;

    // Tự động nạp Three.js nếu trình duyệt chưa kịp tải xong từ header
    if (typeof THREE === 'undefined') {
        if (!document.getElementById('threejs-chatbot-fallback')) {
            const script = document.createElement('script');
            script.id = 'threejs-chatbot-fallback';
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.onload = () => initWelcomeCompass();
            document.head.appendChild(script);
        }
        return;
    }

    if (compassAnimId) {
        cancelAnimationFrame(compassAnimId);
        compassAnimId = null;
    }

    container.innerHTML = '';
    const width = container.clientWidth > 40 ? container.clientWidth : 176;
    const height = container.clientHeight > 40 ? container.clientHeight : 176;

    compassScene = new THREE.Scene();
    compassCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    compassCamera.position.z = 10.5;

    compassRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    compassRenderer.setSize(width, height);
    compassRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    compassRenderer.domElement.style.display = 'block';
    compassRenderer.domElement.style.margin = '0 auto';
    container.appendChild(compassRenderer.domElement);

    compassGroup = new THREE.Group();

    // 1. Vòng ngoài: Xanh Cyan Pha Lê
    const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(3, 0.055, 24, 120),
        new THREE.MeshPhysicalMaterial({
            color: 0x00D2FF,
            emissive: 0x0077B6,
            emissiveIntensity: 0.35,
            metalness: 0.4,
            roughness: 0.15,
            clearcoat: 1.0,
            transparent: true,
            opacity: 0.92
        })
    );
    ring1.rotation.x = Math.PI / 2;
    compassGroup.add(ring1);

    // 2. Vòng trong: Tím Lavender 3D
    const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.04, 20, 100),
        new THREE.MeshPhysicalMaterial({
            color: 0xC084FC,
            emissive: 0x7B2CBF,
            emissiveIntensity: 0.4,
            metalness: 0.35,
            roughness: 0.2,
            clearcoat: 1.0
        })
    );
    ring2.rotation.x = Math.PI / 3;
    compassGroup.add(ring2);

    // 3. Kim la bàn chuyển sắc 3D (Ngọc Bích -> Cyan -> Tím Lavender)
    const needleGeo = new THREE.OctahedronGeometry(1.2, 0);
    const posAttr = needleGeo.attributes.position;
    const colors = [];
    const colorTop = new THREE.Color(0x00F5A0);
    const colorMid = new THREE.Color(0x00D2FF);
    const colorBottom = new THREE.Color(0xA855F7);

    for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        const c = y > 0.1 ? colorTop : (y < -0.1 ? colorBottom : colorMid);
        colors.push(c.r, c.g, c.b);
    }
    needleGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const needle = new THREE.Mesh(
        needleGeo,
        new THREE.MeshPhysicalMaterial({
            vertexColors: true,
            emissive: 0x0A192F,
            emissiveIntensity: 0.2,
            metalness: 0.25,
            roughness: 0.18,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08,
            flatShading: true
        })
    );
    needle.scale.set(0.4, 2, 0.4);
    compassGroup.add(needle);

    // 4. Các hạt sáng 3D (Stardust Orbs) bay lơ lửng xung quanh
    const particlesGroup = new THREE.Group();
    const particleColors = [0x00F5D4, 0x38BDF8, 0xC084FC, 0x34D399, 0xFFFFFF];
    const particlesData = [];

    for (let i = 0; i < 36; i++) {
        const radius = 0.03 + Math.random() * 0.05;
        const color = particleColors[i % particleColors.length];
        const dot = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 12, 12),
            new THREE.MeshPhysicalMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.65,
                roughness: 0.1,
                clearcoat: 1.0
            })
        );

        const dist = 2.0 + Math.random() * 2.1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const x = dist * Math.sin(phi) * Math.cos(theta);
        const y = dist * Math.sin(phi) * Math.sin(theta);
        const z = dist * Math.cos(phi);

        dot.position.set(x, y, z);
        particlesGroup.add(dot);
        particlesData.push({
            mesh: dot,
            baseY: y,
            speed: 0.8 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2,
            amp: 0.08 + Math.random() * 0.14
        });
    }
    compassGroup.add(particlesGroup);
    compassScene.add(compassGroup);

    // 5. Ánh sáng tạo khối 3D
    compassScene.add(new THREE.AmbientLight(0xffffff, 0.65));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
    dirLight.position.set(6, 10, 8);
    compassScene.add(dirLight);

    const cyanLight = new THREE.PointLight(0x00E5FF, 1.5, 40);
    cyanLight.position.set(-6, 3, 5);
    compassScene.add(cyanLight);

    const violetLight = new THREE.PointLight(0xA855F7, 1.5, 40);
    violetLight.position.set(6, -4, 5);
    compassScene.add(violetLight);

    let mouseX = 0, mouseY = 0;
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) - rect.width / 2) * 0.003;
        mouseY = ((e.clientY - rect.top) - rect.height / 2) * 0.003;
    });
    container.addEventListener('mouseleave', () => {
        mouseX = 0;
        mouseY = 0;
    });

    function animateCompass() {
        compassAnimId = requestAnimationFrame(animateCompass);
        const time = Date.now() * 0.001;

        ring1.rotation.z -= 0.002;
        ring2.rotation.y += 0.004;
        needle.rotation.y -= 0.01;

        particlesGroup.rotation.y += 0.0025;
        particlesGroup.rotation.x -= 0.001;
        for (let i = 0; i < particlesData.length; i++) {
            const p = particlesData[i];
            p.mesh.position.y = p.baseY + Math.sin(time * p.speed + p.phase) * p.amp;
        }

        compassGroup.rotation.y += 0.05 * (mouseX * 1.5 - compassGroup.rotation.y);
        compassGroup.rotation.x += 0.05 * (mouseY * 1.5 - compassGroup.rotation.x);
        compassGroup.position.y = Math.sin(time) * 0.25;

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
async function startNewChatSession() {
    try {
        const res = await fetch('/api/chatbot/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cheDo: currentConsultantMode })
        });
        const json = await res.json();
        if (json.success) {
            const newSession = mapSessionFromServer(json.data);
            chatSessions.unshift(newSession);
            currentSessionId = newSession.id;
            renderCurrentMessages();
            document.getElementById('chat-input')?.focus();
        }
    } catch (err) {
        console.error('Lỗi tạo phiên mới:', err);
    }
}

async function renameChatSession(id, event) {
    event.stopPropagation();
    const session = chatSessions.find(s => s.id === id);
    if (!session) return;
    const newTitle = prompt('Nhập tiêu đề mới cho cuộc trò chuyện:', session.title);
    if (!newTitle || !newTitle.trim()) return;

    const res = await fetch(`/api/chatbot/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tieuDe: newTitle.trim() })
    });
    const json = await res.json();
    if (json.success) {
        session.title = json.data.tieuDe;
        renderDrawerSessions();
        renderCurrentMessages();
    }
}

async function deleteChatSession(id, event) {
    event.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) return;
    const res = await fetch(`/api/chatbot/sessions/${id}`, { method: 'DELETE' });
    if (res.ok) {
        chatSessions = chatSessions.filter(s => s.id !== id);
        if (currentSessionId === id) currentSessionId = chatSessions[0] ? chatSessions[0].id : null;
        renderDrawerSessions();
        renderCurrentMessages();
    }
}

async function clearAllChatSessions() {
    if (!confirm('Xóa sạch toàn bộ lịch sử tư vấn?')) return;
    const res = await fetch('/api/chatbot/sessions', { method: 'DELETE' });
    if (res.ok) {
        chatSessions = [];
        currentSessionId = null;
        renderDrawerSessions();
        renderCurrentMessages();
        toggleHistoryDrawer();
    }
}
function saveSessions() { localStorage.setItem('laban_chat_sessions', JSON.stringify(chatSessions)); }

function toggleModeMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('mode-popup-menu'), chevron = document.getElementById('mode-chevron');
    if (menu.classList.contains('hidden')) { menu.classList.remove('hidden'); menu.classList.add('flex'); chevron?.classList.add('rotate-180'); }
    else { menu.classList.add('hidden'); menu.classList.remove('flex'); chevron?.classList.remove('rotate-180'); }
}


const MODE_SHORT_LABELS = {
    general: 'Tổng quan',
    score: 'Điểm chuẩn',
    holland: 'Holland'
};

function selectConsultantMode(mode, label) {
    currentConsultantMode = mode;
    const btn = document.getElementById('btn-mode-toggle');
    const labelEl = document.getElementById('current-mode-label');
    if (btn) btn.title = `Chế độ: ${label}`;
    if (labelEl) labelEl.innerText = MODE_SHORT_LABELS[mode] || 'Tổng quan';
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
                    </div>
                </div>
            `;
        }
        messagesList.appendChild(bubble);
    });
    lucide.createIcons(); scrollChatToBottom();
}

function formatAIMessage(text) {
    if (!text) return '';

    // 1. Escape HTML cơ bản để tránh lỗi giao diện
    let safeText = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const lines = safeText.split('\n');
    let html = '';
    let inTable = false;
    let tableRows = [];

    const flushTable = () => {
        if (!inTable || tableRows.length === 0) return;
        html += '<div class="overflow-x-auto my-3"><table class="w-full text-xs border-collapse rounded-xl overflow-hidden shadow-sm">';
        tableRows.forEach((cols, idx) => {
            if (idx === 0) {
                html += '<tr class="bg-cyan/10 font-bold text-navy">';
                cols.forEach(c => { html += `<th class="p-2.5 text-left border border-cyan/20">${formatInlineMarkdown(c)}</th>`; });
                html += '</tr>';
            } else {
                html += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
                cols.forEach(c => { html += `<td class="p-2.5 border border-gray-100">${formatInlineMarkdown(c)}</td>`; });
                html += '</tr>';
            }
        });
        html += '</table></div>';
        inTable = false;
        tableRows = [];
    };

    lines.forEach((rawLine) => {
        const line = rawLine.trim();

        // Xử lý bảng Markdown
        if (line.startsWith('|') && line.endsWith('|')) {
            const cols = line.slice(1, -1).split('|').map(c => c.trim());
            // Bỏ qua dòng ngăn cách |---|---|
            if (cols.every(c => /^:?-{2,}:?$/.test(c))) return;
            inTable = true;
            tableRows.push(cols);
            return;
        } else if (inTable) {
            flushTable();
        }

        // Dòng trống
        if (!line) {
            html += '<div class="h-2"></div>';
            return;
        }

        // Đường kẻ ngang (--- hoặc ***)
        if (/^(-{3,}|\*{3,})$/.test(line)) {
            html += '<hr class="my-3 border-gray-200">';
            return;
        }

        // Tiêu đề (###, ##, #)
        if (line.startsWith('### ')) {
            html += `<h4 class="font-bold text-navy text-sm mt-3 mb-1">${formatInlineMarkdown(line.slice(4))}</h4>`;
            return;
        }
        if (line.startsWith('## ')) {
            html += `<h3 class="font-black text-navy text-base mt-3 mb-1">${formatInlineMarkdown(line.slice(3))}</h3>`;
            return;
        }

        // Gạch đầu dòng (- hoặc • hoặc *)
        if (/^[-•*]\s+/.test(line)) {
            html += `<div class="flex items-start gap-2 my-1"><span class="text-cyan font-bold">•</span><span>${formatInlineMarkdown(line.replace(/^[-•*]\s+/, ''))}</span></div>`;
            return;
        }

        // Đoạn văn bình thường
        html += `<p class="my-1">${formatInlineMarkdown(line)}</p>`;
    });

    if (inTable) flushTable();
    return html;
}

function formatInlineMarkdown(str) {
    return str
        // Link dạng [text](url)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-cyan font-semibold underline hover:text-violet">$1</a>')
        // Link nội bộ AI hay viết dạng [/evaluation]
        .replace(/\[(\/[a-zA-Z0-9/_-]+)\]/g, '<a href="$1" class="text-cyan font-semibold underline hover:text-violet">$1</a>')
        // In đậm **text**
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-navy">$1</strong>')
        // In nghiêng *text*
        .replace(/\*(.+?)\*/g, '<em class="italic text-slate-700">$1</em>')
        // Code inline `text`
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-navy rounded text-xs font-mono">$1</code>');
}
async function handleSendMessage() {
    if (isSendingMessage) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    isSendingMessage = true;
    if (!currentSessionId) await startNewChatSession();

    const session = chatSessions.find(s => s.id === currentSessionId);
    if (!session) { isSendingMessage = false; return; }

    // Hiển thị ngay tin nhắn của user
    session.messages.push({ role: 'user', content: text });
    input.value = '';
    autoResizeTextarea(input);
    renderCurrentMessages();

    const typing = document.getElementById('typing-indicator');
    typing.classList.remove('hidden');
    scrollChatToBottom();

    try {
        const res = await fetch(`/api/chatbot/sessions/${session.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text, cheDo: currentConsultantMode })
        });
        const json = await res.json();
        typing.classList.add('hidden');

        if (json.success && json.data) {
            const updated = mapSessionFromServer(json.data.session);
            const idx = chatSessions.findIndex(s => s.id === updated.id);
            if (idx !== -1) chatSessions[idx] = updated;
        } else {
            session.messages.push({ role: 'assistant', content: json.message || 'Có lỗi xảy ra khi gọi AI.' });
        }
    } catch (err) {
        typing.classList.add('hidden');
        session.messages.push({ role: 'assistant', content: 'Không thể kết nối đến máy chủ AI. Vui lòng thử lại.' });
    } finally {
        isSendingMessage = false;
        renderCurrentMessages();
    }
}



function sendSuggestedPrompt(card) { document.getElementById('chat-input').value = card.querySelector('.text-navy').innerText.replace(/"/g, ''); handleSendMessage(); }
function handleInputKeydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }
function autoResizeTextarea(textarea) { textarea.style.height = 'auto'; textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'; }
function scrollChatToBottom() { const container = document.getElementById('chat-messages-container'); setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50); }

async function copyMessageText(btn) {
    const messageCard = btn.parentElement?.previousElementSibling;
    if (!messageCard) return;

    try {
        await navigator.clipboard.writeText(messageCard.innerText);

        btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald"></i> Đã sao chép`;
        lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = `<i data-lucide="copy" class="w-3.5 h-3.5"></i> Sao chép`;
            lucide.createIcons();
        }, 2000);
    } catch (err) {
        console.error('Lỗi sao chép tin nhắn:', err);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadChatSessionsFromDB();
    initWelcomeCompass();
});