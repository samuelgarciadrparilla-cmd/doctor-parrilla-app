// ──────────────────────────────────────────────────────────────────────────────
// BREVO CRM — Sincronización de contactos
// Endpoint: /.netlify/functions/brevo-contact (POST)
// Crea/actualiza contactos en Brevo con atributos para segmentación y campañas
// ──────────────────────────────────────────────────────────────────────────────

const BREVO_API_KEY = process.env.BREVO_API_KEY;

const HEADERS = {
  "accept": "application/json",
  "content-type": "application/json",
  "api-key": BREVO_API_KEY,
};

// IDs de listas en Brevo (se crean automáticamente si no existen)
// Lista 2 = Clientes, Lista 3 = Leads
const LISTA_CLIENTES = 2;
const LISTA_LEADS = 3;

exports.handler = async (event) => {
  // CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" }, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }
  if (!BREVO_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "BREVO_API_KEY no configurada" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { email, nombre, telefono, cumpleanos, fuente, tipo, ciudad } = body;

    if (!email || !email.includes("@")) {
      return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Email requerido" }) };
    }

    // Preparar atributos del contacto
    const attributes = {};
    if (nombre) attributes.NOMBRE = nombre;
    if (telefono) attributes.SMS = telefono;
    if (cumpleanos) attributes.CUMPLEANOS = cumpleanos;
    if (fuente) attributes.FUENTE = fuente;
    if (ciudad) attributes.CIUDAD = ciudad;
    if (tipo) attributes.TIPO = tipo; // "lead" o "cliente"
    attributes.FECHA_REGISTRO = new Date().toISOString().slice(0, 10);

    // Determinar lista según tipo
    const listIds = tipo === "lead" ? [LISTA_LEADS] : [LISTA_CLIENTES];

    // Crear o actualizar contacto en Brevo
    const contactPayload = {
      email: email.trim().toLowerCase(),
      attributes,
      listIds,
      updateEnabled: true, // Si ya existe, actualiza sin sobreescribir
    };

    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(contactPayload),
    });

    const result = await response.json().catch(() => ({}));

    // 201 = creado, 204 = actualizado, 400 = ya existe (con updateEnabled lo actualiza)
    if (response.ok || response.status === 204) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: true, message: "Contacto sincronizado con Brevo CRM", id: result.id }),
      };
    }

    // Si el contacto ya existe, intentar actualizar
    if (response.status === 400 && result.message && result.message.includes("already exist")) {
      const updateResponse = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email.trim().toLowerCase())}`, {
        method: "PUT",
        headers: HEADERS,
        body: JSON.stringify({ attributes, listIds }),
      });

      if (updateResponse.ok || updateResponse.status === 204) {
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ ok: true, message: "Contacto actualizado en Brevo CRM" }),
        };
      }
    }

    return {
      statusCode: response.status,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Error al sincronizar con Brevo", detail: result }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Error interno", detail: err.message }),
    };
  }
};
