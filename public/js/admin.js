// ==========================================
// 1. BIẾN TOÀN CỤC & TRẠNG THÁI HỆ THỐNG
// ==========================================
let adminSessionStartTime = localStorage.getItem('adminSessionStartTime') || new Date().toISOString();
if (!localStorage.getItem('adminSessionStartTime')) {
    localStorage.setItem('adminSessionStartTime', adminSessionStartTime);
}

let userRoleFilter = 'all';
let userStatusFilter = 'all';
let userSearchKeyword = '';
let searchDebounceTimeout = null;

// ==========================================
// 2. HỆ THỐNG THÔNG BÁO TOAST NỔI (TOAST NOTIFICATION)
// ==========================================
function showAdminToast(message, type = 'success') {
    const container = document.getElementById('admin-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const bgClass = isSuccess ? 'bg-navy border-emerald-500/40 text-white' : 'bg-navy border-red-500/40 text-white';
    const iconName = isSuccess ? 'check-circle' : 'alert-circle';
    const iconColor = isSuccess ? 'text-emerald-400' : 'text-red-400';

    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-bold transition-all duration-300 translate-y-2 opacity-0 ${bgClass}`;
    toast.innerHTML = `
        <i data-lucide="${iconName}" class="w-4 h-4 ${iconColor} shrink-0"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 20);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==========================================
// 3. ĐỘNG CƠ REALTIME POLLING (TỰ ĐỘNG ĐỒNG BỘ MỖI 6 GIÂY)
// ==========================================
function formatClockTime(isoStr) {
    const d = new Date(isoStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${h}:${m} (${day}/${month})`;
}

async function fetchRealtimeMetrics() {
    try {
        const res = await fetch(`/api/admin/realtime-metrics?since=${encodeURIComponent(adminSessionStartTime)}`);
        const data = await res.json();
        if (!data.success) return;

        // Cập nhật con số tổng lũy kế
        const elUsers = document.getElementById('metric-total-users');
        const elNews = document.getElementById('metric-total-news');
        const elEvals = document.getElementById('metric-total-evaluations');

        if (elUsers && data.totals.totalUsers !== undefined) {
            elUsers.innerText = Number(data.totals.totalUsers).toLocaleString('vi-VN');
        }
        if (elNews && data.totals.totalNews !== undefined) {
            elNews.innerText = Number(data.totals.totalNews).toLocaleString('vi-VN');
        }
        if (elEvals && data.totals.totalEvaluations !== undefined) {
            elEvals.innerText = Number(data.totals.totalEvaluations).toLocaleString('vi-VN');
        }

        // Cập nhật các Badge "+X mới từ lúc đăng nhập"
        updateNewBadge('badge-new-users', data.newCounts.newUsers);
        updateNewBadge('badge-new-evaluations', data.newCounts.newEvaluations);

        // Cập nhật thanh Live Bar
        const timeDisplay = document.getElementById('admin-access-time-display');
        if (timeDisplay) {
            timeDisplay.innerText = `Theo dõi từ: ${formatClockTime(adminSessionStartTime)}`;
        }
        if (liveText) {
            const sumNew = (data.newCounts.newUsers || 0) + (data.newCounts.newEvaluations || 0);
            if (sumNew > 0) {
                liveText.innerHTML = `<span class="font-bold text-cyan">+${sumNew} bản ghi mới</span> từ lúc bạn mở phiên làm việc!`;
            } else {
                liveText.innerText = 'Chế độ giám sát Realtime đang kích hoạt.';
            }
        }
    } catch (err) {
        console.warn('Lỗi kết nối Realtime metrics:', err);
    }
}

function updateNewBadge(badgeId, count) {
    const el = document.getElementById(badgeId);
    if (!el) return;
    if (count && count > 0) {
        el.innerText = `+${count} mới`;
        el.classList.remove('hidden');
        el.classList.add('inline-flex');
    } else {
        el.classList.add('hidden');
        el.classList.remove('inline-flex');
    }
}

// ==========================================
// 4. BỘ LỌC TÌM KIẾM, TABS VAI TRÒ & TRẠNG THÁI
// ==========================================
function filterUserTable() {
    const rows = document.querySelectorAll('#user-table-tbody tr.user-row');
    const noResultsRow = document.getElementById('no-search-results');
    let visibleCount = 0;

    let countAll = 0;
    let countUsers = 0;
    let countAdmins = 0;

    rows.forEach(row => {
        const name = row.getAttribute('data-name') || '';
        const email = row.getAttribute('data-email') || '';
        const role = row.getAttribute('data-role') || 'user';
        const status = row.getAttribute('data-status') || 'active';

        // Đếm theo vai trò
        countAll++;
        if (role === 'user') countUsers++;
        if (role === 'admin') countAdmins++;

        const matchesSearch = !userSearchKeyword || name.includes(userSearchKeyword) || email.includes(userSearchKeyword);
        const matchesRole = (userRoleFilter === 'all') || (role === userRoleFilter);
        const matchesStatus = (userStatusFilter === 'all') || (status === userStatusFilter);

        if (matchesSearch && matchesRole && matchesStatus) {
            row.classList.remove('hidden');
            visibleCount++;
        } else {
            row.classList.add('hidden');
            const chk = row.querySelector('.user-row-checkbox');
            if (chk) chk.checked = false;
        }
    });

    // Cập nhật số đếm trên 3 Tabs
    const elAll = document.getElementById('count-role-all');
    const elUser = document.getElementById('count-role-user');
    const elAdmin = document.getElementById('count-role-admin');
    if (elAll) elAll.innerText = countAll;
    if (elUser) elUser.innerText = countUsers;
    if (elAdmin) elAdmin.innerText = countAdmins;

    if (noResultsRow) {
        noResultsRow.classList.toggle('hidden', visibleCount > 0);
    }

    handleUserCheckboxChange();
}

function setUserRoleFilter(role) {
    userRoleFilter = role;
    ['all', 'user', 'admin'].forEach(r => {
        const btn = document.getElementById(`tab-role-${r}`);
        if (!btn) return;
        if (r === role) {
            btn.className = 'tab-role-btn py-1.5 px-3 rounded-lg text-xs font-bold bg-white text-cyan shadow-sm transition';
        } else {
            btn.className = 'tab-role-btn py-1.5 px-3 rounded-lg text-xs font-bold text-slate-600 hover:text-navy transition';
        }
    });
    filterUserTable();
}

function setUserStatusFilter(status) {
    userStatusFilter = status;
    filterUserTable();
}

function handleUserSearch(keyword) {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
        userSearchKeyword = (keyword || '').trim().toLowerCase();
        filterUserTable();
    }, 200);
}

// ==========================================
// 5. KHÓA / MỞ KHÓA 1 TÀI KHOẢN (GỬI DATABASE VÀ LƯU VĨNH VIỄN)
// ==========================================
async function toggleUserStatus(button, userId) {
    if (!userId) return;

    button.disabled = true;
    button.classList.add('opacity-50');

    try {
        const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.success) {
            const row = document.getElementById(`user-row-${userId}`);
            if (row) {
                const statusBadge = row.querySelector('.status-badge');
                row.setAttribute('data-status', data.trangThai ? 'active' : 'locked');

                if (data.trangThai) {
                    if (statusBadge) {
                        statusBadge.textContent = 'Hoạt động';
                        statusBadge.className = 'status-badge rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700';
                    }
                    button.textContent = 'Khóa tài khoản';
                    button.className = 'toggle-status-btn rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition hover:opacity-90';
                } else {
                    if (statusBadge) {
                        statusBadge.textContent = 'Bị khóa';
                        statusBadge.className = 'status-badge rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700';
                    }
                    button.textContent = 'Mở khóa';
                    button.className = 'toggle-status-btn rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:opacity-90';
                }
            }
            showAdminToast(data.message, 'success');
        } else {
            showAdminToast(data.message || 'Lỗi cập nhật trạng thái', 'error');
        }
    } catch (err) {
        console.error('Lỗi khi gửi yêu cầu khóa/mở khóa:', err);
        showAdminToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
        button.disabled = false;
        button.classList.remove('opacity-50');
    }
}

// ==========================================
// 6. THAO TÁC HÀNG LOẠT (BATCH ACTIONS TOOLBAR)
// ==========================================
function toggleSelectAllUsers(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    const visibleRows = document.querySelectorAll('#user-table-tbody tr.user-row:not(.hidden) .user-row-checkbox');
    visibleRows.forEach(cb => {
        cb.checked = isChecked;
    });
    handleUserCheckboxChange();
}

function handleUserCheckboxChange() {
    const selectedCheckboxes = document.querySelectorAll('.user-row-checkbox:checked');
    const batchBar = document.getElementById('batch-action-bar');
    const selectedCountText = document.getElementById('batch-selected-count');
    const masterCheckbox = document.getElementById('check-all-users');

    const totalVisible = document.querySelectorAll('#user-table-tbody tr.user-row:not(.hidden) .user-row-checkbox').length;
    if (masterCheckbox && totalVisible > 0) {
        masterCheckbox.checked = (selectedCheckboxes.length === totalVisible);
    }

    if (selectedCheckboxes.length >= 2) {
        if (batchBar) {
            batchBar.classList.remove('hidden');
            batchBar.classList.add('flex');
        }
        if (selectedCountText) {
            selectedCountText.innerText = `Đã chọn ${selectedCheckboxes.length} tài khoản`;
        }
    } else {
        if (batchBar) {
            batchBar.classList.add('hidden');
            batchBar.classList.remove('flex');
        }
    }
}

function deselectAllUsers() {
    document.querySelectorAll('.user-row-checkbox').forEach(cb => cb.checked = false);
    const masterCheckbox = document.getElementById('check-all-users');
    if (masterCheckbox) masterCheckbox.checked = false;
    handleUserCheckboxChange();
}

async function executeBatchAction(targetStatus) {
    const selectedCheckboxes = document.querySelectorAll('.user-row-checkbox:checked');
    const userIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (userIds.length === 0) return;

    const actionText = targetStatus ? 'mở khóa' : 'khóa';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} ${userIds.length} tài khoản đã chọn?`)) {
        return;
    }

    try {
        const res = await fetch('/api/admin/users/batch-status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds, status: targetStatus })
        });
        const data = await res.json();

        if (data.success) {
            userIds.forEach(id => {
                const row = document.getElementById(`user-row-${id}`);
                if (!row) return;

                const statusBadge = row.querySelector('.status-badge');
                const btn = row.querySelector('.toggle-status-btn');
                row.setAttribute('data-status', targetStatus ? 'active' : 'locked');

                if (targetStatus) {
                    if (statusBadge) {
                        statusBadge.textContent = 'Hoạt động';
                        statusBadge.className = 'status-badge rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700';
                    }
                    if (btn) {
                        btn.textContent = 'Khóa tài khoản';
                        btn.className = 'toggle-status-btn rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition hover:opacity-90';
                    }
                } else {
                    if (statusBadge) {
                        statusBadge.textContent = 'Bị khóa';
                        statusBadge.className = 'status-badge rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700';
                    }
                    if (btn) {
                        btn.textContent = 'Mở khóa';
                        btn.className = 'toggle-status-btn rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:opacity-90';
                    }
                }
            });

            deselectAllUsers();
            showAdminToast(data.message, 'success');
        } else {
            showAdminToast(data.message || 'Lỗi thao tác hàng loạt', 'error');
        }
    } catch (err) {
        console.error('Lỗi khi thao tác hàng loạt:', err);
        showAdminToast('Lỗi kết nối máy chủ.', 'error');
    }
}

