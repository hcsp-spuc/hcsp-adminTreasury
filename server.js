require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for each portal under their own URL namespace
app.use('/admin', express.static(path.join(__dirname, 'admin/public')));
app.use('/superadmin', express.static(path.join(__dirname, 'superadmin/public')));

// Portal entry points
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin/public/index.html'));
});

app.get('/superadmin', (req, res) => {
  res.sendFile(path.join(__dirname, 'superadmin/public/index.html'));
});

// Root redirects to admin login by default
app.get('/', (req, res) => {
  res.redirect('/admin');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`  Admin:       http://localhost:${PORT}/admin`);
  console.log(`  Super Admin: http://localhost:${PORT}/superadmin`);
});
