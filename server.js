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
        customerAddress TEXT,
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
    
    // Migration for existing databases
    try {
        await pool.query("ALTER TABLE orders ADD COLUMN customerAddress TEXT");
    } catch (e) { 
        // Ignore if column exists
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
  const [rows] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
  res.json(rows.map(r => ({...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items})));
});
app.post('/api/orders', checkDB, async (req, res) => {
  const o = req.body;
  await pool.query('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=?', 
  [o.id, o.customerName, o.customerPhone, o.customerAddress, o.totalAmount, o.status, JSON.stringify(o.items), o.createdAt, o.status]);
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

// --- ORDER WIZARD SESSION STORAGE ---
// Stores state: { step: 'NAME'|'ADDRESS'|'PHONE', tempOrder: {...} }
const userSessions = {};

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

    // Helpers
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

    const answerCallback = async (callbackId, text = null) => {
        const body = { callback_query_id: callbackId };
        if (text) body.text = text;
        await fetch(`${TG_BASE}${config.botToken}/answerCallbackQuery`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
    };

    // Keyboards
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

    const cancelOrderBtn = {
        inline_keyboard: [[{ text: "❌ لغو سفارش", callback_data: "cmd_cancel_order" }]]
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
                reply_markup: { inline_keyboard: [[{ text: "🛒 خرید", callback_data: `order_${p.id}` }]] }
            }));
            await fetch(`${TG_BASE}${config.botToken}/answerInlineQuery`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ inline_query_id: update.inline_query.id, results, cache_time: 1 })
            });
            continue;
        }

        // 2. CALLBACK QUERY
        if (update.callback_query) {
            const cb = update.callback_query;
            const data = cb.data;
            const chatId = cb.message.chat.id;

            await answerCallback(cb.id);

            // --- ORDER CANCELLATION ---
            if (data === 'cmd_cancel_order') {
                if (userSessions[chatId]) {
                    delete userSessions[chatId];
                    await sendMsg(chatId, "❌ فرآیند ثبت سفارش لغو شد.", mainMenuInline);
                }
                continue;
            }

            // --- ORDER START (Start the Wizard) ---
            if (data.startsWith('order_')) {
                const pid = data.split('_')[1];
                const product = products.find(p => p.id === pid);
                
                if (!product) {
                    await sendMsg(chatId, "❌ متاسفانه این محصول یافت نشد یا حذف شده است.");
                } else {
                    // Initialize Session
                    userSessions[chatId] = {
                        step: 'AWAITING_NAME',
                        tempOrder: {
                            productId: pid,
                            productName: product.name,
                            productPrice: product.price,
                            customerName: '',
                            customerAddress: '',
                            customerPhone: ''
                        }
                    };
                    await sendMsg(chatId, `📝 *ثبت سفارش جدید*\nمحصول: ${product.name}\n\nلطفاً *نام و نام خانوادگی* خود را وارد کنید:`, cancelOrderBtn);
                }
            }

            // --- NAVIGATION & MENUS ---
            else if (data === 'cmd_products') {
                if (categories.length === 0) {
                     const productButtons = products.slice(0, 20).map(p => ([
                        { text: `${p.name} - ${Number(p.price).toLocaleString()}`, callback_data: `prod_${p.id}` }
                    ]));
                    productButtons.push([{ text: "🔙 بازگشت", callback_data: "cmd_start" }]);
                    await sendMsg(chatId, "🛍 *محصولات:*", { inline_keyboard: productButtons });
                } else {
                    const catButtons = categories.map(c => ([
                        { text: `📂 ${c.name}`, callback_data: `cat_${c.id}` }
                    ]));
                    catButtons.push([{ text: "🔙 بازگشت به منو", callback_data: "cmd_start" }]);
                    await sendMsg(chatId, "🗂 *انتخاب دسته بندی:*", { inline_keyboard: catButtons });
                }
            } 
            else if (data.startsWith('cat_')) {
                const catId = data.split('_')[1];
                const category = categories.find(c => c.id === catId);
                const filteredProducts = products.filter(p => p.category === catId);
                
                const productButtons = filteredProducts.slice(0, 20).map(p => ([
                    { text: `${p.name} - ${Number(p.price).toLocaleString()} ت`, callback_data: `prod_${p.id}` }
                ]));
                productButtons.push([{ text: "🔙 بازگشت", callback_data: "cmd_products" }]);
                
                await sendMsg(chatId, `📂 دسته: *${category?.name}*`, { inline_keyboard: productButtons });
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

                    // Button triggers internal logic
                    const itemMarkup = {
                        inline_keyboard: [
                            [{ text: "🛒 ثبت سفارش (پرداخت درب منزل)", callback_data: `order_${product.id}` }],
                            [{ text: "🔙 بازگشت", callback_data: `cat_${product.category}` }]
                        ]
                    };

                    if (product.imageUrl && product.imageUrl.startsWith('data:')) {
                        const buffer = dataURItoBuffer(product.imageUrl);
                        if (buffer) await sendPhoto(chatId, buffer, caption, itemMarkup);
                        else await sendMsg(chatId, caption, itemMarkup);
                    } else if (product.imageUrl) {
                         await sendMsg(chatId, caption + `\n\n🖼 [تصویر](${product.imageUrl})`, itemMarkup);
                    } else {
                        await sendMsg(chatId, caption, itemMarkup);
                    }
                }
            }
            else if (data === 'cmd_start') {
                await sendMsg(chatId, "🏠 *منوی اصلی*", mainMenuInline);
            }
            continue;
        }

        // 3. TEXT MESSAGES & WIZARD HANDLING
        if (update.message) {
            const chatId = update.message.chat.id;
            const userId = update.message.from.id;
            const text = update.message.text;
            
            // --- ORDER WIZARD HANDLER ---
            if (userSessions[chatId]) {
                const session = userSessions[chatId];

                if (text && (text === '/start' || text === '❌ لغو سفارش')) {
                    delete userSessions[chatId];
                    await sendMsg(chatId, "❌ سفارش لغو شد.", mainMenuInline);
                    continue;
                }

                // Step 1: Receive Name
                if (session.step === 'AWAITING_NAME') {
                    if (!text) { await sendMsg(chatId, "لطفا نام خود را به صورت متن وارد کنید:"); continue; }
                    session.tempOrder.customerName = text;
                    session.step = 'AWAITING_ADDRESS';
                    await sendMsg(chatId, `✅ نام ثبت شد: ${text}\n\n📍 حالا لطفا *آدرس دقیق پستی* خود را وارد کنید:`, cancelOrderBtn);
                }
                // Step 2: Receive Address
                else if (session.step === 'AWAITING_ADDRESS') {
                    if (!text) { await sendMsg(chatId, "لطفا آدرس را به صورت متن وارد کنید:"); continue; }
                    session.tempOrder.customerAddress = text;
                    session.step = 'AWAITING_PHONE';
                    
                    // Check if user verified before to auto-fill phone
                    const [vUsers] = await pool.query('SELECT phoneNumber FROM verified_users WHERE userId = ?', [userId]);
                    
                    if (vUsers.length > 0) {
                        // Auto-complete with known phone
                        const phone = vUsers[0].phoneNumber;
                        await finalizeOrder(chatId, session, phone);
                    } else {
                        // Ask for phone
                        await sendMsg(chatId, `✅ آدرس ثبت شد.\n\n📞 لطفا *شماره تماس* خود را وارد کنید (یا دکمه ارسال شماره را بزنید):`, 
                             { keyboard: [[{text: "📱 ارسال شماره تلفن", request_contact: true}]], resize_keyboard: true, one_time_keyboard: true }
                        );
                    }
                }
                // Step 3: Receive Phone (Text or Contact Object)
                else if (session.step === 'AWAITING_PHONE') {
                    let phone = text;
                    if (update.message.contact) {
                        phone = update.message.contact.phone_number;
                    }

                    if (!phone) { await sendMsg(chatId, "لطفا شماره معتبر وارد کنید:"); continue; }
                    
                    await finalizeOrder(chatId, session, phone);
                }
                continue;
            }

            // --- NORMAL FLOW ---
            
            // Handle Contact Share (Verification)
            if (update.message.contact && update.message.contact.user_id === userId) {
                const u = update.message.from;
                const ph = update.message.contact.phone_number;
                await pool.query('INSERT INTO verified_users VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE phoneNumber=?', 
                [u.id, u.first_name, u.last_name, u.username, ph, Date.now(), ph]); 
                await sendMsg(chatId, `✅ *هویت تایید شد!*\nخوش آمدید.`, mainMenuInline);
            }
            
            // Handle Commands & Text
            else if (update.message.text) {
                const t = update.message.text.toLowerCase().trim();
                
                if (t === '/start') {
                    const [verifiedRows] = await pool.query('SELECT * FROM verified_users WHERE userId = ?', [userId]);
                    if (verifiedRows.length > 0) {
                        await sendMsg(chatId, `👋 سلام ${update.message.from.first_name} عزیز!\nخوش آمدید.`, mainMenuInline);
                    } else {
                        await sendMsg(chatId, `👋 سلام!\nبرای استفاده از ربات لطفاً شماره خود را تایید کنید.`, contactMenu);
                    }
                }
            }
        }
    }
  } catch (e) {
    // console.error("Bot loop error:", e.message); 
  }
}

