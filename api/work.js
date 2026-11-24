// Panel de valets. GET → {open, mine} (valet) | {all} (admin). POST {action: take | release | received | returned, code}
const { wrap, send, HttpError } = require('../lib/http');
const { session } = require('../lib/auth');
const db = require('../lib/db');
const R = require('../lib/reservations');
const { active } = require('../lib/config');
const { nowLocal } = require('../lib/pricing');
const { notifyN8n } = require('../lib/n8n');

// Los datos del cliente (nombre, teléfono, placa) solo se ven cuando la reserva ya fue tomada
const view = (r, names, reveal) => ({
    ...R.dto(r), paymentDetail: undefined, placa: undefined, valet: names[r.assigned_to] || null,
    ...(reveal ? { cliente: r.customer_name, telefono: r.customer_phone, placa: r.plate } : {})
});
const q = (sql, args) => db().query(sql, args);
const SEL = `select ${R.COLS} from reservations`;

module.exports = wrap(['GET', 'POST'], async (req, res) => {
    const s = await session(req, ['valet', 'admin']), adm = s.role === 'admin', me = adm ? null : s.id;

    if (req.method === 'GET') {
        if (adm) {
            const names = Object.fromEntries((await q('select id, name from staff')).rows.map(x => [x.id, x.name]));
            return send(res, 200, { all: (await q(`${SEL} order by entrega desc limit 200`)).rows.map(r => view(r, names, true)) });
        }
        const now = nowLocal(active().timeZone);
        const open = (await q(`${SEL} where stage = 'open' and status in ('confirmed','pending') and recogida >= $1 order by entrega asc limit 100`, [now])).rows;
        const mine = (await q(`${SEL} where assigned_to = $1 order by (stage = 'returned'), entrega asc limit 100`, [s.id])).rows;
        return send(res, 200, { open: open.map(r => view(r, {}, false)), mine: mine.map(r => view(r, {}, true)) });
    }

    const { action } = req.body || {}, code = String((req.body || {}).code || '').toUpperCase();
    // Cada transición es atómica: si otro valet la tomó antes, no se actualiza ninguna fila
    const Q = {
        take: [`update reservations set assigned_to = $2::uuid, stage = 'assigned', assigned_at = now(), updated_at = now() where code = $1 and stage = 'open' and status in ('confirmed','pending') returning ${R.COLS}`, [code, me]],
        release: [`update reservations set assigned_to = null, stage = 'open', assigned_at = null, updated_at = now() where code = $1 and stage in ('assigned','received') and ($3::boolean or (assigned_to = $2::uuid and stage = 'assigned')) returning ${R.COLS}`, [code, me, adm]],
        received: [`update reservations set stage = 'received', updated_at = now() where code = $1 and stage = 'assigned' and assigned_to = $2::uuid returning ${R.COLS}`, [code, me]],
        returned: [`update reservations set stage = 'returned', status = 'completed', payment_status = case when payment_method = 'cash' then 'paid' else payment_status end, paid_at = case when payment_method = 'cash' then now() else paid_at end, updated_at = now() where code = $1 and stage = 'received' and assigned_to = $2::uuid returning ${R.COLS}`, [code, me]]
    };
    if (!Q[action]) throw new HttpError(400, 'Acción no válida.');
    if (adm && action !== 'release') throw new HttpError(403, 'El administrador solo puede liberar reservas.');
    const { rows: [r] } = await q(...Q[action]);
    if (!r) throw new HttpError(409, action === 'take' ? 'Otro valet ya tomó esta reserva.' : 'La reserva cambió de estado. Actualiza la lista.');
    const ev = { take: 'reservation.assigned', release: 'reservation.released', received: 'reservation.received', returned: 'reservation.completed' }[action];
    await notifyN8n(ev, { ...R.full(r), valet: s.name }); // p. ej. avisar al cliente por WhatsApp/correo desde n8n
    send(res, 200, { ok: true, reservation: view(r, { [r.assigned_to]: s.name }, true) });
});