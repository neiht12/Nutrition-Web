// JavaScript cho chức năng thêm/sửa card
function createNewCard() {
    const list = document.getElementById('card-list');
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => showDetail(card);
    card.innerHTML = `
        <img src="https://via.placeholder.com/100" alt="Tên món ăn">
        <div class="name">Tên món ăn</div>
        <div class="info"></div>
        <span class="edit-icon" onclick="event.stopPropagation(); editCard(this.parentElement)">✏️</span>
    `;
    list.appendChild(card);
    updateCardSelect();
    return card;
}

function updateCardSelect() {
    const select = document.getElementById('card-select');
    if (!select) return;

    const cards = document.querySelectorAll('#card-list .card');
    select.innerHTML = '<option value="">-- Chọn card để sửa --</option>';

    cards.forEach((card, index) => {
        const nameDiv = card.querySelector('.name');
        const option = document.createElement('option');
        option.value = index;
        option.textContent = nameDiv.textContent;
        select.appendChild(option);
    });
}

function selectCardToEdit() {
    const select = document.getElementById('card-select');
    const form = document.getElementById('edit-form');
    const nameInput = document.getElementById('edit-name');
    const fileInput = document.getElementById('edit-image');
    const infoInput = document.getElementById('edit-info');
    const buttons = document.querySelectorAll('#edit-form button');
    const saveButton = buttons[buttons.length - 2]; // Nút Lưu là nút thứ hai từ cuối

    if (select.value === '') {
        // Nếu không chọn gì, vô hiệu hóa form
        nameInput.disabled = true;
        fileInput.disabled = true;
        infoInput.disabled = true;
        saveButton.disabled = true;
        return;
    }

    // Nếu đã có card trong form.dataset, không cần lặp lại
    if (form.dataset.card) {
        const currentCardIndex = Array.from(document.querySelectorAll('#card-list .card')).indexOf(form.dataset.card);
        if (currentCardIndex === parseInt(select.value)) {
            // Đã là card hiện tại, chỉ bật các input
            nameInput.disabled = false;
            fileInput.disabled = false;
            infoInput.disabled = false;
            saveButton.disabled = false;
            return;
        }
    }

    const cards = document.querySelectorAll('#card-list .card');
    const card = cards[select.value];

    if (!card) return;

    editCard(card);
}

function showDetail(card) {
    const modal = document.getElementById('detail-modal');
    const detailCard = modal.querySelector('.detail-card');
    const img = card.querySelector('img');
    const nameDiv = card.querySelector('.name');
    const infoDiv = card.querySelector('.info') || { textContent: 'Thông tin dinh dưỡng chưa có.' };

    detailCard.innerHTML = `
        <span class="detail-close" onclick="closeDetail()">×</span>
        <img src="${img.src}" alt="${nameDiv.textContent}">
        <div class="name">${nameDiv.textContent}</div>
        <div class="info">${infoDiv.textContent}</div>
        <button onclick="closeDetail()" style="margin-top: 20px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Đóng</button>
    `;
    modal.style.display = 'flex';

    // Đóng khi click ngoài modal
    modal.onclick = function (event) {
        if (event.target === modal) {
            closeDetail();
        }
    };
}

function closeDetail() {
    document.getElementById('detail-modal').style.display = 'none';
}

function editCard(card) {
    const form = document.getElementById('edit-form');
    const select = document.getElementById('card-select');
    const nameInput = document.getElementById('edit-name');
    const fileInput = document.getElementById('edit-image');
    const infoInput = document.getElementById('edit-info');
    const buttons = document.querySelectorAll('#edit-form button');
    const saveButton = buttons[buttons.length - 2]; // Nút Lưu

    // Tìm index của card trong danh sách
    const allCards = Array.from(document.querySelectorAll('#card-list .card'));
    let cardIndex = allCards.indexOf(card);

    if (cardIndex === -1) {
        console.error('Không tìm thấy card!');
        return;
    }

    // Lấy thông tin từ card
    const nameDiv = card.querySelector('.name');
    const infoDiv = card.querySelector('.info');

    // Cập nhật form data trước
    form.dataset.card = card;
    form.dataset.addingNew = 'false';

    // Cập nhật input values
    nameInput.value = nameDiv.textContent;
    infoInput.value = infoDiv ? infoDiv.textContent : '';
    fileInput.value = '';

    // Bật các input
    nameInput.disabled = false;
    fileInput.disabled = false;
    infoInput.disabled = false;
    saveButton.disabled = false;

    // Cập nhật dropdown (sẽ trigger selectCardToEdit, nhưng form data đã sẵn sàng)
    select.value = cardIndex;

    // Hiển thị form
    form.style.display = 'block';
}

