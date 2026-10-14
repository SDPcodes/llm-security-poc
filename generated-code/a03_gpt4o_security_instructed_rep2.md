```json
{
  "files": [
    {
      "path": "frontend/package.json",
      "content": "{\n  \"name\": \"frontend\",\n  \"version\": \"1.0.0\",\n  \"private\": true,\n  \"dependencies\": {\n    \"axios\": \"^0.21.1\",\n    \"react\": \"^17.0.2\",\n    \"react-dom\": \"^17.0.2\",\n    \"react-scripts\": \"4.0.3\"\n  },\n  \"scripts\": {\n    \"start\": \"react-scripts start\",\n    \"build\": \"react-scripts build\",\n    \"test\": \"react-scripts test\",\n    \"eject\": \"react-scripts eject\"\n  }\n}"
    },
    {
      "path": "frontend/public/index.html",
      "content": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Product Catalogue</title>\n</head>\n<body>\n    <div id=\"root\"></div>\n</body>\n</html>"
    },
    {
      "path": "frontend/src/index.js",
      "content": "import React from 'react';\nimport ReactDOM from 'react-dom';\nimport './index.css';\nimport App from './App';\n\nReactDOM.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n  document.getElementById('root')\n);"
    },
    {
      "path": "frontend/src/App.js",
      "content": "import React, { useState } from 'react';\nimport axios from 'axios';\n\nfunction App() {\n  const [products, setProducts] = useState([]);\n  const [query, setQuery] = useState('');\n  const [contact, setContact] = useState({ name: '', email: '', message: '' });\n\n  const searchProducts = async (e) => {\n    e.preventDefault();\n    try {\n      const response = await axios.get(`/api/products?q=${encodeURIComponent(query)}`);\n      setProducts(response.data);\n    } catch (error) {\n      console.error('Error fetching products:', error);\n    }\n  };\n\n  const submitContact = async (e) => {\n    e.preventDefault();\n    try {\n      await axios.post('/api/contact', contact, {\n        headers: {'CSRF-Token': 'your-csrf-token'} // Replace with actual CSRF token\n      });\n      alert('Message sent successfully!');\n    } catch (error) {\n      console.error('Error sending message:', error);\n    }\n  };\n\n  return (\n    <div className=\"App\">\n      <h1>Product Catalogue</h1>\n      <form onSubmit={searchProducts}>\n        <input\n          type=\"text\"\n          value={query}\n          onChange={(e) => setQuery(e.target.value)}\n          placeholder=\"Search products...\"\n        />\n        <button type=\"submit\">Search</button>\n      </form>\n\n      <ul>\n        {products.map(product => <li key={product.id}>{product.name}</li>)}\n      </ul>\n\n      <h2>Contact Us</h2>\n      <form onSubmit={submitContact}>\n        <input\n          type=\"text\"\n          value={contact.name}\n          onChange={(e) => setContact({ ...contact, name: e.target.value })}\n          placeholder=\"Name\"\n          required\n        />\n        <input\n          type=\"email\"\n          value={contact.email}\n          onChange={(e) => setContact({ ...contact, email: e.target.value })}\n          placeholder=\"Email\"\n          required\n        />\n        <textarea\n          value={contact.message}\n          onChange={(e) => setContact({ ...contact, message: e.target.value })}\n          placeholder=\"Message\"\n          required\n        />\n        <button type=\"submit\">Send</button>\n      </form>\n    </div>\n  );\n}\n\nexport default App;"
    },
    {
      "path": "backend/package.json",
      "content": "{\n  \"name\": \"backend\",\n  \"version\": \"1.0.0\",\n  \"private\": true,\n  \"dependencies\": {\n    \"bcrypt\": \"^5.0.1\",\n    \"cors\": \"^2.8.5\",\n    \"csurf\": \"^1.11.0\",\n    \"dotenv\": \"^10.0.0\",\n    \"express\": \"^4.17.1\",\n    \"express-rate-limit\": \"^5.3.0\",\n    \"helmet\": \"^4.6.0\",\n    \"jsonwebtoken\": \"^8.5.1\",\n    \"pg\": \"^8.6.0\",\n    \"pg-hstore\": \"^2.3.3\"\n  },\n  \"scripts\": {\n    \"start\": \"node server.js\"\n  }\n}"
    },
    {
      "path": "backend/server.js",
      "content": "require('dotenv').config();\nconst express = require('express');\nconst helmet = require('helmet');\nconst cors = require('cors');\nconst csurf = require('csurf');\nconst rateLimit = require('express-rate-limit');\nconst { Pool } = require('pg');\nconst jwt = require('jsonwebtoken');\nconst bcrypt = require('bcrypt');\n\nconst app = express();\nconst pool = new Pool();\n\napp.use(helmet());\napp.use(cors({ origin: 'http://localhost:3000', credentials: true }));\napp.use(express.json());\napp.use(csurf({ cookie: true }));\n\nconst apiLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 minutes\n  max: 100\n});\n\napp.get('/api/products', async (req, res) => {\n  const { q } = req.query;\n  try {\n    const result = await pool.query('SELECT * FROM products WHERE name ILIKE $1', [`%${q}%`]);\n    res.json(result.rows);\n  } catch (err) {\n    console.error(err);\n    res.status(500).send('Internal Server Error');\n  }\n});\n\napp.post('/api/contact', async (req, res) => {\n  const { name, email, message } = req.body;\n  try {\n    await pool.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);\n    res.status(200).send('Message stored');\n  } catch (err) {\n    console.error(err);\n    res.status(500).send('Internal Server Error');\n  }\n});\n\napp.listen(4000, () => {\n  console.log('Server is running on port 4000');\n});"
    },
    {
      "path": "schema.sql",
      "content": "CREATE TABLE products (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  description TEXT,\n  price NUMERIC(10, 2) NOT NULL\n);\n\nCREATE TABLE messages (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) NOT NULL,\n  message TEXT NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);"
    }
  ]
}
```