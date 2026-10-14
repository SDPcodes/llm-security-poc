const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.post('/api/preview', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  try {
    const response = await axios.get(url);
    const matchTitle = response.data.match(/<title>(.*?)<\/title>/i);
    const title = matchTitle ? matchTitle[1] : 'No title found';
    const matchDescription = response.data.match(/<meta name="description" content="(.*?)"/i);
    const description = matchDescription ? matchDescription[1] : 'No description found';
    await pool.query('INSERT INTO url_logs(url, title) VALUES($1, $2)', [url, title]);
    res.json({ title, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch URL' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
