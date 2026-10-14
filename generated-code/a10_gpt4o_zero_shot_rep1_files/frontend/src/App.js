import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);

  const fetchPreview = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/preview', { url });
      setPreview(response.data);
    } catch (error) {
      console.error('Error fetching URL preview:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>URL Previewer</h1>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
        style={{ width: '300px' }}
      />
      <button onClick={fetchPreview}>Fetch Preview</button>
      {preview && (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <h2>{preview.title}</h2>
          <p>{preview.description}</p>
        </div>
      )}
    </div>
  );
}

export default App;
