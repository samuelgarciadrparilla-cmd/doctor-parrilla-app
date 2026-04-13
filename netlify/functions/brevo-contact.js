// ── NETLIFY FUNCTION: brevo-contact ──────────────────────────────────────────
// Agrega o actualiza contactos en Brevo (listas de email marketing)
// Endpoint: /.netlify/functions/brevo-contact (POST)
// Acciones: "add" (crear/actualizar contacto), "list" (listar contactos)
// ──────────────────────────────────────────────────────────────────────────────

const BREVO_API_KEY = process.env.BREVO_API_KEY;

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { action, email, data } = JSON.parse(event.body);

    // ── Acción: agregar/actualizar contacto ──
    if (action === "add") {
      if (!email) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Email requerido" }) };
      }

      const { nombre, telefono, ciudad, origen, tipo } = data || {};

      // Construir atributos (sin SMS para evitar conflictos de duplicado)
      const attributes = {
        FIRSTNAME: nombre?.split(" ")[0] || "",
        LASTNAME: nombre?.split(" ").slice(1).join(" ") || "",
        CITY: ciudad || "Paraguay",
      };

      // Crear o actualizar contacto en Brevo
      const res = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          updateEnabled: true,
          attributes,
        }),
      });

      // 201 = creado, 204 = actualizado, otro = error
      if (res.status === 201 || res.status === 204) {
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true, action: res.status === 201 ? "created" : "updated" }) };
      }

      const result = await res.json().catch(() => ({}));
      // Si el contacto ya existe, Brevo devuelve duplicate_parameter — no es error
      if (result.code === "duplicate_parameter") {
        // Actualizar el contacto existente
        const updateRes = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
          method: "PUT",
          headers: {
            "accept": "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            attributes: {
              FIRSTNAME: nombre?.split(" ")[0] || "",
              LASTNAME: nombre?.split(" ").slice(1).join(" ") || "",
              SMS: telefono || "",
              CITY: ciudad || "Paraguay",
            },
            listIds: tipo === "lead" ? [3] : [2],
          }),
        });
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true, action: "updated" }) };
      }

      console.error("Brevo contact error:", result);
      return { statusCode: res.status, headers: HEADERS, body: JSON.stringify({ error: "Brevo error", details: result }) };
    }

    // ── Acción: obtener listas ──
    if (action === "lists") {
      const res = await fetch("https://api.brevo.com/v3/contacts/lists?limit=50&offset=0", {
        headers: {
          "accept": "application/json",
          "api-key": BREVO_API_KEY,
        },
      });
      const result = await res.json();
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(result) };
    }

    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Acción desconocida: " + action }) };

  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
