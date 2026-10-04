Creating a full-stack web application with all the specified requirements involves several steps. Below, I'll provide a comprehensive overview of how to set up each part of the application, including the necessary code snippets and instructions.

### Project Structure

```
/myapp
  /client
    /src
      /components
        - Register.js
        - Login.js
        - Dashboard.js
        - UpdateProfile.js
      - App.js
      - index.js
    - package.json
  /server
    - server.js
    - auth.js
    - user.js
    - db.js
    - package.json
    - .env
  - README.md
  - database.sql
```

### Database: PostgreSQL

First, create a PostgreSQL database and the `users` table.

```sql
-- database.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);
```

### Backend: Node.js with Express

#### Install Dependencies

Go to the `/server` directory and create a `package.json` file.

```bash
npm init -y
npm install express bcryptjs jsonwebtoken pg dotenv express-rate-limit helmet csurf cookie-parser cors
```

#### Server Configuration

Create a `.env` file in the `/server` directory.

```env
DATABASE_URL=postgres://user:password@localhost:5432/myapp
JWT_SECRET=your_jwt_secret
PORT=5000
```

#### Database Connection

Create `db.js` for database connection.

```javascript
// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
```

#### Authentication Logic

Create `auth.js` for JWT and password handling.

```javascript
// auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

module.exports = { generateToken, hashPassword, verifyPassword };
```

#### User Routes

Create `user.js` for user-related routes.

```javascript
// user.js
const express = require('express');
const router = express.Router();
const db = require('./db');
const { generateToken, hashPassword, verifyPassword } = require('./auth');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const csrf = require('csurf');

const csrfProtection = csrf({ cookie: true });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(403);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

router.post('/register', [
  body('username').isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;
  try {
    const hashedPassword = await hashPassword(password);
    await db.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', [username, email, hashedPassword]);
    res.sendStatus(201);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/login', authLimiter, [
  body('email').isEmail(),
  body('password').exists(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && await verifyPassword(password, user.password)) {
      const token = generateToken(user.id);
      res.cookie('token', token, { httpOnly: true, secure: true });
      res.json({ message: 'Logged in successfully' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.userId]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/profile', authenticateToken, csrfProtection, [
  body('username').isLength({ min: 3 }),
  body('email').isEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email } = req.body;
  try {
    await db.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [username, email, req.user.userId]);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
```

#### Main Server File

Create `server.js` to set up the Express application.

```javascript
// server.js
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const userRoutes = require('./user');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api', userRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

### Frontend: React

#### Install Dependencies

Go to the `/client` directory and create a `package.json` file.

```bash
npx create-react-app client
cd client
npm install axios react-router-dom
```

#### App Component

Set up routing in `App.js`.

```javascript
// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UpdateProfile from './components/UpdateProfile';

function App() {
  return (
    <Router>
      <div>
        <Switch>
          <Route path="/register" component={Register} />
          <Route path="/login" component={Login} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/profile" component={UpdateProfile} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
```

#### Registration Component

Create `Register.js`.

```javascript
// Register.js
import React, { useState } from 'react';
import axios from 'axios';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/register', formData);
      alert('Registration successful');
    } catch (error) {
      alert('Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Username" required />
      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
      <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" required />
      <button type="submit">Register</button>
    </form>
  );
}

export default Register;
```

#### Login Component

Create `Login.js`.

```javascript
// Login.js
import React, { useState } from 'react';
import axios from 'axios';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/login', formData, { withCredentials: true });
      alert('Login successful');
    } catch (error) {
      alert('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
      <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
```

#### Dashboard Component

Create `Dashboard.js`.

```javascript
// Dashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/profile', { withCredentials: true });
        setProfile(response.data);
      } catch (error) {
        alert('Failed to fetch profile');
      }
    };

    fetchProfile();
  }, []);

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {profile.username}</h1>
      <p>Email: {profile.email}</p>
    </div>
  );
}

export default Dashboard;
```

#### Update Profile Component

Create `UpdateProfile.js`.

```javascript
// UpdateProfile.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UpdateProfile() {
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/profile', { withCredentials: true });
        setFormData({
          username: response.data.username,
          email: response.data.email
        });
      } catch (error) {
        alert('Failed to fetch profile');
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/profile', formData, { withCredentials: true });
      alert('Profile updated successfully');
    } catch (error) {
      alert('Failed to update profile');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Username" required />
      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
      <button type="submit">Update Profile</button>
    </form>
  );
}

export default UpdateProfile;
```

### Instructions to Run the Application

1. **Set up the Database**:
   - Ensure PostgreSQL is installed and running.
   - Execute the `database.sql` script to create the `users` table.

2. **Backend Setup**:
   - Navigate to the `/server` directory.
   - Create a `.env` file using the provided template.
   - Run `npm install` to install dependencies.
   - Start the server with `node server.js`.

3. **Frontend Setup**:
   - Navigate to the `/client` directory.
   - Run `npm install` to install dependencies.
   - Start the React development server with `npm start`.

4. **Access the Application**:
   - Open a browser and navigate to `http://localhost:3000`.
   - Use the Register and Login pages to create and access user accounts.
   - Access the Dashboard and Update Profile pages after logging in.

This setup includes important security considerations such as using bcrypt for password hashing, JWT for authentication, parameterized queries to prevent SQL injection, input validation, rate limiting, CSRF protection, and secure HTTP headers with Helmet and CORS configuration.