function exportSelectedAccountsExcel() {
    const selectedRows = Array.from(document.querySelectorAll('.user-row-checkbox:checked'))
        .map(cb => cb.closest('tr'))
        .filter(Boolean);

    if (selectedRows.length === 0) {
        alert('Vui lòng chọn ít nhất 1 tài khoản để xuất.');
        return;
    }

    const headers = ['Tên', 'Email', 'Vai trò', 'Trạng thái'];
    const accountRows = selectedRows.map(row => {
        const cells = row.querySelectorAll('td');
        return [
            cells[1]?.textContent.trim() || '',
            cells[2]?.textContent.trim() || '',
            cells[3]?.textContent.trim() || '',
            cells[4]?.textContent.trim() || ''
        ];
    });

    const rows = [
        ['DANH SÁCH TÀI KHOẢN ĐƯỢC CHỌN'],
        ['Ngày xuất', new Date().toLocaleDateString('vi-VN')],
        [],
        headers,
        ...accountRows
    ];

    downloadCsv(rows, `tai-khoan-da-chon-${new Date().toISOString().slice(0, 10)}.csv`);
    deselectAllUsers();
}

// ==========================================
// 7. BIỂU ĐỒ & CÁC CHỨC NĂNG CŨ
// ==========================================
function renderChartBars(data) {
    const barsContainer = document.getElementById('chart-bars-container');
    const labelsContainer = document.getElementById('chart-labels-container');
    if (!barsContainer || !labelsContainer || !Array.isArray(data)) return;

    barsContainer.innerHTML = '';
    labelsContainer.innerHTML = '';

    const totalBars = data.length;
    const maxCount = Math.max(...data.map(d => d.count), 5);
    const colors = ['bg-cyan/45', 'bg-violet/40', 'bg-cyan/35', 'bg-ocean', 'bg-cyan/55', 'bg-violet/45', 'bg-cyan/50'];

    if (totalBars > 20) {
        barsContainer.className = 'relative z-10 w-full h-full flex items-end justify-between gap-[3px] sm:gap-1 px-0.5';
        labelsContainer.className = 'w-full flex items-center justify-between gap-[3px] sm:gap-1 pt-2.5 px-0.5 min-h-[28px]';
    } else if (totalBars > 10) {
        barsContainer.className = 'relative z-10 w-full h-full flex items-end justify-between gap-1 sm:gap-1.5 px-1';
        labelsContainer.className = 'w-full flex items-center justify-between gap-1 sm:gap-1.5 pt-3 px-1 min-h-[28px]';
    } else {
        barsContainer.className = 'relative z-10 w-full h-full flex items-end justify-around gap-2 sm:gap-4 px-2';
        labelsContainer.className = 'w-full flex items-center justify-around gap-2 sm:gap-4 pt-3 px-2 min-h-[28px]';
    }

    data.forEach((item, idx) => {
        const heightPercent = item.count > 0
            ? Math.max(Math.round((item.count / maxCount) * 92), 12)
            : 6;
        const color = item.count > 0 ? colors[idx % colors.length] : 'bg-slate-200/80';
        const maxWidthClass = totalBars <= 8 ? 'max-w-[42px]' : (totalBars <= 16 ? 'max-w-[26px]' : 'max-w-[16px]');
        const radiusClass = totalBars > 20 ? 'rounded-t-sm' : 'rounded-t-md';

        const barCol = document.createElement('div');
        barCol.className = 'flex-1 min-w-0 h-full flex items-end justify-center';

        const tooltipText = `${item.fullLabel || item.label}: ${item.count} lượt hoàn thành`;

        barCol.innerHTML = `
            <div class="relative group w-full ${maxWidthClass} ${radiusClass} ${color} hover:bg-cyan hover:brightness-105 transition-all duration-300 cursor-pointer" style="height: ${heightPercent}%;">
                <div class="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-navy text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-40 whitespace-nowrap">
                    ${tooltipText}
                </div>
            </div>
        `;
        barsContainer.appendChild(barCol);

        const labelCol = document.createElement('div');
        labelCol.className = 'flex-1 min-w-0 flex justify-center items-center overflow-visible';

        let showLabel = true;
        if (totalBars > 24) {
            showLabel = (idx === 0 || idx === totalBars - 1 || idx % 3 === 0);
        } else if (totalBars > 14) {
            showLabel = (idx === 0 || idx === totalBars - 1 || idx % 2 === 0);
        }

        const fontSizeClass = totalBars > 14 ? 'text-[10px]' : 'text-xs';
        labelCol.innerHTML = `
            <span class="${fontSizeClass} font-semibold text-muted whitespace-nowrap select-none">
                ${showLabel ? item.label : ''}
            </span>
        `;
        labelsContainer.appendChild(labelCol);
    });
}

