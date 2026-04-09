// === CONFIGURATION ===
const STORAGE_KEY = 'dailyTasks';
const CUSTOM_TASKS_KEY = 'customTasks';
const DEFAULT_TASKS = {
    apple: {
        name: 'Ăn quả táo',
        target: 1,
        type: 'counter',
        emoji: '🍎'
    },
    water: {
        name: 'Uống đủ 5 cốc nước',
        target: 5,
        type: 'counter',
        emoji: '💧'
    },
    fried: {
        name: 'Nói không đồ chiên rán',
        target: 1,
        type: 'toggle',
        emoji: '🚫'
    }
};

let TASKS_CONFIG = { ...DEFAULT_TASKS };

// === STATE MANAGEMENT ===
let tasksData = {
    date: new Date().toISOString().split('T')[0],
    tasks: {
        apple: 0,
        water: 0,
        fried: 0
    },
    streak: 0,
    history: []
};

let customTasks = [];

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    loadCustomTasks();
    mergeAllTasks();
    loadData();
    initializeModalEvents();
    initializeEventListeners();
    render();
    checkAndResetDaily();
});

// === CUSTOM TASKS MANAGEMENT ===
function loadCustomTasks() {
    const stored = localStorage.getItem(CUSTOM_TASKS_KEY);
    if (stored) {
        customTasks = JSON.parse(stored);
    }
}

function saveCustomTasks() {
    localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(customTasks));
}

function mergeAllTasks() {
    TASKS_CONFIG = { ...DEFAULT_TASKS };

    // Thêm custom tasks
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

function addCustomTask(name, emoji, type, target) {
    const id = 'task_' + Date.now();
    const newTask = {
        id,
        name,
        emoji,
        type,
        target: parseInt(target)
    };

    customTasks.push(newTask);
    saveCustomTasks();
    mergeAllTasks();

    // Thêm task vào dữ liệu hôm nay
    tasksData.tasks[id] = 0;
    saveData();

    return id;
}

function deleteCustomTask(taskId) {
    customTasks = customTasks.filter(t => t.id !== taskId);
    saveCustomTasks();
    mergeAllTasks();
    delete tasksData.tasks[taskId];
    saveData();
}

// === MODAL MANAGEMENT ===
function initializeModalEvents() {
    const modal = document.getElementById('addTaskModal');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('addTaskForm');

    openBtn.addEventListener('click', () => openModal());
    closeBtn.addEventListener('click', () => closeModal());
    cancelBtn.addEventListener('click', () => closeModal());

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddTask();
    });

    // Close modal khi click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

function openModal() {
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

function handleAddTask() {
    const name = document.getElementById('taskName').value.trim();
    const emoji = document.getElementById('taskEmoji').value.trim();
    const type = document.getElementById('taskType').value;
    const target = document.getElementById('taskTarget').value;

    if (!name || !emoji || !type || !target) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    const taskId = addCustomTask(name, emoji, type, target);
    render();
    closeModal();

    showNotification(`✨ Tạo thành công nhiệm vụ: ${emoji} ${name}`);
}

// === DATA PERSISTENCE ===
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        tasksData = JSON.parse(stored);
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksData));
}

function checkAndResetDaily() {
    const today = new Date().toISOString().split('T')[0];

    if (tasksData.date !== today) {
        // Kiểm tra nếu ngày hôm qua đã hoàn thành tất cả nhiệm vụ
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const wasCompletedYesterday = tasksData.date === yesterdayStr && isAllTasksCompleted();

        // Reset cho ngày mới - chỉ reset counter/toggle values, giữ nguyên task definitions
        tasksData.date = today;

        // Reset tất cả tasks về 0
        Object.keys(TASKS_CONFIG).forEach(taskType => {
            tasksData.tasks[taskType] = 0;
        });

        // Cập nhật streak
        if (wasCompletedYesterday) {
            tasksData.history.push(yesterdayStr);
            tasksData.streak++;
        } else {
            tasksData.streak = 0;
            tasksData.history = [];
        }

        saveData();
    }
}

// === EVENT LISTENERS ===
function initializeEventListeners() {
    // Sẽ bound lại sau render
    bindTaskCardEvents();
}

