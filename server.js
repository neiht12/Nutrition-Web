require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error('Missing DATABASE_URL environment variable');
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
});

app.use(express.json());

const DEFAULT_USERS = [
    { id: 'host', password: 'host123', role: 'host', displayName: 'Host' },
    { id: 'user01', password: '123456', role: 'participant', displayName: 'User 01' },
    { id: 'user02', password: '123456', role: 'participant', displayName: 'User 02' }
];

const DEFAULT_QA = [
    {
        id: 'q_001',
        question: 'Tac hai cua mi tom la gi?',
        answer: 'Mi tom chua nhieu natri, chat beo bao hoa va it vi chat. An thuong xuyen co the lam khau phan mat can doi va anh huong suc khoe tim mach.',
        category: 'nutrition',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'q_002',
        question: 'Thuc don nen an truoc khi di thi?',
        answer: 'Nen uu tien protein, carb phuc tap, trai cay va uong du nuoc. Tranh an qua no hoac thu mon la ngay truoc gio thi.',
        category: 'exam-prep',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    }
];

const DEFAULT_NUTRITION_FOODS = [
    {
        id: 'food_trai_cay_chuoi',
        category: 'trai-cay',
        name: 'Chuoi',
        image_url: 'https://picsum.photos/seed/nutrition-banana/600/420',
        short_desc: 'Giau kali va chat xo, ho tro nang luong va tieu hoa.',
        detail_desc: 'Chuoi cung cap kali giup co the hoat dong on dinh, dong thoi co chat xo ho tro he tieu hoa. Co the an nhu bua phu hoac kem voi sua chua.',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'food_trai_cay_tao',
        category: 'trai-cay',
        name: 'Tao',
        image_url: 'https://picsum.photos/seed/nutrition-apple/600/420',
        short_desc: 'Chua chat chong oxy hoa va chat xo tot cho suc khoe.',
        detail_desc: 'Tao co chat chong oxy hoa va chat xo giup ho tro tim mach va he tieu hoa. Nen an ca vo khi phu hop.',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'food_dam_trung',
        category: 'dam',
        name: 'Trung',
        image_url: 'https://picsum.photos/seed/nutrition-egg/600/420',
        short_desc: 'Nguon dam chat luong cao, ho tro xay dung co bap.',
        detail_desc: 'Trung cung cap protein va nhieu vi chat. Co the che bien luoc, hap, hoac chien it dau.',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'food_dam_ca_hoi',
        category: 'dam',
        name: 'Ca hoi',
        image_url: 'https://picsum.photos/seed/nutrition-salmon/600/420',
        short_desc: 'Giau omega-3 tot cho tim mach va phat trien nao.',
        detail_desc: 'Ca hoi cung cap omega-3 cung protein. Nen uu tien cach che bien it dau nhu nuong hoac hap.',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'food_tinh_bot_gao_lut',
        category: 'tinh-bot',
        name: 'Gao lut',
        image_url: 'https://picsum.photos/seed/nutrition-brown-rice/600/420',
        short_desc: 'Carb phuc tap, cho nang luong ben va ho tro tieu hoa.',
        detail_desc: 'Gao lut chua tinh bot va chat xo giup nang luong giai phong cham hon, phu hop cho hoc tap va van dong.',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'food_tinh_bot_khoai_lang',
        category: 'tinh-bot',
        name: 'Khoai lang',
        image_url: 'https://picsum.photos/seed/nutrition-sweet-potato/600/420',
        short_desc: 'Nhieu chat xo va tinh bot de tieu, tot cho he tieu hoa.',
        detail_desc: 'Khoai lang cung cap vitamin va chat xo, co the an nuong hoac hap de han che dau mo.',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'food_rau_cu_ca_rot',
        category: 'rau-cu',
        name: 'Ca rot',
        image_url: 'https://picsum.photos/seed/nutrition-carrot/600/420',
        short_desc: 'Giau beta-carotene, tot cho mat va mien dich.',
        detail_desc: 'Ca rot cung cap beta-carotene, ho tro suc khoe mat. Co the an song hoac che bien nhe.',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'food_rau_cu_bong_cai_xanh',
        category: 'rau-cu',
        name: 'Bong cai xanh',
        image_url: 'https://picsum.photos/seed/nutrition-broccoli/600/420',
        short_desc: 'Nhieu vitamin va chat chong oxy hoa, ho tro co the khoe manh.',
        detail_desc: 'Bong cai xanh giau vitamin C va chat xo. Nen luoc hoac hap vua du de giu dinh duong.',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'food_sua_sua_chua',
        category: 'sua',
        name: 'Sua chua',
        image_url: 'https://picsum.photos/seed/nutrition-yogurt/600/420',
        short_desc: 'Ho tro tieu hoa nho loi khuan tuy loai.',
        detail_desc: 'Sua chua la lua chon tot cho duong ruot. Co the an kem trai cay.',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    },
    {
        id: 'food_sua_sua_tuoi',
        category: 'sua',
        name: 'Sua tuoi',
        image_url: 'https://picsum.photos/seed/nutrition-milk/600/420',
        short_desc: 'Nguon canxi va protein, ho tro xuong va tang truong.',
        detail_desc: 'Sua tuoi cung cap canxi va protein. Nen chon loai phu hop va uong voi luong vua phai.',
        createdAt: '2026-04-09',
        modifiedAt: '2026-04-09'
    }
];

