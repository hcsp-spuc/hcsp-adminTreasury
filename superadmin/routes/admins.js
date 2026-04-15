const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../../db/index');

function requireAuth(req, res, next) {
    if (!req.session.superadmin) return res.status(401).json({ message: 'Unauthorized.' });
    next();
}

// GET /superadmin/admins
router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('tbl_admin')
        .select('adminid, name, email, username, status, created_at, missionid, tbl_mission(name)')
        .order('adminid', { ascending: true });

    if (error) return res.status(500).json({ message: 'Failed to fetch admins.' });

    const result = data.map(a => ({
        ...a,
        mission_name: a.tbl_mission?.name || '—'
    }));

    res.json(result);
});

// POST /superadmin/admins
router.post('/', requireAuth, async (req, res) => {
    const { name, email, username, password, missionid } = req.body;

    if (!name || !email || !username || !password)
        return res.status(400).json({ message: 'All fields are required.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase
        .from('tbl_admin')
        .insert([{
            name, email, username,
            password: hashedPassword,
            superadminid: req.session.superadmin.id,
            missionid: missionid || null
        }]);

    if (error) {
        if (error.code === '23505') return res.status(409).json({ message: 'Username or email already exists.' });
        return res.status(500).json({ message: 'Failed to add admin.' });
    }

    res.status(201).json({ message: 'Admin added successfully.' });
});

// PUT /superadmin/admins/:id
router.put('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name, email, username, missionid } = req.body;

    if (!name || !email || !username)
        return res.status(400).json({ message: 'Name, email, and username are required.' });

    const { error } = await supabase
        .from('tbl_admin')
        .update({ name, email, username, missionid: missionid || null })
        .eq('adminid', id);

    if (error) {
        if (error.code === '23505') return res.status(409).json({ message: 'Username or email already exists.' });
        return res.status(500).json({ message: 'Failed to update admin.' });
    }
    res.json({ message: 'Admin updated successfully.' });
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

// PATCH /superadmin/admins/:id/mission
router.patch('/:id/mission', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { missionid } = req.body;

    const { error } = await supabase
        .from('tbl_admin')
        .update({ missionid: missionid || null })
        .eq('adminid', id);

    if (error) return res.status(500).json({ message: 'Failed to assign mission.' });
    res.json({ message: 'Mission assigned.' });
});

module.exports = router;
