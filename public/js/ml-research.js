(() => {
    const form = document.getElementById('ml-f54-form');
    if (!form) return;

    const status = document.getElementById('ml-f54-status');
    const results = document.getElementById('ml-f54-results');
    const submitButton = document.getElementById('ml-f54-submit');
    const previousButton = document.getElementById('ml-f54-prev');
    const nextButton = document.getElementById('ml-f54-next');
    const resetButton = document.getElementById('ml-f54-reset');
    const topKInput = document.getElementById('ml-f54-top-k');
    const summary = document.getElementById('ml-f54-summary');
    const resultPanel = document.getElementById('ml-f54-result-panel');
    const questionContainer = document.getElementById('ml-f54-questions');
    const progressText = document.getElementById('ml-f54-progress-text');
    const progress = document.getElementById('ml-f54-progress');
    const pageText = document.getElementById('ml-f54-page');
    const submitLabel = submitButton.textContent;
    const PAGE_SIZE = 6;
    const QUESTION_COUNT = 54;
    const PAGE_COUNT = 9;
    const expectedScale = [
        'Chưa bao giờ đúng',
        'Chỉ đúng 1 vài trường hợp',
        'Chỉ đúng 1 nửa',
        'Gần như là đúng',
        'Hoàn toàn đúng'
    ];
    const answersById = new Map();
    let currentPage = 0;
    let pending = false;
    let radioInputs = [];
    let questionnaire;

    function setHidden(element, hidden) {
        element.hidden = hidden;
        element.classList.toggle('hidden', hidden);
    }

    function showError(message, field) {
        status.textContent = message;
        status.dataset.state = 'error';
        if (field) field.setAttribute('aria-invalid', 'true');
    }

    try {
        questionnaire = JSON.parse(document.getElementById('f54-data').textContent);
        const questions = questionnaire.questions;
        const scale = questionnaire.answer_scale;
        if (questionnaire.questionnaire_version !== 'F54-v1'
            || !Array.isArray(questions) || questions.length !== QUESTION_COUNT
            || !questions.every((question, index) => question.question_id === 'q' + (index + 1)
                && question.question_order === index + 1
                && typeof question.question_text === 'string' && question.question_text.trim())
            || !Array.isArray(scale) || scale.length !== 5
            || !scale.every((anchor, index) => anchor.value === index + 1
                && anchor.label === expectedScale[index])) {
            throw new Error('Invalid questionnaire source');
        }
    } catch {
        for (const control of [previousButton, nextButton, submitButton, resetButton, topKInput]) {
            control.disabled = true;
        }
        setHidden(resultPanel, true);
        showError('Không tải được bộ câu hỏi F54 đã xác minh. Vui lòng tải lại trang.');
        return;
    }

    // This page can collapse the existing navigation on mobile without changing
    // the shared layout module or saving an automatic preference in storage.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const mobileViewport = window.matchMedia('(max-width: 767px)');
        const collapseMobileNavigation = () => {
            if (mobileViewport.matches && typeof isSidebarCollapsed !== 'undefined'
                && typeof applySidebarState === 'function') {
                isSidebarCollapsed = true;
                applySidebarState();
            }
        };
        collapseMobileNavigation();
        mobileViewport.addEventListener('change', collapseMobileNavigation);
    }

    function isAnswer(value) {
        return Number.isInteger(value) && value >= 1 && value <= 5;
    }

    function clearResult() {
        results.replaceChildren();
        summary.textContent = '';
        setHidden(resultPanel, true);
        status.textContent = '';
        status.dataset.state = 'idle';
        topKInput.removeAttribute('aria-invalid');
    }

    function updateControls() {
        const answered = answersById.size;
        progress.value = answered;
        progressText.textContent = 'Đã trả lời ' + answered + '/54';
        const first = currentPage * PAGE_SIZE + 1;
        pageText.textContent = 'Trang ' + (currentPage + 1) + '/9 · Câu ' + first + '–' + (first + PAGE_SIZE - 1);
        previousButton.disabled = pending || currentPage === 0;
        nextButton.disabled = pending || currentPage === PAGE_COUNT - 1;
        resetButton.disabled = pending;
        topKInput.disabled = pending;
        submitButton.disabled = pending || answered !== QUESTION_COUNT;
        setHidden(nextButton, currentPage === PAGE_COUNT - 1);
        setHidden(submitButton, currentPage !== PAGE_COUNT - 1);
        for (const input of radioInputs) input.disabled = pending;
        form.setAttribute('aria-busy', pending ? 'true' : 'false');
        submitButton.textContent = pending ? 'Đang đối chiếu…' : submitLabel;
    }

    function focusQuestion(questionId) {
        const firstOption = document.getElementById('f54-' + questionId + '-1');
        if (firstOption && typeof firstOption.focus === 'function') firstOption.focus();
    }

    function renderPage() {
        questionContainer.replaceChildren();
        radioInputs = [];
        const questions = questionnaire.questions.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
        for (const question of questions) {
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
            fieldset.dataset.questionId = question.question_id;
            const legend = document.createElement('legend');
            legend.className = 'px-1 font-semibold text-navy leading-relaxed';
            legend.textContent = question.question_text;
            legend.style.whiteSpace = 'pre-wrap';
            fieldset.appendChild(legend);

            const options = document.createElement('div');
            options.className = 'mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3';
            for (const anchor of questionnaire.answer_scale) {
                const label = document.createElement('label');
                label.className = 'flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm hover:border-cyan';
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'f54-' + question.question_id;
                input.id = 'f54-' + question.question_id + '-' + anchor.value;
                input.value = String(anchor.value);
                input.className = 'f54-radio mt-1 shrink-0 accent-cyan';
                input.dataset.questionId = question.question_id;
                input.checked = answersById.get(question.question_id) === anchor.value;
                label.htmlFor = input.id;
                input.addEventListener('change', () => {
                    if (pending || !input.checked) return;
                    const value = Number(input.value);
                    if (!isAnswer(value)) {
                        showError('Mỗi đáp án F54 phải là số nguyên từ 1 đến 5.');
                        return;
                    }
                    answersById.set(question.question_id, value);
                    clearResult();
                    updateControls();
                });
                radioInputs.push(input);
                const text = document.createElement('span');
                text.textContent = anchor.value + '. ' + anchor.label;
                label.appendChild(input);
                label.appendChild(text);
                options.appendChild(label);
            }
            fieldset.appendChild(options);
            questionContainer.appendChild(fieldset);
        }
        updateControls();
    }

    function moveToPage(page) {
        currentPage = page;
        renderPage();
        if (typeof questionContainer.scrollIntoView === 'function') {
            questionContainer.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
    }

    previousButton.addEventListener('click', () => {
        if (pending || currentPage === 0) return;
        status.textContent = '';
        status.dataset.state = 'idle';
        moveToPage(currentPage - 1);
    });

    nextButton.addEventListener('click', () => {
        if (pending || currentPage === PAGE_COUNT - 1) return;
        const unanswered = questionnaire.questions
            .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
            .filter((question) => !isAnswer(answersById.get(question.question_id)));
        if (unanswered.length) {
            showError('Vui lòng trả lời các câu còn thiếu: '
                + unanswered.map((question) => question.question_order).join(', ') + '.');
            focusQuestion(unanswered[0].question_id);
            return;
        }
        status.textContent = '';
        status.dataset.state = 'idle';
        moveToPage(currentPage + 1);
    });

    topKInput.addEventListener('input', () => {
        if (!pending) clearResult();
    });

    resetButton.addEventListener('click', () => {
        if (pending) return;
        answersById.clear();
        currentPage = 0;
        topKInput.value = '3';
        clearResult();
        renderPage();
        if (typeof questionContainer.scrollIntoView === 'function') {
            questionContainer.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
    });

    function validResponse(data, topK) {
        return data && data.feature_set === 'F54' && data.task === 'current_major_retrieval'
            && data.research_only === true && typeof data.model_version === 'string' && data.model_version.trim()
            && typeof data.notice === 'string' && data.notice.trim()
            && Array.isArray(data.recommendations) && data.recommendations.length === topK
            && new Set(data.recommendations.map((item) => item?.major_code)).size === topK
            && data.recommendations.every((item) => item && typeof item.major_code === 'string'
                && item.major_code.trim() && typeof item.major_name === 'string' && item.major_name.trim()
                && Number.isFinite(item.similarity_score) && item.similarity_score >= 0 && item.similarity_score <= 100);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (pending) return;
        clearResult();
        const missing = questionnaire.questions.filter((question) => !isAnswer(answersById.get(question.question_id)));
        if (missing.length) {
            moveToPage(Math.floor((missing[0].question_order - 1) / PAGE_SIZE));
            showError('Bạn còn ' + missing.length + ' câu chưa trả lời. Cần đủ 54 đáp án để gửi khảo sát.');
            focusQuestion(missing[0].question_id);
            return;
        }
        if (currentPage !== PAGE_COUNT - 1) {
            moveToPage(PAGE_COUNT - 1);
            showError('Vui lòng kiểm tra trang cuối và nhấn Xem kết quả để gửi khảo sát.');
            return;
        }
        // Order by the numeric ID, never by DOM order or answer insertion order.
        const orderedQuestions = [...questionnaire.questions]
            .sort((left, right) => Number(left.question_id.slice(1)) - Number(right.question_id.slice(1)));
        const answers = orderedQuestions.map((question) => answersById.get(question.question_id));
        if (answers.length !== QUESTION_COUNT || !answers.every(isAnswer)) {
            showError('Cần đúng 54 đáp án F54 là số nguyên từ 1 đến 5.');
            return;
        }
        const topK = Number(topKInput.value);
        if (!Number.isInteger(topK) || topK < 1 || topK > 33) {
            showError('Số ngành trả về phải là số nguyên từ 1 đến 33.', topKInput);
            return;
        }

        pending = true;
        updateControls();
        status.dataset.state = 'loading';
        status.textContent = 'Đang đối chiếu phản hồi F54…';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch('/api/ml/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                signal: controller.signal,
                body: JSON.stringify({ feature_set: 'F54', answers, top_k: topK })
            });
            let data;
            try {
                data = await response.json();
            } catch (error) {
                if (error.name === 'AbortError') throw error;
                throw new Error('Dịch vụ trả kết quả không hợp lệ. Vui lòng thử lại.');
            }
            if (!response.ok) throw new Error(typeof data?.message === 'string'
                ? data.message : 'Chưa thể đối chiếu F54. Vui lòng thử lại.');
            if (!validResponse(data, topK)) throw new Error('Dịch vụ trả kết quả không hợp lệ. Vui lòng thử lại.');

            for (const [index, item] of data.recommendations.entries()) {
                const row = document.createElement('li');
                row.className = 'rounded-xl border border-slate-200 bg-white p-3 text-sm break-words';
                row.textContent = '#' + (index + 1) + ' — ' + item.major_name + ' (' + item.major_code
                    + ') — Điểm tương đồng ' + item.similarity_score.toFixed(2) + '/100';
                results.appendChild(row);
            }
            summary.textContent = 'Top-' + data.recommendations.length + ' · Model ' + data.model_version
                + ' · Kết quả nghiên cứu F54';
            setHidden(resultPanel, false);
            status.textContent = data.notice;
            status.dataset.state = 'success';
            if (typeof resultPanel.scrollIntoView === 'function') {
                resultPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
            }
        } catch (error) {
            results.replaceChildren();
            summary.textContent = '';
            setHidden(resultPanel, true);
            showError(error.name === 'AbortError' ? 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.'
                : error instanceof TypeError ? 'Không thể kết nối dịch vụ F54. Vui lòng kiểm tra kết nối và thử lại.'
                    : error.message || 'Không thể kết nối dịch vụ F54.');
        } finally {
            clearTimeout(timeout);
            pending = false;
            updateControls();
        }
    });

    clearResult();
    renderPage();
})();
