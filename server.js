require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'spuc-treasury-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 } // 8 hours
}));

// Static files
app.use('/admin', express.static(path.join(__dirname, 'admin/public')));
app.use('/superadmin', express.static(path.join(__dirname, 'superadmin/public')));

// Superadmin routes
const superadminAuth   = require('./superadmin/routes/auth');
const superadminAdmins = require('./superadmin/routes/admins');
app.use('/superadmin', superadminAuth);
app.use('/superadmin/admins', superadminAdmins);

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
