require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('../db/index');

async function hashSuperadminPassword() {
    const username = 'spucsuperadmin';

    const { data, error } = await supabase
        .from('tbl_superadmin')
        .select('superadminid, password')
        .eq('username', username)
        .single();

    if (error || !data) return console.error('Superadmin not found.');

    const hashed = await bcrypt.hash(data.password, 10);

    const { error: updateError } = await supabase
        .from('tbl_superadmin')
        .update({ password: hashed })
        .eq('superadminid', data.superadminid);

    if (updateError) return console.error('Failed to update password:', updateError.message);
    console.log('Password hashed successfully.');
}

hashSuperadminPassword();