const DEFAULT_SCIENCE_FUN = [
    {
        id: 'sf_rainbow',
        category: 'weather',
        emoji: '🌈',
        title: 'Vi sao cau vong xuat hien sau mua?',
        phenomenon: 'Anh nang chieu qua cac giot nuoc con lo lung trong khong khi.',
        short_desc: 'Giot nuoc hoat dong nhu lang kinh ti hon, tach anh sang trang thanh nhieu mau.',
        explanation: 'Khi anh sang Mat Troi di vao giot nuoc, no bi khuc xa, phan xa ben trong roi khuc xa lan nua khi di ra ngoai. Moi mau lech di mot goc khac nhau nen mat ta thay dai mau quen thuoc.',
        fun_fact: 'Muon thay cau vong ro, ban thuong phai dung quay lung ve phia Mat Troi.',
        createdAt: '2026-04-10',
        modifiedAt: '2026-04-10'
    },
    {
        id: 'sf_yawn',
        category: 'human-body',
        emoji: '😮',
        title: 'Vi sao ngap lai de lay?',
        phenomenon: 'Chi can thay nguoi khac ngap la minh cung muon ngap theo.',
        short_desc: 'Nao bo co xu huong bat chuoc tin hieu xa hoi va trang thai co the cua nguoi xung quanh.',
        explanation: 'Mot so nghien cuu cho rang ngap lay lien quan den kha nang dong cam va co che bat chuoc trong nao. Khi nhin thay hanh dong ngap, nao co the kich hoat mang luoi tuong tu nhu luc chinh minh ngap.',
        fun_fact: 'Doc chu "ngap" hoac tuong tuong ai do dang ngap cung co the kich thich phan xa nay.',
        createdAt: '2026-04-10',
        modifiedAt: '2026-04-10'
    },
    {
        id: 'sf_popcorn',
        category: 'food-science',
        emoji: '🍿',
        title: 'Vi sao bap rang no bup mot cai?',
        phenomenon: 'Hat bap bien thanh cuc bap trang xop khi gap nhiet do cao.',
        short_desc: 'Hoi nuoc bi nhot trong hat bap tang ap suat cho den khi lop vo vo tung.',
        explanation: 'Ben trong hat bap co mot it nuoc va tinh bot. Khi bi dun nong, nuoc chuyen thanh hoi, ap suat tang dan. Den mot muc du lon, lop vo nut ra va tinh bot nong phong len rat nhanh, tao nen tieng no.',
        fun_fact: 'Khong phai hat bap nao cung no tot; do am ben trong phai du phu hop.',
        createdAt: '2026-04-10',
        modifiedAt: '2026-04-10'
    }
];

function today() {
    return new Date().toISOString().split('T')[0];
}

function normalizeTaskState(taskState) {
    return {
        date: String(taskState?.date || today()),
        tasks: taskState?.tasks && typeof taskState.tasks === 'object' ? taskState.tasks : {},
        streak: Number(taskState?.streak || 0),
        history: Array.isArray(taskState?.history) ? taskState.history : [],
        completedCelebrationShown: Boolean(taskState?.completedCelebrationShown)
    };
}

function normalizeQaRecord(record) {
    return {
        id: String(record.id),
        question: String(record.question || '').trim(),
        answer: String(record.answer || '').trim(),
        category: String(record.category || 'other').trim() || 'other',
        createdAt: String(record.createdAt || today()),
        modifiedAt: String(record.modifiedAt || today())
    };
}

function normalizeFoodRecord(record) {
    return {
        id: String(record.id),
        category: String(record.category || '').trim(),
        name: String(record.name || '').trim(),
        image_url: String(record.image_url || '').trim(),
        short_desc: String(record.short_desc || '').trim(),
        detail_desc: String(record.detail_desc || '').trim(),
        createdAt: String(record.createdAt || today()),
        modifiedAt: String(record.modifiedAt || today())
    };
}

function normalizeScienceFunRecord(record) {
    return {
        id: String(record.id),
        category: String(record.category || 'other').trim() || 'other',
        emoji: String(record.emoji || '🔬').trim() || '🔬',
        title: String(record.title || '').trim(),
        phenomenon: String(record.phenomenon || '').trim(),
        short_desc: String(record.short_desc || '').trim(),
        explanation: String(record.explanation || '').trim(),
        fun_fact: String(record.fun_fact || '').trim(),
        createdAt: String(record.createdAt || today()),
        modifiedAt: String(record.modifiedAt || today())
    };
}

function mapTaskStateRow(row) {
    if (!row) return null;
    return {
        date: row.date,
        tasks: row.tasks_json || {},
        streak: Number(row.streak || 0),
        history: row.history_json || [],
        completedCelebrationShown: Boolean(row.completed_celebration_shown)
    };
}

