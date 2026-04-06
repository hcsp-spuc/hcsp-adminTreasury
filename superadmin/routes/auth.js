const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../../db/index');

// POST /superadmin/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ message: 'Username and password are required.' });

    const { data, error } = await supabase
        .from('tbl_superadmin')
        .select('superadminid, name, username, password')
        .eq('username', username)
        .single();

    if (error || !data)
        return res.status(401).json({ message: 'Invalid username or password.' });

    const passwordMatch = await bcrypt.compare(password, data.password);
    if (!passwordMatch)
        return res.status(401).json({ message: 'Invalid username or password.' });

    req.session.superadmin = { id: data.superadminid, name: data.name, username: data.username };
    res.json({ message: 'Login successful.' });
});

// GET /superadmin/me
router.get('/me', (req, res) => {
    if (!req.session.superadmin)
        return res.status(401).json({ message: 'Unauthorized.' });
    res.json(req.session.superadmin);
});

// POST /superadmin/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out.' });
});

module.exports = router;
