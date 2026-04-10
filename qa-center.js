const LEGACY_QADB_KEY = 'qadb_questions';
const QA_MIGRATION_KEY = 'qa_center_db_migrated_v1';
const CATEGORY_ICONS = {
    'nutrition': '🥗',
    'exam_prep': '📚',
    'health': '❤️',
    'other': '💡'
};

let qaDatabase = [];
let filteredQA = [];

document.addEventListener('DOMContentLoaded', async () => {
    initializeEventListeners();
    await bootstrapQA();
});

async function apiRequest(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    let response;

    try {
        response = await fetch(path, { ...options, headers });
    } catch (_error) {
        throw new Error('Không kết nối được server.');
    }

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await response.json().catch(() => ({})) : {};

    if (!response.ok) {
        throw new Error(data.error || `Yêu cầu thất bại (${response.status})`);
    }

    return data;
}

async function bootstrapQA() {
    try {
        await migrateLegacyQaIfNeeded();
        await loadQADatabase();
        renderQA();
    } catch (error) {
        showToast(error.message || 'Không tải được dữ liệu hỏi đáp.', 'error');
    }
}

async function migrateLegacyQaIfNeeded() {
    if (localStorage.getItem(QA_MIGRATION_KEY) === 'done') return;

    const stored = localStorage.getItem(LEGACY_QADB_KEY);
    if (!stored) {
        localStorage.setItem(QA_MIGRATION_KEY, 'done');
        return;
    }

    let items;
    try {
        items = JSON.parse(stored);
    } catch (_error) {
        localStorage.setItem(QA_MIGRATION_KEY, 'done');
        return;
    }

    if (!Array.isArray(items) || items.length === 0) {
        localStorage.setItem(QA_MIGRATION_KEY, 'done');
        return;
    }

    await apiRequest('/api/qa-center/import', {
        method: 'POST',
        body: JSON.stringify({ items })
    });
    localStorage.setItem(QA_MIGRATION_KEY, 'done');
}

async function loadQADatabase() {
    const { items } = await apiRequest('/api/qa-center');
    qaDatabase = Array.isArray(items) ? items : [];
    filteredQA = [...qaDatabase];
}

function generateQAId() {
    return `q_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

async function addQA(question, answer, category) {
    const payload = {
        id: generateQAId(),
        question,
        answer,
        category,
        createdAt: currentDate(),
        modifiedAt: currentDate()
    };

    const { item } = await apiRequest('/api/qa-center', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    return item;
}

async function updateQA(id, question, answer, category, createdAt) {
    const payload = {
        question,
        answer,
        category,
        createdAt: createdAt || currentDate(),
        modifiedAt: currentDate()
    };

    const { item } = await apiRequest(`/api/qa-center/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    return item;
}

