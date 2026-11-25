// GET /api/health → comprueba la conexión y el esquema de la base de datos
const { wrap, send } = require('../lib/http'); // wrap aplica las migraciones pendientes antes de responder
const db = require('../lib/db');
module.exports = wrap(['GET'], async (req, res) => {
    const cols = (await db().query("select column_name from information_schema.columns where table_name = 'reservations' and column_name in ('parking','stage','stage_log')")).rows.map(r => r.column_name);
    const migrations = (await db().query('select name from schema_migrations order by name')).rows.map(r => r.name);
    send(res, 200, { ok: true, columns: cols, migrations });
});