// Nutrition Food Board logic: CRUD bằng localStorage (không dùng API)

const NFDB_KEY = 'nutritiondb_foods_v1';

const CATEGORY_META = {
    'trai-cay': { label: 'Trái cây', emoji: '🍎' },
    'dam': { label: 'Đạm', emoji: '🥚' },
    'tinh-bot': { label: 'Tinh bột', emoji: '🍚' },
    'rau-cu': { label: 'Rau củ', emoji: '🥕' },
    'sua': { label: 'Sữa', emoji: '🥛' }
};

// Seed: 2 món mẫu mỗi nhóm (bạn có thể sửa/xóa/ thêm sau trong giao diện).
const SEED_FOODS_RAW = [
    {
        category: 'trai-cay',
        name: 'Chuối',
        image_url: 'https://picsum.photos/seed/nutrition-banana/600/420',
        short_desc: 'Giàu kali và chất xơ, hỗ trợ năng lượng và tiêu hóa.',
        detail_desc: 'Chuối cung cấp kali giúp cơ thể hoạt động ổn định, đồng thời có chất xơ hỗ trợ hệ tiêu hóa. Có thể ăn như bữa phụ hoặc kèm với sữa chua.'
    },
    {
        category: 'trai-cay',
        name: 'Táo',
        image_url: 'https://picsum.photos/seed/nutrition-apple/600/420',
        short_desc: 'Chứa chất chống oxy hóa và chất xơ tốt cho sức khỏe.',
        detail_desc: 'Táo có chất chống oxy hóa và chất xơ giúp hỗ trợ tim mạch và hệ tiêu hóa. Nên ăn cả vỏ khi phù hợp.'
    },

    {
        category: 'dam',
        name: 'Trứng',
        image_url: 'https://picsum.photos/seed/nutrition-egg/600/420',
        short_desc: 'Nguồn đạm chất lượng cao, hỗ trợ xây dựng cơ bắp.',
        detail_desc: 'Trứng cung cấp protein (đạm) và nhiều vi chất. Có thể chế biến luộc, hấp, hoặc chiên ít dầu.'
    },
    {
        category: 'dam',
        name: 'Cá hồi',
        image_url: 'https://picsum.photos/seed/nutrition-salmon/600/420',
        short_desc: 'Giàu omega-3 tốt cho tim mạch và phát triển não.',
        detail_desc: 'Cá hồi cung cấp omega-3 cùng protein. Nên ưu tiên cách chế biến ít dầu như nướng/hấp.'
    },

    {
        category: 'tinh-bot',
        name: 'Gạo lứt',
        image_url: 'https://picsum.photos/seed/nutrition-brown-rice/600/420',
        short_desc: 'Carb phức tạp, cho năng lượng bền và hỗ trợ tiêu hóa.',
        detail_desc: 'Gạo lứt chứa tinh bột và chất xơ giúp năng lượng giải phóng chậm hơn, phù hợp cho học tập và vận động.'
    },
    {
        category: 'tinh-bot',
        name: 'Khoai lang',
        image_url: 'https://picsum.photos/seed/nutrition-sweet-potato/600/420',
        short_desc: 'Nhiều chất xơ và tinh bột dễ tiêu, tốt cho hệ tiêu hóa.',
        detail_desc: 'Khoai lang cung cấp vitamin và chất xơ, có thể ăn nướng/hấp để hạn chế dầu mỡ.'
    },

    {
        category: 'rau-cu',
        name: 'Cà rốt',
        image_url: 'https://picsum.photos/seed/nutrition-carrot/600/420',
        short_desc: 'Giàu beta-carotene, tốt cho mắt và miễn dịch.',
        detail_desc: 'Cà rốt cung cấp beta-carotene (tiền vitamin A), hỗ trợ sức khỏe mắt. Có thể ăn sống hoặc chế biến nhẹ.'
    },
    {
        category: 'rau-cu',
        name: 'Bông cải xanh',
        image_url: 'https://picsum.photos/seed/nutrition-broccoli/600/420',
        short_desc: 'Nhiều vitamin và chất chống oxy hóa, hỗ trợ cơ thể khỏe mạnh.',
        detail_desc: 'Bông cải xanh giàu vitamin C và chất xơ. Nên luộc/hấp trong thời gian vừa để giữ dinh dưỡng.'
    },

    {
        category: 'sua',
        name: 'Sữa chua',
        image_url: 'https://picsum.photos/seed/nutrition-yogurt/600/420',
        short_desc: 'Hỗ trợ tiêu hóa nhờ lợi khuẩn (tùy loại).',
        detail_desc: 'Sữa chua là lựa chọn tốt cho đường ruột (tùy sản phẩm có lợi khuẩn hay không). Có thể ăn kèm trái cây.'
    },
    {
        category: 'sua',
        name: 'Sữa tươi',
        image_url: 'https://picsum.photos/seed/nutrition-milk/600/420',
        short_desc: 'Nguồn canxi và protein, hỗ trợ xương và tăng trưởng.',
        detail_desc: 'Sữa tươi cung cấp canxi và protein. Nên chọn loại phù hợp và uống với lượng vừa phải.'
    }
];

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
    return str.replace(/[&<>"']/g, (m) => map[m]);
}

function normalizeText(v) {
    return String(v ?? '').trim();
}

function loadNutritionDB() {
    const stored = localStorage.getItem(NFDB_KEY);
    if (stored) {
        try {
            foodsDb = JSON.parse(stored);
            return;
        } catch (e) {
            // Ignore corrupted storage and re-seed.
        }
    }

    foodsDb = SEED_FOODS_RAW.map((f) => ({
        id: generateFoodId(),
        category: f.category,
        name: f.name,
        image_url: f.image_url,
        short_desc: f.short_desc,
        detail_desc: f.detail_desc,
        createdAt: currentDate(),
        modifiedAt: currentDate()
    }));

    saveNutritionDB();
}

function saveNutritionDB() {
    localStorage.setItem(NFDB_KEY, JSON.stringify(foodsDb));
}

function addFood(food) {
    const record = {
        id: generateFoodId(),
        category: food.category,
        name: food.name,
        image_url: food.image_url || '',
        short_desc: food.short_desc || '',
        detail_desc: food.detail_desc || '',
        createdAt: currentDate(),
        modifiedAt: currentDate()
    };

    foodsDb.unshift(record);
    saveNutritionDB();
    return record;
}

function updateFood(id, update) {
    const idx = foodsDb.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    foodsDb[idx] = {
        ...foodsDb[idx],
        ...update,
        modifiedAt: currentDate()
    };

    saveNutritionDB();
    return foodsDb[idx];
}

function deleteFood(id) {
    foodsDb = foodsDb.filter((f) => f.id !== id);
    saveNutritionDB();
}

function getFoodsByCategory(category) {
    return foodsDb.filter((f) => f.category === category);
}

function matchesSearch(food, term) {
    const t = term.toLowerCase();
    const haystack = `${food.name} ${food.short_desc} ${food.detail_desc}`.toLowerCase();
    return haystack.includes(t);
}

function setImageWithFallback(imgEl, src, fallbackText) {
    const placeholderBase = 'https://placehold.co/220x160?text=';
    const listPlaceholderBase = 'https://placehold.co/120x120?text=';

    // Decide placeholder size by class
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
        ? foodsInCategory.filter((f) => matchesSearch(f, searchTerm))
        : foodsInCategory;

    if (!filteredFoods.length) {
        if (emptyEl) emptyEl.style.display = 'block';
        // Khi lọc ra 0 kết quả thì reset chọn để detail không hiển thị sai món.
        selectedFoodId = null;
        editMode = false;
        renderFoodDetail(category);
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    // Ensure selection is valid under current filter
    if (!selectedFoodId || !filteredFoods.some((f) => f.id === selectedFoodId)) {
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

    const food = foodsDb.find((f) => f.id === selectedFoodId && f.category === category) || null;

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
            <div class="food-detail-actions">
                <button class="btn-edit" id="btnEditFood">✏️ Chỉnh sửa</button>
                <button class="btn-delete" id="btnDeleteFood">🗑️ Xóa</button>
            </div>
            <div style="margin-top: 12px; font-size: 0.85rem; color: #999;">
                <span>⏱️ Sửa lần cuối: ${escapeHtml(food.modifiedAt)}</span>
            </div>
        `;

        const imgEl = detailEl.querySelector('.food-detail-image');
        setImageWithFallback(imgEl, food.image_url, food.name);

        const editBtn = document.getElementById('btnEditFood');
        const deleteBtn = document.getElementById('btnDeleteFood');

        editBtn.addEventListener('click', () => {
            editMode = true;
            renderFoodDetail(category);
        });

        deleteBtn.addEventListener('click', () => {
            const ok = confirm(`Bạn có chắc muốn xóa "${food.name}"?`);
            if (!ok) return;

            deleteFood(food.id);
            toast('✓ Xóa thành công!', 'success');

            // Re-render with current filter/search input
            const searchInput = document.getElementById('searchInput');
            const term = searchInput ? searchInput.value : '';
            renderFoodList(category, term);
            renderFoodDetail(category);
        });

        return;
    }

    // Edit mode
    detailEl.innerHTML = `
        <form class="nf-form" id="editFoodForm">
            <div class="form-group">
                <label for="editFoodName">Tên món:</label>
                <input type="text" id="editFoodName" value="${escapeHtml(food.name)}" required />
            </div>
            <div class="form-group">
                <label for="editFoodImageUrl">Hình ảnh (URL):</label>
                <input type="text" id="editFoodImageUrl" value="${escapeHtml(food.image_url || '')}" placeholder="(tuỳ chọn)" />
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

    const form = document.getElementById('editFoodForm');
    const cancelBtn = document.getElementById('btnCancelEdit');

    cancelBtn.addEventListener('click', () => {
        editMode = false;
        renderFoodDetail(category);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = normalizeText(document.getElementById('editFoodName').value);
        const image_url = normalizeText(document.getElementById('editFoodImageUrl').value);
        const short_desc = normalizeText(document.getElementById('editFoodShortDesc').value);
        const detail_desc = normalizeText(document.getElementById('editFoodDetailDesc').value);

        if (!name || !short_desc || !detail_desc) {
            toast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }

        updateFood(food.id, { name, image_url, short_desc, detail_desc });
        editMode = false;
        toast('✓ Cập nhật thành công!', 'success');
        renderFoodList(category, document.getElementById('searchInput')?.value || '');
        renderFoodDetail(category);
    });
}

function openAddFoodModal(category) {
    const modal = document.getElementById('addFoodModal');
    if (!modal) return;

    const form = document.getElementById('foodForm');
    const titleEl = document.getElementById('addFoodModalTitle');
    if (titleEl) {
        const meta = CATEGORY_META[category];
        titleEl.textContent = `✨ Thêm món mới (${meta ? meta.label : category})`;
    }

    if (form) form.reset();

    // Reset hidden category
    const hiddenCat = document.getElementById('foodCategory');
    if (hiddenCat) hiddenCat.value = category;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddFoodModal() {
    const modal = document.getElementById('addFoodModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = 'hidden';
}

function initAddFood(category) {
    const openBtn = document.getElementById('openAddFoodBtn');
    const modal = document.getElementById('addFoodModal');
    const closeBtn = document.getElementById('closeFoodModalBtn');
    const cancelBtn = document.getElementById('cancelFoodBtn');
    const form = document.getElementById('foodForm');

    if (openBtn) {
        openBtn.addEventListener('click', () => openAddFoodModal(category));
    }

    if (closeBtn) closeBtn.addEventListener('click', closeAddFoodModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAddFoodModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAddFoodModal();
        });
    }

    if (!form) return;

    form.addEventListener('submit', (e) => {
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

        const created = addFood({
            category: cat || category,
            name,
            image_url,
            short_desc,
            detail_desc
        });

        toast('✨ Thêm món thành công!', 'success');
        closeAddFoodModal();

        selectedFoodId = created.id;
        editMode = false;

        const searchInput = document.getElementById('searchInput');
        renderFoodList(category, searchInput ? searchInput.value : '');
        renderFoodDetail(category);
    });
}

function initEvents(category) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderFoodList(category, searchInput.value);
            // Detail sẽ tự render lại theo selectedFoodId trong renderFoodList()
            renderFoodDetail(category);
        });
    }

    initAddFood(category);
}

function init() {
    const category = normalizeText(document.body.dataset.category);
    const meta = CATEGORY_META[category];
    if (!meta) {
        // fallback to first defined category
        const firstCategory = Object.keys(CATEGORY_META)[0];
        document.body.dataset.category = firstCategory;
    }

    const realCategory = normalizeText(document.body.dataset.category);

    renderPageTitle(realCategory);

    loadNutritionDB();

    // Initial filtered/render
    renderFoodList(realCategory, '');
    renderFoodDetail(realCategory);

    initEvents(realCategory);
}

document.addEventListener('DOMContentLoaded', init);

