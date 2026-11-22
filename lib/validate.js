const { HttpError } = require('./http');
const { ms, nowLocal } = require('./pricing');
const FMT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Recogida posterior a la entrega y entrega no pasada (en la zona horaria de la sede)
function checkDates(p, entrega, recogida) {
    if (!FMT.test(entrega || '') || !FMT.test(recogida || '')) throw new HttpError(400, 'Fechas no válidas.');
    if (ms(recogida) <= ms(entrega)) throw new HttpError(400, 'La recogida debe ser posterior a la entrega.');
    if (entrega < nowLocal(p.timeZone)) throw new HttpError(400, 'La entrega no puede estar en el pasado.');
}
function parseReservation(p, b = {}) {
    const s = (k, n = 120) => String(b[k] ?? '').trim().slice(0, n);
    const d = {
        nombre: s('nombre'), email: s('email').toLowerCase(), tel: s('tel', 30), placa: s('placa', 12).toUpperCase(), modelo: s('modelo'),
        vuelo: s('vuelo', 12).toUpperCase(), entrega: s('entrega', 16), recogida: s('recogida', 16), termEntrega: s('termEntrega'),
        termRecogida: s('termRecogida'), paymentMethod: s('paymentMethod', 30), paymentDetail: s('paymentDetail', 80),
        extras: Array.isArray(b.extras) ? b.extras.map(String) : []
    };
    const bad = [];
    if (d.nombre.length < 3) bad.push('nombre');
    if (!EMAIL.test(d.email)) bad.push('correo');
    if (d.tel.replace(/\D/g, '').length < 7) bad.push('teléfono');
    if (d.placa.length < 5) bad.push('placa/matrícula');
    if (d.modelo.length < 2) bad.push('marca y modelo');
    if (!p.terminals.includes(d.termEntrega) || !p.terminals.includes(d.termRecogida)) bad.push('terminales');
    if (!p.payments.some(m => m.id === d.paymentMethod)) bad.push('método de pago');
    if (bad.length) throw new HttpError(400, 'Datos no válidos: ' + bad.join(', ') + '.', bad);
    checkDates(p, d.entrega, d.recogida);
    return d;
}
module.exports = { checkDates, parseReservation };