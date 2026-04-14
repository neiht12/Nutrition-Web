const LEGACY_NFDB_KEY = 'nutritiondb_foods_v1';
const NUTRITION_MIGRATION_KEY = 'nutrition_food_db_migrated_v1';

const CATEGORY_META = {
    'trai-cay': { label: 'Trái cây', emoji: '🍎' },
    'dam': { label: 'Đạm', emoji: '🥚' },
    'tinh-bot': { label: 'Tinh bột', emoji: '🍚' },
    'rau-cu': { label: 'Rau củ', emoji: '🥕' },
    'sua': { label: 'Sữa', emoji: '🥛' }
};

let foodsDb = [];
let filteredFoods = [];
let selectedFoodId = null;
let editMode = false;

function currentDate() {
    return new Date().toISOString().split('T')[0];
}

function generateFoodId() {
    return `f_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

function normalizeText(value) {
    return String(value ?? '').trim();
}

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

async function migrateLegacyNutritionIfNeeded() {
    if (localStorage.getItem(NUTRITION_MIGRATION_KEY) === 'done') return;

    const stored = localStorage.getItem(LEGACY_NFDB_KEY);
    if (!stored) {
        localStorage.setItem(NUTRITION_MIGRATION_KEY, 'done');
        return;
    }

    let items;
    try {
        items = JSON.parse(stored);
    } catch (_error) {
        localStorage.setItem(NUTRITION_MIGRATION_KEY, 'done');
        return;
    }

    if (!Array.isArray(items) || items.length === 0) {
        localStorage.setItem(NUTRITION_MIGRATION_KEY, 'done');
        return;
    }

    await apiRequest('/api/nutrition-foods/import', {
        method: 'POST',
        body: JSON.stringify({ items })
    });
    localStorage.setItem(NUTRITION_MIGRATION_KEY, 'done');
}

async function loadNutritionDB() {
    const { items } = await apiRequest('/api/nutrition-foods');
    foodsDb = Array.isArray(items) ? items : [];
}

async function addFood(food) {
    const payload = {
        id: generateFoodId(),
        category: food.category,
        name: food.name,
        image_url: food.image_url || '',
        short_desc: food.short_desc || '',
        detail_desc: food.detail_desc || '',
        createdAt: currentDate(),
        modifiedAt: currentDate()
    };

    const { item } = await apiRequest('/api/nutrition-foods', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    return item;
}

async function updateFood(id, update, existingFood) {
    const payload = {
        category: update.category || existingFood.category,
        name: update.name,
        image_url: update.image_url || '',
        short_desc: update.short_desc || '',
        detail_desc: update.detail_desc || '',
        createdAt: existingFood.createdAt,
        modifiedAt: currentDate()
    };

    const { item } = await apiRequest(`/api/nutrition-foods/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    return item;
}