async function deleteQA(id) {
    await apiRequest(`/api/qa-center/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

function searchQA(searchTerm, category) {
    const normalizedTerm = String(searchTerm || '').toLowerCase();
    filteredQA = qaDatabase.filter((qa) => {
        const matchSearch = qa.question.toLowerCase().includes(normalizedTerm) ||
            qa.answer.toLowerCase().includes(normalizedTerm);
        const matchCategory = !category || qa.category === category;
        return matchSearch && matchCategory;
    });
}

function initializeEventListeners() {
    const openBtn = document.getElementById('openAddQABtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelQABtn');
    const modal = document.getElementById('addQAModal');
    const form = document.getElementById('qaForm');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    openBtn.addEventListener('click', () => openAddQAModal());
    closeBtn.addEventListener('click', () => closeModal());
    cancelBtn.addEventListener('click', () => closeModal());

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddQA();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    searchInput.addEventListener('input', (e) => {
        applyFilters(e.target.value, categoryFilter.value);
    });

    categoryFilter.addEventListener('change', (e) => {
        applyFilters(searchInput.value, e.target.value);
    });
}

function applyFilters(searchTerm, category) {
    searchQA(searchTerm, category);
    renderQA();
}

function refreshCurrentView() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    applyFilters(searchInput ? searchInput.value : '', categoryFilter ? categoryFilter.value : '');
}

function openAddQAModal() {
    const modal = document.getElementById('addQAModal');
    document.getElementById('modalTitle').textContent = '✨ Thêm Câu Hỏi Mới';
    document.getElementById('qaForm').reset();
    document.getElementById('qaForm').dataset.editId = '';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('addQAModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    document.getElementById('qaForm').reset();
}

async function handleAddQA() {
    const question = document.getElementById('qaQuestion').value.trim();
    const answer = document.getElementById('qaAnswer').value.trim();
    const category = document.getElementById('qaCategory').value;
    const editId = document.getElementById('qaForm').dataset.editId;

    if (!question || !answer) {
        showToast('Vui lòng điền đầy đủ câu hỏi và câu trả lời!', 'error');
        return;
    }

    try {
        if (editId) {
            const currentItem = qaDatabase.find((qa) => qa.id === editId);
            await updateQA(editId, question, answer, category, currentItem?.createdAt);
            showToast('Cập nhật câu hỏi thành công!', 'success');
        } else {
            await addQA(question, answer, category);
            showToast('Thêm câu hỏi mới thành công!', 'success');
        }

        closeModal();
        await loadQADatabase();
        refreshCurrentView();
    } catch (error) {
        showToast(error.message || 'Không lưu được câu hỏi.', 'error');
    }
}

function renderQA() {
    const qaList = document.getElementById('qaList');
    const emptyState = document.getElementById('emptyState');

    qaList.innerHTML = '';

    if (filteredQA.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    filteredQA.forEach((qa) => {
        qaList.appendChild(createQAElement(qa));
    });
}

function createQAElement(qa) {
    const item = document.createElement('div');
    item.className = 'qa-item';
    item.dataset.qaId = qa.id;

    const categoryLabel = `${CATEGORY_ICONS[qa.category] || '💡'} ${qa.category}`;

    item.innerHTML = `
        <div class="qa-question-section">
            <div class="qa-question-content">
                <p class="qa-question-text">${escapeHtml(qa.question)}</p>
                <div class="qa-category">${categoryLabel}</div>
            </div>
            <span class="qa-toggle-indicator">▼</span>
        </div>

        <div class="qa-answer-section">
            <p class="qa-answer-label">💬 Câu trả lời:</p>

            <div class="qa-answer-view">
                <p class="qa-answer-text">${escapeHtml(qa.answer)}</p>
            </div>

            <div class="qa-answer-edit" style="display: none;">
                <textarea class="qa-answer-textarea">${escapeHtml(qa.answer)}</textarea>
            </div>

            <div class="qa-actions">
                <button class="btn-edit" data-action="edit">✏️ Chỉnh sửa</button>
                <button class="btn-delete" data-action="delete">🗑️ Xóa</button>
                <button class="btn-save" data-action="save" style="display: none;">💾 Lưu</button>
                <button class="btn-cancel-edit" data-action="cancel" style="display: none;">❌ Hủy</button>
            </div>

            <div style="margin-top: 10px; font-size: 0.85rem; color: #999;">
                <span>Sửa: ${qa.modifiedAt}</span>
            </div>
        </div>
    `;

    item.querySelector('.qa-question-section').addEventListener('click', () => {
        item.classList.toggle('expanded');
    });

    item.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation();
        enterEditMode(item);
    });

    item.querySelector('[data-action="delete"]').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Bạn có chắc muốn xóa câu hỏi này?\n\n"${qa.question}"`)) return;

        try {
            await deleteQA(qa.id);
            await loadQADatabase();
            refreshCurrentView();
            showToast('Xóa câu hỏi thành công!', 'success');
        } catch (error) {
            showToast(error.message || 'Không xóa được câu hỏi.', 'error');
        }
    });

    item.querySelector('[data-action="save"]').addEventListener('click', async (e) => {
        e.stopPropagation();
        await saveEditedAnswer(item, qa);
    });

    item.querySelector('[data-action="cancel"]').addEventListener('click', (e) => {
        e.stopPropagation();
        exitEditMode(item);
    });

    return item;
}

function enterEditMode(item) {
    item.classList.add('editing');

    item.querySelector('[data-action="edit"]').style.display = 'none';
    item.querySelector('[data-action="delete"]').style.display = 'none';
    item.querySelector('[data-action="save"]').style.display = 'block';
    item.querySelector('[data-action="cancel"]').style.display = 'block';

    const textarea = item.querySelector('.qa-answer-textarea');
    textarea.focus();
    textarea.select();
}

function exitEditMode(item) {
    item.classList.remove('editing');

    item.querySelector('[data-action="edit"]').style.display = 'block';
    item.querySelector('[data-action="delete"]').style.display = 'block';
    item.querySelector('[data-action="save"]').style.display = 'none';
    item.querySelector('[data-action="cancel"]').style.display = 'none';
}

async function saveEditedAnswer(item, qa) {
    const textarea = item.querySelector('.qa-answer-textarea');
    const newAnswer = textarea.value.trim();

    if (!newAnswer) {
        showToast('Câu trả lời không được để trống!', 'error');
        return;
    }

    try {
        await updateQA(qa.id, qa.question, newAnswer, qa.category, qa.createdAt);
        await loadQADatabase();
        refreshCurrentView();
        exitEditMode(item);
        showToast('Câu trả lời đã được lưu!', 'success');
    } catch (error) {
        showToast(error.message || 'Không lưu được câu trả lời.', 'error');
    }
}

function currentDate() {
    return new Date().toISOString().split('T')[0];
}

function escapeHtml(text) {
    const value = String(text ?? '');
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return value.replace(/[&<>"']/g, (char) => map[char]);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}