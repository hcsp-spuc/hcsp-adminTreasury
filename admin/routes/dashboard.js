const express = require('express');
const router = express.Router();
const supabase = require('../../db/index');
const requireAuth = require('./middleware');

// GET /admin/dashboard/summary — total tithes, offerings, and combined for the admin's missions
router.get('/summary', requireAuth, async (req, res) => {
    const adminId = req.session.admin.id;

    const { data: missions } = await supabase
        .from('tbl_mission')
        .select('missionid')
        .eq('adminid', adminId);

    if (!missions || !missions.length) return res.json({ totalTithes: 0, totalOfferings: 0, totalAmount: 0 });

    const missionIds = missions.map(m => m.missionid);

    const [{ data: tithes }, { data: offerings }] = await Promise.all([
        supabase.from('tbl_tithes').select('amount').in('missionid', missionIds),
        supabase.from('tbl_offerings').select('amount').in('missionid', missionIds)
    ]);

    const totalTithes = (tithes || []).reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalOfferings = (offerings || []).reduce((s, r) => s + parseFloat(r.amount), 0);

    res.json({ totalTithes, totalOfferings, totalAmount: totalTithes + totalOfferings });
});

// GET /admin/dashboard/monthly — per-month tithes and offerings totals for the current year
router.get('/monthly', requireAuth, async (req, res) => {
    const adminId = req.session.admin.id;
    const currentYear = new Date().getFullYear();

    const { data: missions } = await supabase
        .from('tbl_mission')
        .select('missionid')
        .eq('adminid', adminId);

    if (!missions || !missions.length) return res.json([]);

    const missionIds = missions.map(m => m.missionid);

    const { data: fiscalYear } = await supabase
        .from('tbl_fiscal_year')
        .select('yearid')
        .eq('year', currentYear)
        .single();

    if (!fiscalYear) return res.json([]);

    const [{ data: tithes }, { data: offerings }] = await Promise.all([
        supabase.from('tbl_tithes').select('month, amount').in('missionid', missionIds).eq('yearid', fiscalYear.yearid),
        supabase.from('tbl_offerings').select('month, amount').in('missionid', missionIds).eq('yearid', fiscalYear.yearid)
    ]);

    const monthly = {};
    (tithes || []).forEach(r => {
        monthly[r.month] = monthly[r.month] || { month: r.month, tithes: 0, offerings: 0 };
        monthly[r.month].tithes += parseFloat(r.amount);
    });
    (offerings || []).forEach(r => {
        monthly[r.month] = monthly[r.month] || { month: r.month, tithes: 0, offerings: 0 };
        monthly[r.month].offerings += parseFloat(r.amount);
    });

    res.json(Object.values(monthly).sort((a, b) => a.month - b.month));
});

// GET /admin/dashboard/last-upload — rows from the most recent upload batch
router.get('/last-upload', requireAuth, async (req, res) => {
    const adminId = req.session.admin.id;

    const { data: missions } = await supabase
        .from('tbl_mission')
        .select('missionid, name')
        .eq('adminid', adminId);

    if (!missions || !missions.length) return res.json([]);

    const missionIds = missions.map(m => m.missionid);
    const missionMap = Object.fromEntries(missions.map(m => [m.missionid, m.name]));

    // Find the latest date_recorded across tithes and offerings
    const [{ data: latestTithe }, { data: latestOffering }] = await Promise.all([
        supabase.from('tbl_tithes').select('date_recorded').in('missionid', missionIds).order('date_recorded', { ascending: false }).limit(1),
        supabase.from('tbl_offerings').select('date_recorded').in('missionid', missionIds).order('date_recorded', { ascending: false }).limit(1)
    ]);

    const lastTitheDate = latestTithe?.[0]?.date_recorded;
    const lastOfferingDate = latestOffering?.[0]?.date_recorded;
    const lastDate = [lastTitheDate, lastOfferingDate].filter(Boolean).sort().pop();

    if (!lastDate) return res.json([]);

    const [{ data: tithes }, { data: offerings }] = await Promise.all([
        supabase.from('tbl_tithes').select('missionid, amount, date_recorded').in('missionid', missionIds).eq('date_recorded', lastDate),
        supabase.from('tbl_offerings').select('missionid, amount, date_recorded').in('missionid', missionIds).eq('date_recorded', lastDate)
    ]);

    const rows = [
        ...(tithes || []).map(r => ({ name: missionMap[r.missionid], type: 'Tithe', amount: r.amount, date: r.date_recorded })),
        ...(offerings || []).map(r => ({ name: missionMap[r.missionid], type: 'Offering', amount: r.amount, date: r.date_recorded }))
    ];

    res.json(rows);
});

module.exports = router;