function mapNotificationRow(row) {
    return {
        id: row.id,
        type: row.type,
        userId: row.userId,
        userName: row.userName,
        taskType: row.taskType,
        taskName: row.taskName,
        timestamp: row.timestamp,
        isRead: Boolean(row.isRead)
    };
}
// --- MEAL PLANS HELPERS ---

async function listMealPlans() {
    const result = await query(
        `SELECT id, name, emoji, meals_json, created_at AS "createdAt", modified_at AS "modifiedAt"
         FROM meal_plans
         ORDER BY modified_at DESC, created_at DESC, id DESC`
    );
    return result.rows.map(row => ({
        ...row,
        meals: row.meals_json || { breakfast: [], lunch: [], dinner: [] }
    }));
}

async function createMealPlan(name, emoji, meals) {
    const id = `mp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const now = new Date().toISOString();
    await query(
        `INSERT INTO meal_plans (id, name, emoji, meals_json, created_at, modified_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
        [id, name, emoji || '🍽️', JSON.stringify(meals), now, now]
    );
    return { id, name, emoji, meals, createdAt: now, modifiedAt: now };
}

async function updateMealPlan(id, name, emoji, meals) {
    const now = new Date().toISOString();
    await query(
        `UPDATE meal_plans
         SET name = $1, emoji = $2, meals_json = $3::jsonb, modified_at = $4
         WHERE id = $5`,
        [name, emoji || '🍽️', JSON.stringify(meals), now, id]
    );
    return { id, name, emoji, meals, modifiedAt: now };
}

async function listExercises() {
    const result = await query(
        `SELECT id, name, category, emoji, video_url AS "videoUrl", image_url AS "imageUrl", description, created_at AS "createdAt", modified_at AS "modifiedAt"
         FROM exercise_entries
         ORDER BY modified_at DESC, id DESC`
    );
    return result.rows;
}

async function query(text, params = []) {
    return pool.query(text, params);
}

async function withTransaction(work) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function initDb() {
    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            display_name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_task_state (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            date TEXT NOT NULL,
            tasks_json JSONB NOT NULL,
            streak INTEGER NOT NULL DEFAULT 0,
            history_json JSONB NOT NULL,
            completed_celebration_shown BOOLEAN NOT NULL DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS user_custom_tasks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL,
            type TEXT NOT NULL,
            target INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE IF NOT EXISTS host_notifications (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            task_type TEXT NOT NULL,
            task_name TEXT NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL,
            is_read BOOLEAN NOT NULL DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS qa_entries (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT NOT NULL,
            modified_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS nutrition_foods (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            image_url TEXT NOT NULL DEFAULT '',
            short_desc TEXT NOT NULL DEFAULT '',
            detail_desc TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            modified_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS science_fun_entries (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '🔬',
            title TEXT NOT NULL,
            phenomenon TEXT NOT NULL DEFAULT '',
            short_desc TEXT NOT NULL DEFAULT '',
            explanation TEXT NOT NULL,
            fun_fact TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            modified_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meal_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT NOT NULL DEFAULT '🍽️',
        meals_json JSONB NOT NULL,
        created_at TEXT NOT NULL,
        modified_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exercise_entries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        emoji TEXT NOT NULL DEFAULT '💪',
        video_url TEXT,
        image_url TEXT,
        description TEXT,
        created_at TEXT NOT NULL,
        modified_at TEXT NOT NULL
    );
    `);

    for (const user of DEFAULT_USERS) {
        await query(
            `INSERT INTO users (id, password, role, display_name)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING`,
            [user.id, user.password, user.role, user.displayName]
        );
    }

    const qaExists = await query('SELECT 1 FROM qa_entries LIMIT 1');
    if (qaExists.rowCount === 0) {
        for (const record of DEFAULT_QA) {
            await query(
                `INSERT INTO qa_entries (id, question, answer, category, created_at, modified_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [record.id, record.question, record.answer, record.category, record.createdAt, record.modifiedAt]
            );
        }
    }

    const foodsExist = await query('SELECT 1 FROM nutrition_foods LIMIT 1');
    if (foodsExist.rowCount === 0) {
        for (const record of DEFAULT_NUTRITION_FOODS) {
            await query(
                `INSERT INTO nutrition_foods (id, category, name, image_url, short_desc, detail_desc, created_at, modified_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO NOTHING`,
                [record.id, record.category, record.name, record.image_url, record.short_desc, record.detail_desc, record.createdAt, record.modifiedAt]
            );
        }
    }

    const scienceExists = await query('SELECT 1 FROM science_fun_entries LIMIT 1');
    if (scienceExists.rowCount === 0) {
        for (const record of DEFAULT_SCIENCE_FUN) {
            await query(
                `INSERT INTO science_fun_entries (id, category, emoji, title, phenomenon, short_desc, explanation, fun_fact, created_at, modified_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (id) DO NOTHING`,
                [record.id, record.category, record.emoji, record.title, record.phenomenon, record.short_desc, record.explanation, record.fun_fact, record.createdAt, record.modifiedAt]
            );
        }
    }
    const mealPlansExist = await query('SELECT 1 FROM meal_plans LIMIT 1');
    if (mealPlansExist.rowCount === 0) {
        const defaultMeals = {
            breakfast: [{ id: 'm1', name: 'Phở bò', emoji: '🍜', description: 'Giàu protein và năng lượng' }],
            lunch: [{ id: 'm2', name: 'Cơm cá hồi áp chảo', emoji: '🐟', description: 'Omega-3 tốt cho trí não' }],
            dinner: [{ id: 'm3', name: 'Salad ức gà', emoji: '🥗', description: 'Nhẹ bụng, dễ tiêu hóa' }]
        };
        await createMealPlan('Thực đơn mẫu dinh dưỡng', '🌟', defaultMeals);
    }
}

function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

const authRequired = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const result = await query(
        `SELECT u.id, u.role, u.display_name
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = $1`,
        [token]
    );
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: 'Invalid session' });

    req.user = { id: row.id, role: row.role, displayName: row.display_name };
    req.token = token;
    next();
});

