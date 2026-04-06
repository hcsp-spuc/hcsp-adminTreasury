const express = require('express');
const router = express.Router();
const supabase = require('../../db/index');

function requireAuth(req, res, next) {
    if (!req.session.superadmin) return res.status(401).json({ message: 'Unauthorized.' });
    next();
}

// GET /superadmin/admins
router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('tbl_admin')
        .select('adminid, name, email, username, status, created_at')
        .order('adminid', { ascending: true });

    if (error) return res.status(500).json({ message: 'Failed to fetch admins.' });
    res.json(data);
});

// POST /superadmin/admins
router.post('/', requireAuth, async (req, res) => {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password)
        return res.status(400).json({ message: 'All fields are required.' });

    const { error } = await supabase
        .from('tbl_admin')
        .insert([{ name, email, username, password, superadminid: req.session.superadmin.id }]);

    if (error) {
        if (error.code === '23505') return res.status(409).json({ message: 'Username or email already exists.' });
        return res.status(500).json({ message: 'Failed to add admin.' });
    }

    res.status(201).json({ message: 'Admin added successfully.' });
});

// PATCH /superadmin/admins/:id/status
router.patch('/:id/status', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status))
        return res.status(400).json({ message: 'Invalid status.' });

    const { error } = await supabase
        .from('tbl_admin')
        .update({ status })
        .eq('adminid', id);

    if (error) return res.status(500).json({ message: 'Failed to update status.' });
    res.json({ message: 'Status updated.' });
});

module.exports = router;
