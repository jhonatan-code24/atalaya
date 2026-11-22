// Punto de integración de pasarelas. Sin MP_ACCESS_TOKEN la reserva queda con pago "pending" y sigue funcionando.
// Para otro proveedor (p. ej. Stripe en España) añade otra función y elígela según p.gateway.
async function createCheckout(row, p) {
    if (p.gateway !== 'mercadopago' || !process.env.MP_ACCESS_TOKEN) return null;
    const base = process.env.PUBLIC_BASE_URL;
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: [{ title: 'Reserva ' + row.code, quantity: 1, unit_price: +row.amount, currency_id: row.currency }],
            external_reference: row.code, notification_url: base + '/api/webhooks/mercadopago',
            back_urls: { success: base + '/#reservas', failure: base + '/#reservas', pending: base + '/#reservas' }, auto_return: 'approved'
        })
    });
    const j = await r.json();
    return r.ok ? { provider: 'mercadopago', ref: j.id, url: j.init_point } : null;
}
module.exports = { createCheckout };