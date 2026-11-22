// POST /api/webhooks/mercadopago → actualiza payment_status. El pago se consulta directo a Mercado Pago
// con nuestro token, así que una notificación falsa no puede marcar una reserva como pagada.
const { wrap, send } = require('../../lib/http');
const db = require('../../lib/db');
const R = require('../../lib/reservations');
const { notifyN8n } = require('../../lib/n8n');
const MAP = { approved: 'paid', pending: 'pending', in_process: 'pending', rejected: 'failed', cancelled: 'failed', refunded: 'refunded', charged_back: 'refunded' };

module.exports = wrap(['POST'], async (req, res) => {
    const id = (req.body && req.body.data && req.body.data.id) || req.query['data.id'];
    if (!id || !process.env.MP_ACCESS_TOKEN) return send(res, 200, { ok: true });
    const p = await (await fetch('https://api.mercadopago.com/v1/payments/' + id, { headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN } })).json();
    if (!p.external_reference) return send(res, 200, { ok: true });
    const status = MAP[p.status] || 'pending';
    await db().query(`update reservations set payment_status = $2::text, payment_ref = $3, payment_provider = 'mercadopago',
    paid_at = case when $2::text = 'paid' then now() else paid_at end, updated_at = now() where code = $1`, [p.external_reference, status, String(id)]);
    if (status === 'paid') { const r = await R.getByCode(p.external_reference); if (r) await notifyN8n('reservation.paid', R.full(r)); }
    send(res, 200, { ok: true });
});