function hostRequired(req, res, next) {
    if (req.user.role !== 'host') return res.status(403).json({ error: 'Host only' });
    next();
}

async function listQaEntries() {
    const result = await query(
        `SELECT id, question, answer, category, created_at AS "createdAt", modified_at AS "modifiedAt"
         FROM qa_entries
         ORDER BY modified_at DESC, created_at DESC, id DESC`
    );
    return result.rows;
}

async function listNutritionFoods(category) {
    if (category) {
        const result = await query(
            `SELECT id, category, name, image_url, short_desc, detail_desc, created_at AS "createdAt", modified_at AS "modifiedAt"
             FROM nutrition_foods
             WHERE category = $1
             ORDER BY modified_at DESC, created_at DESC, id DESC`,
            [category]
        );
        return result.rows;
    }

    const result = await query(
        `SELECT id, category, name, image_url, short_desc, detail_desc, created_at AS "createdAt", modified_at AS "modifiedAt"
         FROM nutrition_foods
         ORDER BY category ASC, modified_at DESC, created_at DESC, id DESC`
    );
    return result.rows;
}

async function listScienceFunEntries(category) {
    if (category) {
        const result = await query(
            `SELECT id, category, emoji, title, phenomenon, short_desc, explanation, fun_fact, created_at AS "createdAt", modified_at AS "modifiedAt"
             FROM science_fun_entries
             WHERE category = $1
             ORDER BY modified_at DESC, created_at DESC, id DESC`,
            [category]
        );
        return result.rows;
    }

    const result = await query(
        `SELECT id, category, emoji, title, phenomenon, short_desc, explanation, fun_fact, created_at AS "createdAt", modified_at AS "modifiedAt"
         FROM science_fun_entries
         ORDER BY category ASC, modified_at DESC, created_at DESC, id DESC`
    );
    return result.rows;
}

app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { userId, password } = req.body || {};
    if (!userId || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
    }

    const result = await query('SELECT id, password, role, display_name FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Sai ID hoac mat khau' });
    }

    const token = crypto.randomUUID();
    await query('INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)', [token, user.id, new Date().toISOString()]);

    res.json({
        token,
        user: {
            id: user.id,
            role: user.role,
            displayName: user.display_name
        }
    });
}));

app.post('/api/auth/register', asyncHandler(async (req, res) => {
    const { userId, password, displayName } = req.body || {};
    if (!userId || !password || !displayName) {
        return res.status(400).json({ error: 'Thieu ten hien thi, ten dang nhap hoac mat khau' });
    }
    if (userId.length < 3 || password.length < 4) {
        return res.status(400).json({ error: 'Ten dang nhap >= 3 ky tu va mat khau >= 4 ky tu' });
    }

    const normalizedDisplayName = displayName.trim();
    const vietnameseNamePattern = /^(?=.{2,50}$)[\p{L}\p{M}\s'.-]+$/u;
    if (!vietnameseNamePattern.test(normalizedDisplayName)) {
        return res.status(400).json({ error: 'Ten hien thi chi gom chu, khoang trang va dau cau co ban' });
    }

    const existing = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'Ten dang nhap da ton tai' });
    }

    await query(`INSERT INTO users (id, password, role, display_name) VALUES ($1, $2, 'participant', $3)`, [userId, password, normalizedDisplayName]);
    res.json({ ok: true });
}));

app.post('/api/auth/logout', authRequired, asyncHandler(async (req, res) => {
    await query('DELETE FROM sessions WHERE token = $1', [req.token]);
    res.json({ ok: true });
}));

app.get('/api/auth/me', authRequired, (req, res) => {
    res.json({ user: req.user });
});

app.get('/api/tasks/custom', authRequired, asyncHandler(async (_req, res) => {
    const result = await query(`SELECT id, name, emoji, type, target FROM user_custom_tasks WHERE user_id = 'host' ORDER BY created_at DESC`);
    res.json({ customTasks: result.rows });
}));

