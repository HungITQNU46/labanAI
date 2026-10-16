// Đọc trạng thái đăng nhập từ phiên máy chủ đã được EJS cung cấp.
function checkLoginState() { return Boolean(window.AUTH_USER); }

// Đọc vai trò do máy chủ xác thực, không suy đoán từ email hoặc localStorage.
function getCurrentUserRole() {
    return window.AUTH_USER?.role || 'user';
}

// Đăng xuất an toàn bằng cách hủy phiên trên máy chủ.
async function logoutUser() {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất?')) return;
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Không thể đăng xuất.');
        localStorage.removeItem('sidebarCollapsed');
        window.location.href = '/';
    } catch (error) {
        window.alert(error.message || 'Không thể đăng xuất. Vui lòng thử lại.');
    }
}

// Giữ tên hàm cũ để các nút đăng xuất hiện có tiếp tục hoạt động.
function handleLogout() { return logoutUser(); }

let isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

// Thay đổi trạng thái thu gọn/mở rộng của sidebar trong giao diện người dùng.
function toggleSidebar() {
    isSidebarCollapsed = !isSidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
    applySidebarState();
}

// Cập nhật class CSS của sidebar theo trạng thái đang thu gọn hoặc mở rộng.
function applySidebarState() {
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('main-wrapper');
    const topHeader = document.getElementById('top-header'); 
    const bottomNav = document.getElementById('bottom-nav-bar'); // Thanh đáy trang Đánh giá
    const chatBottomBar = document.getElementById('chat-bottom-bar'); // Thanh đáy trang Chatbot
    
    if (!sidebar) return;

    if (isSidebarCollapsed) {
        // Trạng thái thu gọn Sidebar
        sidebar.classList.add('-translate-x-full');
        if (mainWrapper) mainWrapper.classList.remove('md:pl-64');
        if (topHeader) topHeader.classList.remove('md:left-64');
        if (bottomNav) bottomNav.classList.remove('md:left-64');
        if (chatBottomBar) chatBottomBar.classList.remove('md:left-64');
    } else {
        // Trạng thái mở rộng Sidebar
        sidebar.classList.remove('-translate-x-full');
        if (mainWrapper) mainWrapper.classList.add('md:pl-64');
        if (topHeader) topHeader.classList.add('md:left-64');
        if (bottomNav) bottomNav.classList.add('md:left-64');
        if (chatBottomBar) chatBottomBar.classList.add('md:left-64');
    }
}

