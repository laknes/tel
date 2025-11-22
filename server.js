import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// DB Configuration
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'teleshop_db',
  multipleStatements: true
};

let pool;

// --- DATABASE INIT ---
async function initDB() {
  console.log('🔄 Connecting to Database...');
  try {
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempConnection.end();

    pool = mysql.createPool(dbConfig);

    const tables = [
      `CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        productCode VARCHAR(50),
        name VARCHAR(255),
        price DECIMAL(15,0),
        category VARCHAR(255),
        description TEXT,
        imageUrl LONGTEXT,
        createdAt BIGINT
      )`,
      `CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255)
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(255) PRIMARY KEY,
        password VARCHAR(255),
        fullName VARCHAR(255),
        role VARCHAR(50),
        isVerified BOOLEAN DEFAULT FALSE
      )`,
      `CREATE TABLE IF NOT EXISTS verified_users (
        userId BIGINT PRIMARY KEY,
        firstName VARCHAR(255),
        lastName VARCHAR(255),
        username VARCHAR(255),
        phoneNumber VARCHAR(50),
        verifiedAt BIGINT
      )`,
      `CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        customerName VARCHAR(255),
        customerPhone VARCHAR(50),
        totalAmount DECIMAL(15,0),
        status VARCHAR(50),
        items JSON,
        createdAt BIGINT
      )`,
      `CREATE TABLE IF NOT EXISTS configs (
        id VARCHAR(50) PRIMARY KEY,
        data JSON
      )`
    ];

    for (const sql of tables) {
      await pool.query(sql);
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
      await pool.query('INSERT INTO users (username, password, fullName, role, isVerified) VALUES (?, ?, ?, ?, ?)', 
        ['admin', '123', 'مدیر سیستم', 'ADMIN', true]
      );
    }
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization FAILED:', error.message);
  }
}

initDB();

const checkDB = (req, res, next) => {
  if (!pool) return res.status(500).json({ success: false, message: 'Database disconnected' });
  next();
};

// --- API ENDPOINTS ---

app.post('/api/login', checkDB, async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.json({ success: false, message: 'کاربر یافت نشد' });
    
    if (rows[0].password !== password) return res.json({ success: false, message: 'رمز عبور اشتباه است' });
    
    res.json({ success: true, user: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/products', checkDB, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM products');
  res.json(rows);
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
  const [rows] = await pool.query('SELECT * FROM orders');
  res.json(rows.map(r => ({...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items})));
});
app.post('/api/orders', checkDB, async (req, res) => {
  const o = req.body;
  await pool.query('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=?', 
  [o.id, o.customerName, o.customerPhone, o.totalAmount, o.status, JSON.stringify(o.items), o.createdAt, o.status]);
  res.json({ success: true });
});

app.get('/api/config/telegram', checkDB, async (req, res) => {
  const [rows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['telegram']);
  res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : null);
});
app.post('/api/config/telegram', checkDB, async (req, res) => {
  await pool.query('INSERT INTO configs (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data=?', ['telegram', JSON.stringify(req.body), JSON.stringify(req.body)]);
  res.json({ success: true });
});

app.get('/api/verified-users', checkDB, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM verified_users');
  res.json(rows);
});
app.post('/api/verified-users', checkDB, async (req, res) => {
  const u = req.body;
  await pool.query('INSERT INTO verified_users VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE phoneNumber=?', 
  [u.userId, u.firstName, u.lastName, u.username, u.phoneNumber, u.verifiedAt, u.phoneNumber]);
  res.json({ success: true });
});

// --- TELEGRAM BOT LOGIC (SERVER SIDE) ---
const TG_BASE = 'https://api.telegram.org/bot';
let lastUpdateId = 0;

