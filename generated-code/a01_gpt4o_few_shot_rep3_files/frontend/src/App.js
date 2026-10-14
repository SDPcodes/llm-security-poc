import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [projects, setProjects] = useState([]);
  const [role, setRole] = useState('');
  const [newProject, setNewProject] = useState('');

  const login = async () => {
    try {
      const response = await axios.post('/api/login', { email, password });
      setRole(response.data.role);
      fetchProjects();
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
  };

  const createProject = async () => {
    try {
      await axios.post('/api/projects', { name: newProject });
      fetchProjects();
    } catch (error) {
      console.error('Failed to create project', error);
    }
  };

  const deleteProject = async (id) => {
    try {
      await axios.delete(`/api/projects/${id}`);
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project', error);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <button onClick={login}>Login</button>

      <h2>Projects</h2>
      {projects.map((project) => (
        <div key={project.id}>
          <span>{project.name}</span>
          {role === 'admin' && <button onClick={() => deleteProject(project.id)}>Delete</button>}
        </div>
      ))}

      {role && (
        <div>
          <h3>Create Project</h3>
          <input value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder="Project Name" />
          <button onClick={createProject}>Create</button>
        </div>
      )}
    </div>
  );
};

export default App;
