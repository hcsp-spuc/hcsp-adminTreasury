const express = require('express');
const router = express.Router();
const supabase = require('../../db/index');
const requireAuth = require('./middleware');

async function getAdminMissionIds(adminId) {
    const { data } = await supabase
        .from('tbl_admin')
        .select('missionid')
        .eq('adminid', adminId)
        .single();
    return data?.missionid ? [data.missionid] : [];
}

// GET /admin/dashboard/summary
router.get('/summary', requireAuth, async (req, res) => {
    const adminId = req.session.admin.id;
    const missionIds = await getAdminMissionIds(adminId);
    if (!missionIds.length) return res.json({ totalTithes: 0, totalOfferings: 0, totalAmount: 0 });

    const [{ data: tithes }, { data: offerings }] = await Promise.all([
        supabase.from('tbl_tithes').select('amount').in('missionid', missionIds),
        supabase.from('tbl_offerings').select('amount').in('missionid', missionIds)
    ]);

    const totalTithes   = (tithes   || []).reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalOfferings = (offerings || []).reduce((s, r) => s + parseFloat(r.amount), 0);

    res.json({ totalTithes, totalOfferings, totalAmount: totalTithes + totalOfferings });
});

// GET /admin/dashboard/monthly
router.get('/monthly', requireAuth, async (req, res) => {
    const adminId = req.session.admin.id;
    const missionIds = await getAdminMissionIds(adminId);
    if (!missionIds.length) return res.json([]);

    const currentYear = new Date().getFullYear();
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

// GET /admin/dashboard/last-upload
router.get('/last-upload', requireAuth, async (req, res) => {
    const adminId = req.session.admin.id;
    const missionIds = await getAdminMissionIds(adminId);
    if (!missionIds.length) return res.json([]);

    // Get mission name
    const { data: mission } = await supabase
        .from('tbl_mission')
        .select('missionid, name')
        .in('missionid', missionIds);

    const missionMap = Object.fromEntries((mission || []).map(m => [m.missionid, m.name]));

    const [{ data: latestTithe }, { data: latestOffering }] = await Promise.all([
        supabase.from('tbl_tithes').select('date_recorded').in('missionid', missionIds).order('date_recorded', { ascending: false }).limit(1),
        supabase.from('tbl_offerings').select('date_recorded').in('missionid', missionIds).order('date_recorded', { ascending: false }).limit(1)
    ]);

    const lastDate = [latestTithe?.[0]?.date_recorded, latestOffering?.[0]?.date_recorded]
        .filter(Boolean).sort().pop();

    if (!lastDate) return res.json([]);

    const [{ data: tithes }, { data: offerings }] = await Promise.all([
        supabase.from('tbl_tithes').select('missionid, amount, date_recorded').in('missionid', missionIds).eq('date_recorded', lastDate),
        supabase.from('tbl_offerings').select('missionid, amount, date_recorded').in('missionid', missionIds).eq('date_recorded', lastDate)
    ]);

    const rows = [
        ...(tithes   || []).map(r => ({ name: missionMap[r.missionid], type: 'Tithe',    amount: r.amount, date: r.date_recorded })),
        ...(offerings || []).map(r => ({ name: missionMap[r.missionid], type: 'Offering', amount: r.amount, date: r.date_recorded }))
    ];

    res.json(rows);
});

module.exports = router;
