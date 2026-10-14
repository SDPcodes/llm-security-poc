import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState(null);

  useEffect(() => {
    axios.get('/api/files')
      .then(response => setFiles(response.data))
      .catch(error => console.error(error));
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = () => {
    const formData = new FormData();
    formData.append('file', file);
    axios.post('/api/files', formData)
      .then(() => axios.get('/api/files'))
      .then(response => setFiles(response.data))
      .catch(error => console.error(error));
  };

  return (
    <div>
      <h1>File Upload</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      <ul>
        {files.map(f => (
          <li key={f.id}>
            {f.filename}
            <a href={`/api/files/${f.id}/download`}>Download</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