async function deleteFood(id) {
    await apiRequest(`/api/nutrition-foods/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

function getFoodsByCategory(category) {
    return foodsDb.filter((food) => food.category === category);
}

function matchesSearch(food, term) {
    const normalizedTerm = term.toLowerCase();
    const haystack = `${food.name} ${food.short_desc} ${food.detail_desc}`.toLowerCase();
    return haystack.includes(normalizedTerm);
}

function setImageWithFallback(imgEl, src, fallbackText) {
    const placeholderBase = 'https://placehold.co/220x160?text=';
    const listPlaceholderBase = 'https://placehold.co/120x120?text=';
    const isList = imgEl.classList.contains('food-thumb');
    const base = isList ? listPlaceholderBase : placeholderBase;
    const safeText = encodeURIComponent((fallbackText || 'Food').slice(0, 12));
    const finalSrc = normalizeText(src) || `${base}${safeText}`;

    imgEl.src = finalSrc;
    imgEl.onerror = () => {
        imgEl.onerror = null;
        imgEl.src = `${base}${safeText}`;
    };
}

function toast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;

    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 2600);
}

function renderPageTitle(category) {
    const titleEl = document.getElementById('pageTitle');
    const meta = CATEGORY_META[category];
    if (titleEl && meta) {
        titleEl.textContent = `${meta.emoji} ${meta.label}`;
    }
}

function renderFoodList(category, term = '') {
    const listEl = document.getElementById('foodList');
    const emptyEl = document.getElementById('emptyState');

    listEl.innerHTML = '';

    const foodsInCategory = getFoodsByCategory(category);
    const searchTerm = term ? String(term).trim() : '';

    filteredFoods = searchTerm
        ? foodsInCategory.filter((food) => matchesSearch(food, searchTerm))
        : foodsInCategory;

    if (!filteredFoods.length) {
        if (emptyEl) emptyEl.style.display = 'block';
        selectedFoodId = null;
        editMode = false;
        renderFoodDetail(category);
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    if (!selectedFoodId || !filteredFoods.some((food) => food.id === selectedFoodId)) {
        selectedFoodId = filteredFoods[0].id;
        editMode = false;
    }

    filteredFoods.forEach((food) => {
        const item = document.createElement('div');
        item.className = `food-item ${food.id === selectedFoodId ? 'selected' : ''}`;
        item.dataset.foodId = food.id;

        const thumb = document.createElement('img');
        thumb.className = 'food-thumb';
        setImageWithFallback(thumb, food.image_url, food.name);
        thumb.alt = food.name;

        const meta = document.createElement('div');
        meta.className = 'food-item-meta';

        const title = document.createElement('p');
        title.className = 'food-item-title';
        title.textContent = food.name;

        const short = document.createElement('p');
        short.className = 'food-item-short';
        short.textContent = food.short_desc || '';

        meta.appendChild(title);
        meta.appendChild(short);

        const row = document.createElement('div');
        row.className = 'food-item-row';
        row.appendChild(thumb);
        row.appendChild(meta);

        item.appendChild(row);

        item.addEventListener('click', () => {
            selectedFoodId = food.id;
            editMode = false;
            renderFoodList(category, term);
            renderFoodDetail(category);
        });

        listEl.appendChild(item);
    });
}

function renderFoodDetail(category) {
    const detailEl = document.getElementById('foodDetail');
    if (!detailEl) return;

    const food = foodsDb.find((entry) => entry.id === selectedFoodId && entry.category === category) || null;

    if (!food) {
        detailEl.innerHTML = `
            <div class="nf-empty">
                <span class="empty-icon">📌</span>
                <p>Chọn một thực phẩm để xem chi tiết.</p>
            </div>
        `;
        return;
    }

    if (!editMode) {
        detailEl.innerHTML = `
            <div class="food-detail-top">
                <img class="food-detail-image" alt="${escapeHtml(food.name)}" />
                <div>
                    <h2 class="food-detail-title">${escapeHtml(food.name)}</h2>
                    <div class="food-detail-short">${escapeHtml(food.short_desc || '')}</div>
                </div>
            </div>
            <div class="food-detail-text">${escapeHtml(food.detail_desc || '')}</div>
        `;

        const imgEl = detailEl.querySelector('.food-detail-image');
        setImageWithFallback(imgEl, food.image_url, food.name);

        // document.getElementById('btnEditFood').addEventListener('click', () => {
        //     editMode = true;
        //     renderFoodDetail(category);
        // });

        // document.getElementById('btnDeleteFood').addEventListener('click', async () => {
        //     const ok = confirm(`Bạn có chắc muốn xóa "${food.name}"?`);
        //     if (!ok) return;

        //     try {
        //         await deleteFood(food.id);
        //         await loadNutritionDB();
        //         toast('Xóa thành công!', 'success');
        //         const term = document.getElementById('searchInput')?.value || '';
        //         renderFoodList(category, term);
        //         renderFoodDetail(category);
        //     } catch (error) {
        //         toast(error.message || 'Không xóa được món ăn.', 'error');
        //     }
        // });

        return;
    }

    detailEl.innerHTML = `
        <form class="nf-form" id="editFoodForm">
            <div class="form-group">
                <label for="editFoodName">Tên món:</label>
                <input type="text" id="editFoodName" value="${escapeHtml(food.name)}" required />
            </div>
            <div class="form-group">
                <label for="editFoodImageUrl">Hình ảnh (URL):</label>
                <input type="text" id="editFoodImageUrl" value="${escapeHtml(food.image_url || '')}" placeholder="(tùy chọn)" />
            </div>
            <div class="form-group">
                <label for="editFoodShortDesc">Mô tả ngắn:</label>
                <input type="text" id="editFoodShortDesc" value="${escapeHtml(food.short_desc || '')}" required />
            </div>
            <div class="form-group">
                <label for="editFoodDetailDesc">Giải thích chi tiết:</label>
                <textarea id="editFoodDetailDesc" required>${escapeHtml(food.detail_desc || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-cancel-edit" id="btnCancelEdit">❌ Hủy</button>
                <button type="submit" class="btn-save">💾 Lưu</button>
            </div>
        </form>
    `;

    document.getElementById('btnCancelEdit').addEventListener('click', () => {
        editMode = false;
        renderFoodDetail(category);
    });

    document.getElementById('editFoodForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = normalizeText(document.getElementById('editFoodName').value);
        const image_url = normalizeText(document.getElementById('editFoodImageUrl').value);
        const short_desc = normalizeText(document.getElementById('editFoodShortDesc').value);
        const detail_desc = normalizeText(document.getElementById('editFoodDetailDesc').value);

        if (!name || !short_desc || !detail_desc) {
            toast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        try {
            await updateFood(food.id, { name, image_url, short_desc, detail_desc }, food);
            await loadNutritionDB();
            editMode = false;
            toast('Cập nhật thành công!', 'success');
            renderFoodList(category, document.getElementById('searchInput')?.value || '');
            renderFoodDetail(category);
        } catch (error) {
            toast(error.message || 'Không cập nhật được món ăn.', 'error');
        }
    });
}

function openAddFoodModal(category) {
    const modal = document.getElementById('addFoodModal');
    if (!modal) return;

    const titleEl = document.getElementById('addFoodModalTitle');
    if (titleEl) {
        const meta = CATEGORY_META[category];
        titleEl.textContent = `✨ Thêm món mới (${meta ? meta.label : category})`;
    }

    document.getElementById('foodForm')?.reset();
    const hiddenCat = document.getElementById('foodCategory');
    if (hiddenCat) hiddenCat.value = category;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddFoodModal() {
    const modal = document.getElementById('addFoodModal');
    if (!modal) return;

    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function initAddFood(category) {
    const openBtn = document.getElementById('openAddFoodBtn');
    const modal = document.getElementById('addFoodModal');
    const closeBtn = document.getElementById('closeFoodModalBtn');
    const cancelBtn = document.getElementById('cancelFoodBtn');
    const form = document.getElementById('foodForm');

    openBtn?.addEventListener('click', () => openAddFoodModal(category));
    closeBtn?.addEventListener('click', closeAddFoodModal);
    cancelBtn?.addEventListener('click', closeAddFoodModal);

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeAddFoodModal();
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = normalizeText(document.getElementById('foodName').value);
        const image_url = normalizeText(document.getElementById('foodImageUrl').value);
        const short_desc = normalizeText(document.getElementById('foodShortDesc').value);
        const detail_desc = normalizeText(document.getElementById('foodDetailDesc').value);
        const cat = normalizeText(document.getElementById('foodCategory').value);

        if (!name || !short_desc || !detail_desc) {
            toast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        try {
            const created = await addFood({
                category: cat || category,
                name,
                image_url,
                short_desc,
                detail_desc
            });

            await loadNutritionDB();
            toast('Thêm món thành công!', 'success');
            closeAddFoodModal();
            selectedFoodId = created.id;
            editMode = false;
            renderFoodList(category, document.getElementById('searchInput')?.value || '');
            renderFoodDetail(category);
        } catch (error) {
            toast(error.message || 'Không thêm được món ăn.', 'error');
        }
    });
}

function initEvents(category) {
    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('input', () => {
        renderFoodList(category, searchInput.value);
        renderFoodDetail(category);
    });

    initAddFood(category);
}

async function init() {
    const category = normalizeText(document.body.dataset.category);
    const meta = CATEGORY_META[category];
    if (!meta) {
        document.body.dataset.category = Object.keys(CATEGORY_META)[0];
    }

    const realCategory = normalizeText(document.body.dataset.category);
    renderPageTitle(realCategory);

    try {
        await migrateLegacyNutritionIfNeeded();
        await loadNutritionDB();
        renderFoodList(realCategory, '');
        renderFoodDetail(realCategory);
        initEvents(realCategory);
    } catch (error) {
        toast(error.message || 'Không tải được dữ liệu dinh dưỡng.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', init);