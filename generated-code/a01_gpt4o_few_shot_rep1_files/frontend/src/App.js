import React, { useState, useEffect } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', { email, password });
      document.cookie = `token=${res.data.token}`;
      history.push('/dashboard');
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
}

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get('/api/projects');
        setProjects(res.data);
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    };
    fetchProjects();
  }, []);

  const createProject = async () => {
    try {
      const res = await axios.post('/api/projects', { name: projectName });
      setProjects([...projects, res.data]);
      setProjectName('');
    } catch (err) {
      console.error('Failed to create project', err);
    }
  };

  const deleteProject = async (id) => {
    try {
      await axios.delete(`/api/projects/${id}`);
      setProjects(projects.filter(project => project.id !== id));
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  return (
    <div>
      <h1>Projects Dashboard</h1>
      <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="New Project Name" />
      <button onClick={createProject}>Create Project</button>
      <ul>
        {projects.map(project => (
          <li key={project.id}>
            {project.name}
            {project.canDelete && <button onClick={() => deleteProject(project.id)}>Delete</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
    </Switch>
  );
}

export default App;
