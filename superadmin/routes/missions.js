const express = require('express');
const router = express.Router();
const supabase = require('../../db/index');

function requireAuth(req, res, next) {
    if (!req.session.superadmin) return res.status(401).json({ message: 'Unauthorized.' });
    next();
}

// GET /superadmin/missions
router.get('/', requireAuth, async (req, res) => {
    const { data: missions, error: mErr } = await supabase
        .from('tbl_mission')
        .select('missionid, name, address, contactno, email')
        .order('missionid', { ascending: true });

    if (mErr) return res.status(500).json({ message: 'Failed to fetch missions.' });

    const { data: admins, error: aErr } = await supabase
        .from('tbl_admin')
        .select('missionid')
        .not('missionid', 'is', null);

    if (aErr) return res.status(500).json({ message: 'Failed to fetch admin counts.' });

    const countMap = admins.reduce((acc, a) => {
        acc[a.missionid] = (acc[a.missionid] || 0) + 1;
        return acc;
    }, {});

    const result = missions.map(m => ({
        ...m,
        admin_count: countMap[m.missionid] || 0
    }));

    res.json(result);
});

// POST /superadmin/missions
router.post('/', requireAuth, async (req, res) => {
    const { name, address, contactno, email } = req.body;
    if (!name) return res.status(400).json({ message: 'Mission name is required.' });

    const { error } = await supabase
        .from('tbl_mission')
        .insert([{ name, address: address || null, contactno: contactno || null, email: email || null }]);

    if (error) {
        if (error.code === '23505') return res.status(409).json({ message: 'Mission name already exists.' });
        return res.status(500).json({ message: 'Failed to create mission.' });
    }
    res.status(201).json({ message: 'Mission created successfully.' });
});

// PUT /superadmin/missions/:id
router.put('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name, address, contactno, email } = req.body;
    if (!name) return res.status(400).json({ message: 'Mission name is required.' });

    const { error } = await supabase
        .from('tbl_mission')
        .update({ name, address: address || null, contactno: contactno || null, email: email || null })
        .eq('missionid', id);

    if (error) return res.status(500).json({ message: 'Failed to update mission.' });
    res.json({ message: 'Mission updated successfully.' });
});

// DELETE /superadmin/missions/:id
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('tbl_mission')
        .delete()
        .eq('missionid', id);

    if (error) return res.status(500).json({ message: 'Failed to delete mission.' });
    res.json({ message: 'Mission deleted.' });
});

module.exports = router;
