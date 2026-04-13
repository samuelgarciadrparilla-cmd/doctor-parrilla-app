// ── NETLIFY FUNCTION: send-email ──────────────────────────────────────────────
// Envía emails transaccionales via Brevo API
// Endpoint: /.netlify/functions/send-email (POST)
// Tipos: "entrega", "bienvenida", "seguimiento"
// Diseño: Neuromarketing aplicado — colores, urgencia, reciprocidad, prueba social
// Anti-spam: Sin palabras gatillo, ratio texto/imagen equilibrado, sender verificado
// ──────────────────────────────────────────────────────────────────────────────

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = "drparrillapy@gmail.com";
const SENDER_NAME = "Samuel Garcia - Dr. Parrilla";
const REPLY_TO_EMAIL = "drparrillapy@gmail.com";

// Link directo de reseña de Google Business — Place ID verificado
const GOOGLE_REVIEW_LINK = "https://search.google.com/local/writereview?placeid=ChIJxz02rNqpXZQRH4Mx5vR7Mx8";

// Logo Dr. Parrilla (CDN público)
const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663512395733/qZFFQioosHMykgAC.png";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// ── NEUROMARKETING: Paleta de colores ────────────────────────────────────────
// Dorado (#C8A96E) = Premium, exclusividad, confianza
// Negro (#111111) = Elegancia, poder, sofisticación
// Rojo (#B22222) = Urgencia, pasión, fuego (usado con moderación)
// Blanco crema (#F5EDD6) = Calidez, cercanía, legibilidad

// ── Template base ────────────────────────────────────────────────────────────

function emailHeader(subtitulo) {
  return `
  <div style="background:#111111;padding:32px 30px 24px;text-align:center;border-bottom:2px solid #C8A96E;">
    <img src="${LOGO_URL}" alt="Dr. Parrilla" width="220" style="display:block;margin:0 auto 12px;max-width:220px;height:auto;" />
    <div style="font-size:11px;color:#888;letter-spacing:3px;text-transform:uppercase;">${subtitulo}</div>
  </div>`;
}

function emailFooter() {
  return `
  <div style="margin-top:32px;padding-top:24px;border-top:1px solid #2A2A2A;">
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      <tr>
        <td style="vertical-align:top;padding-right:16px;">
          <div style="font-size:15px;color:#F5EDD6;font-weight:bold;">Samuel Garcia</div>
          <div style="font-size:13px;color:#C8A96E;">Fundador — Dr. Parrilla</div>
          <div style="font-size:12px;color:#888;margin-top:6px;">Tel: 0994 389 932</div>
          <div style="font-size:12px;color:#888;">Web: drparrilla.com.py</div>
        </td>
      </tr>
    </table>
    <div style="font-size:11px;color:#555;margin-top:16px;font-style:italic;">El Fuego Nos Une</div>
  </div>`;
}