// Helper function to save order to DB
async function finalizeOrder(chatId, session, phone) {
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const order = {
        id: orderId,
        customerName: session.tempOrder.customerName,
        customerPhone: phone,
        customerAddress: session.tempOrder.customerAddress,
        totalAmount: session.tempOrder.productPrice,
        status: 'PENDING',
        items: [{
            productId: session.tempOrder.productId,
            productName: session.tempOrder.productName,
            quantity: 1,
            priceAtTime: session.tempOrder.productPrice
        }],
        createdAt: Date.now()
    };

    try {
        await pool.query('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [order.id, order.customerName, order.customerPhone, order.customerAddress, order.totalAmount, order.status, JSON.stringify(order.items), order.createdAt]);

        delete userSessions[chatId];
        
        const mainMenuInline = {
            inline_keyboard: [
                [{ text: "🛍 لیست محصولات", callback_data: "cmd_products" }, { text: "🔍 جستجو", callback_data: "cmd_search" }],
                [{ text: "📞 ارتباط با ما", callback_data: "cmd_contact" }, { text: "ℹ️ راهنما", callback_data: "cmd_help" }]
            ]
        };

        await fetch(`${TG_BASE}${process.env.BOT_TOKEN || ''}/sendMessage`, { // Using existing token from config in loop context actually
             // Note: In the main loop we have access to 'config.botToken'. Since this is a helper outside, 
             // we should pass the token or fetch it. For simplicity, let's rely on the main loop context 
             // or refactor. *Correction*: I'll inline this logic back into the loop or fetch config again.
             // BETTER APPROACH: Just querying config again inside helper or passing it.
        });
        
        // Re-fetching config for the helper to ensure token availability
        const [configRows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['telegram']);
        const config = JSON.parse(configRows[0].data);

        await fetch(`${TG_BASE}${config.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `🎉 *سفارش شما با موفقیت ثبت شد!* \n\n🧾 شماره پیگیری: \`${orderId}\`\n📦 محصول: ${session.tempOrder.productName}\n📍 آدرس: ${order.customerAddress}\n\nهمکاران ما جهت هماهنگی ارسال با شما تماس خواهند گرفت.`,
                parse_mode: 'Markdown',
                reply_markup: mainMenuInline
            })
        });

    } catch (e) {
        console.error("Order Save Error", e);
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