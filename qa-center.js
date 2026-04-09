// === CONSTANTS ===
const QADB_KEY = 'qadb_questions';
const CATEGORY_ICONS = {
    'nutrition': '🥗',
    'exam-prep': '📚',
    'health': '❤️',
    'other': '💡'
};

const DEFAULT_QA = [
    {
        id: 'q_001',
        question: 'Tác hại của mì tôm là gì?',
        answer: 'Mì tôm chứa nhiều natri (có thể gây cao huyết áp), chất béo bão hòa, ít dinh dưỡng. Ăn thường xuyên có thể dẫn đến béo phì, tăng cholesterol, vấn đề tim mạch. Nên thay thế bằng các mỳ ngũ cốc hoặc cơm lứt có dinh dưỡng tốt hơn.',
        category: 'nutrition',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'q_002',
        question: 'Thực đơn nên ăn trước khi đi thi?',
        answer: 'Nên ăn những thực phẩm giàu protein (trứng, cá), carbohydrate phức tạp (lúa mì nguyên hạt, gạo lứt), trái cây (chuối có kali), uống nước đủ. Tránh ăn quá no hoặc quá ít. Ăn khoảng 1-2 tiếng trước thi và tránh các thực phẩm gây buồn nôn.',
        category: 'exam-prep',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    }
];

// === STATE ===
let qaDatabase = [];
let filteredQA = [];

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    loadQADatabase();
    initializeEventListeners();
    renderQA();
});

// === DATABASE OPERATIONS ===
function loadQADatabase() {
    const stored = localStorage.getItem(QADB_KEY);
    if (stored) {
        qaDatabase = JSON.parse(stored);
    } else {
        // First time: use default QA
        qaDatabase = JSON.parse(JSON.stringify(DEFAULT_QA));
        saveQADatabase();
    }
    filteredQA = [...qaDatabase];
}

function saveQADatabase() {
    localStorage.setItem(QADB_KEY, JSON.stringify(qaDatabase));
}

function generateQAId() {
    return `q_${Date.now()}`;
}

function addQA(question, answer, category) {
    const newQA = {
        id: generateQAId(),
        question,
        answer,
        category,
        createdAt: new Date().toISOString().split('T')[0],
        modifiedAt: new Date().toISOString().split('T')[0]
    };

    qaDatabase.unshift(newQA);
    saveQADatabase();
    return newQA;
}

function updateQA(id, question, answer, category) {
    const index = qaDatabase.findIndex(qa => qa.id === id);
    if (index !== -1) {
        qaDatabase[index] = {
            ...qaDatabase[index],
            question,
            answer,
            category,
            modifiedAt: new Date().toISOString().split('T')[0]
        };
        saveQADatabase();
        return qaDatabase[index];
    }
}

function deleteQA(id) {
    qaDatabase = qaDatabase.filter(qa => qa.id !== id);
    saveQADatabase();
}

function searchQA(searchTerm, category) {
    filteredQA = qaDatabase.filter(qa => {
        const matchSearch = qa.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            qa.answer.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = !category || qa.category === category;
        return matchSearch && matchCategory;
    });
}

// === EVENT LISTENERS ===
function initializeEventListeners() {
    // Modal controls
    const openBtn = document.getElementById('openAddQABtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelQABtn');
    const modal = document.getElementById('addQAModal');
    const form = document.getElementById('qaForm');

    openBtn.addEventListener('click', () => openAddQAModal());
    closeBtn.addEventListener('click', () => closeModal());
    cancelBtn.addEventListener('click', () => closeModal());

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddQA();
    });

    // Close modal khi click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Search & Filter
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

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

// === MODAL OPERATIONS ===
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

function handleAddQA() {
    const question = document.getElementById('qaQuestion').value.trim();
    const answer = document.getElementById('qaAnswer').value.trim();
    const category = document.getElementById('qaCategory').value;

    if (!question || !answer) {
        showToast('Vui lòng điền đầy đủ câu hỏi và câu trả lời!', 'error');
        return;
    }

    const editId = document.getElementById('qaForm').dataset.editId;

    if (editId) {
        // Update existing
        updateQA(editId, question, answer, category);
        showToast('✓ Cập nhật câu hỏi thành công!', 'success');
    } else {
        // Add new
        addQA(question, answer, category);
        showToast('✨ Thêm câu hỏi mới thành công!', 'success');
    }

    closeModal();
    renderQA();
}

// === RENDERING ===
function renderQA() {
    const qaList = document.getElementById('qaList');
    const emptyState = document.getElementById('emptyState');

    qaList.innerHTML = '';

    if (filteredQA.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    filteredQA.forEach(qa => {
        const qaItem = createQAElement(qa);
        qaList.appendChild(qaItem);
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

    // Bind events
    item.querySelector('.qa-question-section').addEventListener('click', () => {
        item.classList.toggle('expanded');
    });

    const editBtn = item.querySelector('[data-action="edit"]');
    const deleteBtn = item.querySelector('[data-action="delete"]');
    const saveBtn = item.querySelector('[data-action="save"]');
    const cancelBtn = item.querySelector('[data-action="cancel"]');

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        enterEditMode(item, qa);
    });

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Bạn có chắc muốn xóa câu hỏi này?\n\n"${qa.question}"`)) {
            deleteQA(qa.id);
            showToast('✓ Xóa câu hỏi thành công!', 'success');
            renderQA();
        }
    });

    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveEditedAnswer(item, qa);
    });

    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exitEditMode(item);
    });

    return item;
}

function enterEditMode(item, qa) {
    item.classList.add('editing');

    const editBtn = item.querySelector('[data-action="edit"]');
    const deleteBtn = item.querySelector('[data-action="delete"]');
    const saveBtn = item.querySelector('[data-action="save"]');
    const cancelBtn = item.querySelector('[data-action="cancel"]');

    editBtn.style.display = 'none';
    deleteBtn.style.display = 'none';
    saveBtn.style.display = 'block';
    cancelBtn.style.display = 'block';

    const textarea = item.querySelector('.qa-answer-textarea');
    textarea.focus();
    textarea.select();
}

function exitEditMode(item) {
    item.classList.remove('editing');

    const editBtn = item.querySelector('[data-action="edit"]');
    const deleteBtn = item.querySelector('[data-action="delete"]');
    const saveBtn = item.querySelector('[data-action="save"]');
    const cancelBtn = item.querySelector('[data-action="cancel"]');

    editBtn.style.display = 'block';
    deleteBtn.style.display = 'block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
}

function saveEditedAnswer(item, qa) {
    const textarea = item.querySelector('.qa-answer-textarea');
    const newAnswer = textarea.value.trim();

    if (!newAnswer) {
        showToast('Câu trả lời không được trống!', 'error');
        return;
    }

    // Update câu trả lời
    updateQA(qa.id, qa.question, newAnswer, qa.category);

    // Update UI
    const answerText = item.querySelector('.qa-answer-text');
    answerText.textContent = newAnswer;

    // Update modified date
    const modifiedSpan = item.querySelector('[style*="margin-top: 10px"]');
    if (modifiedSpan) {
        modifiedSpan.innerHTML = `<span>Sửa: ${new Date().toISOString().split('T')[0]}</span>`;
    }

    exitEditMode(item);
    showToast('💾 Câu trả lời đã được lưu!', 'success');
}

// === UTILITIES ===
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
