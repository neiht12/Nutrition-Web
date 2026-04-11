// === CONFIGURATION ===
const AUTH_TOKEN_KEY = 'challengeAuthToken';
const LEGACY_BASE_STORAGE_KEY = 'dailyTasks';
const LEGACY_BASE_CUSTOM_TASKS_KEY = 'customTasks';
const LEGACY_HOST_NOTIFICATIONS_KEY = 'hostNotifications';
const LEGACY_MIGRATION_PREFIX = 'dailyTasksLegacyMigrated';
const DEFAULT_TASKS = {
    apple: { name: 'Ăn quả táo', target: 1, type: 'counter', emoji: '🍎' },
    water: { name: 'Uống đủ 5 cốc nước', target: 5, type: 'counter', emoji: '💧' },
    fried: { name: 'Nói không đồ chiên rán', target: 1, type: 'toggle', emoji: '🚫' }
};

let TASKS_CONFIG = { ...DEFAULT_TASKS };
let currentUser = null;
let authToken = null;
let tasksData = createInitialTasksData();
let customTasks = [];

function legacyScopedStorageKey(baseKey) {
    if (!currentUser) return `${baseKey}_guest`;
    return `${baseKey}_${currentUser.id}`;
}

async function migrateLegacyDailyTasksIfNeeded() {
    if (!currentUser) return;

    const migrationKey = `${LEGACY_MIGRATION_PREFIX}_${currentUser.id}`;
    if (localStorage.getItem(migrationKey) === 'done') return;

    let taskState = null;
    let customTasksToImport = [];
    let notificationsToImport = [];

    try {
        const storedTaskState = localStorage.getItem(legacyScopedStorageKey(LEGACY_BASE_STORAGE_KEY));
        taskState = storedTaskState ? JSON.parse(storedTaskState) : null;
    } catch (_error) {
        taskState = null;
    }

    if (currentUser.role === 'host') {
        try {
            const storedCustomTasks = localStorage.getItem(legacyScopedStorageKey(LEGACY_BASE_CUSTOM_TASKS_KEY));
            customTasksToImport = storedCustomTasks ? JSON.parse(storedCustomTasks) : [];
        } catch (_error) {
            customTasksToImport = [];
        }

        try {
            const storedNotifications = localStorage.getItem(LEGACY_HOST_NOTIFICATIONS_KEY);
            notificationsToImport = storedNotifications ? JSON.parse(storedNotifications) : [];
        } catch (_error) {
            notificationsToImport = [];
        }
    }

    const hasTaskState = taskState && typeof taskState === 'object';
    const hasCustomTasks = Array.isArray(customTasksToImport) && customTasksToImport.length > 0;
    const hasNotifications = Array.isArray(notificationsToImport) && notificationsToImport.length > 0;

    if (!hasTaskState && !hasCustomTasks && !hasNotifications) {
        localStorage.setItem(migrationKey, 'done');
        return;
    }

    await apiRequest('/api/tasks/import-legacy', {
        method: 'POST',
        body: JSON.stringify({
            taskState,
            customTasks: customTasksToImport,
            notifications: notificationsToImport
        })
    });

    localStorage.setItem(migrationKey, 'done');
}

function createInitialTasksData() {
    return {
        date: new Date().toISOString().split('T')[0],
        tasks: { apple: 0, water: 0, fried: 0 },
        streak: 0,
        history: [],
        completedCelebrationShown: false
    };
}

async function apiRequest(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    let response;
    try {
        response = await fetch(path, { ...options, headers });
    } catch (_networkError) {
        throw new Error('Không kết nối được server. Hãy kiểm tra server đã chạy chưa.');
    }

    if (response.status === 401) {
        forceRelogin();
        throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json().catch(() => ({})) : {};

    if (!response.ok) {
        if (data && data.error) {
            throw new Error(data.error);
        }
        if (response.status >= 500) {
            throw new Error(`Server đang gặp lỗi (${response.status}). Vui lòng thử lại sau.`);
        }
        throw new Error(`Yêu cầu không hợp lệ (${response.status}) tại ${path}.`);
    }

    if (!isJson) {
        throw new Error(`Server phản hồi sai định dạng ở ${path}.`);
    }

    return data;
}

document.addEventListener('DOMContentLoaded', () => {
    initializeModalEvents();
    initializeAuthEvents();
    restoreSession();
});

async function restoreSession() {
    authToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!authToken) {
        openLoginModal();
        return;
    }

    try {
        const me = await apiRequest('/api/auth/me');
        currentUser = me.user;
        await initializeForCurrentUser();
    } catch (_e) {
        forceRelogin();
    }
}

