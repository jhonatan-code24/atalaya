// POST /api/reservations → valida, comprueba disponibilidad, calcula el monto y guarda
const { wrap, send } = require('../../lib/http');
const { ATALAYA_CONFIG, active } = require('../../lib/config');
const { quote } = require('../../lib/pricing');
const { parseReservation } = require('../../lib/validate');
const R = require('../../lib/reservations');
const { createCheckout } = require('../../lib/payments');
const { notifyN8n } = require('../../lib/n8n');

module.exports = wrap(['POST'], async (req, res) => {
    const p = active(), d = parseReservation(p, req.body);
    const pm = p.payments.find(m => m.id === d.paymentMethod);
    const online = ['card', 'bank', 'phone', 'email', 'wallet'].includes(pm.kind); // cash/transfer = pago manual
    const q = quote(ATALAYA_CONFIG, p, d);
    const row = await R.create(p, d, q, online ? 'pending' : 'unpaid');

    let payment = null;
    if (online) try { // un fallo de la pasarela no cancela la reserva
        payment = await createCheckout(row, p);
        if (payment) await R.setPayment(row.code, payment.provider, payment.ref);
    } catch (e) { console.error('checkout:', e.message); }

    if (await notifyN8n('reservation.created', R.full(row))) await R.markNotified(row.code);
    send(res, 201, { reservation: R.dto(row), quote: q, payment });
});