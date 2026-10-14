import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [projects, setProjects] = useState([]);
  const [role, setRole] = useState('member');

  useEffect(() => {
    // Fetch projects
    axios.get('/api/projects')
      .then(response => {
        setProjects(response.data.projects);
      })
      .catch(error => {
        console.error('Error fetching projects:', error);
      });
  }, []);

  const handleCreateProject = async () => {
    try {
      const response = await axios.post('/api/projects', { name: 'New Project' }, {
        headers: { 'CSRF-Token': 'your-csrf-token' }
      });
      setProjects([...projects, response.data.project]);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await axios.delete(`/api/projects/${projectId}`, {
        headers: { 'CSRF-Token': 'your-csrf-token' }
      });
      setProjects(projects.filter(project => project.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  return (
    <div>
      <h1>Projects Dashboard</h1>
      <button onClick={handleCreateProject}>Create Project</button>
      <ul>
        {projects.map(project => (
          <li key={project.id}>
            {project.name}
            {role === 'admin' && <button onClick={() => handleDeleteProject(project.id)}>Delete</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
