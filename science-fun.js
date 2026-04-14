const LEGACY_MEAL_PLANS_KEY = 'meal_plans_v1';
const MEAL_PLANS_MIGRATION_KEY = 'meal_plans_db_migrated_v1';

const MEAL_LABELS = {
    'breakfast': { label: 'Bữa sáng', emoji: '🌅' },
    'lunch': { label: 'Bữa trưa', emoji: '☀️' },
    'dinner': { label: 'Bữa tối', emoji: '🌙' }
};

let mealPlansDb = [];
let filteredMealPlans = [];
let selectedDayId = null;
let detailEditMode = false;
let currentEditingDish = null;

document.addEventListener('DOMContentLoaded', async () => {
    initializeEvents();
    await bootstrapMealPlans();
});

async function apiRequest(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    let response;

    try {
        response = await fetch(path, { ...options, headers });
    } catch (_error) {
        throw new Error('Khong ket noi duoc server.');
    }

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await response.json().catch(() => ({})) : {};

    if (!response.ok) {
        throw new Error(data.error || `Yeu cau that bai (${response.status})`);
    }

    return data;
}

async function bootstrapMealPlans() {
    try {
        await migrateLegacyMealPlansIfNeeded();
        await loadMealPlans();
        refreshCurrentView();
    } catch (error) {
        toast(error.message || 'Khong tai duoc du lieu thuc don.', 'error');
    }
}

async function migrateLegacyMealPlansIfNeeded() {
    if (localStorage.getItem(MEAL_PLANS_MIGRATION_KEY) === 'done') return;

    const stored = localStorage.getItem(LEGACY_MEAL_PLANS_KEY);
    if (!stored) {
        localStorage.setItem(MEAL_PLANS_MIGRATION_KEY, 'done');
        return;
    }

    let items;
    try {
        items = JSON.parse(stored);
    } catch (_error) {
        localStorage.setItem(MEAL_PLANS_MIGRATION_KEY, 'done');
        return;
    }

    if (!Array.isArray(items) || items.length === 0) {
        localStorage.setItem(MEAL_PLANS_MIGRATION_KEY, 'done');
        return;
    }

    await apiRequest('/api/meal-plans/import', {
        method: 'POST',
        body: JSON.stringify({ items })
    });
    localStorage.setItem(MEAL_PLANS_MIGRATION_KEY, 'done');
}

async function loadMealPlans() {
    const { items } = await apiRequest('/api/meal-plans');
    mealPlansDb = Array.isArray(items) ? items : [];
}

function initializeEvents() {
    const searchInput = document.getElementById('searchInput');
    const sortFilter = document.getElementById('sortFilter');
    const openDayBtn = document.getElementById('openAddDayBtn');
    const dayModal = document.getElementById('dayModal');
    const closeDayBtn = document.getElementById('closeDayModalBtn');
    const cancelDayBtn = document.getElementById('cancelDayBtn');
    const dayForm = document.getElementById('dayForm');

    const dishModal = document.getElementById('dishModal');
    const closeDishBtn = document.getElementById('closeDishModalBtn');
    const cancelDishBtn = document.getElementById('cancelDishBtn');
    const dishForm = document.getElementById('dishForm');

    searchInput.addEventListener('input', refreshCurrentView);
    sortFilter.addEventListener('change', refreshCurrentView);

    // openDayBtn.addEventListener('click', openAddDayModal);
    closeDayBtn.addEventListener('click', closeDayModal);
    cancelDayBtn.addEventListener('click', closeDayModal);

    closeDishBtn.addEventListener('click', closeDishModal);
    cancelDishBtn.addEventListener('click', closeDishModal);

    dayModal.addEventListener('click', (event) => {
        if (event.target === dayModal) closeDayModal();
    });

    dishModal.addEventListener('click', (event) => {
        if (event.target === dishModal) closeDishModal();
    });

    dayForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleDaySubmit();
    });

    dishForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleDishSubmit();
    });
}

function currentDate() {
    return new Date().toISOString().split('T')[0];
}

