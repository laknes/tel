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
const PUBLIC_URL = process.env.PUBLIC_URL || `http://127.0.0.1:${PORT}`;

console.log(`🚀 Server Starting on Port ${PORT}`);
console.log(`🔗 Web App URL: ${PUBLIC_URL}`);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// DB Config (Matches update.sh reset)
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'teleshop_db',
  multipleStatements: true
};

let pool;

async function initDB() {
  try {
    console.log('🔄 Connecting to Database...');
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempConnection.end();

    pool = mysql.createPool(dbConfig);
    
    // Test Connection
    await pool.query('SELECT 1');
    console.log('✅ Database Connected Successfully!');

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
    
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) await pool.query('INSERT INTO users VALUES (?, ?, ?, ?, ?)', ['admin', '123', 'مدیر سیستم', 'ADMIN', true]);
    
  } catch (error) { 
    console.error('❌ DB CONNECTION FAILED:', error.message);
    console.error('⚠️  Run ./update.sh to fix database permissions.');
  }
}

initDB();

const checkDB = (req, res, next) => {
  if (!pool) return res.status(500).json({ success: false, message: 'Database disconnected' });
  next();
};

// --- APIs ---
app.post('/api/login', checkDB, async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.json({ success: false, message: 'User not found' });
    if (rows[0].password !== password) return res.json({ success: false, message: 'Wrong password' });
    res.json({ success: true, user: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products', checkDB, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM products');
  res.json(rows);
});
app.post('/api/products', checkDB, async (req, res) => {
  const p = req.body;
  await pool.query('INSERT INTO products (id, productCode, name, price, itemsPerPackage, category, description, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE productCode=?, name=?, price=?, itemsPerPackage=?, category=?, description=?, imageUrl=?', [p.id, p.productCode, p.name, p.price, p.itemsPerPackage || 1, p.category, p.description, p.imageUrl, p.createdAt, p.productCode, p.name, p.price, p.itemsPerPackage || 1, p.category, p.description, p.imageUrl]);
  res.json({ success: true });
});
app.delete('/api/products/:id', checkDB, async (req, res) => {
  await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/categories', checkDB, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM categories');
  res.json(rows);
});
app.post('/api/categories', checkDB, async (req, res) => {
  const c = req.body;
  await pool.query('INSERT INTO categories VALUES (?, ?) ON DUPLICATE KEY UPDATE name=?', [c.id, c.name, c.name]);
  res.json({ success: true });
});
app.delete('/api/categories/:id', checkDB, async (req, res) => {
  await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/orders', checkDB, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
  res.json(rows.map(r => ({ ...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items, customerAddress: typeof r.customerAddress === 'string' ? JSON.parse(r.customerAddress) : r.customerAddress })));
});
app.post('/api/orders', checkDB, async (req, res) => {
  const o = req.body;
  await pool.query('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=?', [o.id, o.customerName, o.customerPhone, JSON.stringify(o.address), o.shippingMethod, o.shippingCost, o.totalAmount, o.status, JSON.stringify(o.items), o.createdAt, o.status]);
  if (o.customerId) {
      await pool.query('DELETE FROM carts WHERE userId = ?', [o.customerId]);
  }
  res.json({ success: true });
});

app.get('/api/config/telegram', checkDB, async (req, res) => {
  const [rows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['telegram']);
  res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : null);
});
app.post('/api/config/telegram', checkDB, async (req, res) => {
  await pool.query('INSERT INTO configs VALUES (?, ?) ON DUPLICATE KEY UPDATE data=?', ['telegram', JSON.stringify(req.body), JSON.stringify(req.body)]);
  res.json({ success: true });
});

app.get('/api/verified-users', checkDB, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM verified_users');
  res.json(rows);
});
app.post('/api/verified-users', checkDB, async (req, res) => {
  const u = req.body;
  await pool.query('INSERT INTO verified_users VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE phoneNumber=?', [u.userId, u.firstName, u.lastName, u.username, u.phoneNumber, u.verifiedAt, u.phoneNumber]);
  res.json({ success: true });
});

app.get('/api/store/shipping-methods', checkDB, async (req, res) => {
    const [rows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['shipping']);
    res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : []);
});
app.post('/api/store/shipping-methods', checkDB, async (req, res) => {
    await pool.query('INSERT INTO configs VALUES (?, ?) ON DUPLICATE KEY UPDATE data=?', ['shipping', JSON.stringify(req.body), JSON.stringify(req.body)]);
    res.json({ success: true });
});
app.post('/api/store/login', checkDB, async (req, res) => {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length > 0 && rows[0].password === password) res.json({ success: true, user: rows[0] });
    else res.json({ success: false, message: 'Invalid credentials' });
});
app.post('/api/store/register', checkDB, async (req, res) => {
    const { username, password, fullName } = req.body;
    try {
        await pool.query('INSERT INTO users VALUES (?, ?, ?, ?, ?)', [username, password, fullName, 'CUSTOMER', true]);
        res.json({ success: true, user: { username, fullName, role: 'CUSTOMER' } });
    } catch(e) { res.json({ success: false, message: 'User exists' }); }
});