app.post('/api/tasks/custom', authRequired, hostRequired, asyncHandler(async (req, res) => {
    const { id, name, emoji, type, target } = req.body || {};
    if (!id || !name || !emoji || !type || !target) {
        return res.status(400).json({ error: 'Thieu du lieu task' });
    }

    await query(
        `INSERT INTO user_custom_tasks (id, user_id, name, emoji, type, target, created_at)
         VALUES ($1, 'host', $2, $3, $4, $5, $6)`,
        [id, name, emoji, type, Number(target), new Date().toISOString()]
    );
    res.json({ ok: true });
}));

app.delete('/api/tasks/custom/:id', authRequired, hostRequired, asyncHandler(async (req, res) => {
    await query(`DELETE FROM user_custom_tasks WHERE id = $1 AND user_id = 'host'`, [req.params.id]);
    res.json({ ok: true });
}));

app.post('/api/tasks/import-legacy', authRequired, asyncHandler(async (req, res) => {
    const { taskState, customTasks, notifications } = req.body || {};
    const result = {
        importedTaskState: false,
        importedCustomTasks: 0,
        importedNotifications: 0
    };

    await withTransaction(async (client) => {
        if (taskState) {
            const existingTaskState = await client.query('SELECT 1 FROM user_task_state WHERE user_id = $1', [req.user.id]);
            if (existingTaskState.rowCount === 0) {
                const normalized = normalizeTaskState(taskState);
                await client.query(
                    `INSERT INTO user_task_state (user_id, date, tasks_json, streak, history_json, completed_celebration_shown)
                     VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6)`,
                    [req.user.id, normalized.date, JSON.stringify(normalized.tasks), normalized.streak, JSON.stringify(normalized.history), normalized.completedCelebrationShown]
                );
                result.importedTaskState = true;
            }
        }

        if (req.user.role === 'host' && Array.isArray(customTasks)) {
            for (const task of customTasks) {
                if (!task?.id || !task?.name || !task?.emoji || !task?.type || !task?.target) continue;
                const insertResult = await client.query(
                    `INSERT INTO user_custom_tasks (id, user_id, name, emoji, type, target, created_at)
                     VALUES ($1, 'host', $2, $3, $4, $5, $6)
                     ON CONFLICT (id) DO NOTHING`,
                    [String(task.id), String(task.name).trim(), String(task.emoji).trim(), String(task.type).trim(), Number(task.target), String(task.createdAt || new Date().toISOString())]
                );
                result.importedCustomTasks += insertResult.rowCount;
            }
        }

        if (req.user.role === 'host' && Array.isArray(notifications)) {
            for (const notification of notifications) {
                if (!notification?.id) continue;
                const insertResult = await client.query(
                    `INSERT INTO host_notifications (id, type, user_id, user_name, task_type, task_name, timestamp, is_read)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (id) DO NOTHING`,
                    [String(notification.id), String(notification.type || 'task_completed'), String(notification.userId || ''), String(notification.userName || ''), String(notification.taskType || ''), String(notification.taskName || ''), String(notification.timestamp || new Date().toISOString()), Boolean(notification.isRead)]
                );
                result.importedNotifications += insertResult.rowCount;
            }
        }
    });

    res.json(result);
}));

app.get('/api/tasks/state', authRequired, asyncHandler(async (req, res) => {
    const result = await query(
        `SELECT date, tasks_json, streak, history_json, completed_celebration_shown
         FROM user_task_state
         WHERE user_id = $1`,
        [req.user.id]
    );
    res.json({ taskState: mapTaskStateRow(result.rows[0]) });
}));

app.put('/api/tasks/state', authRequired, asyncHandler(async (req, res) => {
    const { date, tasks, streak, history, completedCelebrationShown } = req.body || {};
    if (!date || !tasks || !Array.isArray(history)) {
        return res.status(400).json({ error: 'Task state khong hop le' });
    }

    await query(
        `INSERT INTO user_task_state (user_id, date, tasks_json, streak, history_json, completed_celebration_shown)
         VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6)
         ON CONFLICT (user_id) DO UPDATE SET
            date = EXCLUDED.date,
            tasks_json = EXCLUDED.tasks_json,
            streak = EXCLUDED.streak,
            history_json = EXCLUDED.history_json,
            completed_celebration_shown = EXCLUDED.completed_celebration_shown`,
        [req.user.id, date, JSON.stringify(tasks), Number(streak || 0), JSON.stringify(history), Boolean(completedCelebrationShown)]
    );

    res.json({ ok: true });
}));

