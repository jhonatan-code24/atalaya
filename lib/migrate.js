// Aplica las migraciones pendientes la primera vez que arranca cada instancia (evita errores por olvidar `npm run db:init`)
const db = require('./db');
const MIGRATIONS = require('./schema');
let done;
async function run() {
    const c = await db().connect();
    try {
        await c.query('select pg_advisory_lock(727272)'); // una instancia a la vez
        await c.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
        const seen = new Set((await c.query('select name from schema_migrations')).rows.map(r => r.name));
        for (const m of MIGRATIONS) if (!seen.has(m.name)) { await c.query(m.sql); await c.query('insert into schema_migrations (name) values ($1)', [m.name]); }
    } finally { await c.query('select pg_advisory_unlock(727272)').catch(() => { }); c.release(); }
}
module.exports = () => done || (done = run().catch(e => { done = null; throw e; }));