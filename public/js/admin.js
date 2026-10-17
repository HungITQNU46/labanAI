function downloadCsv(rows, fileName) {
    const escapeCsvCell = (value) => {
        let cell = String(value);
        if (/^[\s]*[=+\-@]/.test(cell)) cell = `'${cell}`;
        return `"${cell.replaceAll('"', '""')}"`;
    };
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}

function exportDashboardExcel() {
    const summaryCards = [...document.querySelectorAll('[data-export-summary]')];
    const majorRows = [...document.querySelectorAll('[data-export-majors] li')];

    if (summaryCards.length === 0 || majorRows.length === 0) {
        alert('Không tìm thấy dữ liệu dashboard để xuất.');
        return;
    }

    const rows = [
        ['BÁO CÁO TRUNG TÂM ĐIỀU KHIỂN'],
        ['Ngày xuất', new Date().toLocaleDateString('vi-VN')],
        [],
        ['CHỈ SỐ TỔNG QUAN'],
        ['Chỉ số', 'Giá trị'],
        ...summaryCards.map((card) => [
            card.querySelector('.text-xs')?.textContent.trim() ?? '',
            card.querySelector('.text-3xl')?.textContent.trim() ?? ''
        ]),
        [],
        ['NGÀNH ĐƯỢC QUAN TÂM'],
        ['STT', 'Ngành', 'Lượt gợi ý'],
        ...majorRows.map((item) => [
            item.querySelector('span.flex')?.textContent.trim() ?? '',
            item.querySelector('p.font-bold')?.textContent.trim() ?? '',
            item.querySelector('.text-xl')?.textContent.trim() ?? ''
        ])
    ];

    downloadCsv(rows, `bao-cao-dashboard-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportAccountsExcel() {
    const table = document.querySelector('#accounts table');
    const headers = [...(table?.querySelectorAll('thead th') ?? [])]
        .slice(0, 4)
        .map((header) => header.textContent.trim());
    const accountRows = [...(table?.querySelectorAll('tbody tr') ?? [])]
        .map((row) => [...row.querySelectorAll('td')].slice(0, 4)
            .map((cell) => cell.textContent.trim()));

    if (headers.length === 0 || accountRows.length === 0) {
        alert('Không tìm thấy dữ liệu tài khoản để xuất.');
        return;
    }

    const rows = [
        ['DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG'],
        ['Ngày xuất', new Date().toLocaleDateString('vi-VN')],
        [],
        headers,
        ...accountRows
    ];
    downloadCsv(rows, `danh-sach-tai-khoan-${new Date().toISOString().slice(0, 10)}.csv`);
}

let isAdminSidebarCollapsed = false;

// Áp dụng trạng thái đóng/mở thanh điều hướng và cập nhật phần nội dung theo trạng thái đó.
function applyAdminSidebarState(collapsed, persist = false) {
    const sidebar = document.getElementById('admin-sidebar');
    const mainWrapper = document.getElementById('main-wrapper');
    const backdrop = document.getElementById('admin-sidebar-backdrop');
    const brandToggle = document.getElementById('admin-brand-toggle');
    const brandCopy = document.getElementById('admin-brand-copy');

    if (!sidebar || !mainWrapper) return;

    isAdminSidebarCollapsed = collapsed;
    sidebar.style.transform = collapsed ? 'translateX(-100%)' : 'translateX(0)';
    mainWrapper.classList.toggle('md:ml-64', !collapsed);
    if (brandCopy) {
        brandCopy.classList.toggle('hidden', collapsed);
    }
    if (brandToggle) {
        brandToggle.setAttribute('aria-expanded', String(!collapsed));
        brandToggle.setAttribute('title', collapsed
            ? 'Nhấn vào logo để mở thanh điều hướng'
            : 'Nhấn vào logo để đóng thanh điều hướng');
    }

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (backdrop) {
        backdrop.classList.toggle('hidden', !isMobile || collapsed);
    }

    if (persist) {
        localStorage.setItem('sidebarCollapsed', String(collapsed));
    }
}

// Thu gọn hoặc mở thanh điều hướng quản trị khi quản trị viên nhấn vào logo.
function toggleAdminSidebar() {
    applyAdminSidebarState(!isAdminSidebarCollapsed, true);
}

// Hiển thị đúng panel tương ứng với mục đã chọn trong sidebar của quản trị viên.
function activateAdminPanel(targetId) {
    document.querySelectorAll('.admin-panel').forEach((panel) => {
        panel.classList.add('hidden');
    });

    const targetPanel = document.getElementById(targetId);
    if (targetPanel) {
        targetPanel.classList.remove('hidden');
    }

    document.querySelectorAll('.admin-nav').forEach((navItem) => {
        const isActive = navItem.dataset.target === targetId;
        navItem.classList.toggle('active', isActive);
        navItem.classList.toggle('bg-cyan/10', isActive);
        navItem.classList.toggle('text-cyan', isActive);
        navItem.classList.toggle('border-cyan/20', isActive);
        navItem.classList.toggle('text-muted', !isActive);
    });

    if (window.innerWidth < 768) {
        applyAdminSidebarState(true, true);
    }
}

// Cập nhật trạng thái active trên menu trái của trang quản trị để người dùng dễ nhận diện đang ở mục nào.
function activateAdminNav(button) {
    if (!button || !button.dataset.target) return;
    activateAdminPanel(button.dataset.target);
}

// Chuyển đổi trạng thái khóa/mở khóa tài khoản người dùng trong bảng quản lý tài khoản.
function toggleUserStatus(button) {
    const row = button.closest('tr');
    const statusBadge = row.querySelector('td:nth-child(4) span');

    if (statusBadge && statusBadge.textContent.trim() === 'Hoạt động') {
        statusBadge.textContent = 'Bị khóa';
        statusBadge.className = 'rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700';
        button.textContent = 'Mở khóa';
        button.className = 'rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700';
    } else if (statusBadge) {
        statusBadge.textContent = 'Hoạt động';
        statusBadge.className = 'rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700';
        button.textContent = 'Khóa tài khoản';
        button.className = 'rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600';
    }
}

// Chuyển đổi trạng thái ẩn/hiện của bài viết trên giao diện quản lý tin tức.
function toggleNewsVisibility(button) {
    const card = button.closest('.rounded-2xl');
    const statusBadge = card.querySelector('span.rounded-full');

    if (!statusBadge) return;

    if (statusBadge.textContent.trim() === 'Hiện') {
        statusBadge.textContent = 'Ẩn';
        statusBadge.className = 'rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700';
        button.textContent = 'Hiện bài viết';
        button.className = 'rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700';
    } else {
        statusBadge.textContent = 'Hiện';
        statusBadge.className = 'rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700';
        button.textContent = 'Ẩn bài viết';
        button.className = 'rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedSidebarState = localStorage.getItem('sidebarCollapsed');
    const initiallyCollapsed = savedSidebarState === null
        ? window.matchMedia('(max-width: 767px)').matches
        : savedSidebarState === 'true';
    applyAdminSidebarState(initiallyCollapsed);
    window.addEventListener('resize', () => {
        const backdrop = document.getElementById('admin-sidebar-backdrop');
        if (backdrop) {
            backdrop.classList.toggle(
                'hidden',
                !window.matchMedia('(max-width: 767px)').matches || isAdminSidebarCollapsed
            );
        }
    });

    document.querySelectorAll('.admin-nav').forEach((navItem) => {
        navItem.addEventListener('click', () => activateAdminNav(navItem));
    });
    document.getElementById('export-dashboard')?.addEventListener('click', exportDashboardExcel);
    document.getElementById('export-accounts')?.addEventListener('click', exportAccountsExcel);
    document.getElementById('export-dashboard')?.addEventListener('click', exportDashboardExcel);

    document.querySelectorAll('button').forEach((button) => {
        if (button.textContent.includes('Khóa tài khoản') || button.textContent.includes('Mở khóa')) {
            button.addEventListener('click', () => toggleUserStatus(button));
        }

        if (button.textContent.includes('Ẩn bài viết') || button.textContent.includes('Hiện bài viết')) {
            button.addEventListener('click', () => toggleNewsVisibility(button));
        }
    });
});
