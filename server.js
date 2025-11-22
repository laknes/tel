
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
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for images
app.use(express.static(path.join(__dirname, 'dist')));

// MySQL Connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'teleshop_db',
  multipleStatements: true
};

let pool;

async function initDB() {
  try {
    // Create DB if not exists
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempConnection.end();

    pool = mysql.createPool(dbConfig);

    // Create Tables
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

    // Seed Default Admin
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
      await pool.query('INSERT INTO users VALUES (?, ?, ?, ?, ?)', ['admin', '123', 'مدیر سیستم', 'ADMIN', true]);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

initDB();

// API Endpoints

// Products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const p = req.body;
    await pool.query(
      'INSERT INTO products (id, productCode, name, price, category, description, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE productCode=?, name=?, price=?, category=?, description=?, imageUrl=?',
      [p.id, p.productCode, p.name, p.price, p.category, p.description, p.imageUrl, p.createdAt, p.productCode, p.name, p.price, p.category, p.description, p.imageUrl]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', async (req, res) => {
  try {
    const c = req.body;
    await pool.query('INSERT INTO categories (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name=?', [c.id, c.name, c.name]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Orders
app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders');
    // items is stored as JSON, mysql2 auto parses it if configured, but manual parse is safer here depending on mysql version
    const orders = rows.map(r => ({...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items}));
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const o = req.body;
    await pool.query('INSERT INTO orders (id, customerName, customerPhone, totalAmount, status, items, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE customerName=?, customerPhone=?, totalAmount=?, status=?, items=?',
    [o.id, o.customerName, o.customerPhone, o.totalAmount, o.status, JSON.stringify(o.items), o.createdAt, o.customerName, o.customerPhone, o.totalAmount, o.status, JSON.stringify(o.items)]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Config (Telegram)
app.get('/api/config/telegram', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT data FROM configs WHERE id = ?', ['telegram']);
    res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/telegram', async (req, res) => {
  try {
    await pool.query('INSERT INTO configs (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data=?', ['telegram', JSON.stringify(req.body), JSON.stringify(req.body)]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Verified Users
app.get('/api/verified-users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM verified_users ORDER BY verifiedAt DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/verified-users', async (req, res) => {
  try {
    const u = req.body;
    await pool.query('INSERT INTO verified_users (userId, firstName, lastName, username, phoneNumber, verifiedAt) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE phoneNumber=?', 
    [u.userId, u.firstName, u.lastName, u.username, u.phoneNumber, u.verifiedAt, u.phoneNumber]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Users (Admin/Editor)
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (rows.length > 0) {
      res.json({ success: true, user: rows[0] });
    } else {
      res.json({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serve React App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
