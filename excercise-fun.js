const LEGACY_EXERCISES_KEY = 'exercises_v1';
const EXERCISES_MIGRATION_KEY = 'exercises_db_migrated_v1';

let exercisesDb = [];
let filteredExercises = [];
let selectedExId = null;
let detailEditMode = false;

document.addEventListener('DOMContentLoaded', async () => {
    initializeEvents();
    await bootstrapExercises();
});

// --- CORE API & UTILS ---

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

function currentDate() {
    return new Date().toISOString(); // Đã sửa lại để lấy cả giờ phút giây chuẩn ISO
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function escapeHtml(text) {
    const str = String(text ?? '');
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, (char) => map[char]);
}

// --- BOOTSTRAP & MIGRATION ---

async function bootstrapExercises() {
    try {
        await migrateLegacyExercisesIfNeeded();
        await loadExercises();
        refreshCurrentView();
    } catch (error) {
        toast(error.message || 'Không tải được dữ liệu bài tập.', 'error');
    }
}

async function migrateLegacyExercisesIfNeeded() {
    if (localStorage.getItem(EXERCISES_MIGRATION_KEY) === 'done') return;

    const stored = localStorage.getItem(LEGACY_EXERCISES_KEY);
    if (!stored) {
        localStorage.setItem(EXERCISES_MIGRATION_KEY, 'done');
        return;
    }

    let items;
    try {
        items = JSON.parse(stored);
    } catch (_error) {
        localStorage.setItem(EXERCISES_MIGRATION_KEY, 'done');
        return;
    }

    if (!Array.isArray(items) || items.length === 0) {
        localStorage.setItem(EXERCISES_MIGRATION_KEY, 'done');
        return;
    }

    // Nếu bạn có làm API import cho exercise, gọi ở đây
    // await apiRequest('/api/exercises/import', {
    //     method: 'POST',
    //     body: JSON.stringify({ items })
    // });

    localStorage.setItem(EXERCISES_MIGRATION_KEY, 'done');
}

async function loadExercises() {
    const { items } = await apiRequest('/api/exercises');
    exercisesDb = Array.isArray(items) ? items : [];
}

// --- EVENT INITIALIZATION ---

function initializeEvents() {
    const searchInput = document.getElementById('searchInput');
    const sortFilter = document.getElementById('sortFilter');
    const openExBtn = document.getElementById('openAddExBtn');
    const exModal = document.getElementById('exModal');
    const closeExBtn = document.getElementById('closeExModalBtn'); // Đảm bảo bạn có nút này trong HTML
    const cancelExBtn = document.getElementById('cancelExBtn'); // Đảm bảo bạn có nút này trong HTML
    const exForm = document.getElementById('exForm');

    if (searchInput) searchInput.addEventListener('input', refreshCurrentView);
    if (sortFilter) sortFilter.addEventListener('change', refreshCurrentView);

    if (openExBtn) openExBtn.addEventListener('click', openAddModal);
    if (closeExBtn) closeExBtn.addEventListener('click', closeModal);
    if (cancelExBtn) cancelExBtn.addEventListener('click', closeModal);

    if (exModal) {
        exModal.addEventListener('click', (event) => {
            if (event.target === exModal) closeModal();
        });
    }

    if (exForm) {
        exForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await handleAddSubmit();
        });
    }
}

// --- FILTERING & SORTING ---

function applyFilters() {
    const term = normalizeText(document.getElementById('searchInput')?.value).toLowerCase();
    const sortBy = document.getElementById('sortFilter')?.value || 'newest';

    filteredExercises = exercisesDb.filter((ex) => {
        const haystack = [ex.name, ex.category, ex.description].join(' ').toLowerCase();
        return !term || haystack.includes(term);
    });

    // Sort
    if (sortBy === 'newest') {
        filteredExercises.sort((a, b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt)));
    } else if (sortBy === 'oldest') {
        filteredExercises.sort((a, b) => String(a.modifiedAt).localeCompare(String(b.modifiedAt)));
    } else if (sortBy === 'name') {
        filteredExercises.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }

    // Auto-select first item if current selection is invalid or null
    if (!selectedExId || !filteredExercises.some((ex) => ex.id === selectedExId)) {
        selectedExId = filteredExercises[0]?.id || null;
        detailEditMode = false;
    }
}

function refreshCurrentView() {
    applyFilters();
    renderStats();
    renderList();
    renderDetail();
}

