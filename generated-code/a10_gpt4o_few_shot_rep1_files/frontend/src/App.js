import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const fetchPreview = async () => {
    try {
      const response = await axios.post('/api/preview', { url });
      setPreview(response.data);
      setError('');
    } catch (err) {
      setPreview(null);
      setError('Error fetching preview');
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
        <div className="preview">
          <h2>{preview.title}</h2>
          <p>{preview.description}</p>
        </div>
      )}
    </div>
  );
}

export default App;