// Render layout chung cho giao diện người dùng, bao gồm header và sidebar tương ứng với trạng thái đăng nhập.
function renderLayout(activeMenuId) {
    const isLoggedIn = checkLoginState();
    const layoutContainer = document.getElementById('layout-container');
    if (!layoutContainer) return;

    if (!isLoggedIn) {
        layoutContainer.innerHTML = `
            <header class="fixed w-full top-0 left-0 z-50 bg-gradient-to-b from-background via-background/90 to-transparent pb-6 transition-all duration-300">
                <div class="w-full px-6 sm:px-8 pt-3.5 flex justify-between items-center">
                    <div class="flex items-center gap-3 cursor-pointer group select-none" onclick="window.location.href='/'">
                        <div class="w-11 h-11 rounded-[14px] bg-gradient-to-b from-[#00B4D8] to-[#7B2CBF] flex items-center justify-center text-white shadow-md shadow-cyan/20 transform transition-transform duration-300 ease-out group-hover:rotate-45 shrink-0">
                            <i data-lucide="compass" class="w-6 h-6 stroke-[2.2]"></i>
                        </div>
                        <div class="text-left">
                            <div class="font-extrabold text-xl leading-none tracking-tight text-navy group-hover:text-cyan transition-colors duration-200">
                                la bàn<span class="text-cyan">.ai</span>
                            </div>
                            <div class="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest leading-[1.25] mt-1">CHỌN NGÀNH, CHỌN TƯƠNG LAI<br></div>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-6 sm:gap-8">
                        <nav class="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
                            <a href="/" class="${activeMenuId === 'nav-home' ? 'text-cyan font-bold' : 'hover:text-cyan transition-colors'}">Trang chủ</a>
                            <a href="/news" class="${activeMenuId === 'nav-news' ? 'text-cyan font-bold' : 'hover:text-cyan transition-colors'}">Tin tức</a>
                            <a href="/guide" class="${activeMenuId === 'nav-guide' ? 'text-cyan font-bold' : 'hover:text-cyan transition-colors'}">Hướng dẫn</a>
                            <a href="/about" class="${activeMenuId === 'nav-about' ? 'text-cyan font-bold' : 'hover:text-cyan transition-colors'}">Về chúng tôi</a>
                            
                        </nav>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="openAuthModal('login')" class="rounded-xl px-3 py-2 text-sm font-bold text-cyan hover:bg-cyan/10 transition-colors">Đăng nhập</button>
                            <button type="button" onclick="openAuthModal('register')" class="btn-gradient rounded-xl px-4 py-2 text-sm font-bold text-white">Đăng ký</button>
                        </div>
                    </div>
                </div>
            </header>
        `;
    } else {
        let loggedInHTML = `
            <div id="brand-logo" onclick="toggleSidebar()" class="fixed top-3.5 left-6 sm:left-8 z-[70] cursor-pointer flex items-center gap-3 select-none group bg-transparent border-0 shadow-none p-0" title="Nhấn vào logo để ẩn hoặc hiện menu điều hướng">
                <div class="w-11 h-11 rounded-[14px] bg-gradient-to-b from-[#00B4D8] to-[#7B2CBF] flex items-center justify-center text-white shadow-md shadow-cyan/20 transform transition-transform duration-300 ease-out group-hover:rotate-45 shrink-0">
                    <i data-lucide="compass" class="w-6 h-6 text-white stroke-[2.2]"></i>
                </div>
                <div class="hidden md:pl-64 md:left-64 -translate-x-full"></div>
                <div class="text-left select-none">
                    <div class="font-extrabold text-xl leading-none tracking-tight text-navy group-hover:text-cyan transition-colors duration-200">la bàn<span class="text-cyan">.ai</span></div>
                    <div class="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest leading-[1.25] mt-1">CHỌN NGÀNH, CHỌN TƯƠNG LAI<br></div>
                </div>
            </div>
        `;


        loggedInHTML += `
            <aside id="sidebar" class="fixed top-0 left-0 h-screen w-64 glass-card border-r border-navy/10 z-[60] flex flex-col bg-surface/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out pt-24">
                <nav class="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
                    <a href="/" class="flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${activeMenuId === 'nav-home' ? 'font-bold bg-cyan/10 text-cyan' : 'font-semibold text-muted hover:bg-navy/5'}"><i data-lucide="home" class="w-5 h-5"></i> Trang chủ</a>
                    <a href="/evaluation" class="flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${activeMenuId === 'nav-eval' ? 'font-bold bg-cyan/10 text-cyan' : 'font-semibold text-muted hover:bg-navy/5'}"><i data-lucide="target" class="w-5 h-5"></i> Đánh giá hướng nghiệp</a>
                    <a href="/chatbot" class="flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${activeMenuId === 'nav-chat' ? 'font-bold bg-cyan/10 text-cyan' : 'font-semibold text-muted hover:bg-navy/5'}"><i data-lucide="message-square" class="w-5 h-5"></i> ChatBot AI</a>
                    <div class="mt-6 pt-4 border-t border-navy/10">
                        <p class="text-xs text-muted mb-2 px-3 uppercase font-bold tracking-wider">Khám phá</p>
                        <a href="/news" class="flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${activeMenuId === 'nav-news' ? 'font-bold bg-cyan/10 text-cyan' : 'font-semibold text-muted hover:bg-navy/5'}"><i data-lucide="newspaper" class="w-5 h-5"></i> Tin tức</a>
                        <a href="/guide" class="flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${activeMenuId === 'nav-guide' ? 'font-bold bg-cyan/10 text-cyan' : 'font-semibold text-muted hover:bg-navy/5'}"><i data-lucide="book-open" class="w-5 h-5"></i> Hướng dẫn</a>
                        <a href="/about" class="flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${activeMenuId === 'nav-about' ? 'font-bold bg-cyan/10 text-cyan' : 'font-semibold text-muted hover:bg-navy/5'}"><i data-lucide="info" class="w-5 h-5"></i> Về chúng tôi</a>
                    </div>
                </nav>
                <div class="p-4 border-t border-navy/5">
                    <button onclick="handleLogout()" class="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"><i data-lucide="log-out" class="w-5 h-5"></i> Đăng xuất</button>
                </div>
            </aside>
        `;

        layoutContainer.innerHTML = loggedInHTML;
        applySidebarState();
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Bắt đầu hành động chính từ trang chủ, đưa người dùng về đăng nhập hoặc sang trang đánh giá nếu đã đăng nhập.
function handleStartAction() {
    if (!checkLoginState()) openAuthModal(); 
    else window.location.href = '/evaluation'; 
}

// Mở chức năng chatbot nếu người dùng đã đăng nhập, nếu chưa thì yêu cầu đăng nhập.
function handleChatbotAction() {
    if (!checkLoginState()) openAuthModal(); 
    else window.location.href = '/chatbot'; 
}

// POPUP ĐĂNG NHẬP / ĐĂNG KÝ
const authModalHTML = `
    <div id="auth-modal" class="fixed inset-0 z-[150] hidden items-center justify-center p-4">
        <div class="absolute inset-0 bg-navy/60 backdrop-blur-sm transition-opacity" onclick="closeAuthModal()"></div>
        <div class="bg-surface rounded-3xl shadow-2xl z-10 w-full max-w-md overflow-hidden relative transform scale-100 transition-all">
            <button onclick="closeAuthModal()" class="absolute top-4 right-4 text-muted hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-colors z-20"><i data-lucide="x" class="w-5 h-5"></i></button>
            <div class="flex border-b border-gray-100 relative">
                <button onclick="switchAuthTab('login')" id="tab-login" class="flex-1 py-4 text-sm font-bold text-cyan border-b-2 border-cyan bg-cyan/5 transition-all">Đăng nhập</button>
                <button onclick="switchAuthTab('register')" id="tab-register" class="flex-1 py-4 text-sm font-bold text-muted border-b-2 border-transparent hover:text-navy transition-all">Đăng ký tài khoản</button>
            </div>
            <div class="p-6 sm:p-8">
                <div class="text-center mb-6">
                    <h3 class="text-2xl font-black text-navy tracking-tight" id="auth-title">Chào mừng trở lại!</h3>
                    <p class="text-xs text-muted mt-1" id="auth-subtitle">Đăng nhập để xem lịch sử và đánh giá hướng nghiệp.</p>
                </div>
                <p id="auth-message" class="hidden rounded-xl px-4 py-3 text-sm" role="alert" aria-live="polite"></p>
                <form id="form-login" onsubmit="loginUser(event)" class="space-y-4">
                    <div><label class="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Email hoặc số điện thoại</label><input name="identifier" type="text" required autocomplete="username" placeholder="name@example.com hoặc 0912345678" class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-cyan focus:bg-white transition-all text-navy placeholder:text-gray-400"></div>
                    <div>
                        <div class="flex justify-between items-center mb-1"><label class="text-[11px] font-bold text-muted uppercase tracking-wider">Mật khẩu</label><a href="#" class="text-[11px] font-bold text-cyan hover:underline">Quên mật khẩu?</a></div>
                        <input name="password" type="password" required autocomplete="current-password" placeholder="••••••••" class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-cyan focus:bg-white transition-all text-navy placeholder:text-gray-400">
                    </div>
                    <button type="submit" class="btn-gradient w-full py-3.5 mt-2 rounded-xl text-white font-bold shadow-md hover-glow transition-all active:scale-95 flex items-center justify-center gap-2">Đăng nhập hệ thống <i data-lucide="arrow-right" class="w-4 h-4"></i></button>
                </form>
                <form id="form-register" onsubmit="registerUser(event)" class="space-y-4 hidden">
                    <div><label class="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Họ và tên</label><input name="name" type="text" required minlength="2" maxlength="80" autocomplete="name" placeholder="Nguyễn Văn A" class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-cyan focus:bg-white transition-all text-navy placeholder:text-gray-400"></div>
                    <div><label class="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Giới tính</label><select name="gender" required class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-cyan focus:bg-white transition-all text-navy"><option value="" disabled selected>Chọn giới tính</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option><option value="Khác">Khác</option></select></div>
                    <div><label class="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Email</label><input name="email" type="email" required autocomplete="email" placeholder="name@example.com" class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-cyan focus:bg-white transition-all text-navy placeholder:text-gray-400"></div>
                    <div><label class="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Số điện thoại (không bắt buộc)</label><input name="phone" type="tel" autocomplete="tel" placeholder="0912345678" class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-cyan focus:bg-white transition-all text-navy placeholder:text-gray-400"></div>
                    <div><label class="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Mật khẩu</label><input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="Nhập mật khẩu" class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-cyan focus:bg-white transition-all text-navy placeholder:text-gray-400"><p class="mt-1 text-[11px] text-muted">Ít nhất 8 ký tự, gồm chữ thường, chữ hoa, số và ký tự đặc biệt.</p></div>
                    <button type="submit" class="btn-gradient w-full py-3.5 mt-2 rounded-xl text-white font-bold shadow-md hover-glow transition-all active:scale-95 flex items-center justify-center gap-2">Đăng ký<i data-lucide="user-plus" class="w-4 h-4"></i></button>
                </form>
            </div>
        </div>
    </div>
`;

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('auth-modal')) {
        document.body.insertAdjacentHTML('beforeend', authModalHTML);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
});