// --- RENDER LOGIC ---

function renderStats() {
    const totalEl = document.getElementById('totalDaysValue'); // Tái sử dụng ID từ HTML cũ
    const filteredEl = document.getElementById('filteredDaysValue');
    const updatedEl = document.getElementById('lastUpdatedValue');

    if (totalEl) totalEl.textContent = String(exercisesDb.length);
    if (filteredEl) filteredEl.textContent = String(filteredExercises.length);

    if (!exercisesDb.length) {
        if (updatedEl) updatedEl.textContent = '--';
        return;
    }

    const latest = [...exercisesDb]
        .sort((a, b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt)))[0];

    if (updatedEl) {
        // Format hiển thị ngày giờ cho đẹp
        const dateObj = new Date(latest.modifiedAt);
        updatedEl.textContent = isNaN(dateObj.getTime()) ? latest.modifiedAt : dateObj.toLocaleDateString('vi-VN');
    }
}

function renderList() {
    const listEl = document.getElementById('exerciseList');
    const emptyEl = document.getElementById('emptyState');

    if (!listEl) return;
    listEl.innerHTML = '';

    if (!filteredExercises.length) {
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    filteredExercises.forEach((ex) => {
        const card = document.createElement('article');
        card.className = `science-card ${ex.id === selectedExId ? 'active' : ''}`;
        card.dataset.id = ex.id;
        card.innerHTML = `
            <div class="science-card-top">
                <div class="science-card-title-wrap">
                    <h3 class="science-card-title">${escapeHtml(ex.name)}</h3>
                    <div class="science-card-badge">💪 ${escapeHtml(ex.category || 'Chung')}</div>
                </div>
                <span class="science-card-emoji">${escapeHtml(ex.emoji || '🏋️')}</span>
            </div>
        `;

        card.addEventListener('click', () => {
            selectedExId = ex.id;
            detailEditMode = false;
            renderList(); // Cập nhật class active
            renderDetail();
        });

        listEl.appendChild(card);
    });
}

function renderDetail() {
    const detailEl = document.getElementById('exerciseDetail');
    if (!detailEl) return;

    const ex = exercisesDb.find((d) => d.id === selectedExId);

    if (!ex) {
        detailEl.innerHTML = `
            <div class="science-detail-empty">
                <span class="empty-icon">🤸</span>
                <p>Chọn một bài tập bên trái để xem hướng dẫn chi tiết.</p>
            </div>
        `;
        return;
    }

    if (!detailEditMode) {
        renderViewMode(detailEl, ex);
        return;
    }

    renderEditMode(detailEl, ex);
}

function renderViewMode(detailEl, ex) {
    detailEl.innerHTML = `
        <div class="detail-head">
            <div>
                <div class="detail-eyebrow">🏋️ Bài tập</div>
                <h2 class="detail-title">${escapeHtml(ex.emoji)} ${escapeHtml(ex.name)}</h2>
                <p class="detail-short"><strong>Nhóm cơ:</strong> ${escapeHtml(ex.category)}</p>
            </div>
        </div>

        <div class="detail-sections">
            ${ex.imageUrl ? `
                <div class="detail-block" style="text-align: center;">
                    <img src="${escapeHtml(ex.imageUrl)}" alt="Minh họa" style="max-width: 100%; border-radius: 12px; max-height: 300px; object-fit: cover;">
                </div>
            ` : ''}
            
            <div class="detail-block">
                <h3>Kỹ thuật thực hiện</h3>
                <p>${escapeHtml(ex.description || 'Chưa có mô tả kỹ thuật.')}</p>
            </div>

            ${ex.videoUrl ? `
                <div class="detail-block">
                    <h3>Video hướng dẫn</h3>
                    <a href="${escapeHtml(ex.videoUrl)}" target="_blank" style="color: #2f91cf; font-weight: bold; text-decoration: none;">▶ Xem video hướng dẫn ↗</a>
                </div>
            ` : ''}
        </div>

    `;

    // document.getElementById('btnEditEx').addEventListener('click', () => {
    //     detailEditMode = true;
    //     renderDetail();
    // });

    // document.getElementById('btnDeleteEx').addEventListener('click', async () => {
    //     const ok = confirm(`Bạn có chắc muốn xóa bài tập này?\n\n"${ex.name}"`);
    //     if (!ok) return;

    //     try {
    //         await apiRequest(`/api/exercises/${encodeURIComponent(ex.id)}`, { method: 'DELETE' });
    //         await loadExercises();
    //         selectedExId = null;
    //         detailEditMode = false;
    //         refreshCurrentView();
    //         toast('Đã xóa bài tập thành công.', 'success');
    //     } catch (error) {
    //         toast(error.message || 'Không xóa được bài tập.', 'error');
    //     }
    // });
}

function renderEditMode(detailEl, ex) {
    detailEl.innerHTML = `
        <form class="detail-edit-form" id="detailEditForm">
            <div class="form-group">
                <label>Tên bài tập</label>
                <input type="text" id="editName" value="${escapeHtml(ex.name)}" required>
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label>Nhóm cơ</label>
                    <input type="text" id="editCategory" value="${escapeHtml(ex.category)}" required>
                </div>
                <div class="form-group">
                    <label>Emoji</label>
                    <input type="text" id="editEmoji" value="${escapeHtml(ex.emoji || '💪')}" maxlength="4">
                </div>
            </div>

            <div class="form-group">
                <label>Link Video</label>
                <input type="url" id="editVideoUrl" value="${escapeHtml(ex.videoUrl || '')}">
            </div>

            <div class="form-group">
                <label>Link Ảnh</label>
                <input type="url" id="editImageUrl" value="${escapeHtml(ex.imageUrl || '')}">
            </div>

            <div class="form-group">
                <label>Mô tả kỹ thuật</label>
                <textarea id="editDesc" rows="5">${escapeHtml(ex.description || '')}</textarea>
            </div>

            <div class="form-actions">
                <button class="btn-cancel-edit" type="button" id="btnCancelEdit">Hủy</button>
                <button class="btn-save" type="submit">Lưu cập nhật</button>
            </div>
        </form>
    `;

    document.getElementById('btnCancelEdit').addEventListener('click', () => {
        detailEditMode = false;
        renderDetail();
    });

    document.getElementById('detailEditForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleEditSubmit(ex);
    });
}

