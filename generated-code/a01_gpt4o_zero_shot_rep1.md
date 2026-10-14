```json
{
  "files": [
    {
      "path": "frontend/package.json",
      "content": "{\"name\":\"frontend\",\"version\":\"1.0.0\",\"private\":true,\"dependencies\":{\"react\":\"^18.0.0\",\"react-dom\":\"^18.0.0\",\"react-scripts\":\"5.0.0\",\"axios\":\"^0.27.0\",\"react-router-dom\":\"^6.3.0\"},\"scripts\":{\"start\":\"react-scripts start\",\"build\":\"react-scripts build\",\"test\":\"react-scripts test\",\"eject\":\"react-scripts eject\"}}"
    },
    {
      "path": "frontend/public/index.html",
      "content": "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Projects Dashboard</title></head><body><div id=\"root\"></div></body></html>"
    },
    {
      "path": "frontend/src/index.js",
      "content": "import React from 'react';import ReactDOM from 'react-dom';import './index.css';import App from './App';import { BrowserRouter as Router } from 'react-router-dom';ReactDOM.render(<Router><App /></Router>, document.getElementById('root'));"
    },
    {
      "path": "frontend/src/App.js",
      "content": "import React from 'react';import { Routes, Route } from 'react-router-dom';import LoginPage from './components/LoginPage';import Dashboard from './components/Dashboard';function App() { return (<Routes><Route path=\"/\" element={<LoginPage />} /><Route path=\"/dashboard\" element={<Dashboard />} /></Routes>);}export default App;"
    },
    {
      "path": "frontend/src/components/LoginPage.js",
      "content": "import React, { useState } from 'react';import axios from 'axios';import { useNavigate } from 'react-router-dom';function LoginPage() { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const navigate = useNavigate(); const handleSubmit = async (e) => { e.preventDefault(); try { const response = await axios.post('http://localhost:5000/api/login', { email, password }); localStorage.setItem('token', response.data.token); navigate('/dashboard'); } catch (error) { console.error('Invalid credentials', error); }}; return (<div><h2>Login</h2><form onSubmit={handleSubmit}><input type=\"email\" placeholder=\"Email\" value={email} onChange={(e) => setEmail(e.target.value)} required /><input type=\"password\" placeholder=\"Password\" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type=\"submit\">Login</button></form></div>);}export default LoginPage;"
    },
    {
      "path": "frontend/src/components/Dashboard.js",
      "content": "import React, { useEffect, useState } from 'react';import axios from 'axios';function Dashboard() { const [projects, setProjects] = useState([]); const [newProject, setNewProject] = useState(''); const [role, setRole] = useState('member'); useEffect(() => { const fetchProjects = async () => { const token = localStorage.getItem('token'); const response = await axios.get('http://localhost:5000/api/projects', { headers: { Authorization: `Bearer ${token}` } }); setProjects(response.data.projects); setRole(response.data.role); }; fetchProjects(); }, []); const createProject = async () => { const token = localStorage.getItem('token'); await axios.post('http://localhost:5000/api/projects', { name: newProject }, { headers: { Authorization: `Bearer ${token}` } }); setNewProject(''); window.location.reload(); }; const deleteProject = async (id) => { const token = localStorage.getItem('token'); await axios.delete(`http://localhost:5000/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }); window.location.reload(); }; return (<div><h2>Projects Dashboard</h2><input type=\"text\" placeholder=\"New Project\" value={newProject} onChange={(e) => setNewProject(e.target.value)} /><button onClick={createProject}>Create Project</button><ul>{projects.map((project) => (<li key={project.id}>{project.name} {role === 'admin' && <button onClick={() => deleteProject(project.id)}>Delete</button>}</li>))}</ul></div>);}export default Dashboard;"
    },
    {
      "path": "backend/package.json",
      "content": "{\"name\":\"backend\",\"version\":\"1.0.0\",\"private\":true,\"dependencies\":{\"express\":\"^4.17.1\",\"jsonwebtoken\":\"^8.5.1\",\"pg\":\"^8.7.1\",\"bcrypt\":\"^5.0.1\",\"cors\":\"^2.8.5\"},\"scripts\":{\"start\":\"node server.js\"}}"
    },
    {
      "path": "backend/server.js",
      "content": "const express = require('express');const jwt = require('jsonwebtoken');const bcrypt = require('bcrypt');const { Pool } = require('pg');const cors = require('cors');const app = express();const SECRET_KEY = 'your_secret_key';const pool = new Pool({ user: 'your_db_user', host: 'localhost', database: 'your_db_name', password: 'your_db_password', port: 5432 });app.use(cors());app.use(express.json());const authenticateToken = (req, res, next) => { const authHeader = req.headers['authorization']; const token = authHeader && authHeader.split(' ')[1]; if (token == null) return res.sendStatus(401); jwt.verify(token, SECRET_KEY, (err, user) => { if (err) return res.sendStatus(403); req.user = user; next(); });};app.post('/api/login', async (req, res) => { const { email, password } = req.body; const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]); const user = result.rows[0]; if (user && bcrypt.compareSync(password, user.password)) { const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY); res.json({ token }); } else { res.sendStatus(403); }});app.get('/api/projects', authenticateToken, async (req, res) => { const { role, id } = req.user; let projects; if (role === 'admin') { projects = await pool.query('SELECT * FROM projects'); } else { projects = await pool.query('SELECT * FROM projects WHERE owner_id = $1', [id]); } res.json({ projects: projects.rows, role });});app.post('/api/projects', authenticateToken, async (req, res) => { const { name } = req.body; const owner_id = req.user.id; await pool.query('INSERT INTO projects (name, owner_id) VALUES ($1, $2)', [name, owner_id]); res.sendStatus(201);});app.delete('/api/projects/:id', authenticateToken, async (req, res) => { if (req.user.role !== 'admin') return res.sendStatus(403); const { id } = req.params; await pool.query('DELETE FROM projects WHERE id = $1', [id]); res.sendStatus(204);});app.listen(5000, () => console.log('Server running on http://localhost:5000'));"
    },
    {
      "path": "schema.sql",
      "content": "CREATE TABLE users ( id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL CHECK (role IN ('member', 'admin')) );CREATE TABLE projects ( id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, owner_id INTEGER REFERENCES users(id) );"
    }
  ]
}
```