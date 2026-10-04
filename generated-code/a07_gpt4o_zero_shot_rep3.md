Creating a full-stack web application involves several components, including a frontend using React, a backend using Node.js and Express, and a PostgreSQL database. Below, you'll find a complete guide to set up the application, including code snippets for each part.

### Project Structure

```
fullstack-app/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── auth.js
│   ├── routes.js
│   └── db.js
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── components/
│   │   │   ├── Register.js
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   └── ProfileForm.js
└── README.md
```

### Backend Setup

#### 1. Create the Backend

**`backend/package.json`**

```json
{
  "name": "backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "bcrypt": "^5.0.1",
    "body-parser": "^1.19.0",
    "cors": "^2.8.5",
    "dotenv": "^8.2.0",
    "express": "^4.17.1",
    "jsonwebtoken": "^8.5.1",
    "pg": "^8.5.1"
  }
}
```

**`backend/server.js`**

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const auth = require('./auth');
const routes = require('./routes');

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/api', routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

**`backend/auth.js`**

```javascript
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(403);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
```

**`backend/routes.js`**

```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const authenticateToken = require('./auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await db.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ accessToken });
    } else {
      res.status(401).send('Email or password incorrect');
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT username, email FROM users WHERE id = $1', [req.user.userId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  const { username, email } = req.body;

  try {
    const result = await db.query(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING *',
      [username, email, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

**`backend/db.js`**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
```

#### 2. Create the Database

**Database Schema**

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL
);
```

### Frontend Setup

#### 1. Create the Frontend

**`frontend/package.json`**

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "axios": "^0.21.1",
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-router-dom": "^5.2.0",
    "react-scripts": "4.0.3"
  }
}
```

**`frontend/src/index.js`**

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import App from './App';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

ReactDOM.render(
  <Router>
    <Switch>
      <Route path="/" exact component={App} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
    </Switch>
  </Router>,
  document.getElementById('root')
);
```

**`frontend/src/App.js`**

```javascript
import React from 'react';
import { Link } from 'react-router-dom';

function App() {
  return (
    <div>
      <h1>Welcome to the Fullstack App</h1>
      <Link to="/register">Register</Link>
      <br />
      <Link to="/login">Login</Link>
    </div>
  );
}

export default App;
```

**`frontend/src/components/Register.js`**

```javascript
import React, { useState } from 'react';
import axios from 'axios';

const Register = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/register', formData);
      alert('Registration successful!');
    } catch (error) {
      alert('Registration failed!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" placeholder="Username" onChange={handleChange} />
      <input type="email" name="email" placeholder="Email" onChange={handleChange} />
      <input type="password" name="password" placeholder="Password" onChange={handleChange} />
      <button type="submit">Register</button>
    </form>
  );
};

export default Register;
```

**`frontend/src/components/Login.js`**

```javascript
import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ history }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/login', formData);
      localStorage.setItem('token', response.data.accessToken);
      history.push('/dashboard');
    } catch (error) {
      alert('Login failed!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" placeholder="Email" onChange={handleChange} />
      <input type="password" name="password" placeholder="Password" onChange={handleChange} />
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
```

**`frontend/src/components/Dashboard.js`**

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProfileForm from './ProfileForm';

const Dashboard = () => {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: token },
        });
        setProfile(response.data);
      } catch (error) {
        alert('Failed to fetch profile!');
      }
    };

    fetchProfile();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <h2>Profile Information</h2>
      <p>Username: {profile.username}</p>
      <p>Email: {profile.email}</p>
      <ProfileForm profile={profile} setProfile={setProfile} />
    </div>
  );
};

export default Dashboard;
```

**`frontend/src/components/ProfileForm.js`**

```javascript
import React, { useState } from 'react';
import axios from 'axios';

const ProfileForm = ({ profile, setProfile }) => {
  const [formData, setFormData] = useState({ username: profile.username, email: profile.email });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:5000/api/profile', formData, {
        headers: { Authorization: token },
      });
      setProfile(response.data);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" value={formData.username} onChange={handleChange} />
      <input type="email" name="email" value={formData.email} onChange={handleChange} />
      <button type="submit">Update Profile</button>
    </form>
  );
};

export default ProfileForm;
```

### Instructions to Run the Application

1. **Set Up the Database**

   - Install PostgreSQL and create a database.
   - Run the SQL script provided above to create the `users` table.

2. **Configure Environment Variables**

   - Create a `.env` file in the `backend` directory with the following content:

     ```
     DATABASE_URL=your_postgres_connection_string
     JWT_SECRET=your_jwt_secret
     ```

3. **Install Dependencies**

   - Navigate to the `backend` directory and run `npm install`.
   - Navigate to the `frontend` directory and run `npm install`.

4. **Start the Backend Server**

   - In the `backend` directory, run `npm start`.

5. **Start the Frontend Application**

   - In the `frontend` directory, run `npm start`.

6. **Visit the Application**

   - Open your browser and go to `http://localhost:3000`.

This setup provides a basic full-stack application with user registration, login, and profile management. You can expand it further based on your specific requirements.