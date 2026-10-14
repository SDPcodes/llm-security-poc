import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const fetchPreview = async () => {
    try {
      const response = await axios.post('/api/preview', { url });
      setPreview(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch preview.');
      setPreview(null);
    }
  };

  return (
    <div className="App">
      <h1>URL Preview</h1>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
      />
      <button onClick={fetchPreview}>Fetch Preview</button>
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
