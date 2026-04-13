// ── NETLIFY FUNCTION: send-email ──────────────────────────────────────────────
// Envía emails transaccionales via Brevo API
// Endpoint: /.netlify/functions/send-email (POST)
// Tipos: "entrega", "bienvenida", "seguimiento"
// ──────────────────────────────────────────────────────────────────────────────

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = "drparrillapy@gmail.com";
const SENDER_NAME = "Samuel García — Dr. Parrilla";
const REPLY_TO_EMAIL = "drparrillapy@gmail.com"; // Respuestas llegan al mismo correo

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// ── Templates de email ───────────────────────────────────────────────────────

function emailHeader(subtitulo) {
  return `
  <div style="background:linear-gradient(135deg,#1A1A1A,#0D0D0D);padding:40px 30px;text-align:center;border-bottom:2px solid #C8A96E;">
    <div style="font-size:32px;font-weight:bold;color:#C8A96E;letter-spacing:4px;">DR. PARRILLA</div>
    <div style="font-size:11px;color:#666;letter-spacing:3px;margin-top:8px;">${subtitulo}</div>
  </div>`;
}

function emailFooter() {
  return `
  <div style="margin-top:32px;padding-top:24px;border-top:1px solid #2A2A2A;">
    <div style="font-size:15px;color:#F5EDD6;font-weight:bold;">Samuel García</div>
    <div style="font-size:13px;color:#C8A96E;">CEO &amp; Fundador — Dr. Parrilla</div>
    <div style="font-size:12px;color:#666;margin-top:4px;">📱 0991 935 364 · cotizacion@drparrilla.com.py</div>
    <div style="font-size:11px;color:#444;margin-top:8px;font-style:italic;">#ElFuegoNosUne 🔥</div>
  </div>`;
}