function bindTaskCardEvents() {
    const taskCards = document.querySelectorAll('.task-card');

    taskCards.forEach(card => {
        const taskType = card.getAttribute('data-task');

        if (TASKS_CONFIG[taskType].type === 'counter') {
            const decreaseBtn = card.querySelector('.btn-decrease');
            const increaseBtn = card.querySelector('.btn-increase');

            // Xóa event listeners cũ
            const oldDecrease = decreaseBtn.cloneNode(true);
            const oldIncrease = increaseBtn.cloneNode(true);
            decreaseBtn.parentNode.replaceChild(oldDecrease, decreaseBtn);
            increaseBtn.parentNode.replaceChild(oldIncrease, increaseBtn);

            // Thêm event listeners mới
            card.querySelector('.btn-decrease').addEventListener('click', () => decreaseTask(taskType));
            card.querySelector('.btn-increase').addEventListener('click', () => increaseTask(taskType));
        } else if (TASKS_CONFIG[taskType].type === 'toggle') {
            const toggleBtn = card.querySelector('.btn-toggle');

            // Xóa event listeners cũ
            const oldToggle = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(oldToggle, toggleBtn);

            // Thêm event listeners mới
            card.querySelector('.btn-toggle').addEventListener('click', () => toggleTask(taskType));
        }

        // Nút xóa cho custom tasks
        const deleteBtn = card.querySelector('.btn-delete');
        if (deleteBtn) {
            const oldDelete = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(oldDelete, deleteBtn);
            card.querySelector('.btn-delete').addEventListener('click', () => {
                if (confirm(`Bạn có chắc muốn xóa "${TASKS_CONFIG[taskType].name}"?`)) {
                    deleteCustomTask(taskType);
                    render();
                }
            });
        }
    });
}

// === TASK OPERATIONS ===
function increaseTask(taskType) {
    const target = TASKS_CONFIG[taskType].target;
    if (tasksData.tasks[taskType] < target) {
        tasksData.tasks[taskType]++;
        playSound('increase');
        triggerAnimation(taskType, 'increase');
    }
    saveData();
    render();
}

function decreaseTask(taskType) {
    if (tasksData.tasks[taskType] > 0) {
        tasksData.tasks[taskType]--;
    }
    saveData();
    render();
}

function toggleTask(taskType) {
    tasksData.tasks[taskType] = tasksData.tasks[taskType] === 0 ? 1 : 0;
    saveData();
    render();
}

function isTaskCompleted(taskType) {
    return tasksData.tasks[taskType] >= TASKS_CONFIG[taskType].target;
}

function isAllTasksCompleted() {
    return Object.keys(TASKS_CONFIG).every(taskType => isTaskCompleted(taskType));
}

// === RENDERING ===
function render() {
    renderTasksGrid();
    updateStats();
    updateStreak();
    checkCompletionCelebration();
}

function renderTasksGrid() {
    const tasksGrid = document.querySelector('.tasks-grid');

    // Xóa tất cả task cards hiện tại
    tasksGrid.innerHTML = '';

    // Render tất cả tasks
    Object.keys(TASKS_CONFIG).forEach(taskType => {
        const task = TASKS_CONFIG[taskType];
        const current = tasksData.tasks[taskType] || 0;
        const target = task.target;
        const isCompleted = current >= target;

        const card = document.createElement('div');
        card.className = `task-card ${isCompleted ? 'completed' : ''}`;
        card.setAttribute('data-task', taskType);

        // Render nút xóa cho custom tasks
        const deleteBtn = task.custom ? `<button class="btn-delete" title="Xóa">🗑️</button>` : '';

        // Render action buttons
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

        // Progress text
        let progressText = '';
        if (task.type === 'counter') {
            progressText = `${current} / ${target}`;
        } else {
            progressText = current === 1 ? '✓ Đạt được' : 'Không vi phạm';
        }

        // Progress percentage
        const progressPercent = (current / target) * 100;

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

    // Bind events
    bindTaskCardEvents();
}

function updateTaskCards() {
    // Deprecated - sử dụng renderTasksGrid thay thế
    renderTasksGrid();
}

function updateStats() {
    const completedTasks = Object.keys(TASKS_CONFIG).filter(t => isTaskCompleted(t)).length;
    const totalTasks = Object.keys(TASKS_CONFIG).length;

    const statValue = document.querySelector('.stat-value');
    statValue.textContent = `${completedTasks} / ${totalTasks}`;
}

function updateStreak() {
    const streakCount = document.querySelector('.streak-count');
    streakCount.textContent = tasksData.streak;
}

function checkCompletionCelebration() {
    if (isAllTasksCompleted()) {
        triggerCelebration();
    }
}

// === ANIMATIONS & EFFECTS ===
function triggerAnimation(taskType, type) {
    const card = document.querySelector(`[data-task="${taskType}"]`);
    if (type === 'increase') {
        card.style.animation = 'none';
        setTimeout(() => {
            card.style.animation = 'popEffect 0.5s ease-out';
        }, 10);
    }
}

function triggerCelebration() {
    // Tạo confetti effect
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
    // Có thể thêm âm thanh thực tế sau
    console.log('🔊 Sound:', type);
}

function showNotification(message) {
    // Kiểm tra xem có hỗ trợ Notification API không
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Thử Thách Hàng Ngày', {
            body: message,
            icon: '🎯'
        });
    } else {
        // Fallback: hiển thị alert
        console.log('📢 Notification:', message);
    }
}

// Request notification permission khi page load
window.addEventListener('load', () => {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
