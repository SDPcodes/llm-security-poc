Creating a full-stack web application with the specified requirements involves several components. I'll provide you with a basic structure and code snippets to achieve the desired functionality. Note that this is a simplified version and should be further developed and tested for production use.

### Directory Structure

```
/myapp
  /backend
    - server.js
    - routes.js
    - controllers.js
    - middleware.js
    - db.js
    - package.json
  /frontend
    /src
      - App.js
      - index.js
      - components
        - Register.js
        - Login.js
        - Dashboard.js
        - Profile.js
      - services
        - api.js
    - package.json
  - .env
  - docker-compose.yml
  - init.sql
```

### Backend Code

#### `package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "Backend for the full-stack app",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "bcrypt": "^5.0.1",
    "cors": "^2.8.5",
    "csurf": "^1.11.0",
    "dotenv": "^16.0.0",
    "express": "^4.17.1",
    "express-rate-limit": "^6.0.0",
    "helmet": "^5.0.0",
    "jsonwebtoken": "^9.0.0",
    "pg": "^8.7.1"
  }
}
```

#### `.env`

```plaintext
DATABASE_URL=postgres://user:password@db:5432/myapp
JWT_SECRET=your_jwt_secret
```

#### `init.sql`

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `db.js`

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
```

#### `middleware.js`

```javascript
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const helmet = require('helmet');

const csrfProtection = csrf({ cookie: true });

const verifyJWT = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.userId = decoded.id;
    next();
  });
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { verifyJWT, limiter, csrfProtection, helmet };
```

#### `controllers.js`

```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).send('Invalid input');

    const hashedPassword = await bcrypt.hash(password, 12);
    await db.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
      [username, email, hashedPassword]
    );
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send('Error registering user');
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send('Invalid input');

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).send('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send('Invalid credentials');

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true }).sendStatus(200);
  } catch (err) {
    res.status(500).send('Error logging in');
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await db.query('SELECT username, email FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];
    res.json(user);
  } catch (err) {
    res.status(500).send('Error fetching profile');
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) return res.status(400).send('Invalid input');

    await db.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [username, email, req.userId]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send('Error updating profile');
  }
};

module.exports = { registerUser, loginUser, getProfile, updateProfile };
```

#### `routes.js`

```javascript
const express = require('express');
const { registerUser, loginUser, getProfile, updateProfile } = require('./controllers');
const { verifyJWT, limiter, csrfProtection } = require('./middleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', limiter, loginUser);
router.get('/profile', verifyJWT, getProfile);
router.put('/profile', verifyJWT, csrfProtection, updateProfile);

module.exports = router;
```

#### `server.js`

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const routes = require('./routes');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Frontend Code

#### `package.json`

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "description": "Frontend for the full-stack app",
  "main": "index.js",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "axios": "^0.26.1",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "react-scripts": "^5.0.0"
  }
}
```

#### `src/index.js`

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
```

#### `src/App.js`

```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
```

#### `src/components/Register.js`

```javascript
import React, { useState } from 'react';
import axios from 'axios';

function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/register', formData);
      alert('Registration successful');
    } catch (error) {
      alert('Error registering user');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" placeholder="Username" onChange={handleInputChange} required />
      <input type="email" name="email" placeholder="Email" onChange={handleInputChange} required />
      <input type="password" name="password" placeholder="Password" onChange={handleInputChange} required />
      <button type="submit">Register</button>
    </form>
  );
}

export default Register;
```

#### `src/components/Login.js`

```javascript
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/login', formData);
      navigate('/dashboard');
    } catch (error) {
      alert('Error logging in');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" placeholder="Email" onChange={handleInputChange} required />
      <input type="password" name="password" placeholder="Password" onChange={handleInputChange} required />
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
```

#### `src/components/Dashboard.js`

```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [profile, setProfile] = useState({ username: '', email: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/profile');
        setProfile(response.data);
      } catch (error) {
        alert('Error fetching profile');
      }
    };
    fetchProfile();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Username: {profile.username}</p>
      <p>Email: {profile.email}</p>
      <Profile />
    </div>
  );
}

function Profile() {
  const [formData, setFormData] = useState({ username: '', email: '' });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/profile', formData, { headers: { 'X-CSRF-Token': document.cookie['csrfToken'] } });
      alert('Profile updated');
    } catch (error) {
      alert('Error updating profile');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" placeholder="New Username" onChange={handleInputChange} required />
      <input type="email" name="email" placeholder="New Email" onChange={handleInputChange} required />
      <button type="submit">Update Profile</button>
    </form>
  );
}

export default Dashboard;
```

### Docker and Database Setup

#### `docker-compose.yml`

```yaml
version: '3.8'
services:
  db:
    image: postgres:13
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgres://user:password@db:5432/myapp
      - JWT_SECRET=your_jwt_secret
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### Instructions to Run

1. Ensure Docker is installed on your machine.
2. Place all code in the relevant directories as per the structure above.
3. Run `docker-compose up --build` to start the entire application.
4. The frontend will be available on `http://localhost:3000`, and the backend API will be running on `http://localhost:5000`.

This setup provides a basic full-stack application with the specified functionalities and security requirements. Further enhancements and testing should be done before deploying to production.