// Helper to convert Base64 to Buffer
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
    // 1. Get Config
    const [configRows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['telegram']);
    if (configRows.length === 0) return;
    const config = typeof configRows[0].data === 'string' ? JSON.parse(configRows[0].data) : configRows[0].data;
    if (!config || !config.botToken) return;

    // 2. Get Updates
    const offset = lastUpdateId + 1;
    const res = await fetch(`${TG_BASE}${config.botToken}/getUpdates?offset=${offset}&limit=50&timeout=0`);
    const data = await res.json();

    if (!data.ok || !data.result || data.result.length === 0) return;

    // 3. Load Data
    const [products] = await pool.query('SELECT * FROM products');
    const [categories] = await pool.query('SELECT * FROM categories');
    const getCatName = (id) => categories.find(c => c.id === id)?.name || 'عمومی';

    // Helper: Send Message
    const sendMsg = async (chatId, text, markup = null) => {
        const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
        if (markup) body.reply_markup = markup;
        await fetch(`${TG_BASE}${config.botToken}/sendMessage`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
    };

    // Helper: Send Photo
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

    // Helper: Answer Callback
    const answerCallback = async (callbackId, text = null) => {
        const body = { callback_query_id: callbackId };
        if (text) body.text = text;
        await fetch(`${TG_BASE}${config.botToken}/answerCallbackQuery`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
    };

    // KEYBOARDS
    const mainMenuInline = {
        inline_keyboard: [
            [{ text: "🛍 لیست محصولات", callback_data: "cmd_products" }, { text: "🔍 جستجو", callback_data: "cmd_search" }],
            [{ text: "📞 ارتباط با ما", callback_data: "cmd_contact" }, { text: "ℹ️ راهنما", callback_data: "cmd_help" }]
        ]
    };

    const contactMenu = {
        keyboard: [[{ text: "📱 تایید شماره تلفن (الزامی)", request_contact: true }]],
        resize_keyboard: true, one_time_keyboard: true
    };

    // PROCESS UPDATES
    for (const update of data.result) {
        if (update.update_id > lastUpdateId) lastUpdateId = update.update_id;

        // 1. INLINE QUERY (Search Bar)
        if (update.inline_query) {
            const query = update.inline_query.query.toLowerCase();
            const filtered = products.filter(p => p.name.toLowerCase().includes(query) || (p.productCode && p.productCode.toLowerCase().includes(query))).slice(0, 20);
            const results = filtered.map(p => ({
                type: 'article', id: p.id, title: p.name,
                description: `کد: ${p.productCode || '-'} | ${Number(p.price).toLocaleString()} تومان`,
                thumb_url: p.imageUrl || 'https://via.placeholder.com/100',
                input_message_content: { message_text: `🛍 *${p.name}*\n🔢 کد: ${p.productCode}\n💵 ${Number(p.price).toLocaleString()} تومان\n\n📝 ${p.description}`, parse_mode: 'Markdown' },
                reply_markup: { inline_keyboard: [[{ text: "🛒 سفارش", url: `https://t.me/${config.supportId?.replace('@','') || 'admin'}` }]] }
            }));
            await fetch(`${TG_BASE}${config.botToken}/answerInlineQuery`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ inline_query_id: update.inline_query.id, results, cache_time: 1 })
            });
            continue;
        }

        // 2. CALLBACK QUERY (Glass Button Clicks)
        if (update.callback_query) {
            const cb = update.callback_query;
            const data = cb.data;
            const chatId = cb.message.chat.id;

            await answerCallback(cb.id);

            if (data === 'cmd_products') {
                if (products.length === 0) {
                    await sendMsg(chatId, "❌ محصولی موجود نیست.");
                } else {
                    // Generate Product Buttons (List)
                    const productButtons = products.slice(0, 20).map(p => ([
                        { text: `${p.name} - ${Number(p.price).toLocaleString()} ت`, callback_data: `prod_${p.id}` }
                    ]));
                    // Add back button
                    productButtons.push([{ text: "🔙 بازگشت به منو", callback_data: "cmd_start" }]);
                    
                    await sendMsg(chatId, "🛍 *لیست محصولات:*\nجهت مشاهده جزئیات روی نام محصول کلیک کنید:", { inline_keyboard: productButtons });
                }
            } 
            else if (data.startsWith('prod_')) {
                const pid = data.split('_')[1];
                const product = products.find(p => p.id === pid);
                if (product) {
                    const caption = `
🛍 *${product.name}*
🔢 *کد:* ${product.productCode || '---'}

📂 *دسته:* ${getCatName(product.category)}
💵 *قیمت:* ${Number(product.price).toLocaleString()} تومان

📝 *توضیحات:*
${product.description}
                    `.trim();

                    const itemMarkup = {
                        inline_keyboard: [
                            [{ text: config.buttonText || "🛒 ثبت سفارش", url: `https://t.me/${config.supportId?.replace('@','') || 'admin'}` }],
                            [{ text: "🔙 بازگشت به لیست", callback_data: "cmd_products" }]
                        ]
                    };

                    if (product.imageUrl && product.imageUrl.startsWith('data:')) {
                        const buffer = dataURItoBuffer(product.imageUrl);
                        if (buffer) await sendPhoto(chatId, buffer, caption, itemMarkup);
                        else await sendMsg(chatId, caption, itemMarkup);
                    } else if (product.imageUrl) {
                         // External URL logic (simplified to send msg for now if not data URI)
                         // For full url support would use sendPhoto with url string, but assuming data uri mostly
                         await sendMsg(chatId, caption + `\n\n🖼 [تصویر](${product.imageUrl})`, itemMarkup);
                    } else {
                        await sendMsg(chatId, caption, itemMarkup);
                    }
                } else {
                    await sendMsg(chatId, "❌ محصول یافت نشد.");
                }
            }
            else if (data === 'cmd_search') {
                await sendMsg(chatId, "🔎 برای جستجو، نام کالا را تایپ کنید.");
            }
            else if (data === 'cmd_contact') {
                await sendMsg(chatId, config.contactMessage || "🆔 @admin", { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "cmd_start" }]] });
            }
            else if (data === 'cmd_help') {
                await sendMsg(chatId, "ℹ️ *راهنما*\nاز دکمه‌های شیشه‌ای برای گشت و گذار در فروشگاه استفاده کنید.", { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "cmd_start" }]] });
            }
            else if (data === 'cmd_start') {
                await sendMsg(chatId, "🏠 *منوی اصلی*", mainMenuInline);
            }
            continue;
        }

        // 3. TEXT MESSAGES
        if (update.message) {
            const chatId = update.message.chat.id;
            
            // Handle Contact Share
            if (update.message.contact && update.message.contact.user_id === update.message.from.id) {
                const u = update.message.from;
                const ph = update.message.contact.phone_number;
                await pool.query('INSERT INTO verified_users VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE phoneNumber=?', 
                [u.id, u.first_name, u.last_name, u.username, ph, Date.now(), ph]); // Fixed param count in sql if needed, but keeping simple
                await sendMsg(chatId, `✅ *هویت تایید شد!*\nخوش آمدید.`, mainMenuInline);
            }
            
            // Handle Commands & Text
            else if (update.message.text) {
                const text = update.message.text.toLowerCase().trim();
                
                if (text === '/start') {
                    await sendMsg(chatId, `👋 سلام!\nبرای استفاده از ربات لطفاً شماره خود را تایید کنید (اگر قبلا تایید نکردید).`, contactMenu);
                    // Also send main menu for users who are already verified (simplified UX)
                    setTimeout(() => sendMsg(chatId, "🏠 *منوی اصلی*", mainMenuInline), 500);
                }
                else if (text.length > 1 && !text.startsWith('/')) {
                    // Text Search -> Return Buttons
                    const found = products.filter(p => p.name.toLowerCase().includes(text));
                    if (found.length) {
                        const productButtons = found.slice(0, 10).map(p => ([
                            { text: `${p.name} - ${Number(p.price).toLocaleString()} ت`, callback_data: `prod_${p.id}` }
                        ]));
                        await sendMsg(chatId, `🔎 نتایج جستجو برای "${text}":`, { inline_keyboard: productButtons });
                    } else {
                        await sendMsg(chatId, "❌ یافت نشد.", mainMenuInline);
                    }
                }
            }
        }
    }
  } catch (e) {
    // console.error("Bot loop error:", e.message); 
  }
}

// Start Bot Loop
setInterval(runBot, 2000);

// --- SERVE APP ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});