function initializeAuthEvents() {
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchAccountBtn = document.getElementById('switchAccountBtn');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleRegister();
    });

    switchAccountBtn.addEventListener('click', async () => {
        if (authToken) {
            try {
                await apiRequest('/api/auth/logout', { method: 'POST' });
            } catch (_e) {
                // Ignore logout error.
            }
        }
        forceRelogin();
    });

    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) closeLoginModal();
    });

    markAllReadBtn.addEventListener('click', async () => {
        if (!currentUser || currentUser.role !== 'host') return;
        await apiRequest('/api/host/notifications/read-all', { method: 'POST' });
        await renderHostNotifications();
    });

    showLoginBtn.addEventListener('click', () => {
        switchAuthView('login');
    });
    showRegisterBtn.addEventListener('click', () => {
        switchAuthView('register');
    });
}

async function handleLogin() {
    setAuthMessage('loginErrorMessage', '');
    setAuthMessage('loginSuccessMessage', '');
    setAuthMessage('registerErrorMessage', '');
    setAuthMessage('registerSuccessMessage', '');

    const loginUserId = document.getElementById('loginUserId').value.trim();
    const loginPassword = document.getElementById('loginPassword').value;

    try {
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ userId: loginUserId, password: loginPassword })
        });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem(AUTH_TOKEN_KEY, authToken);
        closeLoginModal();
        await initializeForCurrentUser();
    } catch (error) {
        setAuthMessage('loginErrorMessage', error.message || 'Đăng nhập thất bại');
    }
}

async function handleRegister() {
    setAuthMessage('loginErrorMessage', '');
    setAuthMessage('loginSuccessMessage', '');
    setAuthMessage('registerErrorMessage', '');
    setAuthMessage('registerSuccessMessage', '');

    const registerDisplayName = document.getElementById('registerDisplayName').value.trim();
    const registerUserId = document.getElementById('registerUserId').value.trim();
    const registerPassword = document.getElementById('registerPassword').value;
    if (!registerDisplayName || !registerUserId || !registerPassword) {
        setAuthMessage('registerErrorMessage', 'Vui lòng nhập đầy đủ thông tin đăng ký.');
        return;
    }

    try {
        await apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                userId: registerUserId,
                password: registerPassword,
                displayName: registerDisplayName
            })
        });
        document.getElementById('loginUserId').value = registerUserId;
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerForm').reset();
        switchAuthView('login');
        setAuthMessage('loginErrorMessage', '');
        setAuthMessage('loginSuccessMessage', 'Đăng ký thành công. Vui lòng đăng nhập để vào hệ thống.');
        setAuthMessage('registerErrorMessage', '');
        setAuthMessage('registerSuccessMessage', '');
    } catch (error) {
        setAuthMessage('registerErrorMessage', error.message || 'Đăng ký thất bại');
    }
}

function forceRelogin() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    updateUserSessionUI();
    openLoginModal();
}

async function initializeForCurrentUser() {
    await migrateLegacyDailyTasksIfNeeded();
    await loadCustomTasks();
    mergeAllTasks();
    await loadData();
    ensureTaskDataShape();
    await checkAndResetDaily();
    initializeEventListeners();
    updateUserSessionUI();
    render();
    await renderHostNotifications();
}

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    switchAuthView('login');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
    if (!currentUser) return;
    const modal = document.getElementById('loginModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
    clearAuthMessages();
}

function switchAuthView(mode) {
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginActive = mode === 'login';

    showLoginBtn.classList.toggle('active', loginActive);
    showRegisterBtn.classList.toggle('active', !loginActive);
    loginForm.classList.toggle('active', loginActive);
    registerForm.classList.toggle('active', !loginActive);

    if (loginActive) {
        setAuthMessage('registerErrorMessage', '');
        setAuthMessage('registerSuccessMessage', '');
    } else {
        setAuthMessage('loginErrorMessage', '');
        setAuthMessage('loginSuccessMessage', '');
    }
}

function setAuthMessage(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!message) {
        el.textContent = '';
        el.style.display = 'none';
        return;
    }
    el.textContent = message;
    el.style.display = 'block';
}

