import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [projects, setProjects] = useState([]);
  const [role, setRole] = useState('member'); // stub for user role

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get('/api/projects');
        setProjects(response.data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, []);

  const deleteProject = async (id) => {
    if (role !== 'admin') return;
    try {
      await axios.delete(`/api/projects/${id}`);
      setProjects((prevProjects) => prevProjects.filter((proj) => proj.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  return (
    <div className="App">
      <h1>Projects Dashboard</h1>
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            {project.name}
            {role === 'admin' && (
              <button onClick={() => deleteProject(project.id)}>Delete</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
