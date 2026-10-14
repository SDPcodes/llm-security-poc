const express = require('express');
const fetch = require('node-fetch');
const { Pool } = require('pg');
const app = express();
const port = 5000;

app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urlpreview',
  password: 'password',
  port: 5432,
});

app.post('/api/preview', async (req, res) => {
  const { url } = req.body;
  try {
    const response = await fetch(url);
    const text = await response.text();
    const titleMatch = text.match(/<title>(.*?)<\/title>/);
    const descriptionMatch = text.match(/<meta name="description" content="(.*?)"/);
    const title = titleMatch ? titleMatch[1] : 'No title available';
    const description = descriptionMatch ? descriptionMatch[1] : 'No description available';

    await pool.query('INSERT INTO url_logs(url, title) VALUES($1, $2)', [url, title]);

    res.json({ title, description });
  } catch (error) {
    console.error('Error fetching URL:', error);
    res.status(500).json({ error: 'Failed to fetch URL preview' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
