import React, { useState } from 'react';

function App() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);

  const fetchPreview = async () => {
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    }
  };

  return (
    <div className="App">
      <h1>URL Preview</h1>
      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Enter URL"
      />
      <button onClick={fetchPreview}>Get Preview</button>
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
