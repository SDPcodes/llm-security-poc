import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get('/api/projects');
        setProjects(response.data);
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    try {
      const response = await axios.post('/api/projects', { name: newProject });
      setProjects([...projects, response.data]);
      setNewProject('');
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      await axios.delete(`/api/projects/${id}`);
      setProjects(projects.filter(project => project.id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  return (
    <div>
      <h1>Projects Dashboard</h1>
      <input type="text" value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder="New Project Name" />
      <button onClick={handleCreateProject}>Create Project</button>
      <ul>
        {projects.map(project => (
          <li key={project.id}>
            {project.name}
            {project.isAdmin && <button onClick={() => handleDeleteProject(project.id)}>Delete</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