// Hiển thị popup đăng nhập/đăng ký trên giao diện người dùng.
function openAuthModal(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); switchAuthTab(tab); }
}
// Ẩn popup đăng nhập/đăng ký khi người dùng đóng hoặc hoàn tất thao tác.
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

// Chuyển đổi giữa tab Đăng nhập và Đăng ký trong modal chung của hệ thống.
function switchAuthTab(tab) {
    const loginForm = document.getElementById('form-login'), registerForm = document.getElementById('form-register');
    const tabLogin = document.getElementById('tab-login'), tabRegister = document.getElementById('tab-register');
    const title = document.getElementById('auth-title'), subtitle = document.getElementById('auth-subtitle');
    const message = document.getElementById('auth-message');
    message.classList.add('hidden');
    message.textContent = '';

    if (tab === 'login') {
        loginForm.classList.remove('hidden'); registerForm.classList.add('hidden');
        tabLogin.className = "flex-1 py-4 text-sm font-bold text-cyan border-b-2 border-cyan bg-cyan/5 transition-all";
        tabRegister.className = "flex-1 py-4 text-sm font-bold text-muted border-b-2 border-transparent hover:text-navy transition-all";
        title.innerText = "Chào mừng trở lại!"; subtitle.innerText = "Đăng nhập để xem lịch sử và đánh giá hướng nghiệp.";
    } else {
        loginForm.classList.add('hidden'); registerForm.classList.remove('hidden');
        tabRegister.className = "flex-1 py-4 text-sm font-bold text-cyan border-b-2 border-cyan bg-cyan/5 transition-all";
        tabLogin.className = "flex-1 py-4 text-sm font-bold text-muted border-b-2 border-transparent hover:text-navy transition-all";
        title.innerText = "Tạo tài khoản mới"; subtitle.innerText = "Tham gia cùng hàng ngàn học sinh định hướng tương lai.";
    }
}

