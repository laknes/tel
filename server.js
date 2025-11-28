import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- DATABASE CONNECTION ---
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'teleshop_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
};

let pool;

async function initDB() {
  try {
    console.log('🔄 Connecting to Database...');
    const tempConn = await mysql.createConnection({
      host: dbConfig.host, user: dbConfig.user, password: dbConfig.password
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempConn.end();

    pool = mysql.createPool(dbConfig);
    await pool.query('SELECT 1');
    console.log('✅ Database Connected Successfully!');
    
    await initTables();
  } catch (e) {
    console.error(`❌ DB Error: ${e.message}`);
    console.error('Run ./tel.sh and choose Repair Database.');
  }
}

async function initTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS products (id VARCHAR(255) PRIMARY KEY, productCode VARCHAR(50), name VARCHAR(255), price DECIMAL(15,0), category VARCHAR(255), description TEXT, imageUrl LONGTEXT, createdAt BIGINT)`,
      `CREATE TABLE IF NOT EXISTS categories (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255))`,
      `CREATE TABLE IF NOT EXISTS users (username VARCHAR(255) PRIMARY KEY, password VARCHAR(255), fullName VARCHAR(255), role VARCHAR(50), isVerified BOOLEAN DEFAULT FALSE)`,
      `CREATE TABLE IF NOT EXISTS verified_users (userId BIGINT PRIMARY KEY, firstName VARCHAR(255), lastName VARCHAR(255), username VARCHAR(255), phoneNumber VARCHAR(50), verifiedAt BIGINT)`,
      `CREATE TABLE IF NOT EXISTS orders (id VARCHAR(255) PRIMARY KEY, customerName VARCHAR(255), customerPhone VARCHAR(50), customerAddress TEXT, totalAmount DECIMAL(15,0), status VARCHAR(50), items JSON, createdAt BIGINT)`,
      `CREATE TABLE IF NOT EXISTS configs (id VARCHAR(50) PRIMARY KEY, data JSON)`
    ];

    for (const sql of tables) await pool.query(sql);
    
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
        await pool.query('INSERT INTO users VALUES (?, ?, ?, ?, ?)', ['admin', '123', 'مدیر سیستم', 'ADMIN', true]);
    }
}

initDB();

const checkDB = (req, res, next) => {
  if (!pool) return res.status(503).json({ success: false, message: 'Database is unavailable.' });
  next();
};

// --- API ENDPOINTS ---

app.post('/api/login', checkDB, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [req.body.username]);
    if (rows.length > 0 && rows[0].password === req.body.password) {
        res.json({ success: true, user: rows[0] });
    } else {
        res.json({ success: false, message: 'Invalid Credentials' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CRUD Operations
app.get('/api/products', checkDB, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM products'); res.json(rows); } catch { res.json([]); }
});
app.post('/api/products', checkDB, async (req, res) => {
  const p = req.body;
  await pool.query('INSERT INTO products (id, productCode, name, price, category, description, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE productCode=?, name=?, price=?, category=?, description=?, imageUrl=?', 
  [p.id, p.productCode, p.name, p.price, p.category, p.description, p.imageUrl, p.createdAt, p.productCode, p.name, p.price, p.category, p.description, p.imageUrl]);
  res.json({ success: true });
});
app.delete('/api/products/:id', checkDB, async (req, res) => {
  await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/categories', checkDB, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM categories'); res.json(rows); } catch { res.json([]); }
});
app.post('/api/categories', checkDB, async (req, res) => {
  await pool.query('INSERT INTO categories VALUES (?, ?) ON DUPLICATE KEY UPDATE name=?', [req.body.id, req.body.name, req.body.name]);
  res.json({ success: true });
});
app.delete('/api/categories/:id', checkDB, async (req, res) => {
  await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/orders', checkDB, async (req, res) => {
  try {
      const [rows] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
      res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]') })));
  } catch { res.json([]); }
});
app.post('/api/orders', checkDB, async (req, res) => {
  const o = req.body;
  await pool.query('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=?', 
  [o.id, o.customerName, o.customerPhone, o.customerAddress, o.totalAmount, o.status, JSON.stringify(o.items), o.createdAt, o.status]);
  res.json({ success: true });
});

app.get('/api/config/telegram', checkDB, async (req, res) => {
  try {
      const [rows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['telegram']);
      res.json(rows.length ? JSON.parse(rows[0].data) : null);
  } catch { res.json(null); }
});
app.post('/api/config/telegram', checkDB, async (req, res) => {
  await pool.query('INSERT INTO configs VALUES (?, ?) ON DUPLICATE KEY UPDATE data=?', ['telegram', JSON.stringify(req.body), JSON.stringify(req.body)]);
  res.json({ success: true });
});

app.get('/api/verified-users', checkDB, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM verified_users'); res.json(rows); } catch { res.json([]); }
});
app.post('/api/verified-users', checkDB, async (req, res) => {
  const u = req.body;
  await pool.query('INSERT INTO verified_users VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE phoneNumber=?', [u.userId, u.firstName, u.lastName, u.username, u.phoneNumber, u.verifiedAt, u.phoneNumber]);
  res.json({ success: true });
});

// --- TELEGRAM BOT LOGIC (Direct Mode) ---
const TG_BASE = 'https://api.telegram.org/bot';
let lastUpdateId = 0;
const userSessions = {};

async function runBot() {
  if (!pool) return;
  try {
    const [configRows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['telegram']);
    if (configRows.length === 0) return;
    const config = JSON.parse(configRows[0].data);
    if (!config || !config.botToken) return;

    const res = await fetch(`${TG_BASE}${config.botToken}/getUpdates?offset=${lastUpdateId + 1}&limit=50&timeout=0`);
    const data = await res.json();

    if (!data.ok || !data.result || data.result.length === 0) return;

    const [products] = await pool.query('SELECT * FROM products');
    const [categories] = await pool.query('SELECT * FROM categories');
    
    const sendMsg = async (chatId, text, markup = null) => {
        await fetch(`${TG_BASE}${config.botToken}/sendMessage`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', reply_markup: markup }) });
    };
    const sendPhoto = async (chatId, photoData, caption, markup = null) => {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', caption);
        formData.append('parse_mode', 'Markdown');
        if (markup) formData.append('reply_markup', JSON.stringify(markup));
        const blob = new Blob([atob(photoData.split(',')[1]).split('').map(c => c.charCodeAt(0))], { type: 'image/jpeg' });
        formData.append('photo', blob, 'image.jpg');
        await fetch(`${TG_BASE}${config.botToken}/sendPhoto`, { method: 'POST', body: formData });
    };
    const answerCallback = async (id) => {
        await fetch(`${TG_BASE}${config.botToken}/answerCallbackQuery`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ callback_query_id: id }) });
    };

    const mainMenu = { inline_keyboard: [[{ text: "🛍 محصولات", callback_data: "cmd_products" }, { text: "🔍 جستجو", callback_data: "cmd_search" }], [{ text: "📞 پشتیبانی", callback_data: "cmd_contact" }]] };

    for (const update of data.result) {
        if (update.update_id > lastUpdateId) lastUpdateId = update.update_id;

        // Callback Queries
        if (update.callback_query) {
            const cb = update.callback_query;
            const data = cb.data;
            const chatId = cb.message.chat.id;
            await answerCallback(cb.id);

            if (data === 'cmd_products') {
                const btns = categories.map(c => [{ text: `📂 ${c.name}`, callback_data: `cat_${c.id}` }]);
                btns.push([{ text: "🔙 منو", callback_data: "cmd_start" }]);
                await sendMsg(chatId, "🗂 دسته‌بندی را انتخاب کنید:", { inline_keyboard: btns });
            } 
            else if (data.startsWith('cat_')) {
                const catId = data.split('_')[1];
                const prods = products.filter(p => p.category === catId);
                const btns = prods.map(p => [{ text: p.name, callback_data: `prod_${p.id}` }]);
                btns.push([{ text: "🔙 بازگشت", callback_data: "cmd_products" }]);
                await sendMsg(chatId, "👇 محصول را انتخاب کنید:", { inline_keyboard: btns });
            }
            else if (data.startsWith('prod_')) {
                const p = products.find(prod => prod.id === data.split('_')[1]);
                if (p) {
                    const caption = `🛍 *${p.name}*\n🔢 کد: ${p.productCode || '---'}\n💵 قیمت: ${Number(p.price).toLocaleString()} تومان\n\n📝 ${p.description}`;
                    const markup = { inline_keyboard: [[{ text: "🛒 خرید", callback_data: `buy_${p.id}` }], [{ text: "🔙 بازگشت", callback_data: `cat_${p.category}` }]] };
                    if (p.imageUrl && p.imageUrl.startsWith('data:')) await sendPhoto(chatId, p.imageUrl, caption, markup);
                    else await sendMsg(chatId, caption, markup);
                }
            }
            else if (data.startsWith('buy_')) {
                const pid = data.split('_')[1];
                const p = products.find(prod => prod.id === pid);
                if (p) {
                    userSessions[chatId] = { step: 'NAME', productId: pid, productName: p.name, price: p.price };
                    await sendMsg(chatId, `📝 *ثبت سفارش: ${p.name}*\n\nلطفاً *نام و نام خانوادگی* خود را وارد کنید:`);
                }
            }
            else if (data === 'cmd_start') await sendMsg(chatId, "🏠 منوی اصلی:", mainMenu);
            
            continue;
        }

        // Text Messages (Wizard Logic)
        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            if (userSessions[chatId] && text !== '/start') {
                const session = userSessions[chatId];
                if (session.step === 'NAME') {
                    session.customerName = text;
                    session.step = 'ADDRESS';
                    await sendMsg(chatId, `✅ نام ثبت شد.\n📍 لطفاً *آدرس دقیق* خود را وارد کنید:`);
                } else if (session.step === 'ADDRESS') {
                    session.customerAddress = text;
                    session.step = 'PHONE';
                    await sendMsg(chatId, `✅ آدرس ثبت شد.\n📞 لطفاً *شماره تماس* خود را وارد کنید:`);
                } else if (session.step === 'PHONE') {
                    // Save Order
                    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
                    await pool.query('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                    [orderId, session.customerName, text, session.customerAddress, session.price, 'PENDING', JSON.stringify([{productId: session.productId, productName: session.productName, quantity: 1, priceAtTime: session.price}]), Date.now()]);
                    
                    delete userSessions[chatId];
                    await sendMsg(chatId, `🎉 *سفارش شما با موفقیت ثبت شد!*\n🧾 کد پیگیری: \`${orderId}\`\n\nهمکاران ما با شما تماس خواهند گرفت.`, mainMenu);
                }
                continue;
            }

            if (text === '/start') {
                await sendMsg(chatId, `👋 سلام! به فروشگاه ما خوش آمدید.`, mainMenu);
            }
        }
    }
  } catch (e) { /* polling error */ }
}

setInterval(runBot, 2000);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});