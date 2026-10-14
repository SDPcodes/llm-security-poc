import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import axios from 'axios';

function App() {
  const [auth, setAuth] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (auth) {
      axios.get('/api/projects', { headers: { Authorization: `Bearer ${auth.token}` } })
        .then(response => setProjects(response.data))
        .catch(error => console.error(error));
    }
  }, [auth]);

  const handleLogin = (email, password) => {
    axios.post('/api/login', { email, password })
      .then(response => setAuth(response.data))
      .catch(error => console.error(error));
  };

  const handleLogout = () => setAuth(null);

  const handleCreateProject = (name) => {
    if (auth) {
      axios.post('/api/projects', { name }, { headers: { Authorization: `Bearer ${auth.token}` } })
        .then(response => setProjects([...projects, response.data]))
        .catch(error => console.error(error));
    }
  };

  const handleDeleteProject = (id) => {
    if (auth && auth.role === 'admin') {
      axios.delete(`/api/projects/${id}`, { headers: { Authorization: `Bearer ${auth.token}` } })
        .then(() => setProjects(projects.filter(p => p.id !== id)))
        .catch(error => console.error(error));
    }
  };

  return (
    <Router>
      <Switch>
        <Route path="/login">
          <Login onLogin={handleLogin} />
        </Route>
        <Route path="/dashboard">
          {auth ? <Dashboard projects={projects} auth={auth} onLogout={handleLogout} onCreateProject={handleCreateProject} onDeleteProject={handleDeleteProject} /> : <Redirect to="/login" />}
        </Route>
        <Redirect from="/" to="/login" />
      </Switch>
    </Router>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

function Dashboard({ projects, auth, onLogout, onCreateProject, onDeleteProject }) {
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    onCreateProject(newProjectName);
    setNewProjectName('');
  };

  return (
    <div>
      <h2>Projects Dashboard</h2>
      <button onClick={onLogout}>Logout</button>
      <ul>
        {projects.map(project => (
          <li key={project.id}>
            {project.name}
            {auth.role === 'admin' && <button onClick={() => onDeleteProject(project.id)}>Delete</button>}
          </li>
        ))}
      </ul>
      {auth.role === 'admin' && (
        <form onSubmit={handleCreate}>
          <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="New Project Name" required />
          <button type="submit">Create Project</button>
        </form>
      )}
    </div>
  );
}

export default App;
