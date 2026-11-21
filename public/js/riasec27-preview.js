/**
 * riasec27-preview.js
 * 
 * Frontend interaction script for Direction B RIASEC27 Research Preview.
 * Strictly qualitative Tier 2 exploration with invariant ML Top-3 protection.
 */

'use strict';

(() => {
    // 1. Data elements
    const dataElement = document.getElementById('riasec27-data');
    if (!dataElement) return;

    let questionnaire = null;
    try {
        questionnaire = JSON.parse(dataElement.textContent);
    } catch (e) {
        console.error('Failed to parse questionnaire source JSON:', e);
        return;
    }

    const questions = questionnaire.questions || [];
    const scale = questionnaire.answer_scale || [];
    const TOTAL_QUESTIONS = 27;

    // DOM references
    const questionsContainer = document.getElementById('questions-list');
    const answeredCountEl = document.getElementById('answered-count');
    const submitBtn = document.getElementById('btn-submit-riasec');
    const resetBtn = document.getElementById('btn-reset-answers');
    const form = document.getElementById('riasec27-form');

    const resultsPanel = document.getElementById('riasec27-results-panel');
    const resultsContent = document.getElementById('results-content');

    const catalogListEl = document.getElementById('catalog-list');
    const filterButtons = document.querySelectorAll('.catalog-filter-btn');

    const themesGrid = document.getElementById('themes-grid');
    const tier2Box = document.getElementById('tier2-question-box');
    const tier2ThemeTitle = document.getElementById('tier2-theme-title');
    const tier2QuestionText = document.getElementById('tier2-question-text');
    const tier2OptionsContainer = document.getElementById('tier2-options-container');
    const tier2Form = document.getElementById('tier2-form');
    const tier2ResultBox = document.getElementById('tier2-result-box');
    const tier2FocusTag = document.getElementById('tier2-focus-tag');
    const tier2GuidanceText = document.getElementById('tier2-guidance-text');
    const tier2StepsList = document.getElementById('tier2-steps-list');
    const btnCloseTier2 = document.getElementById('btn-close-tier2');
    const btnSkipTier2 = document.getElementById('btn-skip-tier2');

    // Local in-memory state (NEVER persisted to storage or database)
    const answers = new Map();
    let currentCatalog = [];
    let currentThemes = [];
    let activeThemeId = null;

    // --- SECTION 1: SURVEY RENDERING ---
    function renderQuestions() {
        if (!questionsContainer) return;
        questionsContainer.innerHTML = '';

        questions.forEach((q, idx) => {
            const card = document.createElement('div');
            card.className = 'p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm';

            const header = document.createElement('div');
            header.className = 'flex items-center gap-2 mb-2';
            header.innerHTML = `
                <span class="rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold px-2 py-0.5">${q.question_id}</span>
                <span class="text-xs text-muted font-semibold">Nhóm ${q.domain}</span>
            `;

            const prompt = document.createElement('div');
            prompt.className = 'text-sm font-semibold text-navy mb-4';
            prompt.innerHTML = `
                <span>${idx + 1}. ${escapeHtml(q.vietnamese_text)}</span>
                <span class="block text-xs font-normal text-slate-500 mt-0.5 italic">[${escapeHtml(q.codebook_statement)}]</span>
            `;

            const optionsGroup = document.createElement('div');
            optionsGroup.className = 'grid grid-cols-1 sm:grid-cols-5 gap-2';

            scale.forEach((s) => {
                const label = document.createElement('label');
                label.className = 'option-label flex items-center sm:flex-col sm:justify-center p-2.5 rounded-xl border border-slate-200 cursor-pointer text-xs transition gap-2 text-slate-700 select-none';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `question_${q.question_id}`;
                radio.value = s.value;
                radio.className = 'option-radio accent-cyan text-cyan';

                radio.addEventListener('change', () => {
                    answers.set(q.question_id, s.value);
                    updateAnswerProgress();
                });

                const textSpan = document.createElement('span');
                textSpan.className = 'text-center text-[11px]';
                textSpan.innerHTML = `<strong>${s.value}.</strong> ${escapeHtml(s.label_vi)}`;

                label.appendChild(radio);
                label.appendChild(textSpan);
                optionsGroup.appendChild(label);
            });

            card.appendChild(header);
            card.appendChild(prompt);
            card.appendChild(optionsGroup);
            questionsContainer.appendChild(card);
        });
    }

    function updateAnswerProgress() {
        const count = answers.size;
        if (answeredCountEl) answeredCountEl.textContent = count;
        if (submitBtn) {
            submitBtn.disabled = count !== TOTAL_QUESTIONS;
        }
    }

    function resetSurvey() {
        answers.clear();
        const radios = questionsContainer.querySelectorAll('input[type="radio"]');
        radios.forEach((r) => { r.checked = false; });
        updateAnswerProgress();
        if (resultsPanel) resultsPanel.classList.add('hidden');
        if (resultsContent) resultsContent.innerHTML = '';
    }

    // --- SECTION 2: SUBMIT & RENDER TOP-3 ---
    async function submitSurvey(e) {
        e.preventDefault();
        if (answers.size !== TOTAL_QUESTIONS) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang xử lý mô hình ML...';

        const payloadAnswers = {};
        for (const [k, v] of answers.entries()) {
            payloadAnswers[k] = v;
        }

        try {
            const resp = await fetch('/api/riasec27/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: payloadAnswers })
            });

            const data = await resp.json();
            renderResults(data);
        } catch (err) {
            renderError('Không thể kết nối đến máy chủ phân tích hoặc tiến trình xử lý gặp sự cố.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Gửi tính điểm ML Top-3';
        }
    }

    function renderResults(data) {
        if (!resultsPanel || !resultsContent) return;
        resultsPanel.classList.remove('hidden');
        resultsPanel.scrollIntoView({ behavior: 'smooth' });

        const ml = data.ml_ranking || {};
        const status = ml.status || 'UNKNOWN';

        if (status === 'SUCCESS') {
            const top3 = ml.top3 || [];
            let cardsHtml = '<div class="grid grid-cols-1 md:grid-cols-3 gap-5">';

            top3.forEach((item, index) => {
                const rankNum = index + 1;
                const scoreVal = item.pearson_r !== undefined ? item.pearson_r : item.similarity_score;
                const scoreStr = scoreVal !== undefined
                    ? (scoreVal >= 0 ? '+' : '') + scoreVal.toFixed(4)
                    : 'N/A';

                cardsHtml += `
                    <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                        <div class="absolute top-0 right-0 bg-ocean text-white text-[11px] font-black px-3 py-1 rounded-bl-xl">
                            TOP #${rankNum}
                        </div>
                        <div>
                            <div class="text-xs text-muted font-mono mb-1">Mã: ${escapeHtml(item.major_code || item.moet_code || 'N/A')}</div>
                            <h4 class="text-base font-bold text-navy mb-2">${escapeHtml(item.major_name_vi || item.major_id)}</h4>
                            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 mb-3">
                                <div class="font-semibold text-slate-800">O*NET: ${escapeHtml(item.soc_code || 'N/A')}</div>
                                <div class="text-[11px] text-slate-500">${escapeHtml(item.occupation_title_en || '')}</div>
                            </div>
                        </div>
                        <div class="pt-3 border-t border-slate-100">
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-muted">Chỉ số tương đồng:</span>
                                <span class="font-mono font-bold text-ocean">${scoreStr}</span>
                            </div>
                            <p class="text-[10px] text-muted mt-1 italic">Tương quan Pearson r [-1, +1]. Không phải phần trăm phù hợp.</p>
                        </div>
                    </div>
                `;
            });
            cardsHtml += '</div>';

            resultsContent.innerHTML = `
                <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 mb-4">
                    <strong>Đã tính điểm thành công:</strong> Kết quả Top-3 được xếp hạng trên đúng 21 ngành READY_FOR_PROTOTYPE đã có hồ sơ nghề tham chiếu thử nghiệm.
                </div>
                ${cardsHtml}
                <div class="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <strong>Lưu ý khoa học:</strong> Kết quả trên thể hiện mức độ tương đồng giữa vector sở thích dự đoán từ 6 mô hình ML và hồ sơ nghề O*NET. Không đảm bảo sự thành công và không thay thế cho đánh giá năng lực thực tế.
                </div>
            `;
        } else if (status === 'ABSTAIN_FLAT_PROFILE') {
            resultsContent.innerHTML = `
                <div class="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
                    <h4 class="font-bold text-base mb-2 flex items-center gap-2">
                        <span>Hồ sơ RIASEC chưa phân hóa (ABSTAIN_FLAT_PROFILE)</span>
                    </h4>
                    <p class="text-xs leading-relaxed mb-3">
                        ${escapeHtml(ml.message || 'Các câu trả lời của bạn có xu hướng đồng đều trên tất cả các nhóm sở thích, khiến phương sai giữa 6 lĩnh vực xấp xỉ 0.')}
                    </p>
                    <p class="text-xs leading-relaxed text-amber-800">
                        Để tránh tạo ra bảng xếp hạng giả tạo (ảo giác Top-3), hệ thống quyết định hủy gợi ý tự động. Bạn có thể kiểm tra và điều chỉnh lại câu trả lời theo đúng sở thích thực tế nhất của mình.
                    </p>
                </div>
            `;
        } else if (status === 'TIED_BOUNDARY') {
            resultsContent.innerHTML = `
                <div class="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
                    <h4 class="font-bold text-base mb-2 flex items-center gap-2">
                        <span>Phát hiện hòa điểm biên (TIED_BOUNDARY)</span>
                    </h4>
                    <p class="text-xs leading-relaxed mb-3">
                        Nhiều ngành đạt điểm tương quan Pearson gần như hoàn toàn trùng khớp tại ranh giới Top-3. Hệ thống không sử dụng quy tắc phá hòa tùy tiện (arbitrary tie-break) để đảm bảo tính khách quan khoa học.
                    </p>
                </div>
            `;
        } else {
            renderError(ml.message || 'Hệ thống không thể xử lý hồ sơ này.');
        }
    }

    function renderError(message) {
        if (!resultsPanel || !resultsContent) return;
        resultsPanel.classList.remove('hidden');
        resultsContent.innerHTML = `
            <div class="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs">
                <strong>Thông báo:</strong> ${escapeHtml(message)}
            </div>
        `;
    }

    // --- SECTION 3: CATALOG LIST & FILTER ---
    async function loadCatalog() {
        if (!catalogListEl) return;
        try {
            const resp = await fetch('/api/riasec27/catalog');
            const data = await resp.json();
            currentCatalog = data.catalog || [];
            renderCatalog('ALL');
        } catch (err) {
            catalogListEl.innerHTML = '<div class="col-span-full py-6 text-center text-xs text-red-600">Không thể tải danh mục ngành học.</div>';
        }
    }

    function renderCatalog(filter) {
        if (!catalogListEl) return;
        catalogListEl.innerHTML = '';

        let filtered = currentCatalog;
        if (filter === 'READY') {
            filtered = currentCatalog.filter(m => m.status === 'READY_FOR_PROTOTYPE');
        } else if (filter === 'CONDITIONAL') {
            filtered = currentCatalog.filter(m => m.status === 'CONDITIONAL');
        } else if (filter === 'UNRESOLVED') {
            filtered = currentCatalog.filter(m => m.status === 'UNRESOLVED');
        }

        if (filtered.length === 0) {
            catalogListEl.innerHTML = '<div class="col-span-full py-6 text-center text-xs text-muted">Không có ngành nào trong bộ lọc này.</div>';
            return;
        }

        filtered.forEach(m => {
            const card = document.createElement('div');
            card.className = 'p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between';

            let statusBadge = '';
            if (m.status === 'READY_FOR_PROTOTYPE') {
                statusBadge = '<span class="status-badge-ready text-[11px] font-bold px-2 py-0.5 rounded-md">21 READY (Có Top-3)</span>';
            } else if (m.status === 'CONDITIONAL') {
                statusBadge = '<span class="status-badge-conditional text-[11px] font-bold px-2 py-0.5 rounded-md">10 CONDITIONAL (Chờ minh chứng)</span>';
            } else {
                statusBadge = '<span class="status-badge-unresolved text-[11px] font-bold px-2 py-0.5 rounded-md">2 UNRESOLVED (Chưa có O*NET)</span>';
            }

            const canExploreTier2 = m.status !== 'READY_FOR_PROTOTYPE';
            const exploreBtnHtml = canExploreTier2
                ? `<button type="button" class="btn-explore-major mt-3 w-full py-1.5 px-3 rounded-lg border border-ocean text-ocean text-xs font-bold hover:bg-ocean/5 transition" data-major-id="${escapeHtml(m.id)}">Khám phá chuyên sâu (Tier 2)</button>`
                : '';

            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <span class="text-xs font-mono text-muted">Mã: ${escapeHtml(m.moet_code || 'N/A')}</span>
                        ${statusBadge}
                    </div>
                    <h4 class="text-sm font-bold text-navy mb-1">${escapeHtml(m.name_vi)}</h4>
                    <p class="text-[11px] text-slate-500 mb-2">${escapeHtml(m.name_en || '')}</p>
                    
                    <div class="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1">
                        <div><strong>Ánh xạ O*NET:</strong> ${escapeHtml(m.soc_code || 'Chưa xác định')}</div>
                        <div><strong>Minh chứng CTĐT:</strong> ${escapeHtml(m.curriculum_source?.verification_status || 'Chưa kiểm chứng')}</div>
                    </div>
                </div>
                ${exploreBtnHtml}
            `;

            catalogListEl.appendChild(card);
        });

        // Add event listener to Tier 2 explore buttons
        catalogListEl.querySelectorAll('.btn-explore-major').forEach(btn => {
            btn.addEventListener('click', () => {
                const majorId = btn.getAttribute('data-major-id');
                openTier2ForMajor(majorId);
            });
        });
    }

    // --- SECTION 4: TIER 2 EXPLORATION ---
    async function loadThemes() {
        if (!themesGrid) return;
        try {
            const resp = await fetch('/api/riasec27/themes');
            const data = await resp.json();
            currentThemes = data.themes || [];
            renderThemesGrid();
        } catch (err) {
            themesGrid.innerHTML = '<div class="col-span-full py-6 text-center text-xs text-red-600">Không thể tải danh sách chủ đề Tier 2.</div>';
        }
    }

    function renderThemesGrid() {
        if (!themesGrid) return;
        themesGrid.innerHTML = '';

        const themeLabels = {
            THEME_A_SECONDARY_PEDAGOGY: 'Chủ đề A: Sư phạm phổ thông',
            THEME_B_IT_AND_SOFTWARE: 'Chủ đề B: CNTT & Phần mềm',
            THEME_C_REGIONAL_AND_CULTURE: 'Chủ đề C: Đông phương & Việt Nam học',
            THEME_D_TOURISM_AND_HOSPITALITY: 'Chủ đề D: Quản lý du lịch lữ hành',
            THEME_E_PUBLIC_ADMINISTRATION: 'Chủ đề E: Quản lý nhà nước'
        };

        currentThemes.forEach(theme => {
            const card = document.createElement('div');
            card.className = 'p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:border-cyan transition cursor-pointer';

            const title = themeLabels[theme.theme_id] || theme.title_vi || theme.theme_id;

            card.innerHTML = `
                <div>
                    <span class="rounded bg-cyan/10 text-ocean text-[10px] font-bold px-2 py-0.5 mb-2 inline-block">Định tính</span>
                    <h4 class="text-sm font-bold text-navy mb-1">${escapeHtml(title)}</h4>
                    <p class="text-xs text-muted leading-relaxed mb-3">${escapeHtml(theme.description_vi || '')}</p>
                </div>
                <button type="button" class="btn-open-theme py-2 px-4 rounded-xl bg-slate-100 hover:bg-cyan/10 hover:text-ocean text-xs font-bold text-slate-700 transition w-full" data-theme-id="${theme.theme_id}">
                    Bắt đầu tìm hiểu
                </button>
            `;

            card.querySelector('.btn-open-theme').addEventListener('click', (e) => {
                e.stopPropagation();
                openThemeQuestion(theme.theme_id);
            });

            card.addEventListener('click', () => {
                openThemeQuestion(theme.theme_id);
            });

            themesGrid.appendChild(card);
        });
    }

    function openThemeQuestion(themeId) {
        const theme = currentThemes.find(t => t.theme_id === themeId);
        if (!theme || !tier2Box) return;

        activeThemeId = themeId;
        tier2Box.classList.remove('hidden');
        if (tier2ResultBox) tier2ResultBox.classList.add('hidden');
        tier2Box.scrollIntoView({ behavior: 'smooth' });

        const q = theme.question || {};
        if (tier2ThemeTitle) tier2ThemeTitle.textContent = theme.title || theme.title_vi || themeId;
        if (tier2QuestionText) tier2QuestionText.textContent = q.text || theme.question_text_vi || 'Chọn định hướng bạn quan tâm nhất:';

        if (tier2OptionsContainer) {
            tier2OptionsContainer.innerHTML = '';
            const options = q.options || theme.options || [];

            options.forEach((opt, idx) => {
                const label = document.createElement('label');
                label.className = 'option-label flex items-start p-3.5 rounded-xl border border-slate-200 cursor-pointer text-xs text-slate-800 transition gap-3 select-none';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'tier2_option';
                radio.value = opt.option_id;
                radio.className = 'option-radio accent-cyan text-cyan mt-0.5';
                if (idx === 0) radio.checked = true;

                const textSpan = document.createElement('span');
                textSpan.innerHTML = `<strong>${escapeHtml(opt.text || opt.label_vi)}</strong>`;

                label.appendChild(radio);
                label.appendChild(textSpan);
                tier2OptionsContainer.appendChild(label);
            });
        }
    }

    async function openTier2ForMajor(majorId) {
        try {
            const resp = await fetch('/api/riasec27/explore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ major_id: majorId })
            });
            const data = await resp.json();

            if (data.status === 'AWAITING_USER_CHOICE' && data.theme_id) {
                openThemeQuestion(data.theme_id);
            } else if (data.status === 'READY_MAJOR_PROFILE') {
                alert(`Ngành ${majorId} là ngành READY_FOR_PROTOTYPE đã tham gia chấm điểm ML Top-3.`);
            }
        } catch (err) {
            alert('Không thể mở thông tin định tính cho ngành này.');
        }
    }

    async function handleTier2Submit(e) {
        e.preventDefault();
        const selectedRadio = tier2Form.querySelector('input[name="tier2_option"]:checked');
        if (!selectedRadio || !activeThemeId) return;

        const optionId = selectedRadio.value;
        await sendTier2Exploration({ theme_id: activeThemeId, option_id: optionId, is_skip: false });
    }

    async function handleTier2Skip() {
        if (!activeThemeId) return;
        await sendTier2Exploration({ theme_id: activeThemeId, option_id: null, is_skip: true });
    }

    async function sendTier2Exploration(payload) {
        try {
            const resp = await fetch('/api/riasec27/explore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            renderTier2Result(data);
        } catch (err) {
            alert('Lỗi khi gửi lựa chọn khám phá định tính.');
        }
    }

    function renderTier2Result(data) {
        if (!tier2ResultBox) return;
        tier2ResultBox.classList.remove('hidden');
        tier2ResultBox.scrollIntoView({ behavior: 'smooth' });

        if (data.status === 'USER_SKIPPED') {
            if (tier2FocusTag) tier2FocusTag.textContent = 'ĐÃ BỎ QUA CÂU HỎI';
            if (tier2GuidanceText) {
                tier2GuidanceText.textContent = data.pedagogical_guidance || 'Bạn đã chọn bỏ qua câu hỏi phân hóa này. Toàn bộ danh mục 33 ngành và kết quả ML Top-3 được giữ nguyên.';
            }
            if (tier2StepsList) tier2StepsList.innerHTML = '<li>Bạn có thể quay lại khám phá bất kỳ lúc nào hoặc tìm hiểu thêm qua sổ bộ 33 ngành.</li>';
            return;
        }

        const explored = data.explored_major || {};
        const focusMajor = explored.major_name_vi || explored.major_id || data.focus_summary || 'Chưa xác định ngành cụ thể';
        if (tier2FocusTag) tier2FocusTag.textContent = focusMajor;

        // Ensure constrained phrasing (Section VI)
        let guidance = data.learning_orientation || data.comparative_analysis || data.pedagogical_guidance || '';
        guidance = `Bạn đã chọn tìm hiểu hướng này. Dưới đây là một số hoạt động và thông tin bạn có thể khám phá thêm: ${guidance}`;
        if (tier2GuidanceText) tier2GuidanceText.textContent = guidance;

        if (tier2StepsList) {
            tier2StepsList.innerHTML = '';
            const steps = [
                data.comparative_analysis,
                'Tham khảo thêm chuẩn đầu ra và đề cương chương trình từ các trường đại học.',
                'Nói chuyện với thầy cô hoặc sinh viên đang học ngành này để hiểu rõ môi trường thực tế.'
            ].filter(Boolean);
            steps.forEach(step => {
                const li = document.createElement('li');
                li.textContent = step;
                tier2StepsList.appendChild(li);
            });
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- INITIALIZATION ---
    function init() {
        renderQuestions();

        if (resetBtn) resetBtn.addEventListener('click', resetSurvey);
        if (form) form.addEventListener('submit', submitSurvey);

        // Filter buttons
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => {
                    b.classList.remove('bg-navy', 'text-white');
                    b.classList.add('bg-slate-100', 'text-slate-700');
                });
                btn.classList.add('bg-navy', 'text-white');
                btn.classList.remove('bg-slate-100', 'text-slate-700');
                renderCatalog(btn.getAttribute('data-filter'));
            });
        });

        // Tier 2 form events
        if (tier2Form) tier2Form.addEventListener('submit', handleTier2Submit);
        if (btnSkipTier2) btnSkipTier2.addEventListener('click', handleTier2Skip);
        if (btnCloseTier2) {
            btnCloseTier2.addEventListener('click', () => {
                if (tier2Box) tier2Box.classList.add('hidden');
                activeThemeId = null;
            });
        }

        loadCatalog();
        loadThemes();
    }

    init();
})();