function clearAuthMessages() {
    setAuthMessage('loginErrorMessage', '');
    setAuthMessage('loginSuccessMessage', '');
    setAuthMessage('registerErrorMessage', '');
    setAuthMessage('registerSuccessMessage', '');
}

function updateUserSessionUI() {
    const currentUserLabel = document.getElementById('currentUserLabel');
    const hostNotificationPanel = document.getElementById('hostNotificationPanel');
    if (!currentUser) {
        currentUserLabel.textContent = 'Chưa đăng nhập';
        hostNotificationPanel.style.display = 'none';
        return;
    }
    currentUserLabel.textContent = `Đang đăng nhập: ${currentUser.displayName} (${currentUser.id}) - ${currentUser.role}`;
    hostNotificationPanel.style.display = currentUser.role === 'host' ? 'block' : 'none';
    const addTaskBtn = document.getElementById('openModalBtn');
    addTaskBtn.style.display = currentUser.role === 'host' ? 'inline-flex' : 'none';
}

async function renderHostNotifications() {
    const list = document.getElementById('hostNotificationList');
    if (!list) return;
    if (!currentUser || currentUser.role !== 'host') {
        list.innerHTML = '';
        return;
    }

    const { notifications } = await apiRequest('/api/host/notifications');
    if (!notifications.length) {
        list.innerHTML = '<div class="host-notification-item">Chưa có thông báo nào.</div>';
        return;
    }

    list.innerHTML = notifications
        .slice(0, 20)
        .map(n => {
            const time = new Date(n.timestamp).toLocaleString('vi-VN');
            const unreadClass = n.isRead ? '' : 'unread';
            return `<div class="host-notification-item ${unreadClass}">✅ ${n.userName} (${n.userId}) vừa hoàn thành: <b>${n.taskName}</b><br><small>${time}</small></div>`;
        })
        .join('');
}

async function notifyHostTaskCompleted(taskType) {
    if (!currentUser || currentUser.role === 'host') return;
    await apiRequest('/api/host/notify-complete', {
        method: 'POST',
        body: JSON.stringify({
            taskType,
            taskName: TASKS_CONFIG[taskType]?.name || taskType
        })
    });
}

async function loadCustomTasks() {
    const { customTasks: rows } = await apiRequest('/api/tasks/custom');
    customTasks = rows || [];
}

function mergeAllTasks() {
    TASKS_CONFIG = { ...DEFAULT_TASKS };
    customTasks.forEach(task => {
        TASKS_CONFIG[task.id] = {
            name: task.name,
            target: task.target,
            type: task.type,
            emoji: task.emoji,
            custom: true
        };
    });
}

async function addCustomTask(name, emoji, type, target) {
    if (!currentUser || currentUser.role !== 'host') {
        throw new Error('Chỉ host mới được thêm thử thách');
    }
    const id = 'task_' + Date.now();
    await apiRequest('/api/tasks/custom', {
        method: 'POST',
        body: JSON.stringify({ id, name, emoji, type, target: parseInt(target, 10) })
    });
    customTasks.push({ id, name, emoji, type, target: parseInt(target, 10) });
    mergeAllTasks();
    tasksData.tasks[id] = 0;
    await saveData();
}

