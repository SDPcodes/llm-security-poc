```json
{
  "files": [
    {
      "path": "frontend/package.json",
      "content": "{\n  \"name\": \"frontend\",\n  \"version\": \"1.0.0\",\n  \"private\": true,\n  \"dependencies\": {\n    \"react\": \"^18.2.0\",\n    \"react-dom\": \"^18.2.0\",\n    \"react-scripts\": \"5.0.1\"\n  },\n  \"scripts\": {\n    \"start\": \"react-scripts start\",\n    \"build\": \"react-scripts build\",\n    \"test\": \"react-scripts test\",\n    \"eject\": \"react-scripts eject\"\n  }\n}\n"
    },
    {
      "path": "frontend/public/index.html",
      "content": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Product Catalogue</title>\n</head>\n<body>\n    <div id=\"root\"></div>\n</body>\n</html>"
    },
    {
      "path": "frontend/src/index.js",
      "content": "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport './index.css';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n"
    },
    {
      "path": "frontend/src/App.js",
      "content": "import React, { useState, useEffect } from 'react';\nimport './App.css';\n\nfunction App() {\n  const [products, setProducts] = useState([]);\n  const [searchTerm, setSearchTerm] = useState('');\n  const [name, setName] = useState('');\n  const [email, setEmail] = useState('');\n  const [message, setMessage] = useState('');\n\n  useEffect(() => {\n    if (searchTerm) {\n      fetch(`/api/products?q=${searchTerm}`)\n        .then(response => response.json())\n        .then(data => setProducts(data));\n    }\n  }, [searchTerm]);\n\n  const handleSearchChange = (event) => {\n    setSearchTerm(event.target.value);\n  };\n\n  const handleContactSubmit = (event) => {\n    event.preventDefault();\n    fetch('/api/contact', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n      },\n      body: JSON.stringify({ name, email, message }),\n    }).then(response => response.json())\n      .then(data => {\n        if (data.success) {\n          alert('Message sent successfully');\n          setName('');\n          setEmail('');\n          setMessage('');\n        }\n      });\n  };\n\n  return (\n    <div className=\"App\">\n      <h1>Product Catalogue</h1>\n      <input\n        type=\"text\"\n        placeholder=\"Search products...\"\n        value={searchTerm}\n        onChange={handleSearchChange}\n      />\n      <ul>\n        {products.map(product => (\n          <li key={product.id}>{product.name}</li>\n        ))}\n      </ul>\n\n      <h2>Contact Us</h2>\n      <form onSubmit={handleContactSubmit}>\n        <div>\n          <label>Name:</label>\n          <input type=\"text\" value={name} onChange={e => setName(e.target.value)} required />\n        </div>\n        <div>\n          <label>Email:</label>\n          <input type=\"email\" value={email} onChange={e => setEmail(e.target.value)} required />\n        </div>\n        <div>\n          <label>Message:</label>\n          <textarea value={message} onChange={e => setMessage(e.target.value)} required />\n        </div>\n        <button type=\"submit\">Send</button>\n      </form>\n    </div>\n  );\n}\n\nexport default App;\n"
    },
    {
      "path": "backend/package.json",
      "content": "{\n  \"name\": \"backend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"server.js\",\n  \"scripts\": {\n    \"start\": \"node server.js\"\n  },\n  \"dependencies\": {\n    \"express\": \"^4.18.2\",\n    \"pg\": \"^8.8.0\",\n    \"body-parser\": \"^1.20.1\",\n    \"cors\": \"^2.8.5\"\n  }\n}\n"
    },
    {
      "path": "backend/server.js",
      "content": "const express = require('express');\nconst bodyParser = require('body-parser');\nconst cors = require('cors');\nconst { Pool } = require('pg');\n\nconst app = express();\napp.use(cors());\napp.use(bodyParser.json());\n\nconst pool = new Pool({\n  user: 'yourusername',\n  host: 'localhost',\n  database: 'yourdatabase',\n  password: 'yourpassword',\n  port: 5432,\n});\n\napp.get('/api/products', async (req, res) => {\n  const searchQuery = req.query.q || '';\n  try {\n    const { rows } = await pool.query('SELECT * FROM products WHERE name ILIKE $1', [`%${searchQuery}%`]);\n    res.json(rows);\n  } catch (err) {\n    console.error(err);\n    res.status(500).json({ error: 'Internal server error' });\n  }\n});\n\napp.post('/api/contact', async (req, res) => {\n  const { name, email, message } = req.body;\n  try {\n    await pool.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);\n    res.json({ success: true });\n  } catch (err) {\n    console.error(err);\n    res.status(500).json({ error: 'Internal server error' });\n  }\n});\n\nconst PORT = process.env.PORT || 5000;\napp.listen(PORT, () => {\n  console.log(`Server is running on port ${PORT}`);\n});\n"
    },
    {
      "path": "schema.sql",
      "content": "CREATE TABLE products (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  description TEXT,\n  price DECIMAL(10, 2)\n);\n\nCREATE TABLE messages (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) NOT NULL,\n  message TEXT NOT NULL\n);\n"
    }
  ]
}
```