// ===== ATALAYA_CONFIG: única fuente de verdad (API + navegador) =====
/* =====================================================================
   CONFIGURACIÓN DE VALETEXPRESS
   Para cambiar de país edita SOLO la línea "activeProfile": "CO" | "ES"
   ===================================================================== */
const ATALAYA_CONFIG = {
    activeProfile: "ES", // <-- CAMBIA AQUÍ: "ES" (Barcelona) | "CO" (pruebas Colombia)
    codePrefix: "VEX",   // prefijo del código de reserva

    /* TEXTOS de la página principal (editables) */
    content: {
        heroBadge: "Valet parking en aeropuerto",
        heroTitle: "Llega, entrega las llaves y <em>vuela tranquilo</em>",
        heroText: "Un conductor recibe tu vehículo en la terminal y lo devuelve cuando aterrizas. Sin filas, sin vueltas.",
        stats: [[24, "/7", "Atención"], [5, " min", "Entrega rápida"], [100, "%", "Vehículos asegurados"]], // ejemplo
        // SERVICIOS: [icono, título, texto, foto opcional]. Para usar tus fotos, pon la ruta en el 4.º valor (ej: "img/vigilancia.jpg")
        services: [
            ["🛡️", "Vigilancia 24/7", "Tu vehículo siempre bajo vigilancia para que viajes con total tranquilidad y confianza.", ""],
            ["🚗", "Entrega en la terminal que prefieras", "Entrega tu vehículo directamente en la terminal que desees. Nosotros nos encargamos del resto para que comiences tu viaje sin complicaciones.", ""],
            ["🔑", "Recogida donde tú nos indiques", "A tu regreso, recogeremos y te entregaremos tu coche en la terminal que nos indiques. En aproximadamente 15 minutos lo tendrás listo para continuar tu camino.", ""],
            ["💬", "Atención prioritaria por WhatsApp", "Mantente en contacto con nosotros en todo momento. Tendrás atención prioritaria por WhatsApp para cualquier duda, incidencia o novedad relacionada con tu reserva.", ""]
        ],
        steps: [
            ["Reserva online", "Completa el formulario en menos de 2 minutos."],
            ["Entrega tu vehículo", "Nuestro valet lo recibe en tu terminal."],
            ["Viaja tranquilo", "Nosotros lo cuidamos mientras no estás."],
            ["Recoge a tu regreso", "Lo recibes en el punto acordado."]
        ],
        faq: [
            ["¿Puedo modificar mi reserva?", "Sí, escríbenos por WhatsApp con tu código de reserva."],
            ["¿Qué pasa si mi vuelo se retrasa?", "Indica tu número de vuelo y ajustamos la recogida."],
            ["¿Cómo se paga?", "Pagas directamente en el aparcamiento cuando recoges tu vehículo."]
        ],
        footer: "Valetexpress · Valet parking en aeropuerto"
    },

    profiles: {
        /* ---------- COLOMBIA (modo prueba) ---------- */
        CO: {
            countryName: "Colombia (modo prueba)", locale: "es-CO", currency: "COP", decimals: 0,
            timeZone: "America/Bogota", airport: "Aeropuerto de Prueba - Colombia", place: "Aeropuerto de prueba",
            taxRate: 0.19,    // IVA incluido en tarifas
            valetFee: 0, venue: "TEST", capacity: 40, gateway: "mercadopago", // sede, cupo de vehículos y pasarela ("" = ninguna) |  // cargo fijo del servicio valet
            // TIPOS DE PARKING (precio por día de 24 h): el 1.er día cuesta "first" y cada día adicional suma "step" (COP, valores de prueba)
            parking: [
                { id: "open", name: "Parking descubierto", icon: "☀️", desc: "Plaza al aire libre", first: 90000, step: 20000 },
                { id: "covered", name: "Parking cubierto", icon: "🏢", desc: "Plaza techada y protegida", first: 105000, step: 20000 }
            ],
            phone: "+57 300 123 4567", plate: "ABC123", plateLabel: "Placa",
            terminals: ["Terminal 1", "Terminal 2"],
            // SERVICIOS ADICIONALES (editables; precios de ejemplo)
            extras: [
                { id: "wash", name: "Lavado automático en túnel", icon: "🚿", price: 40000, desc: "Tu vehículo limpio al volver." },
                { id: "fuel", name: "Servicio de repostaje", icon: "⛽", price: 25000, desc: "Gestión del repostaje.", note: "El combustible se cobra aparte, según el ticket." }
            ],
            // MEDIOS DE PAGO de Colombia (editables)
            payments: [ // MEDIO DE PAGO: solo en el aparcamiento
                { id: "cash", name: "Pago en el aparcamiento", icon: "🅿️", kind: "cash", note: "Pagas al recoger tu vehículo, directamente en el aparcamiento." }
            ]
        },
        /* ---------- ESPAÑA / BARCELONA ---------- */
        ES: {
            countryName: "España · Barcelona", locale: "es-ES", currency: "EUR", decimals: 2,
            timeZone: "Europe/Madrid", airport: "Aeropuerto Josep Tarradellas Barcelona-El Prat (BCN)", place: "El Prat · Barcelona",
            taxRate: 0.21, valetFee: 0, venue: "BCN", capacity: 60, gateway: "", // gateway: pasarela futura (Mercado Pago no opera en España) |
            // TIPOS DE PARKING (precio por día de 24 h): el 1.er día cuesta "first" y cada día adicional suma "step" (EUR, IVA incluido)
            parking: [
                { id: "open", name: "Parking descubierto", icon: "☀️", desc: "Plaza al aire libre", first: 21, step: 5 },
                { id: "covered", name: "Parking cubierto", icon: "🏢", desc: "Plaza techada y protegida", first: 25, step: 5 }
            ],
            phone: "+34 600 123 456", plate: "1234 ABC", plateLabel: "Matrícula",
            terminals: ["Terminal 1 (T1)", "Terminal 2 (T2)"], // PUNTOS DE ENCUENTRO (entrega y recogida)
            // SERVICIOS ADICIONALES (editables; precios con IVA)
            extras: [
                { id: "wash", name: "Lavado automático en túnel", icon: "🚿", price: 15, desc: "Tu vehículo limpio al volver." },
                { id: "fuel", name: "Servicio de repostaje", icon: "⛽", price: 10, desc: "Gestión del repostaje.", note: "El combustible se cobra aparte, según el ticket." }
            ],
            // MEDIOS DE PAGO de España (editables)
            payments: [ // MEDIO DE PAGO: solo en el aparcamiento
                { id: "cash", name: "Pago en el aparcamiento", icon: "🅿️", kind: "cash", note: "Pagas al recoger tu vehículo, directamente en el aparcamiento." }
            ]
        }
    }
};

// Perfil activo con su id
const active = () => ({ id: ATALAYA_CONFIG.activeProfile, ...ATALAYA_CONFIG.profiles[ATALAYA_CONFIG.activeProfile] });
// Config pública para el navegador (sin datos internos: cupo, sede, pasarela)
const publicConfig = () => {
    const { profiles, ...rest } = ATALAYA_CONFIG, { capacity, venue, gateway, ...pub } = profiles[rest.activeProfile];
    return { ...rest, demo: process.env.DEMO_MODE === 'true', profiles: { [rest.activeProfile]: pub } };
};
module.exports = { ATALAYA_CONFIG, active, publicConfig };