const express = require('express');
const router = express.Router();
const supabase = require('../../db/index');

function requireAuth(req, res, next) {
    if (!req.session.superadmin) return res.status(401).json({ message: 'Unauthorized.' });
    next();
}

// GET /superadmin/system-reports
router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('tbl_reporthistory')
        .select('historyid, action, date, tbl_admin(name), tbl_mission(name), tbl_fiscal_year(year)')
        .order('date', { ascending: false });

    if (error) return res.status(500).json({ message: 'Failed to fetch system reports.' });

    const result = data.map(l => ({
        historyid: l.historyid,
        action: l.action,
        date: l.date,
        admin_name: l.tbl_admin?.name || '—',
        mission_name: l.tbl_mission?.name || '—',
        year: l.tbl_fiscal_year?.year || '—'
    }));

    res.json(result);
});

module.exports = router;