app.post('/api/host/notify-complete', authRequired, asyncHandler(async (req, res) => {
    if (req.user.role === 'host') return res.json({ ok: true });

    const { taskType, taskName } = req.body || {};
    if (!taskType || !taskName) {
        return res.status(400).json({ error: 'Thieu thong tin notification' });
    }

    await query(
        `INSERT INTO host_notifications (id, type, user_id, user_name, task_type, task_name, timestamp, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
        [`n_${Date.now()}_${Math.floor(Math.random() * 10000)}`, 'task_completed', req.user.id, req.user.displayName || req.user.id, taskType, taskName, new Date().toISOString()]
    );

    res.json({ ok: true });
}));

app.get('/api/host/notifications', authRequired, hostRequired, asyncHandler(async (_req, res) => {
    const result = await query(
        `SELECT id, type, user_id AS "userId", user_name AS "userName", task_type AS "taskType", task_name AS "taskName", timestamp, is_read AS "isRead"
         FROM host_notifications
         ORDER BY timestamp DESC
         LIMIT 100`
    );
    res.json({ notifications: result.rows.map(mapNotificationRow) });
}));

app.post('/api/host/notifications/read-all', authRequired, hostRequired, asyncHandler(async (_req, res) => {
    await query('UPDATE host_notifications SET is_read = TRUE WHERE is_read = FALSE');
    res.json({ ok: true });
}));

app.get('/api/qa-center', asyncHandler(async (_req, res) => {
    res.json({ items: await listQaEntries() });
}));

app.post('/api/qa-center', asyncHandler(async (req, res) => {
    const normalized = normalizeQaRecord({
        id: req.body?.id || `q_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        question: req.body?.question,
        answer: req.body?.answer,
        category: req.body?.category,
        createdAt: req.body?.createdAt || today(),
        modifiedAt: req.body?.modifiedAt || today()
    });

    if (!normalized.question || !normalized.answer) {
        return res.status(400).json({ error: 'Thieu cau hoi hoac cau tra loi' });
    }

    await query(
        `INSERT INTO qa_entries (id, question, answer, category, created_at, modified_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [normalized.id, normalized.question, normalized.answer, normalized.category, normalized.createdAt, normalized.modifiedAt]
    );

    res.json({ item: normalized });
}));

app.put('/api/qa-center/:id', asyncHandler(async (req, res) => {
    const existing = await query('SELECT created_at AS "createdAt" FROM qa_entries WHERE id = $1', [req.params.id]);
    const existingRow = existing.rows[0];
    if (!existingRow) {
        return res.status(404).json({ error: 'Khong tim thay cau hoi' });
    }

    const normalized = normalizeQaRecord({
        id: req.params.id,
        question: req.body?.question,
        answer: req.body?.answer,
        category: req.body?.category,
        createdAt: existingRow.createdAt,
        modifiedAt: req.body?.modifiedAt || today()
    });

    if (!normalized.question || !normalized.answer) {
        return res.status(400).json({ error: 'Thieu cau hoi hoac cau tra loi' });
    }

    await query(
        `UPDATE qa_entries
         SET question = $1, answer = $2, category = $3, modified_at = $4
         WHERE id = $5`,
        [normalized.question, normalized.answer, normalized.category, normalized.modifiedAt, req.params.id]
    );

    res.json({ item: normalized });
}));

app.delete('/api/qa-center/:id', asyncHandler(async (req, res) => {
    await query('DELETE FROM qa_entries WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
}));

app.post('/api/qa-center/import', asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    let imported = 0;

    await withTransaction(async (client) => {
        for (const item of items) {
            if (!item?.id) continue;
            const normalized = normalizeQaRecord(item);
            if (!normalized.question || !normalized.answer) continue;

            const insertResult = await client.query(
                `INSERT INTO qa_entries (id, question, answer, category, created_at, modified_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [normalized.id, normalized.question, normalized.answer, normalized.category, normalized.createdAt, normalized.modifiedAt]
            );
            imported += insertResult.rowCount;
        }
    });

    res.json({ imported, items: await listQaEntries() });
}));

app.get('/api/nutrition-foods', asyncHandler(async (req, res) => {
    res.json({ items: await listNutritionFoods(req.query.category) });
}));

