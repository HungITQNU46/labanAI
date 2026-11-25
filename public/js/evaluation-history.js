'use strict';

(() => {
    const searchInput = document.getElementById('history-search');
    const periodSelect = document.getElementById('history-period');
    const sortSelect = document.getElementById('history-sort');
    const list = document.getElementById('history-list');
    const cards = Array.from(document.querySelectorAll('[data-history-card]'));
    const noResults = document.getElementById('history-no-results');
    const status = document.getElementById('history-status');
    const compareButton = document.getElementById('history-compare-button');
    const selectedCount = document.getElementById('history-selected-count');
    const modal = document.getElementById('history-compare-modal');
    const modalContent = document.getElementById('history-compare-content');
    const closeButton = document.getElementById('history-compare-close');

    if (!searchInput || !periodSelect || !sortSelect) return;

    const normalizeText = (value) => String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();

    function applyHistoryControls() {
        const query = normalizeText(searchInput.value);
        const days = periodSelect.value === 'all' ? null : Number(periodSelect.value);
        const cutoff = days === null ? null : Date.now() - days * 24 * 60 * 60 * 1000;

        cards.forEach((card) => {
            const timestamp = Number(card.dataset.historyDate) || 0;
            const matchesQuery = !query || normalizeText(card.dataset.historySearch || '').includes(query);
            const matchesPeriod = cutoff === null || (timestamp > 0 && timestamp >= cutoff);
            card.classList.toggle('is-filtered', !matchesQuery || !matchesPeriod);
        });

        cards.sort((left, right) => {
            const dateDifference = (Number(left.dataset.historyDate) || 0) - (Number(right.dataset.historyDate) || 0);
            return sortSelect.value === 'oldest' ? dateDifference : -dateDifference;
        });
        if (list) cards.forEach((card) => list.appendChild(card));

        const visibleCount = cards.filter((card) => !card.classList.contains('is-filtered')).length;
        if (noResults) noResults.classList.toggle('hidden', visibleCount > 0);
        if (status) {
            status.textContent = cards.length && visibleCount
                ? `Hiển thị ${visibleCount} / ${cards.length} lượt đánh giá`
                : '';
        }
    }

    function updateSelectedCount() {
        const count = document.querySelectorAll('.history-select-checkbox:checked').length;
        if (selectedCount) selectedCount.textContent = String(count);
    }

    function createComparisonTable(selectedCards) {
        const wrapper = document.createElement('div');
        wrapper.className = 'history-compare-table-wrap';
        const table = document.createElement('table');
        table.className = 'history-compare-table';
        const head = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const labelHeader = document.createElement('th');
        labelHeader.scope = 'col';
        labelHeader.textContent = 'Thông tin';
        headerRow.appendChild(labelHeader);

        selectedCards.forEach((card) => {
            const header = document.createElement('th');
            header.scope = 'col';
            header.textContent = card.querySelector('.ui-history-date')?.textContent.trim() || 'Lượt đánh giá';
            headerRow.appendChild(header);
        });
        head.appendChild(headerRow);

        const body = document.createElement('tbody');
        const row = document.createElement('tr');
        const rowLabel = document.createElement('th');
        rowLabel.scope = 'row';
        rowLabel.textContent = 'Ngành học được gợi ý';
        row.appendChild(rowLabel);

        selectedCards.forEach((card) => {
            const cell = document.createElement('td');
            const items = Array.from(card.querySelectorAll('.ui-history-majors li'));
            if (items.length) {
                const listElement = document.createElement('ul');
                items.forEach((item) => {
                    const listItem = document.createElement('li');
                    listItem.textContent = item.textContent.trim();
                    listElement.appendChild(listItem);
                });
                cell.appendChild(listElement);
            } else {
                cell.textContent = 'Chưa có thông tin ngành học';
            }
            row.appendChild(cell);
        });

        body.appendChild(row);
        table.append(head, body);
        wrapper.appendChild(table);
        return wrapper;
    }

    function openComparison() {
        const selectedCards = Array.from(document.querySelectorAll('.history-select-checkbox:checked'))
            .map((checkbox) => checkbox.closest('[data-history-card]'))
            .filter(Boolean);

        if (selectedCards.length < 2) {
            if (status) status.textContent = 'Chọn ít nhất 2 lượt đánh giá để so sánh.';
            return;
        }
        if (selectedCards.length > 3) {
            if (status) status.textContent = 'Bạn chỉ có thể so sánh tối đa 3 lượt đánh giá cùng lúc.';
            return;
        }

        modalContent.replaceChildren(createComparisonTable(selectedCards));
        modal.classList.remove('hidden');
        closeButton.focus();
    }

    function closeComparison() {
        modal.classList.add('hidden');
        compareButton.focus();
    }

    searchInput.addEventListener('input', applyHistoryControls);
    periodSelect.addEventListener('change', applyHistoryControls);
    sortSelect.addEventListener('change', applyHistoryControls);
    document.querySelectorAll('.history-select-checkbox').forEach((checkbox) => {
        checkbox.addEventListener('change', updateSelectedCount);
    });
    if (compareButton) compareButton.addEventListener('click', openComparison);
    if (closeButton) closeButton.addEventListener('click', closeComparison);
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeComparison();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeComparison();
        });
    }

    applyHistoryControls();
})();