function generateId() {
    return `mp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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

function getMealMeta(mealType) {
    return MEAL_LABELS[mealType] || { label: mealType, emoji: '🍽️' };
}

function applyFilters() {
    const term = normalizeText(document.getElementById('searchInput')?.value).toLowerCase();
    const sortBy = document.getElementById('sortFilter')?.value || 'newest';

    filteredMealPlans = mealPlansDb.filter((day) => {
        const haystack = [
            day.name,
            ...(day.meals?.breakfast || []).map(d => d.name),
            ...(day.meals?.lunch || []).map(d => d.name),
            ...(day.meals?.dinner || []).map(d => d.name)
        ].join(' ').toLowerCase();

        return !term || haystack.includes(term);
    });

    // Sort
    if (sortBy === 'newest') {
        filteredMealPlans.sort((a, b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt)));
    } else if (sortBy === 'oldest') {
        filteredMealPlans.sort((a, b) => String(a.modifiedAt).localeCompare(String(b.modifiedAt)));
    } else if (sortBy === 'name') {
        filteredMealPlans.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }

    if (!selectedDayId || !filteredMealPlans.some((day) => day.id === selectedDayId)) {
        selectedDayId = filteredMealPlans[0]?.id || null;
        detailEditMode = false;
    }
}

function refreshCurrentView() {
    applyFilters();
    renderStats();
    renderMealDaysList();
    renderMealDayDetail();
}

function renderStats() {
    const totalEl = document.getElementById('totalDaysValue');
    const filteredEl = document.getElementById('filteredDaysValue');

    if (totalEl) totalEl.textContent = String(mealPlansDb.length);
    if (filteredEl) filteredEl.textContent = String(filteredMealPlans.length);
}

function renderMealDaysList() {
    const listEl = document.getElementById('mealDaysList');
    const emptyEl = document.getElementById('emptyState');

    listEl.innerHTML = '';

    if (!filteredMealPlans.length) {
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';

    filteredMealPlans.forEach((day) => {
        const totalDishes = (day.meals?.breakfast?.length || 0) +
            (day.meals?.lunch?.length || 0) +
            (day.meals?.dinner?.length || 0);

        const card = document.createElement('article');
        card.className = `science-card ${day.id === selectedDayId ? 'active' : ''}`;
        card.dataset.dayId = day.id;
        card.innerHTML = `
            <div class="science-card-top">
                <div class="science-card-title-wrap">
                    <h3 class="science-card-title">${escapeHtml(day.name)}</h3>
                    <div class="science-card-badge">🍽️ ${totalDishes} món ăn</div>
                </div>
                <span class="science-card-emoji">${escapeHtml(day.emoji || '🍽️')}</span>
            </div>
            <p class="science-card-desc">
                ${day.meals?.breakfast?.length || 0} món sáng • 
                ${day.meals?.lunch?.length || 0} món trưa • 
                ${day.meals?.dinner?.length || 0} món tối
            </p>
        `;

        card.addEventListener('click', () => {
            selectedDayId = day.id;
            detailEditMode = false;
            renderMealDaysList();
            renderMealDayDetail();
        });

        listEl.appendChild(card);
    });
}

function renderMealDayDetail() {
    const detailEl = document.getElementById('mealDayDetail');
    const day = mealPlansDb.find((d) => d.id === selectedDayId);

    if (!day) {
        detailEl.innerHTML = `
            <div class="science-detail-empty">
                <span class="empty-icon">🥗</span>
                <p>Chọn một ngày bên trái để xem chi tiết thực đơn.</p>
            </div>
        `;
        return;
    }

    if (!detailEditMode) {
        renderDayView(detailEl, day);
        return;
    }

    renderDayEditForm(detailEl, day);
}

function renderDayView(detailEl, day) {
    const meals = day.meals || { breakfast: [], lunch: [], dinner: [] };

    detailEl.innerHTML = `
        <div class="detail-head">
            <div>
                <div class="detail-eyebrow">🍽️ Thực đơn</div>
                <h2 class="detail-title">${escapeHtml(day.emoji || '🍽️')} ${escapeHtml(day.name)}</h2>
            </div>
        </div>
        <div class="detail-sections">
            ${renderMealSection('breakfast', 'Bữa sáng', meals.breakfast || [], day.id)}
            ${renderMealSection('lunch', 'Bữa trưa', meals.lunch || [], day.id)}
            ${renderMealSection('dinner', 'Bữa tối', meals.dinner || [], day.id)}
        </div>
    `;
    /*
    document.getElementById('btnEditDay').addEventListener('click', () => {
        detailEditMode = true;
        renderMealDayDetail();
    });

    document.getElementById('btnDeleteDay').addEventListener('click', async () => {
        const ok = confirm(`Bạn có chắc muốn xóa ngày này?\n\n"${day.name}"`);
        if (!ok) return;

        try {
            await apiRequest(`/api/meal-plans/${encodeURIComponent(day.id)}`, {
                method: 'DELETE'
            });
            await loadMealPlans();
            selectedDayId = null;
            detailEditMode = false;
            refreshCurrentView();
            toast('Đã xóa ngày thành công.', 'success');
        } catch (error) {
            toast(error.message || 'Không xóa được ngày này.', 'error');
        }
    });
*/
    // Add event listeners for add dish buttons
    document.querySelectorAll('.btn-add-dish').forEach(btn => {
        btn.addEventListener('click', () => {
            const mealType = btn.dataset.meal;
            openAddDishModal(day.id, mealType);
        });
    });

    // Add event listeners for edit/delete dish buttons
    document.querySelectorAll('.btn-edit-dish').forEach(btn => {
        btn.addEventListener('click', () => {
            const dishId = btn.dataset.dishId;
            const mealType = btn.dataset.meal;
            openEditDishModal(day.id, mealType, dishId);
        });
    });

    document.querySelectorAll('.btn-delete-dish').forEach(btn => {
        btn.addEventListener('click', async () => {
            const dishId = btn.dataset.dishId;
            const mealType = btn.dataset.meal;
            await deleteDish(day.id, mealType, dishId);
        });
    });
}

function renderMealSection(mealType, mealLabel, dishes, dayId) {
    const meta = getMealMeta(mealType);
    const dishesHtml = dishes.map(dish => `
        <div class="dish-item">
            <div class="dish-info">
                ${dish.imageUrl
            ? `<img src="${escapeHtml(dish.imageUrl)}" alt="${escapeHtml(dish.name)}" class="dish-image" onerror="this.outerHTML='<div class=\\'dish-image\\'>🍽️</div>'">`
            : `<div class="dish-image">🍽️</div>`
        }
                <div class="dish-details">
                    <strong class="dish-name">${escapeHtml(dish.name)}</strong>
                    ${dish.description ? `<p class="dish-desc">${escapeHtml(dish.description)}</p>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    return `
        <section class="detail-block meal-section">
            <div class="dishes-list">
                ${dishesHtml || '<p class="empty-dishes">Chưa có món ăn nào.</p>'}
            </div>
        </section>
    `;
}

function renderDayEditForm(detailEl, day) {
    detailEl.innerHTML = `
        <form class="detail-edit-form" id="detailEditForm">
            <div class="form-group">
                <label for="detailDayName">Tên ngày</label>
                <input type="text" id="detailDayName" value="${escapeHtml(day.name)}" required>
            </div>
            
            <div class="form-group">
                <label for="detailDayEmoji">Emoji</label>
                <input type="text" id="detailDayEmoji" value="${escapeHtml(day.emoji || '🍽️')}" maxlength="4" required>
            </div>

            <div class="form-actions">
                <button class="btn-cancel-edit" type="button" id="btnCancelEdit">Hủy</button>
                <button class="btn-save" type="submit">Lưu cập nhật</button>
            </div>
        </form>
    `;

    document.getElementById('btnCancelEdit').addEventListener('click', () => {
        detailEditMode = false;
        renderMealDayDetail();
    });

    document.getElementById('detailEditForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveDayEdit(day);
    });
}

async function saveDayEdit(existingDay) {
    const name = normalizeText(document.getElementById('detailDayName').value);
    const emoji = normalizeText(document.getElementById('detailDayEmoji').value);

    if (!name) {
        toast('Cần nhập tên ngày.', 'error');
        return;
    }

    try {
        await apiRequest(`/api/meal-plans/${encodeURIComponent(existingDay.id)}`, {
            method: 'PUT',
            body: JSON.stringify({
                name,
                emoji: emoji || '🍽️',
                meals: existingDay.meals,
                createdAt: existingDay.createdAt,
                modifiedAt: currentDate()
            })
        });
        await loadMealPlans();
        detailEditMode = false;
        refreshCurrentView();
        toast('Cập nhật thành công.', 'success');
    } catch (error) {
        toast(error.message || 'Không lưu được thay đổi.', 'error');
    }
}

function openAddDayModal() {
    const modal = document.getElementById('dayModal');
    const form = document.getElementById('dayForm');
    document.getElementById('dayModalTitle').textContent = 'Thêm ngày mới';
    form.reset();
    form.dataset.editId = '';
    document.getElementById('dayEmoji').value = '🍽️';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDayModal() {
    const modal = document.getElementById('dayModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('dayForm').reset();
}

async function handleDaySubmit() {
    const form = document.getElementById('dayForm');
    const name = normalizeText(document.getElementById('dayName').value);
    const emoji = normalizeText(document.getElementById('dayEmoji').value);

    if (!name) {
        toast('Cần nhập tên ngày.', 'error');
        return;
    }

    try {
        await apiRequest('/api/meal-plans', {
            method: 'POST',
            body: JSON.stringify({
                id: generateId(),
                name,
                emoji: emoji || '🍽️',
                meals: {
                    breakfast: [],
                    lunch: [],
                    dinner: []
                },
                createdAt: currentDate(),
                modifiedAt: currentDate()
            })
        });
        toast('Đã thêm ngày mới.', 'success');
        closeDayModal();
        await loadMealPlans();
        refreshCurrentView();
    } catch (error) {
        toast(error.message || 'Không thêm được ngày mới.', 'error');
    }
}

function openAddDishModal(dayId, mealType) {
    const modal = document.getElementById('dishModal');
    const form = document.getElementById('dishForm');
    document.getElementById('dishModalTitle').textContent = 'Thêm món ăn';
    form.reset();
    form.dataset.dayId = dayId;
    form.dataset.editDishId = '';
    document.getElementById('dishMeal').value = mealType;
    document.getElementById('dishImageUrl').value = '';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openEditDishModal(dayId, mealType, dishId) {
    const day = mealPlansDb.find(d => d.id === dayId);
    if (!day) return;

    const dish = day.meals[mealType]?.find(d => d.id === dishId);
    if (!dish) return;

    const modal = document.getElementById('dishModal');
    const form = document.getElementById('dishForm');
    document.getElementById('dishModalTitle').textContent = 'Sửa món ăn';
    form.dataset.dayId = dayId;
    form.dataset.editDishId = dishId;
    document.getElementById('dishMeal').value = mealType;
    document.getElementById('dishName').value = dish.name;
    document.getElementById('dishImageUrl').value = dish.imageUrl || '';
    document.getElementById('dishDesc').value = dish.description || '';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDishModal() {
    const modal = document.getElementById('dishModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('dishForm').reset();
}

async function handleDishSubmit() {
    const form = document.getElementById('dishForm');
    const dayId = form.dataset.dayId;
    const editDishId = form.dataset.editDishId;
    const mealType = document.getElementById('dishMeal').value;
    const name = normalizeText(document.getElementById('dishName').value);
    const imageUrl = normalizeText(document.getElementById('dishImageUrl').value);
    const description = normalizeText(document.getElementById('dishDesc').value);

    if (!name) {
        toast('Cần nhập tên món ăn.', 'error');
        return;
    }

    const day = mealPlansDb.find(d => d.id === dayId);
    if (!day) {
        toast('Không tìm thấy ngày.', 'error');
        return;
    }

    const meals = { ...day.meals };
    if (!meals[mealType]) meals[mealType] = [];

    if (editDishId) {
        // Edit existing dish
        const dishIndex = meals[mealType].findIndex(d => d.id === editDishId);
        if (dishIndex >= 0) {
            meals[mealType][dishIndex] = {
                ...meals[mealType][dishIndex],
                name,
                imageUrl: imageUrl,
                description
            };
        }
    } else {
        // Add new dish
        meals[mealType].push({
            id: generateId(),
            name,
            imageUrl: imageUrl,
            description
        });
    }

    try {
        await apiRequest(`/api/meal-plans/${encodeURIComponent(dayId)}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: day.name,
                emoji: day.emoji,
                meals,
                createdAt: day.createdAt,
                modifiedAt: currentDate()
            })
        });
        toast(editDishId ? 'Đã cập nhật món ăn.' : 'Đã thêm món ăn.', 'success');
        closeDishModal();
        await loadMealPlans();
        refreshCurrentView();
    } catch (error) {
        toast(error.message || 'Không lưu được món ăn.', 'error');
    }
}

async function deleteDish(dayId, mealType, dishId) {
    const ok = confirm('Bạn có chắc muốn xóa món ăn này?');
    if (!ok) return;

    const day = mealPlansDb.find(d => d.id === dayId);
    if (!day) return;

    const meals = { ...day.meals };
    if (!meals[mealType]) return;

    meals[mealType] = meals[mealType].filter(d => d.id !== dishId);

    try {
        await apiRequest(`/api/meal-plans/${encodeURIComponent(dayId)}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: day.name,
                emoji: day.emoji,
                meals,
                createdAt: day.createdAt,
                modifiedAt: currentDate()
            })
        });
        toast('Đã xóa món ăn.', 'success');
        await loadMealPlans();
        refreshCurrentView();
    } catch (error) {
        toast(error.message || 'Không xóa được món ăn.', 'error');
    }
}

function toast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;

    window.clearTimeout(toastEl._timerId);
    toastEl._timerId = window.setTimeout(() => {
        toastEl.classList.remove('show');
    }, 2600);
}
