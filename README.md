# Dr. Parrilla — App de Gestión v2.0
## Lista para producción ✅

---

## DEPLOY EN VERCEL (5 minutos)

### Opción A — Desde tu PC (sin GitHub)
```bash
npm install
npm install -g vercel
vercel login    # abre el navegador → iniciar sesión con Gmail
vercel --prod   # copia el link que aparece
```

### Opción B — Con GitHub (recomendado)
1. Crear repo privado en https://github.com
2. Subir estos archivos
3. Ir a https://vercel.com → Import from GitHub
4. Seleccionar el repo → Deploy ✓

---

## FIREBASE (ya configurado ✅)

URL ya cargada en el código:
`https://doctor-parrilla-clientes-default-rtdb.firebaseio.com`

Reglas necesarias en Firebase Console → Realtime Database → Reglas:
```json
{
  "rules": {
    "drparrilla": {
      ".read": true,
      ".write": true
    }
  }
}
```

---

## USUARIOS ADMINISTRADORES

| Teléfono     | Contraseña   | Nombre         | Rol               |
|--------------|--------------|----------------|-------------------|
| 0991935364   | drp2026      | Samuel García  | CEO               |
| 0981707549   | drp2026      | Jorge          | Gerente General   |
| 0992369143   | drp2026      | David          | Jefe de Producción|
| 0982234753   | drp2026      | Dalila García  | Presidente        |

---

## FEATURES v2.0

- 🔐 Login por teléfono + contraseña
- 📦 Gestión de pedidos con countdown de días hábiles
- 📅 Agendamiento de visitas al showroom
- ⭐ Panel de reseñas con estadísticas
- 🌎 "Dr. Parrilla en el mundo" (11 países)
- 💡 Tips del asador (20 tips rotativos)
- 🔥 Firebase sync en tiempo real
- 💾 Auto-guardado cada 8 segundos

---

Versión 2.0 — Doctor Parrilla Paraguay
