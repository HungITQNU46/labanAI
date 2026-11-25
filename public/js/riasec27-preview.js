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
    const progressBar = document.getElementById('riasec27-progress-bar');
    const progressTrack = document.querySelector('.evaluation-progress');
    const evaluationSteps = Array.from(document.querySelectorAll('[data-eval-step]'));

    const resultsPanel = document.getElementById('riasec27-results-panel');
    const resultsContent = document.getElementById('results-content');
    const aiControls = document.getElementById('ai-explanation-controls');
    const aiPanel = document.getElementById('ai-explanation-panel');
    const aiOpen = document.getElementById('btn-explain-ai');
    const aiClose = document.getElementById('btn-close-ai-explanation');
    const aiConsent = document.getElementById('ai-explanation-consent');
    const aiSend = document.getElementById('btn-create-ai-explanation');
    const aiStatus = document.getElementById('ai-explanation-status');
    const aiContent = document.getElementById('ai-explanation-content');
    let contextToken = null;
    let currentTop3 = [];
    let explanationRequest = null;
    let revision = 0;
    let evaluationPending = false;

    function updateEvaluationStep(activeStep) {
        evaluationSteps.forEach((step) => {
            const stepNumber = Number(step.dataset.evalStep);
            step.classList.toggle('is-current', stepNumber === activeStep);
            step.classList.toggle('is-complete', stepNumber < activeStep);
            if (stepNumber === activeStep) step.setAttribute('aria-current', 'step');
            else step.removeAttribute('aria-current');
        });
    }

    function clearExplanation() {
        if (explanationRequest) explanationRequest.abort();
        explanationRequest = null;
        contextToken = null;
        currentTop3 = [];
        if (aiControls) aiControls.classList.add('hidden');
        if (aiPanel) aiPanel.classList.add('hidden');
        if (aiConsent) aiConsent.checked = false;
        if (aiSend) { aiSend.disabled = true; aiSend.textContent = 'Đồng ý gửi và tạo giải thích'; }
        if (aiContent) aiContent.replaceChildren();
        if (aiStatus) aiStatus.textContent = '';
    }

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
            card.className = 'eval-question-card';

            const header = document.createElement('div');
            header.className = 'eval-question-meta';
            const number = document.createElement('span');
            number.className = 'eval-question-number';
            number.textContent = `Câu ${idx + 1}`;
            const domain = document.createElement('span');
            domain.className = 'eval-domain-tag';
            domain.textContent = `${q.domain} · ${questionnaire.domain_names?.[q.domain]?.vi || q.domain}`;
            header.append(number, domain);

            const prompt = document.createElement('h3');
            prompt.className = 'eval-question-prompt';
            prompt.id = `question-prompt-${q.question_id}`;
            prompt.textContent = q.vietnamese_text;

            const optionsGroup = document.createElement('div');
            optionsGroup.className = 'eval-options';
            optionsGroup.setAttribute('role', 'radiogroup');
            optionsGroup.setAttribute('aria-labelledby', prompt.id);

            scale.forEach((s) => {
                const label = document.createElement('label');
                label.className = 'eval-option';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `question_${q.question_id}`;
                radio.value = s.value;
                radio.className = 'option-radio accent-cyan text-cyan';
                radio.setAttribute('aria-label', `${s.value}: ${s.label_vi}`);

                radio.addEventListener('change', () => {
                    revision++;
                    clearExplanation();
                    if (resultsPanel) resultsPanel.classList.add('hidden');
                    answers.set(q.question_id, s.value);
                    optionsGroup.querySelectorAll('.eval-option').forEach((option) => option.classList.remove('is-selected'));
                    label.classList.add('is-selected');
                    updateEvaluationStep(1);
                    updateAnswerProgress();
                });

                const textSpan = document.createElement('span');
                textSpan.textContent = String(s.value);

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
        if (progressBar) progressBar.style.width = `${(count / TOTAL_QUESTIONS) * 100}%`;
        if (progressTrack) progressTrack.setAttribute('aria-valuenow', String(count));
        if (submitBtn) {
            submitBtn.disabled = count !== TOTAL_QUESTIONS || evaluationPending;
        }
    }

    function resetSurvey() {
        revision++;
        clearExplanation();
        answers.clear();
        const radios = questionsContainer.querySelectorAll('input[type="radio"]');
        radios.forEach((r) => { r.checked = false; });
        questionsContainer.querySelectorAll('.eval-option').forEach((option) => option.classList.remove('is-selected'));
        updateAnswerProgress();
        updateEvaluationStep(1);
        if (resultsPanel) resultsPanel.classList.add('hidden');
        if (resultsContent) resultsContent.innerHTML = '';
    }

    // --- SECTION 2: SUBMIT & RENDER TOP-3 ---
    async function submitSurvey(e) {
        e.preventDefault();
        if (answers.size !== TOTAL_QUESTIONS || evaluationPending) return;

        evaluationPending = true;
        const submittedRevision = revision;
        clearExplanation();

        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang tạo gợi ý...';

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
            if (submittedRevision === revision) renderResults(data);
        } catch (err) {
            if (submittedRevision === revision) renderError('Không thể kết nối đến máy chủ phân tích hoặc tiến trình xử lý gặp sự cố.', 'NETWORK_ERROR');
        } finally {
            evaluationPending = false;
            updateAnswerProgress();
            submitBtn.textContent = 'Xem kết quả';
        }
    }

    function renderResults(data) {
        if (!resultsPanel || !resultsContent) return;
        clearExplanation();
        resultsPanel.classList.remove('hidden');
        resultsPanel.scrollIntoView({ behavior: 'smooth' });

        const ml = data?.ml_ranking || {};
        const status = ml.status || 'UNKNOWN';

        if (status === 'SUCCESS') {
            updateEvaluationStep(2);
            const top3 = ml.top3 || [];
            let cardsHtml = '<div class="grid grid-cols-1 md:grid-cols-3 gap-5">';

            top3.forEach((item) => {
                // Preserve native competition ranks; an equal score is not an ID tie-break.
                const rankNum = Number.isInteger(item.rank) && item.rank > 0 ? item.rank : 'N/A';
                cardsHtml += `
                    <div class="top3-card min-w-0 break-words p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden" data-major-id="${escapeHtml(item.major_id)}">
                        <div data-result-field="rank" class="absolute top-0 right-0 bg-ocean text-white text-[11px] font-black px-3 py-1 rounded-bl-xl">
                            TOP #${rankNum}
                        </div>
                        <div class="pt-4">
                            <div data-result-field="major_code" class="text-xs text-muted font-mono mb-1">Mã: ${escapeHtml(item.major_code || item.moet_code || 'N/A')}</div>
                            <h4 data-result-field="major_name" class="text-base font-bold text-navy mb-3">${escapeHtml(item.major_name_vi || item.major_id)}</h4>
                            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 mb-3">
                                <div data-result-field="soc_code" class="font-semibold text-slate-800">O*NET: ${escapeHtml(item.soc_code || 'N/A')}</div>
                                <div data-result-field="occupation_title" class="mt-1 text-[11px] text-slate-500">${escapeHtml(item.occupation_title_en || '')}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            cardsHtml += '</div>';

            resultsContent.innerHTML = cardsHtml;
            contextToken = typeof data.explanation_context_token === 'string' ? data.explanation_context_token : null;
            currentTop3 = top3.map(item => ({ major_id: item.major_id, rank: item.rank, name: item.major_name_vi || item.major_id }));
            if (aiControls) aiControls.classList.remove('hidden');
            if (aiOpen) aiOpen.disabled = !contextToken;
        } else if (status === 'ABSTAIN_FLAT_PROFILE') {
            updateEvaluationStep(2);
            resultsContent.innerHTML = `
                <div data-result-status="ABSTAIN_FLAT_PROFILE" class="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-navy" role="status">
                    <h4 class="font-bold text-base mb-2 flex items-center gap-2">
                        <span>Hồ sơ sở thích chưa đủ phân biệt</span>
                    </h4>
                    <p class="text-xs leading-relaxed mb-3">
                        Các câu trả lời hiện tại chưa tạo được hồ sơ đủ phân biệt để đưa ra Top-3.
                    </p>
                    <p class="text-xs leading-relaxed text-slate-600">
                        Hệ thống không tạo Top-3 thay thế. Đây không phải lỗi của bạn hoặc kết luận về năng lực. Bạn có thể trao đổi thêm với người tư vấn hướng nghiệp.
                    </p>
                </div>
            `;
        } else if (status === 'TIED_BOUNDARY') {
            updateEvaluationStep(2);
            resultsContent.innerHTML = `
                <div data-result-status="TIED_BOUNDARY" class="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-navy" role="status">
                    <h4 class="font-bold text-base mb-2 flex items-center gap-2">
                        <span>Chưa thể phân biệt các ngành đang hòa điểm</span>
                    </h4>
                    <p class="text-xs leading-relaxed mb-3">
                        Một số ngành đang hòa điểm ở ranh giới Top-3. Hệ thống giữ nguyên kết quả hòa và không tạo một Top-3 thay thế.
                    </p>
                </div>
            `;
        } else {
            // Backend diagnostics may contain internal paths. Never reflect them in the preview.
            renderError('Hệ thống chưa thể tạo gợi ý vào lúc này. Bạn có thể thử lại sau.', data?.error);
        }
    }

    function renderError(message, errorCode) {
        if (!resultsPanel || !resultsContent) return;
        clearExplanation();
        const allowedCodes = new Set([
            'NETWORK_ERROR', 'INVALID_RIASEC27_INPUT', 'SERVICE_UNAVAILABLE',
            'PYTHON_EXIT_ERROR', 'PYTHON_IMPORT_ERROR', 'PYTHON_INTERNAL_ERROR', 'PYTHON_INPUT_ERROR',
            'MODEL_DEPENDENCY_ERROR', 'SPAWN_ERROR', 'EMPTY_OUTPUT', 'PARSE_ERROR',
            'TIMEOUT_ERROR', 'CONCURRENCY_LIMIT', 'PAYLOAD_TOO_LARGE', 'BUFFER_OVERFLOW'
        ]);
        const safeCode = allowedCodes.has(errorCode) ? errorCode : 'RIASEC27_EVALUATION_ERROR';
        resultsPanel.classList.remove('hidden');
        resultsContent.innerHTML = `
            <div data-error-code="${safeCode}" class="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs" role="alert">
                <strong>Thông báo:</strong> ${escapeHtml(message)}
            </div>
        `;
    }

    async function requestAIExplanation() {
        if (!contextToken || !aiConsent?.checked || explanationRequest) return;
        const request = new AbortController();
        explanationRequest = request;
        const requestRevision = revision;
        const timer = setTimeout(() => request.abort(), 20000);
        aiSend.disabled = true;
        aiSend.textContent = 'Đang tạo giải thích...';
        aiStatus.textContent = 'Đang yêu cầu nhà cung cấp AI giải thích ba ngành đã có.';
        aiContent.replaceChildren();
        try {
            const response = await fetch('/api/riasec27/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ context_token: contextToken, consent: true }), signal: request.signal });
            const data = await response.json();
            if (requestRevision !== revision || explanationRequest !== request) return;
            if (!response.ok || data.status !== 'SUCCESS' || !Array.isArray(data.explanations) || data.explanations.length !== 3 ||
                data.explanations.some((item, i) => item.major_id !== currentTop3[i].major_id || item.rank !== currentTop3[i].rank || typeof item.reason !== 'string' || typeof item.explore !== 'string') || typeof data.limitations !== 'string') throw new Error('EXPLANATION_UNAVAILABLE');
            const displayText = value => value.replace(/(?:research_status\s*:\s*)?RESEARCH_ONLY\s*[—-]\s*TOP3_NOT_VALIDATED/gi, '').trim();
            data.explanations.forEach((item, i) => {
                const box = document.createElement('div'); box.className = 'rounded-xl bg-white border border-slate-200 p-4';
                const heading = document.createElement('h5'); heading.className = 'font-bold text-navy';
                heading.textContent = `Top #${currentTop3[i].rank} — ${currentTop3[i].name}`;
                const reason = document.createElement('p'); reason.className = 'mt-2 text-xs leading-relaxed'; reason.textContent = displayText(item.reason);
                const explore = document.createElement('p'); explore.className = 'mt-2 text-xs leading-relaxed'; explore.textContent = displayText(item.explore);
                box.append(heading, reason, explore); aiContent.appendChild(box);
            });
            const limits = document.createElement('p'); limits.className = 'text-xs text-slate-600'; limits.textContent = displayText(data.limitations);
            aiContent.appendChild(limits);
            aiStatus.textContent = 'Lời giải thích do AI tạo; thứ hạng ngành được giữ nguyên.';
        } catch {
            if (requestRevision === revision && explanationRequest === request) aiStatus.textContent = 'Chưa thể tạo lời giải thích bằng AI lúc này';
        } finally {
            clearTimeout(timer);
            if (explanationRequest === request) {
                explanationRequest = null;
                aiSend.disabled = !aiConsent.checked;
                aiSend.textContent = 'Đồng ý gửi và tạo giải thích';
            }
        }
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

        if (aiOpen) aiOpen.addEventListener('click', () => {
            aiPanel.classList.remove('hidden');
            updateEvaluationStep(3);
        });
        if (aiClose) aiClose.addEventListener('click', () => {
            if (explanationRequest) explanationRequest.abort();
            aiPanel.classList.add('hidden');
            updateEvaluationStep(2);
        });
        if (aiConsent) aiConsent.addEventListener('change', () => { aiSend.disabled = !aiConsent.checked || !!explanationRequest; });
        if (aiSend) aiSend.addEventListener('click', requestAIExplanation);

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
        updateEvaluationStep(1);
    }

    init();
})();
