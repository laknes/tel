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
// Robust Public URL detection
const PUBLIC_URL = process.env.PUBLIC_URL || `http://127.0.0.1:${PORT}`;

console.log('--- SYSTEM STARTUP ---');
console.log(`🌍 Server running at: http://0.0.0.0:${PORT}`);
console.log(`🔗 Web App Public Link: ${PUBLIC_URL}`);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, 'dist')));

// --- DATABASE CONNECTION ---
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '', // Optimized for tel.sh script
  database: 'teleshop_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
};

let pool;

async function initDB() {
  let retries = 5;
  while (retries > 0) {
    try {
      console.log(`🔄 Connecting to Database... (${retries} attempts left)`);
      const tempConn = await mysql.createConnection({
        host: dbConfig.host, user: dbConfig.user, password: dbConfig.password
      });
      await tempConn.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
      await tempConn.end();

      pool = mysql.createPool(dbConfig);
      await pool.query('SELECT 1'); // Test connection
      console.log('✅ Database Connected Successfully!');
      
      await initTables();
      return;
    } catch (e) {
      console.error(`⚠️ DB Error: ${e.message}`);
      retries--;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  console.error('❌ CRITICAL: Could not connect to Database. Run ./tel.sh to repair.');
}

async function initTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS products (id VARCHAR(255) PRIMARY KEY, productCode VARCHAR(50), name VARCHAR(255), price DECIMAL(15,0), itemsPerPackage INT DEFAULT 1, category VARCHAR(255), description TEXT, imageUrl LONGTEXT, createdAt BIGINT)`,
      `CREATE TABLE IF NOT EXISTS categories (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255))`,
      `CREATE TABLE IF NOT EXISTS users (username VARCHAR(255) PRIMARY KEY, password VARCHAR(255), fullName VARCHAR(255), role VARCHAR(50), isVerified BOOLEAN DEFAULT FALSE)`,
      `CREATE TABLE IF NOT EXISTS verified_users (userId BIGINT PRIMARY KEY, firstName VARCHAR(255), lastName VARCHAR(255), username VARCHAR(255), phoneNumber VARCHAR(50), verifiedAt BIGINT)`,
      `CREATE TABLE IF NOT EXISTS orders (id VARCHAR(255) PRIMARY KEY, customerName VARCHAR(255), customerPhone VARCHAR(50), customerAddress JSON, shippingMethod VARCHAR(255), shippingCost DECIMAL(15,0), totalAmount DECIMAL(15,0), status VARCHAR(50), items JSON, createdAt BIGINT)`,
      `CREATE TABLE IF NOT EXISTS carts (userId VARCHAR(255) PRIMARY KEY, items JSON, updatedAt BIGINT)`,
      `CREATE TABLE IF NOT EXISTS configs (id VARCHAR(50) PRIMARY KEY, data JSON)`
    ];

    for (const sql of tables) await pool.query(sql);
    
    // Seed Admin
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
        await pool.query('INSERT INTO users VALUES (?, ?, ?, ?, ?)', ['admin', '123', 'مدیر سیستم', 'ADMIN', true]);
    }
    
    // Seed Shipping
    const [shipRows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['shipping']);
    if (shipRows.length === 0) {
        const defaultShipping = [{ id: 'post', name: 'پست پیشتاز', cost: 45000, estimatedDays: '۳ تا ۵ روز کاری' }, { id: 'tipax', name: 'تیپاکس', cost: 0, estimatedDays: '۲ تا ۳ روز کاری' }];
        await pool.query('INSERT INTO configs VALUES (?, ?)', ['shipping', JSON.stringify(defaultShipping)]);
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
        res.json({ success: false, message: 'اطلاعات ورود اشتباه است' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Products
app.get('/api/products', checkDB, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM products'); res.json(rows); } catch { res.json([]); }
});
app.post('/api/products', checkDB, async (req, res) => {
  const p = req.body;
  await pool.query('INSERT INTO products (id, productCode, name, price, itemsPerPackage, category, description, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE productCode=?, name=?, price=?, itemsPerPackage=?, category=?, description=?, imageUrl=?', 
  [p.id, p.productCode, p.name, p.price, p.itemsPerPackage || 1, p.category, p.description, p.imageUrl, p.createdAt, p.productCode, p.name, p.price, p.itemsPerPackage || 1, p.category, p.description, p.imageUrl]);
  res.json({ success: true });
});
app.delete('/api/products/:id', checkDB, async (req, res) => {
  await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// Categories
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

// Orders
app.get('/api/orders', checkDB, async (req, res) => {
  try {
      const [rows] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
      res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]'), customerAddress: JSON.parse(r.customerAddress || '{}') })));
  } catch { res.json([]); }
});
app.post('/api/orders', checkDB, async (req, res) => {
  const o = req.body;
  await pool.query('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=?', 
  [o.id, o.customerName, o.customerPhone, JSON.stringify(o.address), o.shippingMethod, o.shippingCost, o.totalAmount, o.status, JSON.stringify(o.items), o.createdAt, o.status]);
  
  if (o.customerId) await pool.query('DELETE FROM carts WHERE userId = ?', [o.customerId]); // Clear cart
  res.json({ success: true });
});

// Configs
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

// Store APIs
app.get('/api/store/shipping-methods', checkDB, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['shipping']);
        res.json(rows.length ? JSON.parse(rows[0].data) : []);
    } catch { res.json([]); }
});
app.post('/api/store/shipping-methods', checkDB, async (req, res) => {
    await pool.query('INSERT INTO configs VALUES (?, ?) ON DUPLICATE KEY UPDATE data=?', ['shipping', JSON.stringify(req.body), JSON.stringify(req.body)]);
    res.json({ success: true });
});
app.get('/api/store/cart/:userId', checkDB, async (req, res) => {
    try {
        const [cartRows] = await pool.query('SELECT items FROM carts WHERE userId = ?', [req.params.userId]);
        if (cartRows.length === 0) return res.json([]);
        const items = JSON.parse(cartRows[0].items || '[]');
        const [products] = await pool.query('SELECT * FROM products');
        const fullItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return product ? { ...product, quantity: item.quantity } : null;
        }).filter(i => i !== null);
        res.json(fullItems);
    } catch { res.json([]); }
});
app.post('/api/store/login', checkDB, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [req.body.username]);
        if (rows.length > 0 && rows[0].password === req.body.password) res.json({ success: true, user: rows[0] });
        else res.json({ success: false, message: 'رمز عبور اشتباه است' });
    } catch { res.json({ success: false, message: 'خطا' }); }
});
app.post('/api/store/register', checkDB, async (req, res) => {
    try {
        await pool.query('INSERT INTO users VALUES (?, ?, ?, ?, ?)', [req.body.username, req.body.password, req.body.fullName, 'CUSTOMER', true]);
        res.json({ success: true, user: { username: req.body.username, fullName: req.body.fullName, role: 'CUSTOMER' } });
    } catch { res.json({ success: false, message: 'این نام کاربری وجود دارد' }); }
});

// --- TELEGRAM BOT (POLLING) ---
const TG_BASE = 'https://api.telegram.org/bot';
let lastUpdateId = 0;

async function runBot() {
  if (!pool) return;
  try {
    const [configRows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['telegram']);
    if (configRows.length === 0) return;
    const config = JSON.parse(configRows[0].data);
    if (!config || !config.botToken) return;

    // Short Polling
    const res = await fetch(`${TG_BASE}${config.botToken}/getUpdates?offset=${lastUpdateId + 1}&limit=50&timeout=0`);
    const data = await res.json();

    if (!data.ok || !data.result || data.result.length === 0) return;

    const [products] = await pool.query('SELECT * FROM products');
    const [categories] = await pool.query('SELECT * FROM categories');
    
    // Helper Functions
    const sendMsg = async (chatId, text, markup = null) => {
        await fetch(`${TG_BASE}${config.botToken}/sendMessage`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', reply_markup: markup }) });
    };
    const answerCallback = async (id, text = null) => {
        await fetch(`${TG_BASE}${config.botToken}/answerCallbackQuery`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ callback_query_id: id, text }) });
    };

    // Main Menu
    const mainMenu = { inline_keyboard: [[{ text: "🛍 محصولات", callback_data: "cmd_products" }, { text: "🛒 سبد خرید", callback_data: "cmd_cart" }], [{ text: "🔍 جستجو", callback_data: "cmd_search" }, { text: "📞 پشتیبانی", callback_data: "cmd_contact" }]] };

    for (const update of data.result) {
        if (update.update_id > lastUpdateId) lastUpdateId = update.update_id;

        // Dynamic Cart Link
        const CART_LINK = `${PUBLIC_URL}/?cart=${update.callback_query ? update.callback_query.from.id : (update.message ? update.message.from.id : '')}`;

        // 1. INLINE QUERY
        if (update.inline_query) {
            const query = update.inline_query.query.toLowerCase();
            const filtered = products.filter(p => p.name.toLowerCase().includes(query) || (p.productCode && p.productCode.toLowerCase().includes(query))).slice(0, 20);
            const results = filtered.map(p => ({
                type: 'article', id: p.id, title: p.name,
                description: `${p.price.toLocaleString()} تومان`,
                input_message_content: { message_text: `🛍 ${p.name}\n💰 ${p.price.toLocaleString()} تومان`, parse_mode: 'Markdown' },
                reply_markup: { inline_keyboard: [[{ text: "➕ افزودن به سبد", callback_data: `add_${p.id}` }]] }
            }));
            await fetch(`${TG_BASE}${config.botToken}/answerInlineQuery`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ inline_query_id: update.inline_query.id, results, cache_time: 1 }) });
            continue;
        }

        // 2. CALLBACKS
        if (update.callback_query) {
            const cb = update.callback_query;
            const data = cb.data;
            const chatId = cb.message.chat.id;
            const userId = cb.from.id;

            // Add to Cart
            if (data.startsWith('add_')) {
                const pid = data.split('_')[1];
                const [cartRows] = await pool.query('SELECT items FROM carts WHERE userId = ?', [userId]);
                let items = cartRows.length ? JSON.parse(cartRows[0].items) : [];
                const exist = items.find(i => i.productId === pid);
                if (exist) exist.quantity++; else items.push({ productId: pid, quantity: 1 });
                await pool.query('INSERT INTO carts VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE items=?, updatedAt=?', [userId, JSON.stringify(items), Date.now(), JSON.stringify(items), Date.now()]);
                await answerCallback(cb.id, "✅ به سبد اضافه شد");
                continue;
            }

            // View Cart
            if (data === 'cmd_cart') {
                const [cartRows] = await pool.query('SELECT items FROM carts WHERE userId = ?', [userId]);
                const items = cartRows.length ? JSON.parse(cartRows[0].items) : [];
                if (items.length === 0) {
                    await sendMsg(chatId, "🛒 سبد خرید خالی است.", mainMenu);
                } else {
                    let msg = "🛒 *سبد خرید شما:*\n\n";
                    let total = 0;
                    items.forEach(i => {
                        const p = products.find(prod => prod.id === i.productId);
                        if (p) {
                            total += p.price * i.quantity;
                            msg += `▪️ ${p.name} (${i.quantity} عدد)\n`;
                        }
                    });
                    msg += `\n💵 *جمع کل: ${total.toLocaleString()} تومان*`;
                    await sendMsg(chatId, msg, { inline_keyboard: [[{ text: "💳 تکمیل خرید (Web App)", url: CART_LINK }], [{ text: "❌ خالی کردن", callback_data: "cmd_clear" }], [{ text: "🔙 منو", callback_data: "cmd_start" }]] });
                }
                await answerCallback(cb.id);
                continue;
            }

            // Clear Cart
            if (data === 'cmd_clear') {
                await pool.query('DELETE FROM carts WHERE userId = ?', [userId]);
                await answerCallback(cb.id, "سبد خالی شد");
                await sendMsg(chatId, "🗑 سبد خرید پاک شد.", mainMenu);
                continue;
            }

            // Products List (Categories)
            if (data === 'cmd_products') {
                const btns = categories.map(c => [{ text: `📂 ${c.name}`, callback_data: `cat_${c.id}` }]);
                btns.push([{ text: "🔙 منو", callback_data: "cmd_start" }]);
                await sendMsg(chatId, "🗂 دسته‌بندی را انتخاب کنید:", { inline_keyboard: btns });
                await answerCallback(cb.id);
                continue;
            }

            // Products in Category
            if (data.startsWith('cat_')) {
                const catId = data.split('_')[1];
                const prods = products.filter(p => p.category === catId);
                const btns = prods.map(p => [{ text: p.name, callback_data: `prod_${p.id}` }]);
                btns.push([{ text: "🔙 بازگشت", callback_data: "cmd_products" }]);
                await sendMsg(chatId, "👇 محصول را انتخاب کنید:", { inline_keyboard: btns });
                await answerCallback(cb.id);
                continue;
            }

            // Product Detail
            if (data.startsWith('prod_')) {
                const p = products.find(prod => prod.id === data.split('_')[1]);
                if (p) {
                    const caption = `🛍 *${p.name}*\n📦 بسته: ${p.itemsPerPackage || 1} تایی\n💵 قیمت: ${Number(p.price).toLocaleString()} تومان\n\n📝 ${p.description}`;
                    await sendMsg(chatId, caption, { inline_keyboard: [[{ text: "➕ افزودن به سبد", callback_data: `add_${p.id}` }], [{ text: "🔙 بازگشت", callback_data: `cat_${p.category}` }]] });
                }
                await answerCallback(cb.id);
                continue;
            }

            if (data === 'cmd_start') {
                await sendMsg(chatId, "🏠 منوی اصلی:", mainMenu);
                await answerCallback(cb.id);
                continue;
            }
        }

        // 3. MESSAGES
        if (update.message && update.message.text === '/start') {
            await sendMsg(update.message.chat.id, `👋 سلام! به فروشگاه ما خوش آمدید.\nاز دکمه‌های زیر استفاده کنید.`, mainMenu);
        }
    }
  } catch (e) { /* Ignore polling errors */ }
}

setInterval(runBot, 2000);

// --- SPA Fallback ---
// IMPORTANT: This must be the LAST route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});