function showAuthMessage(message, isError = true) {
    const messageElement = document.getElementById('auth-message');
    messageElement.textContent = message;
    messageElement.className = `rounded-xl px-4 py-3 text-sm ${isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`;
}

async function submitAuthForm(endpoint, form) {
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Không thể hoàn tất yêu cầu.');
        return result;
    } finally {
        submitButton.disabled = false;
    }
}

// Gửi thông tin đăng nhập và điều hướng theo quyền do máy chủ trả về.
async function loginUser(event) {
    event.preventDefault();
    try {
        const result = await submitAuthForm('/auth/login', event.currentTarget);
        window.location.href = result.user.role === 'admin' ? '/admin' : '/';
    } catch (error) {
        showAuthMessage(error.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    }
}

// Tạo tài khoản mới; sau khi thành công chuyển sang tab đăng nhập.
async function registerUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.elements.password.value;
    if (
        password.length < 8
        || new TextEncoder().encode(password).length > 72
        || !/\p{Ll}/u.test(password)
        || !/\p{Lu}/u.test(password)
        || !/\p{N}/u.test(password)
        || !/[^\p{L}\p{N}\s]/u.test(password)
    ) {
        showAuthMessage('Mật khẩu cần ít nhất 8 ký tự, gồm chữ thường, chữ hoa, chữ số và ký tự đặc biệt; tối đa 72 byte.');
        return;
    }
    try {
        const result = await submitAuthForm('/auth/register', form);
        const email = form.elements.email.value;
        form.reset();
        switchAuthTab('login');
        document.querySelector('#form-login [name="identifier"]').value = email;
        showAuthMessage(result.message, false);
    } catch (error) {
        showAuthMessage(error.message || 'Không thể đăng ký. Vui lòng thử lại.');
    }
}

if (new URLSearchParams(window.location.search).get('auth') === 'login') {
    document.addEventListener('DOMContentLoaded', () => openAuthModal('login'));
}