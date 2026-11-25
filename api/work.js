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

    const { action, to } = req.body || {}, code = String((req.body || {}).code || '').toUpperCase();
    const ORDER = ['assigned', 'waiting', 'picked', 'parked', 'enroute', 'returned']; // el último = carro entregado → reserva completada
    const LOG = st => `stage_log = stage_log || jsonb_build_array(jsonb_build_object('stage', ${st}::text, 'at', now()))`;
    let r;
    if (action === 'take' && !adm) { // atómico: si otro valet la tomó antes, no actualiza nada
        r = (await q(`update reservations set assigned_to = $2::uuid, stage = 'assigned', assigned_at = now(), ${LOG("'assigned'")}, updated_at = now() where code = $1 and stage = 'open' and status in ('confirmed','pending') returning ${R.COLS}`, [code, me])).rows[0];
        if (!r) throw new HttpError(409, 'Otro valet ya tomó esta reserva.');
    } else if (action === 'release') { // el valet solo antes de empezar; el admin en cualquier momento (menos si ya se entregó)
        r = (await q(`update reservations set assigned_to = null, stage = 'open', assigned_at = null, ${LOG("'open'")}, updated_at = now() where code = $1 and stage in ('assigned','waiting','picked','parked','enroute') and ($3::boolean or (assigned_to = $2::uuid and stage = 'assigned')) returning ${R.COLS}`, [code, me, adm])).rows[0];
        if (!r) throw new HttpError(409, 'No se puede liberar: la reserva ya avanzó o cambió. Actualiza la lista.');
    } else if (action === 'set' && !adm) { // solo al estado siguiente o al anterior (para corregir un error)
        const i = ORDER.indexOf(to), cur = (await q('select stage from reservations where code = $1 and assigned_to = $2::uuid', [code, me])).rows[0], j = cur ? ORDER.indexOf(cur.stage) : -1;
        if (i < 0 || j < 0 || cur.stage === 'returned' || Math.abs(i - j) !== 1) throw new HttpError(409, 'Cambio de estado no permitido. Actualiza la lista.');
        r = (await q(`update reservations set stage = $3::text, ${LOG('$3')},
        status = case when $3::text = 'returned' then 'completed' else status end,
        payment_status = case when $3::text = 'returned' and payment_method = 'cash' then 'paid' else payment_status end,
        paid_at = case when $3::text = 'returned' and payment_method = 'cash' then now() else paid_at end, updated_at = now()
        where code = $1 and stage = $2 and assigned_to = $4::uuid returning ${R.COLS}`, [code, cur.stage, to, me])).rows[0];
        if (!r) throw new HttpError(409, 'La reserva cambió de estado. Actualiza la lista.');
    } else throw new HttpError(adm ? 403 : 400, adm ? 'El administrador solo puede liberar reservas.' : 'Acción no válida.');

    const ev = action === 'take' ? 'reservation.assigned' : action === 'release' ? 'reservation.released' : to === 'returned' ? 'reservation.completed' : 'reservation.stage';
    await notifyN8n(ev, { ...R.full(r), valet: s.name }); // p. ej. avisar al cliente por WhatsApp/correo en cada cambio
    send(res, 200, { ok: true, reservation: view(r, { [r.assigned_to]: s.name }, true) });
});