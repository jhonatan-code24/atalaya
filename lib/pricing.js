const ms = v => Date.parse(v + ':00Z'); // 'YYYY-MM-DDTHH:mm' tratado como hora local de la sede
const nowLocal = tz => new Date().toLocaleString('sv-SE', { timeZone: tz }).slice(0, 16).replace(' ', 'T');

// Cálculo oficial (por días de 24 h iniciados): día 1 = first, cada día siguiente suma "step"
function quote(cfg, p, { entrega, recogida, extras = [], parking }) {
    const park = p.parking.find(x => x.id === parking), mins = (ms(recogida) - ms(entrega)) / 60000;
    const days = Math.max(1, Math.ceil(mins / 1440)), f = 10 ** p.decimals, rd = x => Math.round(x * f) / f;
    const day = i => park.first + park.step * (i - 1), lines = [];
    if (days <= 5) for (let i = 1; i <= days; i++) lines.push({ label: `${park.name} · día ${i}`, amount: day(i) });
    else {
        lines.push({ label: `${park.name} · día 1`, amount: day(1) });
        lines.push({ label: `${park.name} · días 2 a ${days}`, amount: days * park.first + park.step * days * (days - 1) / 2 - park.first });
    }
    const ex = p.extras.filter(x => Array.isArray(extras) && extras.includes(x.id)), valetFee = p.valetFee || 0;
    const total = rd(lines.reduce((s, l) => s + l.amount, 0) + valetFee + ex.reduce((s, x) => s + x.price, 0));
    const dd = Math.floor(mins / 1440), hh = Math.floor(mins % 1440 / 60), mm = Math.round(mins % 60);
    return {
        lines, extras: ex, valetFee, total, tax: rd(total - total / (1 + p.taxRate)), currency: p.currency, days, parking: park.id,
        dur: [dd && dd + ' d', hh && hh + ' h', mm && mm + ' min'].filter(Boolean).join(' ')
    };
}
module.exports = { quote, ms, nowLocal };