function addNewCardFromForm() {
    const form = document.getElementById('edit-form');
    const nameInput = document.getElementById('edit-name');
    const infoInput = document.getElementById('edit-info');
    const select = document.getElementById('card-select');
    const buttons = document.querySelectorAll('#edit-form button');
    const saveButton = buttons[buttons.length - 2]; // Nút Lưu

    // Tạo card mới
    const newCard = createNewCard();

    // Xóa giá trị cũ từ form
    nameInput.value = '';
    infoInput.value = '';
    document.getElementById('edit-image').value = '';

    // Set reference tới card mới
    form.dataset.card = newCard;
    form.dataset.addingNew = 'true';

    // Bật các input cho card mới
    nameInput.disabled = false;
    document.getElementById('edit-image').disabled = false;
    infoInput.disabled = false;
    saveButton.disabled = false;

    // Tự động chọn card mới trong dropdown
    const allCards = Array.from(document.querySelectorAll('#card-list .card'));
    const newCardIndex = allCards.indexOf(newCard);
    if (newCardIndex !== -1) {
        select.value = newCardIndex;
    }

    // Focus vào input name để người dùng có thể bắt đầu gõ ngay
    nameInput.focus();
}


function saveEdit() {
    const form = document.getElementById('edit-form');
    const card = form.dataset.card;
    const nameInput = document.getElementById('edit-name');
    const fileInput = document.getElementById('edit-image');
    const infoInput = document.getElementById('edit-info');
    const select = document.getElementById('card-select');

    // 验证输入
    if (!nameInput.value.trim()) {
        alert('Vui lòng nhập tên món ăn!');
        return;
    }

    // 检查是否有选中的卡片
    if (!card) {
        alert('Vui lòng chọn hoặc tạo card trước!');
        return;
    }

    // 获取卡片元素
    const img = card.querySelector('img');
    const nameDiv = card.querySelector('.name');
    let infoDiv = card.querySelector('.info');

    // 如果没有info元素，创建它
    if (!infoDiv) {
        infoDiv = document.createElement('div');
        infoDiv.className = 'info';
        card.appendChild(infoDiv);
    }

    // 更新card的内容
    nameDiv.textContent = nameInput.value.trim();
    infoDiv.textContent = infoInput.value.trim();

    // 处理文件上传
    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            img.src = e.target.result;
        };
        reader.readAsDataURL(fileInput.files[0]);
    }

    // 更新dropdown列表（反映新的名称）
    updateCardSelect();

    // 重置表单状态
    select.value = '';
    nameInput.disabled = true;
    fileInput.disabled = true;
    infoInput.disabled = true;
    const buttons = document.querySelectorAll('#edit-form button');
    const saveButton = buttons[buttons.length - 2];
    saveButton.disabled = true;

    form.style.display = 'none';
    form.dataset.card = null;

    alert('Lưu thành công!');
}

function cancelEdit() {
    const form = document.getElementById('edit-form');
    const select = document.getElementById('card-select');
    const nameInput = document.getElementById('edit-name');
    const fileInput = document.getElementById('edit-image');
    const infoInput = document.getElementById('edit-info');
    const buttons = document.querySelectorAll('#edit-form button');
    const saveButton = buttons[buttons.length - 2];

    // Xóa dữ liệu form
    nameInput.value = '';
    infoInput.value = '';
    fileInput.value = '';

    // Vô hiệu hóa các input
    nameInput.disabled = true;
    fileInput.disabled = true;
    infoInput.disabled = true;
    saveButton.disabled = true;

    // Đặt lại dropdown
    select.value = '';

    // Ẩn form
    form.style.display = 'none';
    form.dataset.card = null;
}