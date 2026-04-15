const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const supabase = require('../../db/index');
const requireAuth = require('./middleware');

const upload = multer({ storage: multer.memoryStorage() });

const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const monthAbbr  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

// GET /admin/upload/template — download the Excel template
router.get('/template', requireAuth, (req, res) => {
    const wb = XLSX.utils.book_new();

    const templateData = [
        ['mission_name', 'year', 'month', 'tithe_amount', 'offering_amount'],
        ['Example Mission', 2024, 'January', 5000.00, 3000.00]
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);

    ws['!cols'] = [
        { wch: 25 },
        { wch: 8 },
        { wch: 8 },
        { wch: 15 },
        { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Tithes & Offerings');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="treasury_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// POST /admin/upload/excel — parse and save uploaded Excel
router.post('/excel', requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    let rows;
    try {
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws);
    } catch {
        return res.status(400).json({ message: 'Invalid Excel file.' });
    }

    if (!rows.length) return res.status(400).json({ message: 'Excel file is empty.' });

    const required = ['mission_name', 'year', 'month', 'tithe_amount', 'offering_amount'];
    const keys = Object.keys(rows[0]);
    const missing = required.filter(c => !keys.includes(c));
    if (missing.length) {
        return res.status(400).json({ message: `Missing columns: ${missing.join(', ')}. Please use the provided template.` });
    }

    const adminId = req.session.admin.id;
    const errors = [];
    let saved = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const missionName = String(row.mission_name || '').trim();
        const year = parseInt(row.year);
        const rawMonth = String(row.month || '').trim();
        let month = parseInt(rawMonth);
        if (isNaN(month)) {
            const lower = rawMonth.toLowerCase();
            const idx = monthNames.indexOf(lower) !== -1 ? monthNames.indexOf(lower) : monthAbbr.indexOf(lower);
            month = idx !== -1 ? idx + 1 : NaN;
        }
        const titheAmount = parseFloat(row.tithe_amount) || 0;
        const offeringAmount = parseFloat(row.offering_amount) || 0;

        if (!missionName || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            errors.push(`Row ${rowNum}: Invalid data.`);
            continue;
        }

        // Get mission by name only (missions are shared across admins)
        let { data: mission } = await supabase
            .from('tbl_mission')
            .select('missionid')
            .eq('name', missionName)
            .single();

        if (!mission) {
            const { data: newMission, error: mErr } = await supabase
                .from('tbl_mission')
                .insert({ name: missionName })
                .select('missionid')
                .single();
            if (mErr) { errors.push(`Row ${rowNum}: Could not create mission "${missionName}".`); continue; }
            mission = newMission;
        }

        // Get or create fiscal year
        let { data: fiscalYear } = await supabase
            .from('tbl_fiscal_year')
            .select('yearid')
            .eq('year', year)
            .single();

        if (!fiscalYear) {
            const { data: newYear, error: yErr } = await supabase
                .from('tbl_fiscal_year')
                .insert({ year, start_date: `${year}-01-01`, end_date: `${year}-12-31` })
                .select('yearid')
                .single();
            if (yErr) { errors.push(`Row ${rowNum}: Could not create fiscal year ${year}.`); continue; }
            fiscalYear = newYear;
        }

        // Upsert tithes
        const { error: tErr } = await supabase
            .from('tbl_tithes')
            .upsert({ missionid: mission.missionid, yearid: fiscalYear.yearid, month, amount: titheAmount, date_recorded: new Date().toISOString().split('T')[0] },
                { onConflict: 'missionid,yearid,month' });
        if (tErr) { errors.push(`Row ${rowNum}: Failed to save tithe.`); continue; }

        // Upsert offerings
        const { error: oErr } = await supabase
            .from('tbl_offerings')
            .upsert({ missionid: mission.missionid, yearid: fiscalYear.yearid, month, amount: offeringAmount, date_recorded: new Date().toISOString().split('T')[0] },
                { onConflict: 'missionid,yearid,month' });
        if (oErr) { errors.push(`Row ${rowNum}: Failed to save offering.`); continue; }

        saved++;
    }

    // Log to report history
    await supabase.from('tbl_reportHistory').insert({
        adminid: adminId,
        action: `Uploaded Excel: ${saved} row(s) saved, ${errors.length} error(s).`
    });

    res.json({ message: `Upload complete. ${saved} row(s) saved.`, errors });
});

module.exports = router;