async function openAllRecommendedMajorsModal() {
    const modal = document.getElementById('all-majors-modal');
    const listContainer = document.getElementById('all-majors-modal-list');
    if (!modal || !listContainer) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    listContainer.innerHTML = `
        <div class="py-12 text-center text-muted">
            <div class="w-8 h-8 border-4 border-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-xs font-semibold">Đang truy vấn dữ liệu từ hệ thống AI...</p>
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const res = await fetch('/api/admin/all-recommended-majors');
        const data = await res.json();
        listContainer.innerHTML = '';

        if (data.success && data.majors && data.majors.length > 0) {
            data.majors.forEach((m) => {
                listContainer.innerHTML += `
                    <div data-major="${m.name}" onclick="closeAllRecommendedMajorsModal(); viewMajorDetails('${encodeURIComponent(m.name)}');" class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-cyan/40 hover:bg-white transition-all cursor-pointer flex items-center justify-between gap-3 group">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan/10 font-black text-cyan text-xs">
                                ${m.rank}
                            </span>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <p class="font-bold text-navy text-sm group-hover:text-cyan transition-colors truncate">${m.name}</p>
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                        TB ${m.avgMatch || '0'}% phù hợp
                                    </span>
                                </div>
                                <p class="text-[11px] text-muted mt-0.5">${m.count} lượt học sinh được AI đề xuất (${m.percentage}% tổng lượt)</p>
                            </div>
                        </div>
                        <div class="text-right shrink-0 flex items-center gap-3">
                            <span class="text-base font-black text-cyan">${m.percentage}%</span>
                            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 group-hover:text-cyan transition-colors"></i>
                        </div>
                    </div>
                `;
            });
        } else {
            listContainer.innerHTML = `
                <div class="py-12 px-4 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <i data-lucide="inbox" class="w-6 h-6"></i>
                    </div>
                    <p class="text-sm font-bold text-slate-600">Chưa có bài đánh giá nào</p>
                    <p class="text-xs text-muted mt-1">Hệ thống chưa ghi nhận lượt đánh giá nào nên chưa có danh sách đề xuất ngành học.</p>
                </div>
            `;
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        console.error('Lỗi lấy danh sách ngành:', err);
    }
}

function closeAllRecommendedMajorsModal() {
    const modal = document.getElementById('all-majors-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function viewMajorDetails(majorName) {
    if (!majorName) return;
    try {
        const res = await fetch(`/api/admin/major-detail/${encodeURIComponent(majorName)}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('modal-major-title').innerText = data.majorName;
            document.getElementById('modal-total-hits').innerText = `${data.totalMatches} lượt`;

            const list = document.getElementById('modal-schools-list');
            list.innerHTML = '';
            if (data.admissions && data.admissions.length > 0) {
                data.admissions.forEach(item => {
                    list.innerHTML += `
                        <div class="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <p class="font-bold text-navy text-sm">${item.tenTruong} (${item.maTruong})</p>
                                <p class="text-xs text-muted">Tổ hợp: <span class="font-bold text-cyan">${item.toHop}</span> | Mã ngành: ${item.maNganh}</p>
                            </div>
                            <div class="text-right">
                                <span class="text-xs text-muted block">Điểm chuẩn dự kiến</span>
                                <span class="text-sm font-black text-emerald-600">${item.diemChuanDuKien}</span>
                            </div>
                        </div>
                    `;
                });
            } else {
                list.innerHTML = '<p class="text-xs text-muted py-2">Chưa có thông tin đối sánh điểm chuẩn cụ thể cho ngành này.</p>';
            }

            const modal = document.getElementById('major-detail-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    } catch (err) {
        console.error('Lỗi lấy thông tin ngành:', err);
    }
}

