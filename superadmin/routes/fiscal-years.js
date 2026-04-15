const express = require('express');
const router = express.Router();
const supabase = require('../../db/index');

function requireAuth(req, res, next) {
    if (!req.session.superadmin) return res.status(401).json({ message: 'Unauthorized.' });
    next();
}

// GET /superadmin/fiscal-years
router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('tbl_fiscal_year')
        .select('yearid, year, start_date, end_date')
        .order('year', { ascending: false });

    if (error) return res.status(500).json({ message: 'Failed to fetch fiscal years.' });
    res.json(data);
});

// POST /superadmin/fiscal-years
router.post('/', requireAuth, async (req, res) => {
    const { year, start_date, end_date } = req.body;

    if (!year || !start_date || !end_date)
        return res.status(400).json({ message: 'All fields are required.' });

    if (new Date(end_date) <= new Date(start_date))
        return res.status(400).json({ message: 'End date must be after start date.' });

    const { error } = await supabase
        .from('tbl_fiscal_year')
        .insert([{ year, start_date, end_date }]);

    if (error) {
        if (error.code === '23505') return res.status(409).json({ message: 'Fiscal year already exists.' });
        return res.status(500).json({ message: 'Failed to add fiscal year.' });
    }

    res.status(201).json({ message: 'Fiscal year added successfully.' });
});

// DELETE /superadmin/fiscal-years/:id
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('tbl_fiscal_year')
        .delete()
        .eq('yearid', id);

    if (error) return res.status(500).json({ message: 'Failed to delete fiscal year.' });
    res.json({ message: 'Fiscal year deleted.' });
});

module.exports = router;
