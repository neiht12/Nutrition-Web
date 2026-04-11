document.addEventListener('DOMContentLoaded', async () => {
    // Gọi API để lấy danh sách (Đảm bảo đã thêm API vào server.js ở bước trước)
    await loadHallOfFame();
});

function escapeHtml(text) {
    const str = String(text ?? '');
    return str.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
}

async function loadHallOfFame() {
    const listEl = document.getElementById('fameList');
    const podiumEl = document.getElementById('podiumContainer');

    try {
        // apiRequest tự động lấy authToken từ localStorage (đã có trong daily-tasks-api.js)
        const { hallOfFame } = await apiRequest('/api/tasks/hall-of-fame');

        if (!hallOfFame || hallOfFame.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <div style="font-size: 3rem; margin-bottom: 10px;">😴</div>
                    <div style="color: #888; font-size: 1.1rem;">Hôm nay chưa có ai hoàn thành.<br>Hãy là người đầu tiên! 🚀</div>
                </div>`;
            podiumEl.style.display = 'none';
            return;
        }

        // --- Render Podium (Top 3) ---
        podiumEl.style.display = 'flex';

        // Hàm phụ trợ để gán dữ liệu cho bục vinh quang
        const setPodium = (index, nameId, streakId, displayClass) => {
            const user = hallOfFame[index];
            const el = document.querySelector(`.${displayClass}`);
            if (user) {
                document.getElementById(nameId).textContent = escapeHtml(user.displayName);
                document.getElementById(streakId).textContent = `🔥 ${user.streak}`;
                el.style.visibility = 'visible';
            } else {
                el.style.visibility = 'hidden'; // Ẩn bục nếu không đủ người
            }
        };

        setPodium(0, 'top1Name', 'top1Streak', 'top-1');
        setPodium(1, 'top2Name', 'top2Streak', 'top-2');
        setPodium(2, 'top3Name', 'top3Streak', 'top-3');

        // --- Render List (Từ Top 4 trở đi) ---
        const others = hallOfFame.slice(3);
        if (others.length === 0) {
            listEl.innerHTML = '<div style="text-align: center; color: #aaa; font-style: italic;">Chưa có thêm ai...</div>';
            return;
        }

        listEl.innerHTML = others.map((user, idx) => `
            <div class="fame-item">
                <div class="fame-item-info">
                    <span class="fame-item-rank">#${idx + 4}</span>
                    <span class="fame-item-name">🏅 ${escapeHtml(user.displayName)}</span>
                </div>
                <div class="fame-item-streak">🔥 ${user.streak} ngày</div>
            </div>
        `).join('');

    } catch (error) {
        listEl.innerHTML = `<div style="text-align: center; color: red;">Lỗi: ${error.message}</div>`;
        podiumEl.style.display = 'none';
    }
}