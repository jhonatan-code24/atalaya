const ms = v => Date.parse(v + ':00Z'); // 'YYYY-MM-DDTHH:mm' tratado como hora local de la sede
const nowLocal = tz => new Date().toLocaleString('sv-SE', { timeZone: tz }).slice(0, 16).replace(' ', 'T');

// Cálculo oficial de tarifa (el navegador solo muestra este resultado)
function quote(cfg, p, { entrega, recogida, extras = [] }) {
    const mins = (ms(recogida) - ms(entrega)) / 60000, R = p.rates, lines = [];
    const add = (u, q) => q > 0 && lines.push({ u, q, amount: q * R[u] });
    if (cfg.billingMode === 'auto') {
        // Mejor tarifa: meses > semanas > días > horas (si un tramo cuesta >= la unidad superior, se cobra la superior)
        let h = Math.ceil(mins / 60), m = Math.floor(h / 720); h -= m * 720;
        let w = Math.floor(h / 168); h -= w * 168;
        let d = Math.floor(h / 24); h -= d * 24;
        if (h * R.hour >= R.day) { d++; h = 0; }
        if (d * R.day >= R.week) { w++; d = 0; }
        if (w * R.week + d * R.day >= R.month) { m++; w = 0; d = 0; }
        add('month', m); add('week', w); add('day', d); add('hour', h);
    } else add('day', Math.max(1, Math.ceil(mins / 1440))); // por día (24 h) iniciado
    const ex = p.extras.filter(x => Array.isArray(extras) && extras.includes(x.id));
    const f = 10 ** p.decimals, rd = x => Math.round(x * f) / f;
    const total = rd(lines.reduce((s, l) => s + l.amount, 0) + p.valetFee + ex.reduce((s, x) => s + x.price, 0));
    const dd = Math.floor(mins / 1440), hh = Math.floor(mins % 1440 / 60), mm = Math.round(mins % 60);
    return {
        lines, extras: ex, valetFee: p.valetFee, total, tax: rd(total - total / (1 + p.taxRate)), currency: p.currency,
        dur: [dd && dd + ' d', hh && hh + ' h', mm && mm + ' min'].filter(Boolean).join(' ')
    };
}
module.exports = { quote, ms, nowLocal };