function closeMajorDetailModal() {
    const modal = document.getElementById('major-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

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
    if (summaryCards.length === 0) return alert('Không tìm thấy dữ liệu dashboard để xuất.');

    const rows = [
        ['BÁO CÁO TRUNG TÂM ĐIỀU KHIỂN'],
        ['Ngày xuất', new Date().toLocaleDateString('vi-VN')],
        [],
        ['CHỈ SỐ TỔNG QUAN'],
        ['Chỉ số', 'Giá trị'],
        ...summaryCards.map((card) => [
            card.querySelector('.text-xs')?.textContent.trim() ?? '',
            card.querySelector('.text-3xl')?.textContent.trim() ?? ''
        ])
    ];
    downloadCsv(rows, `bao-cao-dashboard-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportAccountsExcel() {
    const table = document.querySelector('#accounts table');
    const headers = ['Tên', 'Email', 'Vai trò', 'Trạng thái'];
    const visibleRows = [...document.querySelectorAll('#user-table-tbody tr.user-row:not(.hidden)')];

    if (visibleRows.length === 0) return alert('Không có dữ liệu tài khoản hiển thị để xuất.');

    const accountRows = visibleRows.map((row) => {
        const cells = row.querySelectorAll('td');
        return [
            cells[1]?.textContent.trim() || '',
            cells[2]?.textContent.trim() || '',
            cells[3]?.textContent.trim() || '',
            cells[4]?.textContent.trim() || ''
        ];
    });

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
    if (brandCopy) brandCopy.classList.toggle('hidden', collapsed);
    if (brandToggle) {
        brandToggle.setAttribute('aria-expanded', String(!collapsed));
        brandToggle.setAttribute('title', collapsed ? 'Mở thanh điều hướng' : 'Đóng thanh điều hướng');
    }

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (backdrop) backdrop.classList.toggle('hidden', !isMobile || collapsed);

    if (persist) localStorage.setItem('sidebarCollapsed', String(collapsed));
}

function toggleAdminSidebar() {
    applyAdminSidebarState(!isAdminSidebarCollapsed, true);
}

function activateAdminPanel(targetId) {
    document.querySelectorAll('.admin-panel').forEach((panel) => panel.classList.add('hidden'));
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) targetPanel.classList.remove('hidden');

    document.querySelectorAll('.admin-nav').forEach((navItem) => {
        const isActive = navItem.dataset.target === targetId;
        navItem.classList.toggle('active', isActive);
        navItem.classList.toggle('bg-cyan/10', isActive);
        navItem.classList.toggle('text-cyan', isActive);
        navItem.classList.toggle('border-cyan/20', isActive);
        navItem.classList.toggle('text-muted', !isActive);
    });

    if (window.innerWidth < 768) applyAdminSidebarState(true, true);
}

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

// Bộ lọc ngày Flatpickr
let currentSelectedTimeframe = '7days';
let customDateMode = 'single';
let fpSingle, fpStart, fpEnd;

function getTodayVNStr() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
}

function buildClientSubtitle(params) {
    const now = new Date();
    const todayVN = getTodayVNStr();
    const prefix = 'Số lượt hoàn thành bài đánh giá hướng nghiệp Hollands<br>';

    if (params.timeframe === 'today') {
        return `${prefix}hôm nay (${todayVN})`;
    }
    if (params.timeframe === '7days') {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        const startVN = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
        return `${prefix}trong 7 ngày gần nhất (${startVN} - ${todayVN})`;
    }
    if (params.timeframe === '1month') {
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        const startVN = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
        return `${prefix}trong 1 tháng qua (${startVN} - ${todayVN})`;
    }
    if (params.timeframe === 'custom') {
        if (params.startDate === params.endDate) {
            return `${prefix}trong ngày ${params.startDate}`;
        }
        return `${prefix} ${params.startDate} - ${params.endDate}`;
    }
    return '';
}

function highlightActivePreset(tf) {
    ['today', '7days', '1month'].forEach(p => {
        const btn = document.getElementById(`preset-${p}`);
        if (!btn) return;
        if (p === tf) {
            btn.className = 'preset-btn py-1.5 px-2 rounded-lg text-xs font-bold bg-white text-cyan shadow-sm transition';
        } else {
            btn.className = 'preset-btn py-1.5 px-2 rounded-lg text-xs font-bold text-slate-600 hover:text-navy transition';
        }
    });
}

function toggleTimeframeDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('timeframe-dropdown-menu');
    const chevron = document.getElementById('timeframe-chevron');
    if (menu) {
        menu.classList.toggle('hidden');
        if (chevron) chevron.classList.toggle('rotate-180');
    }
}

document.addEventListener('click', (e) => {
    if (e.target.closest('.flatpickr-calendar')) return;
    const dropdown = document.getElementById('timeframe-dropdown-menu');
    const btn = document.getElementById('timeframe-dropdown-btn');
    if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
        document.getElementById('timeframe-chevron')?.classList.remove('rotate-180');
    }
});

async function fetchConsultationStats(params) {
    const expectedSubtitle = buildClientSubtitle(params);
    const subtitleEl = document.getElementById('chart-dynamic-subtitle');
    if (subtitleEl && expectedSubtitle) {
        subtitleEl.innerHTML = expectedSubtitle;
    }

    try {
        const queryStr = new URLSearchParams(params).toString();
        const res = await fetch(`/api/admin/consultation-stats?${queryStr}`);
        const data = await res.json();
        if (data.success) {
            if (subtitleEl) {
                subtitleEl.innerHTML = expectedSubtitle || data.subtitle;
            }
            renderChartBars(data.chartData);
        }
    } catch (err) {
        console.error('Lỗi cập nhật biểu đồ:', err);
    }
}

function selectTimeframe(tf, labelText) {
    currentSelectedTimeframe = tf;
    highlightActivePreset(tf);

    const labelEl = document.getElementById('timeframe-label');
    if (labelEl) {
        labelEl.innerHTML = `<i data-lucide="calendar" class="h-4 w-4 text-cyan shrink-0"></i><span>${labelText}</span>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    document.getElementById('timeframe-dropdown-menu')?.classList.add('hidden');
    document.getElementById('timeframe-chevron')?.classList.remove('rotate-180');

    fetchConsultationStats({ timeframe: tf });
}

function setCustomDateMode(mode) {
    customDateMode = mode;
    const btnSingle = document.getElementById('btn-mode-single');
    const btnRange = document.getElementById('btn-mode-range');
    const singleWrapper = document.getElementById('single-date-wrapper');
    const rangeWrapper = document.getElementById('range-date-wrapper');

    if (mode === 'single') {
        btnSingle.className = 'py-1.5 px-2 text-xs font-bold rounded-lg bg-white text-cyan shadow-sm transition';
        btnRange.className = 'py-1.5 px-2 text-xs font-bold rounded-lg text-slate-600 hover:text-navy transition';
        singleWrapper.classList.remove('hidden');
        rangeWrapper.classList.add('hidden');
    } else {
        btnRange.className = 'py-1.5 px-2 text-xs font-bold rounded-lg bg-white text-cyan shadow-sm transition';
        btnSingle.className = 'py-1.5 px-2 text-xs font-bold rounded-lg text-slate-600 hover:text-navy transition';
        rangeWrapper.classList.remove('hidden');
        singleWrapper.classList.add('hidden');
    }
}

function applyCustomDateFilter() {
    let startDate, endDate, labelText;

    if (customDateMode === 'single') {
        const val = document.getElementById('custom-single-date').value;
        if (!val) return alert('Vui lòng chọn ngày.');
        startDate = val;
        endDate = val;
        labelText = val;
    } else {
        startDate = document.getElementById('custom-start-date').value;
        endDate = document.getElementById('custom-end-date').value;
        if (!startDate || !endDate) return alert('Vui lòng chọn đầy đủ từ ngày và đến ngày.');

        if (startDate === endDate) {
            labelText = startDate;
        } else {
            labelText = `${startDate} - ${endDate}`;
        }
    }

    highlightActivePreset('custom');
    document.getElementById('timeframe-dropdown-menu')?.classList.add('hidden');
    document.getElementById('timeframe-chevron')?.classList.remove('rotate-180');

    const labelEl = document.getElementById('timeframe-label');
    if (labelEl) {
        labelEl.innerHTML = `<i data-lucide="calendar" class="h-4 w-4 text-cyan shrink-0"></i><span class="whitespace-nowrap">${labelText}</span>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    currentSelectedTimeframe = 'custom';
    fetchConsultationStats({ timeframe: 'custom', startDate, endDate });
}

function initVietnameseDatePickers() {
    if (typeof flatpickr === 'undefined') return;

    const vnConfig = {
        dateFormat: "d/m/Y",
        locale: flatpickr.l10ns.vn || "vn",
        disableMobile: true
    };

    fpSingle = flatpickr("#custom-single-date", {
        ...vnConfig,
        defaultDate: new Date()
    });

    fpStart = flatpickr("#custom-start-date", {
        ...vnConfig,
        defaultDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        onChange: function(selectedDates) {
            if (selectedDates[0] && fpEnd) fpEnd.set('minDate', selectedDates[0]);
        }
    });

    fpEnd = flatpickr("#custom-end-date", {
        ...vnConfig,
        defaultDate: new Date(),
        onChange: function(selectedDates) {
            if (selectedDates[0] && fpStart) fpStart.set('maxDate', selectedDates[0]);
        }
    });
}

function updateAdminTimeDisplay() {
    const timeDisplay = document.getElementById('admin-access-time-display');
    if (timeDisplay) {
        timeDisplay.innerText = `Theo dõi từ: ${formatClockTime(adminSessionStartTime)}`;
    }
}

// ==========================================
// 8. KHỞI CHẠY KHI TẢI TRANG
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (!checkLoginState() || getCurrentUserRole() !== 'admin') {
        window.location.href = '/';
        return;
    }

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

    document.getElementById('export-dashboard')?.addEventListener('click', exportDashboardExcel);
    document.getElementById('export-accounts')?.addEventListener('click', exportAccountsExcel);

    document.querySelectorAll('button').forEach((button) => {
        if (button.textContent.includes('Ẩn bài viết') || button.textContent.includes('Hiện bài viết')) {
            button.addEventListener('click', () => toggleNewsVisibility(button));
        }
    });
});