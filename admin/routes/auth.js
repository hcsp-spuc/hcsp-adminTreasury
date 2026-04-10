const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../../db/index');
const requireAuth = require('./middleware');

// POST /admin/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ message: 'Username and password are required.' });

    const { data, error } = await supabase
        .from('tbl_admin')
        .select('adminid, name, username, password, status')
        .eq('username', username)
        .single();

    if (error || !data)
        return res.status(401).json({ message: 'Invalid username or password.' });

    if (data.status !== 'active')
        return res.status(403).json({ message: 'Account is inactive. Contact your administrator.' });

    const match = await bcrypt.compare(password, data.password);
    if (!match)
        return res.status(401).json({ message: 'Invalid username or password.' });

    req.session.admin = { id: data.adminid, name: data.name, username: data.username };
    res.json({ message: 'Login successful.' });
});

// GET /admin/me
router.get('/me', requireAuth, (req, res) => {
    res.json(req.session.admin);
});

// POST /admin/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out.' });
});

module.exports = router;
