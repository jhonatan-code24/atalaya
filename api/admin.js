// Solo admin. GET → lista de valets | POST {action: approve | reject | suspend | reactivate, id}
const { wrap, send, HttpError } = require('../lib/http');
const { session } = require('../lib/auth');
const db = require('../lib/db');
const { notifyN8n } = require('../lib/n8n');
const MAP = { approve: 'approved', reject: 'rejected', suspend: 'suspended', reactivate: 'approved' };

module.exports = wrap(['GET', 'POST'], async (req, res) => {
    const s = await session(req, ['admin']);
    if (req.method === 'GET') {
        const { rows } = await db().query(`select id, name, email, phone, status, created_at, approved_at from staff order by (status = 'pending') desc, created_at desc`);
        return send(res, 200, { staff: rows });
    }
    const { action, id } = req.body || {}, status = MAP[action];
    if (!status || !/^[0-9a-f-]{36}$/i.test(String(id))) throw new HttpError(400, 'Solicitud no válida.');
    const { rows: [u] } = await db().query(`update staff set status = $2::text, approved_at = case when $2::text = 'approved' then now() else approved_at end,
    approved_by = $3 where id = $1 returning name, email, phone, status`, [id, status, s.email]);
    if (!u) throw new HttpError(404, 'Valet no encontrado.');
    // Si deja de estar aprobado, sus reservas aún no recibidas vuelven a la lista de disponibles
    if (status !== 'approved') await db().query(`update reservations set assigned_to = null, stage = 'open', assigned_at = null where assigned_to = $1 and stage = 'assigned'`, [id]);
    await notifyN8n('staff.' + status, u); // p. ej. enviar correo al valet cuando se aprueba
    send(res, 200, { ok: true, staff: u });
});