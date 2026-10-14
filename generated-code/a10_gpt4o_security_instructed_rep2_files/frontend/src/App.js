import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const fetchPreview = async () => {
    try {
      setError('');
      const response = await axios.post('/api/preview', { url });
      setPreview(response.data);
    } catch (err) {
      setError('Failed to fetch preview.');
    }
  };

  return (
    <div>
      <h1>URL Preview</h1>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter a URL"
      />
      <button onClick={fetchPreview}>Get Preview</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {preview && (
        <div>
          <h2>{preview.title}</h2>
          <p>{preview.description}</p>
        </div>
      )}
    </div>
  );
}

export default App;
