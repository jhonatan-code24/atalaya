// Aplica db/migrations/*.sql en orden (son idempotentes)
const fs = require('fs'), path = require('path'), db = require('../lib/db');
(async () => {
    const dir = path.join(__dirname, '../db/migrations');
    for (const f of fs.readdirSync(dir).sort()) { await db().query(fs.readFileSync(path.join(dir, f), 'utf8')); console.log('✔', f); }
    process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });