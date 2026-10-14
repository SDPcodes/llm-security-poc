```json
{
  "files": [
    {
      "path": "frontend/package.json",
      "content": "{\n  \"name\": \"frontend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"index.js\",\n  \"dependencies\": {\n    \"react\": \"^17.0.2\",\n    \"react-dom\": \"^17.0.2\",\n    \"react-scripts\": \"4.0.3\",\n    \"axios\": \"^0.21.1\"\n  },\n  \"scripts\": {\n    \"start\": \"react-scripts start\",\n    \"build\": \"react-scripts build\",\n    \"test\": \"react-scripts test\",\n    \"eject\": \"react-scripts eject\"\n  }\n}"
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
      "content": "import React, { useState } from 'react';\nimport axios from 'axios';\n\nfunction App() {\n  const [products, setProducts] = useState([]);\n  const [searchQuery, setSearchQuery] = useState(\"\");\n  const [contactForm, setContactForm] = useState({ name: \"\", email: \"\", message: \"\" });\n\n  const fetchProducts = async (query) => {\n    try {\n      const response = await axios.get(`/api/products?q=${query}`);\n      setProducts(response.data);\n    } catch (error) {\n      console.error(\"Error fetching products\", error);\n    }\n  };\n\n  const handleSearch = (e) => {\n    setSearchQuery(e.target.value);\n    fetchProducts(e.target.value);\n  };\n\n  const handleContactChange = (e) => {\n    const { name, value } = e.target;\n    setContactForm({ ...contactForm, [name]: value });\n  };\n\n  const handleContactSubmit = async (e) => {\n    e.preventDefault();\n    try {\n      await axios.post('/api/contact', contactForm);\n      alert('Message sent successfully!');\n      setContactForm({ name: \"\", email: \"\", message: \"\" });\n    } catch (error) {\n      console.error(\"Error sending message\", error);\n    }\n  };\n\n  return (\n    <div>\n      <h1>Product Catalogue</h1>\n      <input\n        type=\"text\"\n        placeholder=\"Search products...\"\n        value={searchQuery}\n        onChange={handleSearch}\n      />\n      <ul>\n        {products.map((product) => (\n          <li key={product.id}>{product.name}</li>\n        ))}\n      </ul>\n      <h2>Contact Us</h2>\n      <form onSubmit={handleContactSubmit}>\n        <input\n          type=\"text\"\n          name=\"name\"\n          placeholder=\"Your Name\"\n          value={contactForm.name}\n          onChange={handleContactChange}\n        />\n        <input\n          type=\"email\"\n          name=\"email\"\n          placeholder=\"Your Email\"\n          value={contactForm.email}\n          onChange={handleContactChange}\n        />\n        <textarea\n          name=\"message\"\n          placeholder=\"Your Message\"\n          value={contactForm.message}\n          onChange={handleContactChange}\n        />\n        <button type=\"submit\">Send</button>\n      </form>\n    </div>\n  );\n}\n\nexport default App;"
    },
    {
      "path": "backend/package.json",
      "content": "{\n  \"name\": \"backend\",\n  \"version\": \"1.0.0\",\n  \"main\": \"server.js\",\n  \"dependencies\": {\n    \"express\": \"^4.17.1\",\n    \"pg\": \"^8.5.1\",\n    \"body-parser\": \"^1.19.0\",\n    \"cors\": \"^2.8.5\"\n  },\n  \"scripts\": {\n    \"start\": \"node server.js\"\n  }\n}"
    },
    {
      "path": "backend/server.js",
      "content": "const express = require('express');\nconst bodyParser = require('body-parser');\nconst cors = require('cors');\nconst { Pool } = require('pg');\n\nconst app = express();\napp.use(cors());\napp.use(bodyParser.json());\n\nconst pool = new Pool({\n  user: 'your_user',\n  host: 'localhost',\n  database: 'your_database',\n  password: 'your_password',\n  port: 5432,\n});\n\napp.get('/api/products', async (req, res) => {\n  const query = req.query.q || '';\n  try {\n    const result = await pool.query('SELECT * FROM products WHERE name ILIKE $1', [`%${query}%`]);\n    res.json(result.rows);\n  } catch (err) {\n    console.error(err);\n    res.status(500).send('Server error');\n  }\n});\n\napp.post('/api/contact', async (req, res) => {\n  const { name, email, message } = req.body;\n  try {\n    await pool.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);\n    res.status(200).send('Message received');\n  } catch (err) {\n    console.error(err);\n    res.status(500).send('Server error');\n  }\n});\n\napp.listen(5000, () => {\n  console.log('Server is running on port 5000');\n});"
    },
    {
      "path": "schema.sql",
      "content": "CREATE TABLE products (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  description TEXT\n);\n\nCREATE TABLE messages (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  email VARCHAR(100) NOT NULL,\n  message TEXT NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nINSERT INTO products (name, description) VALUES\n('Product 1', 'Description for product 1'),\n('Product 2', 'Description for product 2'),\n('Product 3', 'Description for product 3');"
    }
  ]
}
```