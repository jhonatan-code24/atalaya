// Correo de confirmación al cliente (Gmail + contraseña de aplicación).
// Si el envío falla, la reserva NO se cancela: solo se registra el error.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BRAND = 'Valetexpress'; // nombre que ve el cliente
let tx;
const transport = () => tx || (tx = require('nodemailer').createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } }));

function build(r, p) {
    const money = n => new Intl.NumberFormat(p.locale, { style: 'currency', currency: r.currency, minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals }).format(n);
    const when = v => new Intl.DateTimeFormat(p.locale, { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(v + ':00Z'));
    const park = (p.parking.find(x => x.id === r.parking) || {}).name || '';
    const extras = r.extras || [], total = money(+r.amount), iva = Math.round(p.taxRate * 100) + '%';
    const notes = p.extras.filter(x => x.note && extras.some(e => e.id === x.id)).map(x => x.note);
    const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const rows = [
        ['Entrega del vehículo', when(r.entrega) + '\n' + r.term_entrega],
        ['Recogida del vehículo', when(r.recogida) + '\n' + r.term_recogida],
        ['Vehículo', `${r.vehicle} · ${r.plate}`],
        ['Tipo de parking', park],
        r.flight && ['Vuelo', r.flight],
        extras.length && ['Servicios adicionales', extras.map(e => e.name).join('\n')],
        ['Total a pagar', `${total} (IVA ${iva} incluido)`]
    ].filter(Boolean);
    const pay = 'Pagas directamente en el aparcamiento al recoger tu vehículo.';
    const subject = `Reserva confirmada ${r.code} · ${BRAND}`;
    const tr = ([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e6ebf3;color:#66748a;font-size:13px;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #e6ebf3;font-size:15px;color:#1c2a3f">${esc(v).replace(/\n/g, '<br>')}</td></tr>`;
    const html = `<div style="background:#f3f6fb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
<div style="background:#0b1f3a;padding:22px 26px;color:#fff;font-size:22px;font-weight:bold">${BRAND} <span style="color:#f5a524">·</span> <span style="font-size:13px;font-weight:normal;opacity:.8">${esc(p.place)}</span></div>
<div style="padding:26px">
<h2 style="margin:0 0 6px;color:#0b1f3a">¡Reserva confirmada!</h2>
<p style="margin:0 0 16px;color:#1c2a3f">Hola ${esc(r.customer_name)}, ya tenemos tu reserva. Presenta este código al valet:</p>
<div style="background:#0b1f3a;color:#f5a524;font-size:24px;font-weight:bold;letter-spacing:2px;text-align:center;padding:14px;border-radius:10px;margin-bottom:18px">${esc(r.code)}</div>
<table style="width:100%;border-collapse:collapse">${rows.map(tr).join('')}</table>
<p style="background:#fff6e2;border-radius:10px;padding:12px;color:#1c2a3f;font-size:14px;margin:18px 0 8px">🅿️ ${pay}</p>
${notes.map(n => `<p style="color:#66748a;font-size:13px;margin:4px 0">• ${esc(n)}</p>`).join('')}
<p style="color:#66748a;font-size:13px;margin:18px 0 0">¿Cambió tu plan? Desde “Mi reserva”${base ? ` (<a href="${esc(base)}/#reservas" style="color:#0b1f3a">${esc(base)}</a>)` : ''} puedes cambiar la terminal de recogida con tu código y este correo.</p>
</div></div>
<p style="text-align:center;color:#8a97ab;font-size:12px;margin:14px 0 0">${BRAND} · ${esc(p.airport)}</p></div>`;
    const text = [`¡Reserva confirmada! Código: ${r.code}`, '', ...rows.map(([k, v]) => `${k}: ${v.replace(/\n/g, ' · ')}`), '', pay, ...notes.map(n => '• ' + n),
        '', `Puedes cambiar la terminal de recogida desde "Mi reserva"${base ? ': ' + base + '/#reservas' : ''} con tu código y este correo.`].join('\n');
    return { subject, html, text };
}

async function sendConfirmation(row, p) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return false;
    try {
        const { subject, html, text } = build(row, p);
        await Promise.race([
            transport().sendMail({ from: `"${BRAND}" <${process.env.GMAIL_USER}>`, to: row.customer_email, subject, html, text }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('tiempo de espera agotado')), 8000))
        ]);
        return true;
    } catch (e) { console.error('email:', e.message); return false; }
}
module.exports = { sendConfirmation, build };