import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function App() {
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/files', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setFiles(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchFiles();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDownload = async (fileId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/files/${fileId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'file'); // or extract the file name from response
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1>File Manager</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            {file.filename}
            <button onClick={() => handleDownload(file.id)}>Download</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
