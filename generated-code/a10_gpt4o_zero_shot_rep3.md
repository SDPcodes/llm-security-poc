```json
{
  "files": [
    {
      "path": "frontend/package.json",
      "content": "{\n  \"name\": \"url-preview\",\n  \"version\": \"1.0.0\",\n  \"private\": true,\n  \"dependencies\": {\n    \"react\": \"^18.0.0\",\n    \"react-dom\": \"^18.0.0\",\n    \"react-scripts\": \"5.0.0\"\n  },\n  \"scripts\": {\n    \"start\": \"react-scripts start\",\n    \"build\": \"react-scripts build\",\n    \"test\": \"react-scripts test\",\n    \"eject\": \"react-scripts eject\"\n  }\n}"
    },
    {
      "path": "frontend/public/index.html",
      "content": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>URL Preview</title>\n</head>\n<body>\n    <div id=\"root\"></div>\n</body>\n</html>"
    },
    {
      "path": "frontend/src/index.js",
      "content": "import React from 'react';\nimport ReactDOM from 'react-dom';\nimport './index.css';\nimport App from './App';\n\nReactDOM.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n  document.getElementById('root')\n);"
    },
    {
      "path": "frontend/src/App.js",
      "content": "import React, { useState } from 'react';\n\nfunction App() {\n  const [url, setUrl] = useState('');\n  const [preview, setPreview] = useState(null);\n\n  const fetchPreview = async () => {\n    try {\n      const response = await fetch('/api/preview', {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json'\n        },\n        body: JSON.stringify({ url })\n      });\n\n      if (response.ok) {\n        const data = await response.json();\n        setPreview(data);\n      }\n    } catch (error) {\n      console.error('Error fetching preview:', error);\n    }\n  };\n\n  return (\n    <div className=\"App\">\n      <h1>URL Preview</h1>\n      <input\n        type=\"text\"\n        value={url}\n        onChange={e => setUrl(e.target.value)}\n        placeholder=\"Enter URL\"\n      />\n      <button onClick={fetchPreview}>Get Preview</button>\n      {preview && (\n        <div className=\"preview\">\n          <h2>{preview.title}</h2>\n          <p>{preview.description}</p>\n        </div>\n      )}\n    </div>\n  );\n}\n\nexport default App;"
    },
    {
      "path": "backend/package.json",
      "content": "{\n  \"name\": \"url-preview-backend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"server.js\",\n  \"scripts\": {\n    \"start\": \"node server.js\"\n  },\n  \"dependencies\": {\n    \"express\": \"^4.18.2\",\n    \"node-fetch\": \"^2.6.7\",\n    \"pg\": \"^8.7.1\"\n  }\n}"
    },
    {
      "path": "backend/server.js",
      "content": "const express = require('express');\nconst fetch = require('node-fetch');\nconst { Pool } = require('pg');\nconst app = express();\nconst port = 5000;\n\napp.use(express.json());\n\nconst pool = new Pool({\n  user: 'postgres',\n  host: 'localhost',\n  database: 'urlpreview',\n  password: 'password',\n  port: 5432,\n});\n\napp.post('/api/preview', async (req, res) => {\n  const { url } = req.body;\n  try {\n    const response = await fetch(url);\n    const text = await response.text();\n    const titleMatch = text.match(/<title>(.*?)<\\/title>/);\n    const descriptionMatch = text.match(/<meta name=\"description\" content=\"(.*?)\"/);\n    const title = titleMatch ? titleMatch[1] : 'No title available';\n    const description = descriptionMatch ? descriptionMatch[1] : 'No description available';\n\n    await pool.query('INSERT INTO url_logs(url, title) VALUES($1, $2)', [url, title]);\n\n    res.json({ title, description });\n  } catch (error) {\n    console.error('Error fetching URL:', error);\n    res.status(500).json({ error: 'Failed to fetch URL preview' });\n  }\n});\n\napp.listen(port, () => {\n  console.log(`Server running on http://localhost:${port}`);\n});"
    },
    {
      "path": "schema.sql",
      "content": "CREATE TABLE url_logs (\n  id SERIAL PRIMARY KEY,\n  url TEXT NOT NULL,\n  title TEXT NOT NULL,\n  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n"
    }
  ]
}
```