const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'url_preview',
  password: 'password',
  port: 5432,
});

app.post('/api/preview', async (req, res) => {
  const { url } = req.body;
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const title = $('head > title').text();
    const description = $('meta[name="description"]').attr('content') || 'No description available';

    await pool.query('INSERT INTO url_logs (url, title) VALUES ($1, $2)', [url, title]);

    res.json({ title, description });
  } catch (error) {
    console.error('Error fetching URL:', error);
    res.status(500).json({ error: 'Failed to fetch URL' });
  }
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