function emailWrapper(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#111111;border:1px solid #2A2A2A;">
${content}
<div style="background:#0A0A0A;padding:20px 30px;text-align:center;border-top:1px solid #1A1A1A;">
  <div style="font-size:10px;color:#444;letter-spacing:2px;">DR. PARRILLA · LAMBARÉ, PARAGUAY</div>
  <div style="font-size:10px;color:#333;margin-top:4px;">drparrilla.com.py</div>
</div>
</div></body></html>`;
}

function formatNombre(data) {
  const { clienteNombre, tratamiento } = data || {};
  if (tratamiento) {
    const apellido = clienteNombre?.split(" ").slice(-1)[0] || clienteNombre || "";
    return `${tratamiento} ${apellido}`;
  }
  return clienteNombre?.split(" ")[0] || "Estimado/a cliente";
}

// ── Email: Entrega ───────────────────────────────────────────────────────────

function buildEntregaEmail(data) {
  const nombre = formatNombre(data);
  const { modelo, pedidoId } = data || {};
  const subject = `🔥 ¡Tu parrilla ${modelo || ""} fue entregada! — Dr. Parrilla`;
  const html = emailWrapper(`
    ${emailHeader("FABRICACIÓN ARTESANAL · PARAGUAY")}
    <div style="padding:40px 30px;">
      <div style="font-size:18px;color:#F5EDD6;margin-bottom:24px;">Hola ${nombre},</div>
      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:24px;">
        Te escribo personalmente para decirte que tu parrilla <strong style="color:#C8A96E;">${modelo || "Dr. Parrilla"}</strong>
        (Pedido <strong style="color:#C8A96E;">${pedidoId || ""}</strong>) ya fue entregada con éxito.
      </div>
      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:24px;">
        Cada parrilla que sale de nuestro taller lleva un pedazo de nuestra pasión.
        Espero que la disfrutes tanto como nosotros disfrutamos fabricándola.
      </div>
      <div style="background:#1A1A1A;border:1px solid #C8A96E44;border-radius:12px;padding:24px;margin:30px 0;text-align:center;">
        <div style="font-size:22px;margin-bottom:8px;">⭐</div>
        <div style="font-size:14px;color:#C8A96E;font-weight:bold;margin-bottom:12px;">¿Nos dejás tu reseña en Google?</div>
        <div style="font-size:13px;color:#999;margin-bottom:16px;">Te regalamos un <strong style="color:#C8A96E;">cupón de 10% de descuento</strong> en tu próxima compra.</div>
        <a href="https://search.google.com/local/writereview?placeid=ChIJDwOaHfCpXZQRpSomething" style="display:inline-block;background:linear-gradient(135deg,#C8A96E,#9A7A3E);color:#0A0A0A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:1px;">
          DEJAR RESEÑA EN GOOGLE
        </a>
      </div>
      <div style="font-size:15px;color:#CCC;line-height:1.8;">
        Cualquier cosa que necesites — mantenimiento, accesorios, o simplemente compartir fotos de tus asados — escribime directamente.
      </div>
      ${emailFooter()}
    </div>
  `);
  return { subject, html };
}

// ── Email: Bienvenida ────────────────────────────────────────────────────────

function buildBienvenidaEmail(data) {
  const nombre = formatNombre(data);
  const { cuponCode } = data || {};
  const subject = `🔥 ¡Bienvenido/a a la familia Dr. Parrilla! — Tu cupón de descuento`;
  const cuponBlock = cuponCode ? `
    <div style="background:linear-gradient(135deg,#1A1400,#0D0A00);border:2px solid #C8A96E;border-radius:16px;padding:30px;margin:30px 0;text-align:center;">
      <div style="font-size:12px;color:#C8A96E;letter-spacing:3px;margin-bottom:12px;">🎁 TU CUPÓN DE BIENVENIDA</div>
      <div style="font-size:32px;font-weight:bold;color:#F5EDD6;letter-spacing:6px;font-family:monospace;margin-bottom:12px;">${cuponCode}</div>
      <div style="font-size:14px;color:#C8A96E;font-weight:bold;">10% DE DESCUENTO</div>
      <div style="font-size:11px;color:#666;margin-top:8px;">Válido por 3 meses · Presentá este código al hacer tu pedido</div>
    </div>` : "";
  const html = emailWrapper(`
    ${emailHeader("BIENVENIDO/A A LA FAMILIA")}
    <div style="padding:40px 30px;">
      <div style="font-size:18px;color:#F5EDD6;margin-bottom:24px;">Hola ${nombre},</div>
      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:24px;">
        ¡Qué alegría tenerte en la familia <strong style="color:#C8A96E;">Dr. Parrilla</strong>!
        Somos fabricantes artesanales de parrillas premium en acero inoxidable 304,
        y cada pieza que sale de nuestro taller es una obra de arte hecha con pasión paraguaya.
      </div>
      ${cuponBlock}
      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:24px;">
        Podés explorar nuestro catálogo completo y seguir tus pedidos en tiempo real desde nuestra app:
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://drparrillaparaguay.com" style="display:inline-block;background:linear-gradient(135deg,#C8A96E,#9A7A3E);color:#0A0A0A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:1px;">
          EXPLORAR CATÁLOGO
        </a>
      </div>
      ${emailFooter()}
    </div>
  `);
  return { subject, html };
}

// ── Email: Seguimiento (7 días post-entrega) ─────────────────────────────────

function buildSeguimientoEmail(data) {
  const nombre = formatNombre(data);
  const { modelo } = data || {};
  const subject = `🔥 ¿Cómo va tu parrilla ${modelo || ""}? — Samuel de Dr. Parrilla`;
  const html = emailWrapper(`
    ${emailHeader("FABRICACIÓN ARTESANAL · PARAGUAY")}
    <div style="padding:40px 30px;">
      <div style="font-size:18px;color:#F5EDD6;margin-bottom:24px;">Hola ${nombre},</div>
      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:24px;">
        Ya pasó una semana desde que recibiste tu <strong style="color:#C8A96E;">${modelo || "parrilla Dr. Parrilla"}</strong>.
        ¿Ya la estrenaste? ¡Me encantaría ver fotos de tu primer asado!
      </div>
      <div style="font-size:15px;color:#CCC;line-height:1.8;margin-bottom:24px;">
        Si tenés alguna consulta sobre el uso, mantenimiento o limpieza, no dudes en escribirme.
        Estoy para ayudarte.
      </div>
      <div style="background:#1A1A1A;border:1px solid #C8A96E44;border-radius:12px;padding:24px;margin:24px 0;">
        <div style="font-size:14px;color:#C8A96E;font-weight:bold;margin-bottom:8px;">💡 Tip del asador</div>
        <div style="font-size:13px;color:#999;line-height:1.6;">
          Para mantener tu parrilla como nueva, limpiala después de cada uso con agua tibia y un paño suave.
          Evitá productos abrasivos. El acero inoxidable 304 es resistente, pero merece cuidado.
        </div>
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