// --- ACTION HANDLERS ---

async function handleEditSubmit(existingEx) {
    const name = normalizeText(document.getElementById('editName').value);
    const category = normalizeText(document.getElementById('editCategory').value);
    const emoji = normalizeText(document.getElementById('editEmoji').value);
    const videoUrl = normalizeText(document.getElementById('editVideoUrl').value);
    const imageUrl = normalizeText(document.getElementById('editImageUrl').value);
    const description = normalizeText(document.getElementById('editDesc').value);

    if (!name) {
        toast('Cần nhập tên bài tập.', 'error');
        return;
    }

    try {
        await apiRequest(`/api/exercises/${encodeURIComponent(existingEx.id)}`, {
            method: 'PUT',
            body: JSON.stringify({ name, category, emoji: emoji || '💪', videoUrl, imageUrl, description })
        });
        await loadExercises();
        detailEditMode = false;
        refreshCurrentView();
        toast('Cập nhật thành công.', 'success');
    } catch (error) {
        toast(error.message || 'Không lưu được thay đổi.', 'error');
    }
}

function openAddModal() {
    const modal = document.getElementById('exModal');
    const form = document.getElementById('exForm');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('exEmoji').value = '💪';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('exModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

async function handleAddSubmit() {
    const name = normalizeText(document.getElementById('exName').value);
    const category = normalizeText(document.getElementById('exCategory').value);
    const emoji = normalizeText(document.getElementById('exEmoji').value);
    const videoUrl = normalizeText(document.getElementById('exVideo').value);
    const imageUrl = normalizeText(document.getElementById('exImage').value);
    const description = normalizeText(document.getElementById('exDesc').value);

    if (!name) {
        toast('Cần nhập tên bài tập.', 'error');
        return;
    }

    try {
        await apiRequest('/api/exercises', {
            method: 'POST',
            body: JSON.stringify({ name, category, emoji: emoji || '💪', videoUrl, imageUrl, description })
        });
        toast('Đã thêm bài tập mới.', 'success');
        closeModal();
        await loadExercises();
        refreshCurrentView();
    } catch (error) {
        toast(error.message || 'Không thêm được bài tập.', 'error');
    }
}

// --- UI FEEDBACK ---

function toast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;

    window.clearTimeout(toastEl._timerId);
    toastEl._timerId = window.setTimeout(() => {
        toastEl.classList.remove('show');
    }, 2600);
}