app.post('/api/nutrition-foods', asyncHandler(async (req, res) => {
    const normalized = normalizeFoodRecord({
        id: req.body?.id || `f_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        category: req.body?.category,
        name: req.body?.name,
        image_url: req.body?.image_url,
        short_desc: req.body?.short_desc,
        detail_desc: req.body?.detail_desc,
        createdAt: req.body?.createdAt || today(),
        modifiedAt: req.body?.modifiedAt || today()
    });

    if (!normalized.category || !normalized.name || !normalized.short_desc || !normalized.detail_desc) {
        return res.status(400).json({ error: 'Thieu du lieu mon an' });
    }

    await query(
        `INSERT INTO nutrition_foods (id, category, name, image_url, short_desc, detail_desc, created_at, modified_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [normalized.id, normalized.category, normalized.name, normalized.image_url, normalized.short_desc, normalized.detail_desc, normalized.createdAt, normalized.modifiedAt]
    );

    res.json({ item: normalized });
}));

app.put('/api/nutrition-foods/:id', asyncHandler(async (req, res) => {
    const existing = await query('SELECT created_at AS "createdAt" FROM nutrition_foods WHERE id = $1', [req.params.id]);
    const existingRow = existing.rows[0];
    if (!existingRow) {
        return res.status(404).json({ error: 'Khong tim thay mon an' });
    }

    const normalized = normalizeFoodRecord({
        id: req.params.id,
        category: req.body?.category,
        name: req.body?.name,
        image_url: req.body?.image_url,
        short_desc: req.body?.short_desc,
        detail_desc: req.body?.detail_desc,
        createdAt: existingRow.createdAt,
        modifiedAt: req.body?.modifiedAt || today()
    });

    if (!normalized.category || !normalized.name || !normalized.short_desc || !normalized.detail_desc) {
        return res.status(400).json({ error: 'Thieu du lieu mon an' });
    }

    await query(
        `UPDATE nutrition_foods
         SET category = $1, name = $2, image_url = $3, short_desc = $4, detail_desc = $5, modified_at = $6
         WHERE id = $7`,
        [normalized.category, normalized.name, normalized.image_url, normalized.short_desc, normalized.detail_desc, normalized.modifiedAt, req.params.id]
    );

    res.json({ item: normalized });
}));

app.delete('/api/nutrition-foods/:id', asyncHandler(async (req, res) => {
    await query('DELETE FROM nutrition_foods WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
}));

app.post('/api/nutrition-foods/import', asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    let imported = 0;

    await withTransaction(async (client) => {
        for (const item of items) {
            if (!item?.id) continue;
            const normalized = normalizeFoodRecord(item);
            if (!normalized.category || !normalized.name || !normalized.short_desc || !normalized.detail_desc) continue;

            const insertResult = await client.query(
                `INSERT INTO nutrition_foods (id, category, name, image_url, short_desc, detail_desc, created_at, modified_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO NOTHING`,
                [normalized.id, normalized.category, normalized.name, normalized.image_url, normalized.short_desc, normalized.detail_desc, normalized.createdAt, normalized.modifiedAt]
            );
            imported += insertResult.rowCount;
        }
    });

    res.json({ imported, items: await listNutritionFoods() });
}));

app.get('/api/science-fun', asyncHandler(async (req, res) => {
    res.json({ items: await listScienceFunEntries(req.query.category) });
}));

app.post('/api/science-fun', asyncHandler(async (req, res) => {
    const normalized = normalizeScienceFunRecord({
        id: req.body?.id || `sf_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        category: req.body?.category,
        emoji: req.body?.emoji,
        title: req.body?.title,
        phenomenon: req.body?.phenomenon,
        short_desc: req.body?.short_desc,
        explanation: req.body?.explanation,
        fun_fact: req.body?.fun_fact,
        createdAt: req.body?.createdAt || today(),
        modifiedAt: req.body?.modifiedAt || today()
    });

    if (!normalized.title || !normalized.short_desc || !normalized.explanation) {
        return res.status(400).json({ error: 'Thieu tieu de, mo ta ngan hoac giai thich' });
    }

    await query(
        `INSERT INTO science_fun_entries (id, category, emoji, title, phenomenon, short_desc, explanation, fun_fact, created_at, modified_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [normalized.id, normalized.category, normalized.emoji, normalized.title, normalized.phenomenon, normalized.short_desc, normalized.explanation, normalized.fun_fact, normalized.createdAt, normalized.modifiedAt]
    );

    res.json({ item: normalized });
}));

app.put('/api/science-fun/:id', asyncHandler(async (req, res) => {
    const existing = await query('SELECT created_at AS "createdAt" FROM science_fun_entries WHERE id = $1', [req.params.id]);
    const existingRow = existing.rows[0];
    if (!existingRow) {
        return res.status(404).json({ error: 'Khong tim thay giai thich khoa hoc' });
    }

    const normalized = normalizeScienceFunRecord({
        id: req.params.id,
        category: req.body?.category,
        emoji: req.body?.emoji,
        title: req.body?.title,
        phenomenon: req.body?.phenomenon,
        short_desc: req.body?.short_desc,
        explanation: req.body?.explanation,
        fun_fact: req.body?.fun_fact,
        createdAt: existingRow.createdAt,
        modifiedAt: req.body?.modifiedAt || today()
    });

    if (!normalized.title || !normalized.short_desc || !normalized.explanation) {
        return res.status(400).json({ error: 'Thieu tieu de, mo ta ngan hoac giai thich' });
    }

    await query(
        `UPDATE science_fun_entries
         SET category = $1, emoji = $2, title = $3, phenomenon = $4, short_desc = $5, explanation = $6, fun_fact = $7, modified_at = $8
         WHERE id = $9`,
        [normalized.category, normalized.emoji, normalized.title, normalized.phenomenon, normalized.short_desc, normalized.explanation, normalized.fun_fact, normalized.modifiedAt, req.params.id]
    );

    res.json({ item: normalized });
}));

app.delete('/api/science-fun/:id', asyncHandler(async (req, res) => {
    await query('DELETE FROM science_fun_entries WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
}));

app.post('/api/science-fun/import', asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    let imported = 0;

    await withTransaction(async (client) => {
        for (const item of items) {
            if (!item?.id) continue;
            const normalized = normalizeScienceFunRecord(item);
            if (!normalized.title || !normalized.short_desc || !normalized.explanation) continue;

            const insertResult = await client.query(
                `INSERT INTO science_fun_entries (id, category, emoji, title, phenomenon, short_desc, explanation, fun_fact, created_at, modified_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (id) DO NOTHING`,
                [normalized.id, normalized.category, normalized.emoji, normalized.title, normalized.phenomenon, normalized.short_desc, normalized.explanation, normalized.fun_fact, normalized.createdAt, normalized.modifiedAt]
            );
            imported += insertResult.rowCount;
        }
    });

    res.json({ imported, items: await listScienceFunEntries() });
}));
// --- MEAL PLANS ROUTES ---

app.get('/api/meal-plans', asyncHandler(async (_req, res) => {
    res.json({ items: await listMealPlans() });
}));

app.post('/api/meal-plans', asyncHandler(async (req, res) => {
    const { name, emoji, meals } = req.body || {};
    if (!name || !meals) {
        return res.status(400).json({ error: 'Thiếu tên hoặc danh sách món ăn' });
    }

    const normalizedMeals = {
        breakfast: Array.isArray(meals.breakfast) ? meals.breakfast : [],
        lunch: Array.isArray(meals.lunch) ? meals.lunch : [],
        dinner: Array.isArray(meals.dinner) ? meals.dinner : []
    };

    const result = await createMealPlan(name, emoji, normalizedMeals);
    res.json({ item: result });
}));

app.put('/api/meal-plans/:id', asyncHandler(async (req, res) => {
    const { name, emoji, meals } = req.body || {};
    if (!name || !meals) {
        return res.status(400).json({ error: 'Thiếu tên hoặc danh sách món ăn' });
    }

    const normalizedMeals = {
        breakfast: Array.isArray(meals.breakfast) ? meals.breakfast : [],
        lunch: Array.isArray(meals.lunch) ? meals.lunch : [],
        dinner: Array.isArray(meals.dinner) ? meals.dinner : []
    };

    const result = await updateMealPlan(req.params.id, name, emoji, normalizedMeals);
    res.json({ item: result });
}));

app.delete('/api/meal-plans/:id', asyncHandler(async (req, res) => {
    await query('DELETE FROM meal_plans WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
}));

app.post('/api/meal-plans/import', asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    let imported = 0;

    await withTransaction(async (client) => {
        for (const item of items) {
            if (!item?.id || !item?.name) continue;

            const normalized = {
                id: String(item.id),
                name: String(item.name).trim(),
                emoji: String(item.emoji || '🍽️').trim(),
                meals: {
                    breakfast: Array.isArray(item.meals?.breakfast) ? item.meals.breakfast : [],
                    lunch: Array.isArray(item.meals?.lunch) ? item.meals.lunch : [],
                    dinner: Array.isArray(item.meals?.dinner) ? item.meals.dinner : []
                },
                createdAt: String(item.createdAt || new Date().toISOString()),
                modifiedAt: String(item.modifiedAt || new Date().toISOString())
            };

            const insertResult = await client.query(
                `INSERT INTO meal_plans (id, name, emoji, meals_json, created_at, modified_at)
                 VALUES ($1, $2, $3, $4::jsonb, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [normalized.id, normalized.name, normalized.emoji, JSON.stringify(normalized.meals), normalized.createdAt, normalized.modifiedAt]
            );
            imported += insertResult.rowCount;
        }
    });

    res.json({ imported, items: await listMealPlans() });
}));
app.get('/api/exercises', asyncHandler(async (_req, res) => {
    res.json({ items: await listExercises() });
}));

app.post('/api/exercises', asyncHandler(async (req, res) => {
    const { name, category, emoji, videoUrl, imageUrl, description } = req.body;
    const id = `ex_${Date.now()}`;
    const now = new Date().toISOString();

    await query(
        `INSERT INTO exercise_entries (id, name, category, emoji, video_url, image_url, description, created_at, modified_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, name, category, emoji || '💪', videoUrl, imageUrl, description, now, now]
    );
    res.json({ ok: true });
}));

app.put('/api/exercises/:id', asyncHandler(async (req, res) => {
    const { name, category, emoji, videoUrl, imageUrl, description } = req.body;
    const now = new Date().toISOString();

    await query(
        `UPDATE exercise_entries 
         SET name = $1, category = $2, emoji = $3, video_url = $4, image_url = $5, description = $6, modified_at = $7
         WHERE id = $8`,
        [name, category, emoji, videoUrl, imageUrl, description, now, req.params.id]
    );
    res.json({ ok: true });
}));

app.delete('/api/exercises/:id', asyncHandler(async (req, res) => {
    await query('DELETE FROM exercise_entries WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
}));

app.get('/api/tasks/hall-of-fame', authRequired, asyncHandler(async (req, res) => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Tìm những user có date = hôm nay và đã hoàn thành (completed_celebration_shown = true)
    const result = await query(
        `SELECT u.id, u.display_name AS "displayName", uts.streak
         FROM user_task_state uts
         JOIN users u ON uts.user_id = u.id
         WHERE uts.date = $1 AND uts.completed_celebration_shown = TRUE
         ORDER BY uts.streak DESC, u.display_name ASC`,
        [todayStr]
    );

    res.json({ hallOfFame: result.rows });
}));

app.use(express.static(__dirname));

app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Server dang gap loi. Vui long thu lai sau.' });
});

initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize database', error);
        process.exit(1);
    });