// Get Cart Items
app.get('/api/store/cart/:userId', checkDB, async (req, res) => {
    try {
        const [cartRows] = await pool.query('SELECT items FROM carts WHERE userId = ?', [req.params.userId]);
        if (cartRows.length === 0) return res.json([]);
        const items = typeof cartRows[0].items === 'string' ? JSON.parse(cartRows[0].items) : cartRows[0].items;
        const [products] = await pool.query('SELECT * FROM products');
        const fullItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return product ? { ...product, quantity: item.quantity } : null;
        }).filter(i => i !== null);
        res.json(fullItems);
    } catch (e) { res.status(500).json([]); }
});

// --- TELEGRAM BOT ---
const TG_BASE = 'https://api.telegram.org/bot';
let lastUpdateId = 0;

const dataURItoBuffer = (dataURI) => {
  if (!dataURI || !dataURI.startsWith('data:')) return null;
  const byteString = atob(dataURI.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  return Buffer.from(ia);
};

async function runBot() {
  if (!pool) return;
  try {
    const [configRows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['telegram']);
    if (configRows.length === 0) return;
    const config = typeof configRows[0].data === 'string' ? JSON.parse(configRows[0].data) : configRows[0].data;
    if (!config || !config.botToken) return;

    const offset = lastUpdateId + 1;
    const res = await fetch(`${TG_BASE}${config.botToken}/getUpdates?offset=${offset}&limit=50&timeout=0`);
    const data = await res.json();

    if (!data.ok || !data.result || data.result.length === 0) return;

    const [products] = await pool.query('SELECT * FROM products');
    const [categories] = await pool.query('SELECT * FROM categories');
    
    const sendMsg = async (chatId, text, markup = null) => {
        const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
        if (markup) body.reply_markup = markup;
        await fetch(`${TG_BASE}${config.botToken}/sendMessage`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
    };

    const sendPhoto = async (chatId, photoData, caption, markup = null) => {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', caption);
        formData.append('parse_mode', 'Markdown');
        if (markup) formData.append('reply_markup', JSON.stringify(markup));
        const blob = new Blob([photoData], { type: 'image/jpeg' });
        formData.append('photo', blob, 'image.jpg');
        await fetch(`${TG_BASE}${config.botToken}/sendPhoto`, { method: 'POST', body: formData });
    };

    const answerCallback = async (callbackId, text) => {
        await fetch(`${TG_BASE}${config.botToken}/answerCallbackQuery`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ callback_query_id: callbackId, text }) });
    };

    const mainMenuInline = {
        inline_keyboard: [[{ text: "🛍 محصولات", callback_data: "cmd_products" }, { text: "🛒 سبد خرید", callback_data: "cmd_cart" }], [{ text: "🔍 جستجو", callback_data: "cmd_search" }, { text: "📞 ارتباط با ما", callback_data: "cmd_contact" }]]
    };

    for (const update of data.result) {
        if (update.update_id > lastUpdateId) lastUpdateId = update.update_id;

        const CART_LINK = (uid) => `${PUBLIC_URL}?cart=${uid}`;

        if (update.inline_query) {
            const query = update.inline_query.query.toLowerCase();
            const filtered = products.filter(p => p.name.toLowerCase().includes(query) || (p.productCode && p.productCode.toLowerCase().includes(query))).slice(0, 20);
            const results = filtered.map(p => ({
                type: 'article', id: p.id, title: p.name,
                description: `کد: ${p.productCode || '-'} | ${Number(p.price).toLocaleString()} تومان`,
                thumb_url: p.imageUrl || 'https://via.placeholder.com/100',
                input_message_content: { message_text: `🛍 *${p.name}*\n💵 ${Number(p.price).toLocaleString()} تومان`, parse_mode: 'Markdown' },
                reply_markup: { inline_keyboard: [[{ text: "🛒 مشاهده سبد", callback_data: "cmd_cart" }]] }
            }));
            await fetch(`${TG_BASE}${config.botToken}/answerInlineQuery`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ inline_query_id: update.inline_query.id, results, cache_time: 1 }) });
            continue;
        }

        if (update.callback_query) {
            const cb = update.callback_query;
            const data = cb.data;
            const chatId = cb.message.chat.id;
            const userId = cb.from.id;

            if (data.startsWith('add_')) {
                const pid = data.split('_')[1];
                const [cartRows] = await pool.query('SELECT items FROM carts WHERE userId = ?', [userId]);
                let items = cartRows.length ? (typeof cartRows[0].items === 'string' ? JSON.parse(cartRows[0].items) : cartRows[0].items) : [];
                const exist = items.find(i => i.productId === pid);
                if (exist) exist.quantity++;
                else items.push({ productId: pid, quantity: 1 });
                await pool.query('INSERT INTO carts VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE items=?, updatedAt=?', [userId, JSON.stringify(items), Date.now(), JSON.stringify(items), Date.now()]);
                await answerCallback(cb.id, "✅ به سبد خرید اضافه شد");
                continue;
            }

            if (data === 'cmd_clear') {
                await pool.query('DELETE FROM carts WHERE userId = ?', [userId]);
                await answerCallback(cb.id, "سبد خالی شد");
                await sendMsg(chatId, "🗑 سبد خرید شما خالی شد.", mainMenuInline);
                continue;
            }

            if (data === 'cmd_cart') {
                await answerCallback(cb.id);
                const [cartRows] = await pool.query('SELECT items FROM carts WHERE userId = ?', [userId]);
                const items = cartRows.length ? (typeof cartRows[0].items === 'string' ? JSON.parse(cartRows[0].items) : cartRows[0].items) : [];
                
                if (items.length === 0) {
                    await sendMsg(chatId, "🛒 سبد خرید شما خالی است.", mainMenuInline);
                } else {
                    let msg = "🛒 *سبد خرید شما:*\n\n";
                    let total = 0;
                    items.forEach(i => {
                        const p = products.find(prod => prod.id === i.productId);
                        if (p) {
                            const sub = p.price * i.quantity;
                            total += sub;
                            msg += `🔸 ${p.name} (${i.quantity} عدد) - ${sub.toLocaleString()} ت\n`;
                        }
                    });
                    msg += `\n💵 *جمع کل: ${total.toLocaleString()} تومان*`;
                    
                    await sendMsg(chatId, msg, {
                        inline_keyboard: [
                            [{ text: "💳 تکمیل خرید (Web App)", url: CART_LINK(userId) }],
                            [{ text: "❌ خالی کردن سبد", callback_data: "cmd_clear" }],
                            [{ text: "🔙 بازگشت", callback_data: "cmd_start" }]
                        ]
                    });
                }
                continue;
            }

            if (data === 'cmd_products') {
                if (categories.length === 0) {
                     const productButtons = products.slice(0, 20).map(p => ([{ text: `${p.name}`, callback_data: `prod_${p.id}` }]));
                    productButtons.push([{ text: "🔙 بازگشت", callback_data: "cmd_start" }]);
                    await sendMsg(chatId, "🛍 *محصولات:*", { inline_keyboard: productButtons });
                } else {
                    const catButtons = categories.map(c => ([{ text: `📂 ${c.name}`, callback_data: `cat_${c.id}` }]));
                    catButtons.push([{ text: "🔙 بازگشت", callback_data: "cmd_start" }]);
                    await sendMsg(chatId, "🗂 *انتخاب دسته بندی:*", { inline_keyboard: catButtons });
                }
            } 
            else if (data.startsWith('cat_')) {
                const catId = data.split('_')[1];
                const filteredProducts = products.filter(p => p.category === catId);
                const productButtons = filteredProducts.slice(0, 20).map(p => ([{ text: `${p.name}`, callback_data: `prod_${p.id}` }]));
                productButtons.push([{ text: "🔙 بازگشت", callback_data: "cmd_products" }]);
                await sendMsg(chatId, `📂 محصولات دسته بندی:`, { inline_keyboard: productButtons });
            }
            else if (data.startsWith('prod_')) {
                const pid = data.split('_')[1];
                const product = products.find(p => p.id === pid);
                if (product) {
                    const caption = `🛍 *${product.name}*\n🔢 کد: ${product.productCode || '---'}\n📦 بسته: ${product.itemsPerPackage || 1} عدد\n💵 قیمت: ${Number(product.price).toLocaleString()} تومان\n\n📝 ${product.description}`;
                    const itemMarkup = { 
                        inline_keyboard: [
                            [{ text: "➕ افزودن به سبد خرید", callback_data: `add_${product.id}` }], 
                            [{ text: "🔙 بازگشت", callback_data: `cat_${product.category}` }]
                        ] 
                    };
                    if (product.imageUrl && product.imageUrl.startsWith('data:')) {
                        const buffer = dataURItoBuffer(product.imageUrl);
                        if (buffer) await sendPhoto(chatId, buffer, caption, itemMarkup);
                        else await sendMsg(chatId, caption, itemMarkup);
                    } else await sendMsg(chatId, caption, itemMarkup);
                }
            }
            else if (data === 'cmd_start') await sendMsg(chatId, "🏠 *منوی اصلی*", mainMenuInline);
            
            await answerCallback(cb.id);
            continue;
        }

        if (update.message && update.message.text === '/start') {
            await sendMsg(update.message.chat.id, config.welcomeMessage || `👋 سلام! به فروشگاه ما خوش آمدید.`, mainMenuInline);
        }
    }
  } catch (e) { }
}

setInterval(runBot, 2000);

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});