import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProjectsDashboard({ user }) {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
        .then(response => setProjects(response.data))
        .catch(error => console.error('Error fetching projects', error));
    }
  }, [user]);

  const handleDelete = (projectId) => {
    const token = localStorage.getItem('token');
    axios.delete(`/api/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => setProjects(projects.filter(project => project.id !== projectId)))
      .catch(error => console.error('Error deleting project', error));
  };

  return (
    <div>
      <h1>Projects Dashboard</h1>
      <ul>
        {projects.map(project => (
          <li key={project.id}>
            {project.name}
            {user.role === 'admin' && <button onClick={() => handleDelete(project.id)}>Delete</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProjectsDashboard;