async function deleteCustomTask(taskId) {
    if (!currentUser || currentUser.role !== 'host') {
        throw new Error('Chỉ host mới được xóa thử thách');
    }
    await apiRequest(`/api/tasks/custom/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
    customTasks = customTasks.filter(t => t.id !== taskId);
    mergeAllTasks();
    delete tasksData.tasks[taskId];
    await saveData();
}

function initializeModalEvents() {
    const modal = document.getElementById('addTaskModal');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('addTaskForm');

    openBtn.addEventListener('click', () => openModal());
    closeBtn.addEventListener('click', () => closeModal());
    cancelBtn.addEventListener('click', () => closeModal());
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddTask();
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function openModal() {
    if (!currentUser || currentUser.role !== 'host') return;
    const modal = document.getElementById('addTaskModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('addTaskModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    document.getElementById('addTaskForm').reset();
}

async function handleAddTask() {
    if (!currentUser || currentUser.role !== 'host') {
        alert('Chỉ tài khoản host mới được thêm thử thách.');
        return;
    }
    const name = document.getElementById('taskName').value.trim();
    const emoji = document.getElementById('taskEmoji').value.trim();
    const type = document.getElementById('taskType').value;
    const target = document.getElementById('taskTarget').value;

    if (!name || !emoji || !type || !target) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    await addCustomTask(name, emoji, type, target);
    render();
    closeModal();
    showNotification(`✨ Tạo thành công nhiệm vụ: ${emoji} ${name}`);
}

async function loadData() {
    const { taskState } = await apiRequest('/api/tasks/state');
    tasksData = taskState || createInitialTasksData();
}

async function saveData() {
    await apiRequest('/api/tasks/state', {
        method: 'PUT',
        body: JSON.stringify(tasksData)
    });
}

function ensureTaskDataShape() {
    Object.keys(TASKS_CONFIG).forEach(taskType => {
        if (typeof tasksData.tasks[taskType] !== 'number') {
            tasksData.tasks[taskType] = 0;
        }
    });
}

async function checkAndResetDaily() {
    const today = new Date().toISOString().split('T')[0];
    if (tasksData.date === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const wasCompletedYesterday = tasksData.date === yesterdayStr && isAllTasksCompleted();

    tasksData.date = today;
    tasksData.completedCelebrationShown = false;
    Object.keys(TASKS_CONFIG).forEach(taskType => {
        tasksData.tasks[taskType] = 0;
    });

    if (wasCompletedYesterday) {
        tasksData.history.push(yesterdayStr);
        tasksData.streak++;
    } else {
        tasksData.streak = 0;
        tasksData.history = [];
    }
    await saveData();
}

function initializeEventListeners() {
    bindTaskCardEvents();
}

function bindTaskCardEvents() {
    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach(card => {
        const taskType = card.getAttribute('data-task');
        if (TASKS_CONFIG[taskType].type === 'counter') {
            const decreaseBtn = card.querySelector('.btn-decrease');
            const increaseBtn = card.querySelector('.btn-increase');
            const oldDecrease = decreaseBtn.cloneNode(true);
            const oldIncrease = increaseBtn.cloneNode(true);
            decreaseBtn.parentNode.replaceChild(oldDecrease, decreaseBtn);
            increaseBtn.parentNode.replaceChild(oldIncrease, increaseBtn);
            card.querySelector('.btn-decrease').addEventListener('click', () => void decreaseTask(taskType));
            card.querySelector('.btn-increase').addEventListener('click', () => void increaseTask(taskType));
        } else if (TASKS_CONFIG[taskType].type === 'toggle') {
            const toggleBtn = card.querySelector('.btn-toggle');
            const oldToggle = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(oldToggle, toggleBtn);
            card.querySelector('.btn-toggle').addEventListener('click', () => void toggleTask(taskType));
        }

        const deleteBtn = card.querySelector('.btn-delete');
        if (deleteBtn) {
            const oldDelete = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(oldDelete, deleteBtn);
            card.querySelector('.btn-delete').addEventListener('click', () => {
                if (confirm(`Bạn có chắc muốn xóa "${TASKS_CONFIG[taskType].name}"?`)) {
                    void deleteCustomTask(taskType).then(() => render());
                }
            });
        }
    });
}

async function increaseTask(taskType) {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    const target = TASKS_CONFIG[taskType].target;
    const wasCompleted = isTaskCompleted(taskType);
    if (tasksData.tasks[taskType] < target) {
        tasksData.tasks[taskType]++;
        playSound('increase');
        triggerAnimation(taskType, 'increase');
    }
    const isNowCompleted = isTaskCompleted(taskType);
    if (!wasCompleted && isNowCompleted) {
        await notifyHostTaskCompleted(taskType);
    }
    await saveData();
    render();
}

async function decreaseTask(taskType) {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    if (tasksData.tasks[taskType] > 0) {
        tasksData.tasks[taskType]--;
    }
    await saveData();
    render();
}

async function toggleTask(taskType) {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    const wasCompleted = isTaskCompleted(taskType);
    tasksData.tasks[taskType] = tasksData.tasks[taskType] === 0 ? 1 : 0;
    const isNowCompleted = isTaskCompleted(taskType);
    if (!wasCompleted && isNowCompleted) {
        await notifyHostTaskCompleted(taskType);
    }
    await saveData();
    render();
}

function isTaskCompleted(taskType) {
    return tasksData.tasks[taskType] >= TASKS_CONFIG[taskType].target;
}

function isAllTasksCompleted() {
    return Object.keys(TASKS_CONFIG).every(taskType => isTaskCompleted(taskType));
}

function render() {
    renderTasksGrid();
    updateStats();
    updateStreak();
    void checkCompletionCelebration();
    void renderHostNotifications();
}

function renderTasksGrid() {
    const tasksGrid = document.querySelector('.tasks-grid');
    if (!tasksGrid) return;
    tasksGrid.innerHTML = '';

    Object.keys(TASKS_CONFIG).forEach(taskType => {
        const task = TASKS_CONFIG[taskType];
        const current = tasksData.tasks[taskType] || 0;
        const target = task.target;
        const isCompleted = current >= target;
        const card = document.createElement('div');
        card.className = `task-card ${isCompleted ? 'completed' : ''}`;
        card.setAttribute('data-task', taskType);
        const canManageTasks = currentUser && currentUser.role === 'host';
        const deleteBtn = task.custom && canManageTasks ? '<button class="btn-delete" title="Xóa">🗑️</button>' : '';

        let actionButtons = '';
        if (task.type === 'counter') {
            actionButtons = `
                <div class="task-actions">
                    <button class="btn-decrease" aria-label="Giảm">−</button>
                    <button class="btn-increase" aria-label="Tăng">+</button>
                </div>
            `;
        } else if (task.type === 'toggle') {
            const activeClass = current === 1 ? 'active' : '';
            actionButtons = `
                <div class="task-actions">
                    <button class="btn-toggle ${activeClass}" aria-label="Đạt được">✓ Đạt được</button>
                </div>
            `;
        }

        const progressText = task.type === 'counter' ? `${current} / ${target}` : (current === 1 ? '✓ Đạt được' : 'Không vi phạm');
        const progressPercent = Math.min(100, (current / target) * 100);

        card.innerHTML = `
            <div class="task-header">
                <span class="task-emoji">${task.emoji}</span>
                <span class="task-name">${task.name}</span>
                ${deleteBtn}
            </div>
            <div class="task-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span class="progress-text">${progressText}</span>
            </div>
            ${actionButtons}
            <div class="task-status">${isCompleted ? '✓ Hoàn thành' : 'Chưa hoàn thành'}</div>
        `;

        tasksGrid.appendChild(card);
    });

    bindTaskCardEvents();
}

function updateStats() {
    const statValueEl = document.querySelector('.stat-value');
    if (!statValueEl) return;

    const completedTasks = Object.keys(TASKS_CONFIG).filter(t => isTaskCompleted(t)).length;
    const totalTasks = Object.keys(TASKS_CONFIG).length;
    statValueEl.textContent = `${completedTasks} / ${totalTasks}`;
}

function updateStreak() {
    const streakCountEl = document.querySelector('.streak-count');
    if (!streakCountEl) return;

    streakCountEl.textContent = tasksData.streak;
}

async function checkCompletionCelebration() {
    if (!tasksData.completedCelebrationShown && isAllTasksCompleted()) {
        tasksData.completedCelebrationShown = true;
        await saveData();
        triggerCelebration();
    }
}

function triggerAnimation(taskType, type) {
    const card = document.querySelector(`[data-task="${taskType}"]`);
    if (!card || type !== 'increase') return;
    card.style.animation = 'none';
    setTimeout(() => {
        card.style.animation = 'popEffect 0.5s ease-out';
    }, 10);
}

function triggerCelebration() {
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.top = '-10px';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa502', '#ff6348'][Math.floor(Math.random() * 5)];
        confetti.style.borderRadius = '50%';
        confetti.style.zIndex = '999';
        confetti.style.opacity = '1';
        document.body.appendChild(confetti);

        const startLeft = parseFloat(confetti.style.left);
        const randomX = (Math.random() - 0.5) * 200;
        let top = -10;
        const interval = setInterval(() => {
            top += Math.random() * 5 + 3;
            confetti.style.top = top + 'px';
            confetti.style.left = (startLeft + randomX * (top / window.innerHeight)) + 'px';
            confetti.style.opacity = Math.max(0, 1 - (top / window.innerHeight));
            if (top > window.innerHeight) {
                clearInterval(interval);
                confetti.remove();
            }
        }, 30);
    }
    playSound('celebration');
    showNotification('🎉 Tuyệt vời! Bạn đã hoàn thành tất cả nhiệm vụ hôm nay!');
}

function playSound(type) {
    console.log('🔊 Sound:', type);
}

function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Thử Thách Hàng Ngày', { body: message, icon: '🎯' });
    } else {
        console.log('📢 Notification:', message);
    }
}

window.addEventListener('load', () => {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
