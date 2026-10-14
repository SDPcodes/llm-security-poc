const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.post('/api/preview', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  try {
    const response = await axios.get(url);
    const html = response.data;
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const descriptionMatch = html.match(/<meta name="description" content="([^<]*)"/i);
    const title = titleMatch ? titleMatch[1] : 'No title found';
    const description = descriptionMatch ? descriptionMatch[1] : 'No description found';

    await pool.query(
      'INSERT INTO url_logs (url, title) VALUES ($1, $2)',
      [url, title]
    );

    res.json({ title, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch the URL' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
