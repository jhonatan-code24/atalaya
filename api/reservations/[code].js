// GET   /api/reservations/:code?email=...  → estado de la reserva
// PATCH /api/reservations/:code {email, termRecogida | rating+comment | status:'completed'(solo DEMO_MODE)}
// La reserva se verifica con código + correo (la autenticación real queda para una fase posterior).
const { wrap, send, HttpError } = require('../../lib/http');
const { ATALAYA_CONFIG } = require('../../lib/config');
const R = require('../../lib/reservations');
const { notifyN8n } = require('../../lib/n8n');

module.exports = wrap(['GET', 'PATCH'], async (req, res) => {
    const code = String(req.query.code || '').toUpperCase(), b = req.body || {};
    const email = String(req.method === 'GET' ? req.query.email : b.email || '').trim().toLowerCase();
    const r = await R.getByCode(code);
    if (!r || r.customer_email !== email) throw new HttpError(404, 'Reserva no encontrada.'); // no revela si existe
    if (req.method === 'GET') return send(res, 200, { reservation: R.dto(r) });

    const p = ATALAYA_CONFIG.profiles[r.profile], ph = R.phase(r), set = {};
    if (b.termRecogida !== undefined) {
        if (!p.terminals.includes(b.termRecogida)) throw new HttpError(400, 'Terminal no válida.');
        if (ph === 'completed' || ph === 'cancelled') throw new HttpError(409, 'La reserva ya finalizó.');
        set.term_recogida = b.termRecogida;
    }
    if (b.rating !== undefined) {
        const n = Number(b.rating);
        if (!Number.isInteger(n) || n < 1 || n > 5) throw new HttpError(400, 'Calificación de 1 a 5.');
        if (ph !== 'completed') throw new HttpError(409, 'Solo puedes calificar reservas finalizadas.');
        if (r.rating) throw new HttpError(409, 'Esta reserva ya fue calificada.');
        set.rating = n; set.review = String(b.comment || '').trim().slice(0, 200);
    }
    if (b.status === 'completed') {
        if (process.env.DEMO_MODE !== 'true') throw new HttpError(403, 'No permitido.');
        set.status = 'completed';
    }
    if (!Object.keys(set).length) throw new HttpError(400, 'Nada que actualizar.');
    const u = await R.update(code, set);
    await notifyN8n('reservation.updated', R.full(u));
    send(res, 200, { reservation: R.dto(u) });
});