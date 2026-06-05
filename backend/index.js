const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Low, JSONFile } = require('lowdb');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'bexo_reseller_secret';

const adapter = new JSONFile(path.join(__dirname, 'db.json'));
const db = new Low(adapter);

async function initDb() {
  await db.read();
  db.data ||= {
    users: [],
    products: [],
    orders: [],
    payouts: [],
    activeUsers: [],
  };

  if (db.data.products.length === 0) {
    db.data.products.push(
      {
        id: randomUUID(),
        title: 'Bexo Premium Smart Speaker',
        category: 'Electronics',
        price: 89.99,
        image: 'https://via.placeholder.com/420x420.png?text=Bexo+Smart+Speaker',
        rating: 4.6,
        description: 'A powerful smart speaker with voice assistant support and premium sound for everyday home use.',
      },
      {
        id: randomUUID(),
        title: 'Bexo Pro Wireless Headphones',
        category: 'Electronics',
        price: 129.99,
        image: 'https://via.placeholder.com/420x420.png?text=Bexo+Wireless+Headphones',
        rating: 4.8,
        description: 'Comfortable, noise-reducing headphones with long battery life and crisp audio.',
      },
      {
        id: randomUUID(),
        title: 'Bexo Urban Travel Backpack',
        category: 'Luggage',
        price: 54.99,
        image: 'https://via.placeholder.com/420x420.png?text=Bexo+Travel+Backpack',
        rating: 4.4,
        description: 'Durable backpack designed for travel, daily commute, and multiple compartments for all essentials.',
      },
      {
        id: randomUUID(),
        title: 'Bexo Home Office Keyboard',
        category: 'Computers',
        price: 39.99,
        image: 'https://via.placeholder.com/420x420.png?text=Bexo+Keyboard',
        rating: 4.5,
        description: 'Slim wireless keyboard with quiet keys and fast setup for home office and productivity.',
      },
      {
        id: randomUUID(),
        title: 'Bexo Comfort Running Shoes',
        category: 'Footwear',
        price: 74.99,
        image: 'https://via.placeholder.com/420x420.png?text=Bexo+Running+Shoes',
        rating: 4.3,
        description: 'Breathable running shoes with excellent cushioning and modern style.',
      },
      {
        id: randomUUID(),
        title: 'Bexo Smart Watch Lite',
        category: 'Wearables',
        price: 99.99,
        image: 'https://via.placeholder.com/420x420.png?text=Bexo+Smart+Watch',
        rating: 4.7,
        description: 'A lightweight smartwatch for fitness tracking, notifications, and everyday wear.',
      }
    );
  }

  if (db.data.users.length === 0) {
    const adminPassword = 'Admin@123';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    db.data.users.push({
      id: randomUUID(),
      name: 'Bexo Admin',
      email: 'admin@bexo.com',
      password: adminHash,
      passwordPlain: adminPassword,
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
  }

  await db.write();
}

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid auth header' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
}

function adminMiddleware(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  await db.read();

  const normalizedEmail = email.toLowerCase();
  const existing = db.data.users.find((user) => user.email === normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: randomUUID(),
    name,
    email: normalizedEmail,
    password: passwordHash,
    passwordPlain: password,
    role: 'user',
    createdAt: new Date().toISOString(),
  };

  db.data.users.push(newUser);
  await db.write();

  const token = createToken(newUser);
  return res.json({ token, user: safeUser(newUser) });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  await db.read();
  const normalizedEmail = email.toLowerCase();
  const user = db.data.users.find((item) => item.email === normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid login' });
  }

  const token = createToken(user);
  const activeIndex = db.data.activeUsers.findIndex((item) => item.userId === user.id);
  const activeRecord = {
    userId: user.id,
    name: user.name,
    email: user.email,
    lastSeen: new Date().toISOString(),
  };
  if (activeIndex >= 0) {
    db.data.activeUsers[activeIndex] = activeRecord;
  } else {
    db.data.activeUsers.push(activeRecord);
  }
  await db.write();

  return res.json({ token, user: safeUser(user) });
});

app.get('/api/me', authMiddleware, async (req, res) => {
  await db.read();
  const user = db.data.users.find((item) => item.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(safeUser(user));
});

app.get('/api/products', async (req, res) => {
  await db.read();
  res.json(db.data.products);
});

app.get('/api/products/:id', async (req, res) => {
  await db.read();
  const product = db.data.products.find((item) => item.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  const { cart } = req.body;
  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty' });
  }

  await db.read();
  const user = db.data.users.find((item) => item.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const items = cart.map((item) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    price: item.price,
  }));
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const newOrder = {
    id: randomUUID(),
    userId: user.id,
    items,
    total: Number(total.toFixed(2)),
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  db.data.orders.push(newOrder);
  db.data.payouts.push({
    id: randomUUID(),
    userId: user.id,
    email: user.email,
    amount: Number(total.toFixed(2)),
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  await db.write();

  res.json({ order: newOrder });
});

app.get('/api/orders', authMiddleware, async (req, res) => {
  await db.read();
  const orders = db.data.orders.filter((order) => order.userId === req.userId);
  res.json(orders);
});

app.get('/api/payouts', authMiddleware, async (req, res) => {
  await db.read();
  if (req.userRole === 'admin') {
    return res.json(db.data.payouts);
  }
  const userPayouts = db.data.payouts.filter((payout) => payout.userId === req.userId);
  res.json(userPayouts);
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  await db.read();
  const userList = db.data.users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    passwordPlain: user.passwordPlain || 'hidden',
  }));
  res.json(userList);
});

app.get('/api/admin/active-users', authMiddleware, adminMiddleware, async (req, res) => {
  await db.read();
  const active = db.data.activeUsers.map((item) => ({
    ...item,
    lastSeen: item.lastSeen,
  }));
  res.json(active);
});

app.post('/api/logout', authMiddleware, async (req, res) => {
  await db.read();
  db.data.activeUsers = db.data.activeUsers.filter((item) => item.userId !== req.userId);
  await db.write();
  res.json({ success: true });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