function emailWrapper(content) {
  // Anti-spam: DOCTYPE completo, charset, viewport, texto plano visible
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>Dr. Parrilla</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Anti-spam: preheader oculto para mejorar preview en inbox -->
  <div style="display:none;font-size:1px;color:#f4f4f4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Dr. Parrilla — Fabricantes artesanales de parrillas premium en Paraguay
  </div>
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f4;">
    <tr><td align="center" style="padding:24px 16px;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#111111;border-radius:8px;overflow:hidden;">
        <tr><td>
          ${content}
          <div style="background:#0D0D0D;padding:24px 30px;text-align:center;">
            <div style="font-size:10px;color:#666;letter-spacing:2px;margin-bottom:16px;">DR. PARRILLA — LAMBARE, PARAGUAY</div>
            <!-- Links de redes sociales prominentes -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td style="padding:0 10px;">
                  <a href="https://drparrilla.com.py" style="display:inline-block;background:#1A1A1A;border:1px solid #333;border-radius:6px;padding:10px 16px;text-decoration:none;font-size:12px;color:#C8A96E;font-weight:bold;">Web</a>
                </td>
                <td style="padding:0 10px;">
                  <a href="https://www.instagram.com/drparrillapy/" style="display:inline-block;background:#1A1A1A;border:1px solid #333;border-radius:6px;padding:10px 16px;text-decoration:none;font-size:12px;color:#C8A96E;font-weight:bold;">Instagram</a>
                </td>
                <td style="padding:0 10px;">
                  <a href="https://www.facebook.com/doctorparrillapy/" style="display:inline-block;background:#1A1A1A;border:1px solid #333;border-radius:6px;padding:10px 16px;text-decoration:none;font-size:12px;color:#C8A96E;font-weight:bold;">Facebook</a>
                </td>
                <td style="padding:0 10px;">
                  <a href="https://wa.me/595994389932" style="display:inline-block;background:#1A1A1A;border:1px solid #333;border-radius:6px;padding:10px 16px;text-decoration:none;font-size:12px;color:#C8A96E;font-weight:bold;">WhatsApp</a>
                </td>
              </tr>
            </table>
            <div style="font-size:9px;color:#444;margin-top:14px;">
              Recibes este correo porque eres cliente de Dr. Parrilla.
            </div>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function formatNombre(data) {
  const { clienteNombre, tratamiento } = data || {};
  if (tratamiento && clienteNombre) {
    const apellido = clienteNombre.split(" ").slice(-1)[0] || clienteNombre;
    return `${tratamiento} ${apellido}`;
  }
  return clienteNombre?.split(" ")[0] || "estimado cliente";
}

// ── Email: Entrega ──────────────────────────────────────────────────────────
// NEUROMARKETING: Reciprocidad (regalo cupon) + Prueba social (reseña) + Exclusividad

function buildEntregaEmail(data) {
  const nombre = formatNombre(data);
  const { modelo, pedidoId } = data || {};
  // Anti-spam: Sin emojis en subject, sin mayusculas excesivas, sin palabras como "GRATIS"
  const subject = `Tu parrilla ${modelo || "Dr. Parrilla"} ya fue entregada - Dr. Parrilla`;
  const html = emailWrapper(`
    ${emailHeader("FABRICACION ARTESANAL EN ACERO INOXIDABLE")}
    <div style="padding:36px 30px;">

      <!-- NEUROMARKETING: Personalización = conexión emocional -->
      <div style="font-size:18px;color:#F5EDD6;margin-bottom:20px;">Hola ${nombre},</div>

      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:20px;">
        Te escribo personalmente para confirmarte que tu parrilla
        <strong style="color:#C8A96E;">${modelo || "Dr. Parrilla"}</strong>${pedidoId ? ` (Pedido ${pedidoId})` : ""}
        ya fue entregada con exito.
      </div>

      <!-- NEUROMARKETING: Storytelling = genera vínculo emocional -->
      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:20px;">
        Cada parrilla que sale de nuestro taller en Lambare lleva horas de trabajo artesanal
        y un pedazo de nuestra pasion. Espero que la disfrutes tanto como nosotros disfrutamos
        fabricandola para vos.
      </div>

      <!-- NEUROMARKETING: Reciprocidad — regalo a cambio de reseña -->
      <div style="background:#1A1A1A;border-left:4px solid #C8A96E;border-radius:8px;padding:24px;margin:28px 0;">
        <div style="font-size:15px;color:#F5EDD6;font-weight:bold;margin-bottom:12px;">
          Tu opinion es muy importante para nosotros
        </div>
        <div style="font-size:14px;color:#AAA;line-height:1.7;margin-bottom:16px;">
          Si tu experiencia fue positiva, nos ayudaria mucho que compartas tu opinion en Google.
          Como agradecimiento, te regalamos un <strong style="color:#C8A96E;">cupon del 10% de descuento</strong>
          en tu proxima compra o servicio de mantenimiento.
        </div>
        <div style="text-align:center;">
          <a href="${GOOGLE_REVIEW_LINK}" style="display:inline-block;background:#C8A96E;color:#0A0A0A;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:1px;">
            Compartir mi experiencia
          </a>
        </div>
      </div>

      <!-- NEUROMARKETING: Disponibilidad = confianza post-venta -->
      <div style="font-size:15px;color:#CCC;line-height:1.8;">
        Cualquier consulta sobre mantenimiento, accesorios o simplemente para compartir
        fotos de tus asados, escribime directamente por
        <a href="https://wa.me/595994389932" style="color:#C8A96E;text-decoration:none;">WhatsApp</a>.
      </div>

      ${emailFooter()}
    </div>
  `);
  return { subject, html };
}

// ── Email: Bienvenida ───────────────────────────────────────────────────────
// NEUROMARKETING: Efecto dotación (cupon = ya es tuyo) + Escasez (3 meses) + Pertenencia

function buildBienvenidaEmail(data) {
  const nombre = formatNombre(data);
  const { cuponCode } = data || {};
  const subject = `Bienvenido a la familia Dr. Parrilla, ${nombre}`;
  const cuponBlock = cuponCode ? `
    <div style="background:#1A1400;border:2px solid #C8A96E;border-radius:12px;padding:28px;margin:28px 0;text-align:center;">
      <div style="font-size:12px;color:#C8A96E;letter-spacing:3px;margin-bottom:10px;">TU CUPON DE BIENVENIDA</div>
      <div style="font-size:28px;font-weight:bold;color:#F5EDD6;letter-spacing:4px;font-family:'Courier New',monospace;margin-bottom:10px;padding:12px;background:#0D0A00;border-radius:6px;display:inline-block;">${cuponCode}</div>
      <div style="font-size:14px;color:#C8A96E;font-weight:bold;margin-top:8px;">10% de descuento en tu primera compra</div>
      <!-- NEUROMARKETING: Escasez temporal = urgencia de acción -->
      <div style="font-size:12px;color:#888;margin-top:8px;">Valido por 90 dias desde hoy. Presenta este codigo al hacer tu pedido.</div>
    </div>` : "";

  const html = emailWrapper(`
    ${emailHeader("BIENVENIDO A LA FAMILIA")}
    <div style="padding:36px 30px;">

      <div style="font-size:18px;color:#F5EDD6;margin-bottom:20px;">Hola ${nombre},</div>

      <!-- NEUROMARKETING: Pertenencia = "familia" genera lealtad -->
      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:20px;">
        Es un placer tenerte en la familia <strong style="color:#C8A96E;">Dr. Parrilla</strong>.
        Somos fabricantes artesanales de parrillas premium en acero inoxidable 304,
        y cada pieza que sale de nuestro taller en Lambare es unica.
      </div>

      ${cuponBlock}

      <!-- NEUROMARKETING: Prueba social = números que generan confianza -->
      <div style="background:#1A1A1A;border-radius:8px;padding:20px;margin:24px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align:center;padding:8px;">
              <div style="font-size:22px;font-weight:bold;color:#C8A96E;">500+</div>
              <div style="font-size:11px;color:#888;">Parrillas entregadas</div>
            </td>
            <td style="text-align:center;padding:8px;">
              <div style="font-size:22px;font-weight:bold;color:#C8A96E;">4.9</div>
              <div style="font-size:11px;color:#888;">Calificacion Google</div>
            </td>
            <td style="text-align:center;padding:8px;">
              <div style="font-size:22px;font-weight:bold;color:#C8A96E;">53K+</div>
              <div style="font-size:11px;color:#888;">Seguidores IG</div>
            </td>
          </tr>
        </table>
      </div>

      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:20px;">
        Podes explorar nuestro catalogo completo y seguir tus pedidos en tiempo real
        desde nuestra plataforma:
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="https://drparrillaparaguay.com" style="display:inline-block;background:#C8A96E;color:#0A0A0A;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:1px;">
          Ver catalogo Dr. Parrilla
        </a>
      </div>

      ${emailFooter()}
    </div>
  `);
  return { subject, html };
}

// ── Email: Seguimiento (7 días post-entrega) ────────────────────────────────
// NEUROMARKETING: Efecto Zeigarnik (tarea incompleta) + Reciprocidad + Valor agregado

function buildSeguimientoEmail(data) {
  const nombre = formatNombre(data);
  const { modelo } = data || {};
  const subject = `Como va tu ${modelo || "parrilla"}, ${nombre}? - Samuel de Dr. Parrilla`;
  const html = emailWrapper(`
    ${emailHeader("SEGUIMIENTO POST-ENTREGA")}
    <div style="padding:36px 30px;">

      <div style="font-size:18px;color:#F5EDD6;margin-bottom:20px;">Hola ${nombre},</div>

      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:20px;">
        Ya paso una semana desde que recibiste tu
        <strong style="color:#C8A96E;">${modelo || "parrilla Dr. Parrilla"}</strong>.
        Me encantaria saber como te fue con ella.
      </div>

      <!-- NEUROMARKETING: Valor agregado gratuito = genera reciprocidad -->
      <div style="background:#1A1A1A;border-left:4px solid #C8A96E;border-radius:8px;padding:24px;margin:24px 0;">
        <div style="font-size:14px;color:#C8A96E;font-weight:bold;margin-bottom:12px;">
          Consejos de mantenimiento
        </div>
        <div style="font-size:13px;color:#AAA;line-height:1.7;">
          <strong style="color:#CCC;">1.</strong> Limpia la parrilla despues de cada uso con agua tibia y un pano suave.<br>
          <strong style="color:#CCC;">2.</strong> Evita productos abrasivos o esponjas de acero.<br>
          <strong style="color:#CCC;">3.</strong> El acero inoxidable 304 es resistente a la corrosion, pero un buen cuidado lo mantiene como nuevo.
        </div>
      </div>

      <!-- NEUROMARKETING: Efecto Zeigarnik — tarea pendiente (reseña) -->
      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:20px;">
        Si todavia no dejaste tu resena en Google, te invito a hacerlo.
        Tu opinion nos ayuda a seguir mejorando y a que mas personas conozcan nuestro trabajo:
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${GOOGLE_REVIEW_LINK}" style="display:inline-block;background:#C8A96E;color:#0A0A0A;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:1px;">
          Dejar mi opinion en Google
        </a>
      </div>

      <div style="font-size:15px;color:#CCC;line-height:1.8;">
        Cualquier consulta, estoy disponible por
        <a href="https://wa.me/595994389932" style="color:#C8A96E;text-decoration:none;">WhatsApp</a>
        o respondiendo directamente a este correo.
      </div>

      ${emailFooter()}
    </div>
  `);
  return { subject, html };
}

// ── Handler principal ────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { type, to, data } = JSON.parse(event.body);

    if (!to || !type) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Faltan campos: type, to" }) };
    }

    let subject, html;
    if (type === "entrega") {
      ({ subject, html } = buildEntregaEmail(data));
    } else if (type === "bienvenida") {
      ({ subject, html } = buildBienvenidaEmail(data));
    } else if (type === "seguimiento") {
      ({ subject, html } = buildSeguimientoEmail(data));
    } else {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Tipo desconocido: " + type }) };
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: to, name: data?.clienteNombre || "" }],
        replyTo: { email: REPLY_TO_EMAIL, name: "Dr. Parrilla" },
        subject,
        htmlContent: html,
        tags: [type, "dr-parrilla"],
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Brevo error:", result);
      return { statusCode: res.status, headers: HEADERS, body: JSON.stringify({ error: "Brevo API error", details: result }) };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true, messageId: result.messageId }) };

  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
