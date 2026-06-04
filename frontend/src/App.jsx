import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom';

const API_URL = 'http://localhost:4000/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('bexoToken') || '');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(() => {
    const stored = localStorage.getItem('bexoCart');
    return stored ? JSON.parse(stored) : [];
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('bexoToken', token);
      fetchMe();
    } else {
      localStorage.removeItem('bexoToken');
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem('bexoCart', JSON.stringify(cart));
  }, [cart]);

  async function authFetch(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  async function fetchMe() {
    try {
      const data = await authFetch('/me');
      setUser(data);
    } catch (error) {
      console.error(error);
      setToken('');
    }
  }

  async function handleLogout() {
    if (token) {
      try {
        await authFetch('/logout', { method: 'POST' });
      } catch (error) {
        console.warn(error);
      }
    }
    setToken('');
    setCart([]);
    setMessage({ type: 'success', text: 'Logged out successfully.' });
  }

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setMessage({ type: 'success', text: 'Added to cart.' });
  }

  function updateCart(id, quantity) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  async function checkout() {
    if (!user) {
      setMessage({ type: 'error', text: 'Please log in first to checkout.' });
      return;
    }
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Your cart is empty.' });
      return;
    }
    try {
      await authFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({ cart }),
      });
      setCart([]);
      setMessage({ type: 'success', text: 'Purchase completed successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  }

  return (
    <Router>
      <div className="page-shell">
        <header className="topbar">
          <div className="logo-area">
            <Link to="/" className="brand-link">
              Bexo Reseller
            </Link>
            <span className="brand-subtitle">Reseller marketplace</span>
          </div>
          <nav className="nav-links">
            <Link to="/" className="nav-link">
              Home
            </Link>
            <Link to="/cart" className="nav-link">
              Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </Link>
            {user ? (
              <>
                <Link to="/orders" className="nav-link">
                  Orders
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="nav-link">
                    Admin
                  </Link>
                )}
                <button className="nav-button" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="nav-link">
                Login / Signup
              </Link>
            )}
          </nav>
        </header>

        <main className="container">
          {message && (
            <div className={`alert alert-${message.type}`}>
              <span>{message.text}</span>
              <button className="small-button" onClick={() => setMessage(null)}>
                Close
              </button>
            </div>
          )}

          <Routes>
            <Route path="/" element={<HomePage onAdd={addToCart} />} />
            <Route path="/product/:id" element={<ProductPage onAdd={addToCart} />} />
            <Route
              path="/cart"
              element={
                <CartPage
                  cart={cart}
                  updateCart={updateCart}
                  checkout={checkout}
                  user={user}
                />
              }
            />
            <Route
              path="/login"
              element={<AuthPage onLogin={setToken} setMessage={setMessage} />}
            />
            <Route
              path="/admin"
              element={user?.role === 'admin' ? <AdminPage token={token} /> : <Navigate to="/login" />}
            />
            <Route path="/orders" element={<OrdersPage token={token} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function HomePage({ onAdd }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then((res) => res.json())
      .then(setProducts)
      .catch(console.error);
  }, []);

  const lowerSearch = search.toLowerCase();
  const visible = products.filter((product) =>
    product.title.toLowerCase().includes(lowerSearch) ||
    product.category.toLowerCase().includes(lowerSearch)
  );

  return (
    <div>
      <section className="hero-card">
        <div>
          <h1>Discover top resale products in one marketplace.</h1>
          <p>
            Browse premium seller inventory, login as a reseller, and manage your orders with an admin dashboard.
          </p>
        </div>
      </section>

      <div className="section-header">
        <h2>Products</h2>
        <input
          className="search-input"
          placeholder="Search products or categories"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="grid-list">
        {visible.map((product) => (
          <div key={product.id} className="product-card">
            <Link to={`/product/${product.id}`} className="product-image-link">
              <img src={product.image} alt={product.title} className="product-image" />
            </Link>
            <div className="product-body">
              <strong>{product.title}</strong>
              <p className="product-category">{product.category}</p>
              <p>{product.description}</p>
              <div className="product-footer">
                <span className="price">${product.price.toFixed(2)}</span>
                <button className="button" onClick={() => onAdd(product)}>
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductPage({ onAdd }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div>Loading product...</div>;
  }
  if (!product) {
    return <div>Product not found.</div>;
  }

  return (
    <div className="detail-page">
      <button className="link-button" onClick={() => navigate(-1)}>
        ← Back to products
      </button>
      <div className="detail-grid">
        <div className="detail-image-card">
          <img src={product.image} alt={product.title} />
        </div>
        <div>
          <h2>{product.title}</h2>
          <p className="product-category">{product.category}</p>
          <p>{product.description}</p>
          <div className="detail-row">
            <span className="price large">${product.price.toFixed(2)}</span>
            <button className="button" onClick={() => onAdd(product)}>
              Add to Cart
            </button>
          </div>
          <div className="product-meta">Rating: {product.rating} / 5</div>
        </div>
      </div>
    </div>
  );
}

function CartPage({ cart, updateCart, checkout, user }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div>
      <h2>Cart</h2>
      {cart.length === 0 ? (
        <div className="card-panel">Your cart is empty.</div>
      ) : (
        <div className="cart-grid">
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.title} className="cart-thumb" />
                <div>
                  <strong>{item.title}</strong>
                  <p>${item.price.toFixed(2)} each</p>
                  <div className="quantity-row">
                    <label>
                      Qty:
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => updateCart(item.id, Number(event.target.value))}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="checkout-panel card-panel">
            <h3>Order summary</h3>
            <p>Total: <strong>${total.toFixed(2)}</strong></p>
            <button className="button full-width" onClick={checkout}>
              {user ? 'Checkout Now' : 'Login to Checkout'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthPage({ onLogin, setMessage }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  async function submit(event) {
    event.preventDefault();
    try {
      const endpoint = mode === 'login' ? '/login' : '/signup';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not complete request');
      }
      onLogin(data.token);
      setMessage({ type: 'success', text: `${mode === 'login' ? 'Logged in' : 'Account created'} successfully.` });
      navigate('/');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  }

  return (
    <div className="auth-shell card-panel">
      <h2>{mode === 'login' ? 'Login' : 'Create account'}</h2>
      <form onSubmit={submit} className="auth-form">
        {mode === 'signup' && (
          <label>
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="button full-width" type="submit">
          {mode === 'login' ? 'Login' : 'Sign Up'}
        </button>
      </form>
      <button className="link-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Create a new account' : 'Already have an account? Login'}
      </button>
    </div>
  );
}

function AdminPage({ token }) {
  const [users, setUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [payouts, setPayouts] = useState([]);

  async function loadAdminData() {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const [userRes, activeRes, payoutRes] = await Promise.all([
        fetch(`${API_URL}/admin/users`, { headers }),
        fetch(`${API_URL}/admin/active-users`, { headers }),
        fetch(`${API_URL}/payouts`, { headers }),
      ]);
      const [userData, activeData, payoutData] = await Promise.all([
        userRes.json(),
        activeRes.json(),
        payoutRes.json(),
      ]);
      setUsers(userData);
      setActiveUsers(activeData);
      setPayouts(payoutData);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(loadAdminData, 10000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <div className="admin-grid">
        <div className="admin-card">
          <h3>Users registered</h3>
          <p className="admin-metric">{users.length}</p>
        </div>
        <div className="admin-card">
          <h3>Active users</h3>
          <p className="admin-metric">{activeUsers.length}</p>
        </div>
        <div className="admin-card">
          <h3>Pending payouts</h3>
          <p className="admin-metric">${payouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0).toFixed(2)}</p>
        </div>
      </div>

      <section className="admin-section">
        <h3>All users</h3>
        <div className="scroll-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Password</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.passwordPlain}</td>
                  <td>{new Date(user.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h3>Live active users</h3>
        <div className="scroll-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((item) => (
                <tr key={item.userId}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td>{new Date(item.lastSeen).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h3>Payouts</h3>
        <div className="scroll-table">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{payout.email}</td>
                  <td>${Number(payout.amount).toFixed(2)}</td>
                  <td>{payout.status}</td>
                  <td>{new Date(payout.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OrdersPage({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  if (!token) {
    return <div className="card-panel">Please login to view your orders.</div>;
  }

  if (loading) {
    return <div>Loading orders...</div>;
  }

  return (
    <div>
      <h2>Order history</h2>
      {orders.length === 0 ? (
        <div className="card-panel">No orders yet.</div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card card-panel">
              <div className="order-row">
                <strong>Order ID:</strong> {order.id}
              </div>
              <div className="order-row">
                <strong>Total:</strong> ${order.total.toFixed(2)}
              </div>
              <div className="order-row">
                <strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}
              </div>
              <div>
                {order.items.map((item) => (
                  <div key={item.id} className="order-item">
                    {item.quantity} × {item.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="card-panel">
      <h2>Page not found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="button">
        Go home
      </Link>
    </div>
  );
}

export default App;
