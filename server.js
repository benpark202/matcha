const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/config', (req, res) => {
  const { SUPABASE_URL = '', SUPABASE_ANON_KEY = '' } = process.env;
  res.json({ SUPABASE_URL, SUPABASE_ANON_KEY });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`matcha server listening on http://localhost:${PORT}`);
});
