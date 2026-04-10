import { useState, useRef, useEffect, useCallback } from "react";
import React from "react";

// ── EUROPEAN PREMIUM DESIGN SYSTEM ──────────────────────────────────────────
const GOLD        = "#C8A96E";       // Warm gold
const GOLD_LIGHT  = "#E2C98A";       // Light gold
const GOLD_DARK   = "#9A7A3E";       // Deep gold
const CREAM       = "#F5EDD6";       // Warm cream for text
const DARK        = "#080808";       // Near black
const DARK2       = "#0C0C0C";
const DARK3       = "#10131A";       // Steel dark
const CARD        = "#0F1115";       // Deep steel card - premium
const CARD2       = "#13161C";       // Premium card
const BORDER      = "#1D2025";       // Refined border - premium
const BORDER2     = "#292E36";       // Active border - premium
const RED         = "#C0392B";
const GREEN       = "#27AE60";
const ORANGE      = "#E67E22";
// Premium gradients
const STEEL_BG    = "linear-gradient(160deg, #0A0C0F 0%, #0D0A08 25%, #080808 50%, #0A0C0D 75%, #0C0A09 100%)";
const GOLD_GRAD   = "linear-gradient(135deg, #9A7A3E 0%, #C8A96E 40%, #E2C98A 70%, #C8A96E 100%)";
const STEEL_CARD  = "linear-gradient(145deg, #0E1014 0%, #0B0D11 100%)";
const FLAME_LOW   = "linear-gradient(0deg, rgba(180,80,0,0.1) 0%, rgba(200,120,0,0.04) 40%, transparent 100%)";
const WA_NUMBER = "595994389932";
// Link de reseña Google -- reemplazá con el link de "Obtener más reseñas" de Google Business
// Ir a business.google.com → tu perfil → "Obtener más reseñas" → copiar link
const GOOGLE_REVIEW_URL = "https://share.google/D7XEt1nQQzynvpxG5";

// ── FIREBASE + LOCAL STORAGE ─────────────────────────────────────────────────
// Paste your Firebase Realtime Database URL here after creating the project
// Example: "https://doctor-parrilla-default-rtdb.firebaseio.com"
const FIREBASE_URL = "https://doctor-parrilla-clientes-default-rtdb.firebaseio.com";

const appStorage = {
async get(key) {
// 1. Try Firebase
if (FIREBASE_URL) {
try {
const r = await fetch(`${FIREBASE_URL}/drparrilla/${key}.json`);
if (r.ok) { const d = await r.json(); if (d !== null) return JSON.stringify(d); }
} catch(e) {}
}
// 2. Try Claude artifact storage
try {
if (window.storage) { const r = await window.storage.get(key); return r ? r.value : null; }
} catch(e) {}
// 3. Fallback localStorage
try { return localStorage.getItem(key); } catch(e) { return null; }
},
async set(key, value) {
// 1. Save to Firebase (con reintento)
if (FIREBASE_URL) {
for (let attempt = 0; attempt < 2; attempt++) {
try {
const r = await fetch(`${FIREBASE_URL}/drparrilla/${key}.json`, {
method: "PUT",
headers: { "Content-Type": "application/json" },
body: value
});
if (r.ok) break;
console.warn(`Firebase set ${key} intento ${attempt+1} fallo: ${r.status}`);
} catch(e) {
console.warn(`Firebase set ${key} intento ${attempt+1} error:`, e.message);
if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
}
}
}
// 2. Save to Claude artifact storage
try { if (window.storage) { await window.storage.set(key, value); } } catch(e) {}
// 3. Save to localStorage (backup)
try { localStorage.setItem(key, value); } catch(e) {}
}
};

// Firebase connection status
async function checkFirebase() {
if (!FIREBASE_URL) return false;
try {
const r = await fetch(`${FIREBASE_URL}/.json?shallow=true`, { signal: AbortSignal.timeout(3000) });
return r.ok;
} catch(e) { return false; }
}

const ADMIN_USERS = [
{ phone: "0991935364", password: "drp2026", nombre: "Samuel García",  rol: "CEO",                avatar: "SG" },
{ phone: "0981707549", password: "drp2026", nombre: "Jorge",           rol: "Gerente General",    avatar: "JG" },
{ phone: "0992369143", password: "drp2026", nombre: "David",           rol: "Jefe de Producción", avatar: "DV" },
{ phone: "0982234753", password: "drp2026", nombre: "Dalila García",   rol: "Presidente",         avatar: "DG" },
]; // Contraseña por defecto: drp2026

function normalizePhone(p) { return p.replace(/[\s-().]/g, ""); }
function findAdmin(phone, pass) {
const c = normalizePhone(phone);
const u = ADMIN_USERS.find(u => normalizePhone(u.phone)===c);
if (!u) return null;
if (pass !== undefined && u.password !== pass) return null;
return u;
}
function findCliente(phone, clientes) { const c = normalizePhone(phone); return clientes.find(u => normalizePhone(u.tel) === c) || null; }

// ── DÍAS HÁBILES ──────────────────────────────────────────────────────────────
const MESES = { Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11 };
const MESES_NOMBRE = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function parseFecha(str) {
// "05 Abr 2026"
if (!str) return null;
const p = str.trim().split(" ");
if (p.length < 3) return null;
const d = parseInt(p[0]); const m = MESES[p[1]]; const y = parseInt(p[2]);
if (isNaN(d)||isNaN(y)||m===undefined) return null;
return new Date(y, m, d);
}

function addDiasHabiles(fechaBase, dias) {
const d = new Date(fechaBase);
let added = 0;
while (added < dias) {
d.setDate(d.getDate() + 1);
const dow = d.getDay();
if (dow !== 0 && dow !== 6) added++;
}
return d;
}

function diasHabilesRestantes(fechaLimite) {
if (!fechaLimite) return null;
const hoy = new Date(); hoy.setHours(0,0,0,0);
const lim = new Date(fechaLimite); lim.setHours(0,0,0,0);
if (hoy.getTime() === lim.getTime()) return 0;
if (hoy > lim) {
let neg = 0; let c = new Date(lim);
while (c < hoy) { c.setDate(c.getDate()+1); const dw=c.getDay(); if(dw!==0&&dw!==6) neg++; }
return -neg;
}
let cnt = 0; let c = new Date(hoy);
while (c < lim) { c.setDate(c.getDate()+1); const dw=c.getDay(); if(dw!==0&&dw!==6) cnt++; }
return cnt;
}

function formatFechaCorta(date) {
if (!date) return "--";
return `${String(date.getDate()).padStart(2,"0")} ${MESES_NOMBRE[date.getMonth()]} ${date.getFullYear()}`;
}

function getAlertaColor(dias) {
if (dias === null) return null;
if (dias <= 0) return "#E53935";
if (dias <= 3) return "#E53935";
if (dias <= 7) return GOLD;
return "#4CAF50";
}

function CountdownBadge({ fecha, diasHabiles, size = "normal" }) {
const base = parseFecha(fecha);
if (!base || !diasHabiles) return null;
const lim = addDiasHabiles(base, diasHabiles);
const dias = diasHabilesRestantes(lim);
if (dias === null) return null;
const color = getAlertaColor(dias);
const icon  = dias <= 0 ? "🚨" : dias <= 3 ? "🔴" : dias <= 7 ? "🟡" : "🟢";
const label = dias <= 0 ? `Vencido (${Math.abs(dias)}d)` : dias === 0 ? "¡Hoy!" : `${dias} días háb.`;
if (size === "small") return (
<span style={{ background:color+"22", border:`1px solid ${color}55`, color, fontSize:10, padding:"2px 8px", borderRadius:20, fontFamily:"sans-serif", fontWeight:"bold" }}>
{icon} {label}
</span>
);
return (
<div style={{ background:color+"15", border:`1px solid ${color}44`, borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
<div>
<div style={{ fontSize:10, color:color, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:4 }}>DÍAS HÁBILES RESTANTES</div>
<div style={{ fontSize:26, fontWeight:"bold", color, lineHeight:1 }}>{dias <= 0 ? "VENCIDO" : dias}</div>
<div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", marginTop:4 }}>
{dias > 0 ? `${icon} Entrega: ${formatFechaCorta(lim)}` : `${icon} Venció: ${formatFechaCorta(lim)}`}
</div>
</div>
<div style={{ fontSize:36 }}>{dias <= 0 ? "🚨" : dias <= 3 ? "🔴" : dias <= 7 ? "⏳" : "📅"}</div>
</div>
);
}

function AlertaBanner({ pedidos }) {
const urgentes = pedidos.filter(p => {
if (p.estado === 4) return false;
const base = parseFecha(p.fecha);
if (!base || !p.diasHabiles) return false;
const lim = addDiasHabiles(base, p.diasHabiles);
const dias = diasHabilesRestantes(lim);
return dias !== null && dias <= 7;
});
if (urgentes.length === 0) return null;
return (
<div style={{ margin:"16px 16px 0", display:"flex", flexDirection:"column", gap:8 }}>
<div style={{ fontSize:11, color:"#E53935", fontFamily:"sans-serif", letterSpacing:"2px", fontWeight:"bold" }}>⚠️ ALERTAS DE ENTREGA</div>
{urgentes.map(p => {
const base = parseFecha(p.fecha);
const lim = addDiasHabiles(base, p.diasHabiles);
const dias = diasHabilesRestantes(lim);
const color = getAlertaColor(dias);
return (
<div key={p.id} style={{ background:color+"15", border:`1px solid ${color}44`, borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
<span style={{ fontSize:20 }}>{dias <= 0 ? "🚨" : dias <= 3 ? "🔴" : "🟡"}</span>
<div style={{ flex:1 }}>
<div style={{ fontSize:13, fontWeight:"bold", color:"#F0F0F0" }}>{p.id} · {p.modelo}</div>
<div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", marginTop:2 }}>
{dias <= 0 ? `Vencido hace ${Math.abs(dias)} días hábiles` : `${dias} días hábiles restantes · Entrega: ${formatFechaCorta(lim)}`}
</div>
</div>
<div style={{ fontSize:18, fontWeight:"bold", color }}>{dias <= 0 ? "!" : dias}</div>
</div>
);
})}
</div>
);
}

// ── INITIAL DATA ──────────────────────────────────────────────────────────────
const ESTADO_LABELS = ["Pedido recibido","En producción","Control de calidad","Listo para entrega","Entregado"];
const ESTADO_ICONS  = ["📋","⚙️","🔍","📦","✅"];
const ESTADO_COLORS = ["#888", GOLD, "#E8C97A", "#4CAF50", "#4CAF50"];

const INITIAL_PRODUCTOS = [
{ id:1, nombre:"El Patrón 900",                desc:"Parrilla fija premium en acero inoxidable 304. Quemadores de alta potencia, sistema de extracción de grasas.",                       precio:"Gs. 4.200.000",  specs:["Acero inox 304","90cm ancho","Para 8-10 personas","3mm espesor"],                       colores:["Inox","Negro"],  foto:null, tag:"MÁS VENDIDO", emoji:"🔥" },
{ id:2, nombre:"Josephine Portable",             desc:"Parrilla portátil diseñada para eventos y espacios reducidos. Plegable y resistente.",                                               precio:"Gs. 1.800.000",  specs:["Acero inox 201","60cm ancho","Para 4-6 personas","Plegable"],                           colores:["Inox","Negro"],  foto:null, tag:"PORTÁTIL",    emoji:"⚡" },
{ id:3, nombre:"Viking Pro 1200",                desc:"Parrilla profesional para quinchos y restaurantes. La preferida por chefs y asadores profesionales.",                                     precio:"Gs. 8.500.000",  specs:["Acero inox 316","120cm ancho","Para 15+ personas","Uso comercial"],                     colores:["Inox","Negro"],  foto:null, tag:"PRO",         emoji:"👑" },
{ id:4, nombre:"Revestido Premium Acero Inox",   desc:"Sistema completo de quincho con parrilla revestida en acero inoxidable, mesada y módulos de almacenamiento.",                            precio:"Gs. 15.000.000", specs:["Acero inox 304","Modular","Personalizable","Incluye instalación"],                     colores:["Inox"],          foto:null, tag:"PREMIUM",     emoji:"🏆" },
{ id:5, nombre:"Revestido Premium Acero Carbono",desc:"Sistema completo de quincho con parrilla revestida en acero al carbono. Acabado rústico premium de alta durabilidad.",                   precio:"Gs. 12.000.000", specs:["Acero al carbono","Modular","Personalizable","Incluye instalación"],                   colores:["Negro"],         foto:null, tag:"PREMIUM",     emoji:"🔥" },
{ id:6, nombre:"Línea Básica",                    desc:"Parrilla de línea económica con la calidad Dr. Parrilla. Ideal para quienes buscan calidad a precio accesible.",                        precio:"Gs. 2.500.000",  specs:["Acero resistente","80cm ancho","Para 6-8 personas","Fácil montaje"],                    colores:["Negro"],         foto:null, tag:"ECONÓMICA",   emoji:"⭐" },
{ id:7, nombre:"Parrilla Móvil Inox",             desc:"Parrilla móvil con ruedas en acero inoxidable. Perfecta para mover entre espacios y eventos.",                                          precio:"Gs. 3.800.000",  specs:["Acero inox 304","Con ruedas","Para 6-8 personas","Plegable"],                           colores:["Inox"],          foto:null, tag:"MÓVIL",       emoji:"🚢" },
{ id:8, nombre:"Parrilla Móvil Negro",            desc:"Parrilla móvil con ruedas en acabado negro mate. Diseño moderno y funcional para cualquier espacio.",                                    precio:"Gs. 3.500.000",  specs:["Acero al carbono","Con ruedas","Para 6-8 personas","Plegable"],                         colores:["Negro"],         foto:null, tag:"MÓVIL",       emoji:"🚢" },
];

const INITIAL_CLIENTES = [
{ id:"C-001", codigo:"CLI-001", nombre:"Carlos Rodríguez", tel:"0981234567", dir:"Av. Mcal. López 1234, Lambaré",  historial:"Cliente desde 2023. Compró El Patrón 900. Prefiere entrega a domicilio." },
{ id:"C-002", codigo:"CLI-002", nombre:"Ana Martínez",     tel:"0991876543", dir:"Gral. Genes 567, Asunción",      historial:"Empresaria. Restaurante en el centro. Interesada en mantenimiento anual." },
{ id:"C-003", codigo:"CLI-003", nombre:"Roberto Silva",    tel:"0976111222", dir:"Ruta 1 km 18, San Lorenzo",      historial:"" },
];

const ESTADO_NEURO = [
// Estado 0: Pedido recibido
[
"Tu pedido está en nuestras manos. Los mejores artesanos del acero ya conocen tu nombre.",
"Acabamos de recibir tu pedido. Nuestro equipo ya está planificando cada detalle de tu pieza única.",
"Tu proyecto acaba de entrar al taller. Pronto el acero tomará la forma de tus sueños.",
"Pedido confirmado. Cada obra maestra comienza con un primer paso -- el tuyo ya está en marcha.",
"Bienvenido al proceso. Tu parrilla será creada con la misma pasión con la que vos disfrutás un buen asado.",
"El acero ya te espera. Nuestros maestros soldadores están preparando todo para tu pieza exclusiva.",
],
// Estado 1: En producción
[
"Manos expertas forjan tu parrilla ahora mismo. Cada corte, cada soldadura -- hecho para toda la vida.",
"El fuego del taller arde por tu pedido. Acero, precisión y pasión se unen en cada centímetro.",
"Tu parrilla está tomando forma. Cada soldadura es un compromiso de calidad que dura generaciones.",
"Ahora mismo, manos artesanas dan vida al acero. Tu parrilla no se fabrica -- se crea.",
"El taller vibra con tu pedido. Corte, doblado, soldadura -- cada paso es perfección calculada.",
"Tu pieza está en el corazón del proceso. Solo usamos acero premium porque tu asado lo merece.",
"Artesanos con décadas de experiencia trabajan en tu pedido. No es producción en serie -- es arte.",
"El acero inoxidable 304 ya tiene tu nombre. Cada milímetro se mide, se corta, se perfecciona.",
],
// Estado 2: Control de calidad
[
"Tu parrilla pasó por control de calidad. Solo lo perfecto llega a tu hogar.",
"Inspección final en curso. Revisamos cada soldadura, cada acabado, cada detalle. Cero defectos.",
"Tu parrilla está siendo examinada con lupa. Nuestro estándar es la perfección -- sin excepciones.",
"Control de calidad premium: cada unión, cada superficie, cada ángulo debe ser impecable.",
"Estamos verificando que tu pieza cumpla con los estándares europeos de calidad que nos definen.",
"Tu parrilla casi está lista. Solo falta confirmar que cada detalle esté a la altura de tu expectativa.",
],
// Estado 3: Lista para entrega
[
"Tu parrilla de ensueño está lista! Pronto el aroma del asado llenará tu espacio.",
"Obra maestra terminada. Tu parrilla espera el momento de brillar en tu hogar.",
"El acero ya tiene alma -- la tuya. Tu parrilla está lista para escribir historias inolvidables.",
"Preparando el embalaje premium. Tu pieza viaja protegida como la joya que es.",
"Tu parrilla está lista y ansiosa por conocer su nuevo hogar. El primer asado será legendario.",
"Misión cumplida en el taller. Ahora solo falta que el fuego y la carne hagan su magia.",
"¿Ya compraste la carne? Estamos cerca de entregarte tu parrilla. ¡Prepará un buen vacío para el estreno!",
"¡No te olvides del carbón! Quebracho o algarrobo son los mejores para inaugurar tu Dr. Parrilla.",
"¿Un buen vino o una cerveza bien fría para maridar los cortes de carne? El momento perfecto se acerca.",
"Comprá la carne, prepará la mesa, invitá a la familia. Tu Dr. Parrilla está a punto de llegar.",
"¿Ya tenés el chimichurri listo? Tu parrilla está esperando su gran debut.",
"Consejo: un buen sal gruesa y leña de quebracho. Tu primera brasa será inolvidable.",
],
// Estado 4: Entregada
[
"Bienvenida a tu familia. Que cada asado sea un recuerdo imborrable.",
"Tu parrilla ya está en casa. Cada asado que hagas será una celebración de la vida.",
"Entregada con orgullo. Cuidala y ella te dará décadas de asados perfectos.",
"Tu inversión en calidad ya rinde frutos. Disfrutá cada momento alrededor del fuego.",
"La parrilla llegó a destino. Ahora empieza la verdadera historia -- la que escribís vos con cada asado.",
"Gracias por confiar en Dr. Parrilla. Tu satisfacción es nuestro mayor logro. #ElFuegoNosUne🔥",
],
];
// Función para obtener mensaje aleatorio por estado (cambia cada hora para no repetir en la misma sesión)
function getNeuroMessage(estado) {
const msgs = ESTADO_NEURO[estado] || ESTADO_NEURO[0];
const hourSeed = Math.floor(Date.now() / 3600000);
const idx = (hourSeed + estado) % msgs.length;
return msgs[idx];
}


// -- CUPON EXPIRY HELPER --
function isCuponExpirado(cupon) {
if (!cupon.vence) return false;
const vence = parseFecha(cupon.vence);
if (!vence) return false;
const hoy = new Date(); hoy.setHours(0,0,0,0);
return hoy > vence;
}

const INITIAL_PEDIDOS = [
{ id:"DP-2024-089", tel:"0981234567", modelo:"El Patrón 900",      fecha:"28 Mar 2026", estado:3, monto:"Gs. 4.200.000", nota:"Entrega a domicilio Lambaré", fotos:[], diasHabiles:10 },
{ id:"DP-2024-072", tel:"0991876543", modelo:"Viking Pro 1200",    fecha:"10 Feb 2026", estado:4, monto:"Gs. 8.500.000", nota:"Retira en taller",            fotos:[], diasHabiles:10 },
{ id:"DP-2024-101", tel:"0976111222", modelo:"Josephine Portable", fecha:"05 Abr 2026", estado:1, monto:"Gs. 1.800.000", nota:"",                            fotos:[], diasHabiles:10 },
];

const INITIAL_TICKETS = [
{ id:"T-045", tel:"0981234567", tipo:"Mantenimiento", desc:"Limpieza anual y revisión de soldaduras",                                      fecha:"01 Abr 2026", estado:"En proceso" },
{ id:"T-031", tel:"0991876543", tipo:"Consulta",      desc:"Consulta sobre accesorios adicionales para Viking Pro",                        fecha:"15 Mar 2026", estado:"Resuelto"   },
{ id:"T-038", tel:"0976111222", tipo:"Reclamo",       desc:"La parrilla tiene una soldadura que se está levantando en el borde izquierdo", fecha:"03 Abr 2026", estado:"Abierto"    },
];

// ── REAL DR. PARRILLA LOGO ───────────────────────────────────────────────────
const LOGO_REAL = "data:image/png;base64,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";

function Logo({ width = 160, style = {} }) {
return (
<img
src={LOGO_REAL}
alt="Dr. Parrilla"
style={{ width, height:"auto", display:"block", ...style }}
/>
);
}

function LogoIcon({ size = 36, style = {} }) {
// Small flame icon for statusbar using the real logo
return (
<img
src={LOGO_REAL}
alt="Dr. Parrilla"
style={{ height:size*0.45, width:"auto", ...style }}
/>
);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function Tag({ label, color = GOLD }) {
return <span style={{ background:color+"22", border:`1px solid ${color}55`, color, fontSize:9, padding:"2px 8px", borderRadius:20, fontFamily:"sans-serif", letterSpacing:"1.5px", fontWeight:"bold" }}>{label}</span>;
}
function Header({ title, subtitle, back, onBack }) {
return (
<div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${BORDER}`, display:"flex", alignItems:"center", gap:12, background:"linear-gradient(135deg, #0E1015 0%, #0B0C0F 50%, #0D0C0B 100%)", boxShadow:"0 1px 0 rgba(200,169,110,0.08)" }}>
{back && <button onClick={onBack} style={{ background:"none", border:"none", color:GOLD, fontSize:22, cursor:"pointer", padding:"0 4px 0 0" }}>←</button>}
<div>
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", textTransform:"uppercase", marginBottom:2 }}>{subtitle||"DOCTOR PARRILLA"}</div>
<div style={{ fontSize:20, fontWeight:"bold" }}>{title}</div>
</div>
</div>
);
}
function BottomNav({ active, setActive, isAdmin }) {
const items = isAdmin
? [{ key:"admin-orders",label:"Pedidos",icon:"📦" },{ key:"admin-tickets",label:"Soporte",icon:"🔧" },{ key:"admin-cupones",label:"Cupones",icon:"🎟️" },{ key:"admin-clientes",label:"Clientes",icon:"👥" },{ key:"admin-catalog",label:"Catálogo",icon:"🔥" },{ key:"admin-visitas",label:"Visitas",icon:"📅" },{ key:"admin-resenas",label:"Reseñas",icon:"⭐" }]
: [{ key:"home",label:"Inicio",icon:"⌂" },{ key:"catalogo",label:"Catálogo",icon:"🔥" },{ key:"pedidos",label:"Pedidos",icon:"📦" },{ key:"cupones",label:"Cupones",icon:"🎟️" },{ key:"agendar",label:"Visita",icon:"📅" },{ key:"soporte",label:"Soporte",icon:"🔧" }];
return (
<div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"linear-gradient(0deg,#080C10,#0D0D0D)", borderTop:`1px solid ${GOLD}22`, display:"flex", zIndex:100 }}>
{items.map(it => (
<button key={it.key} onClick={() => setActive(it.key)} style={{ flex:1, padding:"12px 0 10px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, opacity:active===it.key?1:0.45 }}>
<span style={{ fontSize:20 }}>{it.icon}</span>
<span style={{ fontSize:10, color:active===it.key?GOLD:"#888", fontFamily:"sans-serif", letterSpacing:"0.5px", textTransform:"uppercase" }}>{it.label}</span>
{active===it.key && <div style={{ width:20, height:2, background:GOLD, borderRadius:1, marginTop:2 }} />}
</button>
))}
</div>
);
}

// ── Compresión de imagen para Firebase (max 800px, calidad 0.6) ──
function compressImage(file, maxW=800, quality=0.6) {
return new Promise((resolve) => {
const reader = new FileReader();
reader.onload = (ev) => {
const img = new Image();
img.onload = () => {
const canvas = document.createElement('canvas');
let w = img.width, h = img.height;
if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
canvas.width = w; canvas.height = h;
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0, w, h);
resolve(canvas.toDataURL('image/jpeg', quality));
};
img.src = ev.target.result;
};
reader.readAsDataURL(file);
});
}

function PhotoUploadButton({ onPhoto, multiple = false, label = "📷 Subir foto", style = {} }) {
const ref = useRef();
const handle = async (e) => {
const files = Array.from(e.target.files); if (!files.length) return;
if (multiple) {
const results = [];
for (const file of files) { results.push(await compressImage(file)); }
onPhoto(results);
} else {
const compressed = await compressImage(files[0]);
onPhoto(compressed);
}
e.target.value = "";
};
return (
<>
<input type="file" accept="image/*" multiple={multiple} ref={ref} onChange={handle} style={{ display:"none" }} />
<button onClick={() => ref.current?.click()} style={{ background:CARD, border:`1px solid ${BORDER}`, color:"#CCC", padding:"12px 16px", borderRadius:10, fontFamily:"sans-serif", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:8, ...style }}>{label}</button>
</>
);
}

// ── REVIEW COMPONENT ─────────────────────────────────────────────────────────
function ReviewFlow({ pedido, onSave, onClose, cupones, setCupones }) {
const [step, setStep] = useState(1); // 1=stars, 2=comment, 3=done
const [stars, setStars] = useState(0);
const [comment, setComment] = useState("");

const submit = () => {
if (stars === 0) return;
onSave({ stars, comment, fecha: new Date().toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"}) });
if (setCupones) {
const fecha = new Date().toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"});
const venceDate = new Date(Date.now() + 3*30*24*60*60*1000);
const vence = venceDate.toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"});
setCupones(prev => [{
id: cuponCode, cliente: pedido.tel, clienteTel: pedido.tel,
descuento: 15, motivo: "Reseña en Google - " + pedido.modelo,
estado: "activo", fecha, vence, tipo: "resena", duracionMeses: 3
}, ...(prev||[])]);
}
setStep(3);
};

// Generar código de cupón único basado en el pedido
const [cuponCode] = useState(() => `DRP-${pedido.id.slice(-3)}-${Math.random().toString(36).slice(2,6).toUpperCase()}`);

if (step === 3) return (
<div style={{ background:CARD, border:`1px solid ${GOLD}44`, borderRadius:16, padding:24, textAlign:"center" }}>
<div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
<div style={{ fontSize:20, fontWeight:"bold", marginBottom:8 }}>¡Gracias por tu reseña!</div>
<div style={{ fontSize:13, color:"#888", fontFamily:"sans-serif", marginBottom:16, lineHeight:1.6 }}>
Tu opinión nos ayuda a mejorar y a que más familias disfruten de una parrilla Dr. Parrilla.
</div>
<div style={{ background:"linear-gradient(135deg,#1A0800,#0A0A0A)", border:`1px solid ${GOLD}55`, borderRadius:12, padding:"16px", marginBottom:16 }}>
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:8 }}>🎁 REGALO EXCLUSIVO · #ElFuegoNosUne🔥</div>
<div style={{ fontSize:14, color:"#CCC", fontFamily:"sans-serif", lineHeight:1.6, marginBottom:12 }}>
Dejá tu reseña en Google y ganá un <span style={{ color:GOLD, fontWeight:"bold" }}>cupón de 15% de descuento</span> en tu próxima compra o servicio de mantenimiento.
</div>
<div style={{ background:DARK, border:`2px dashed ${GOLD}66`, borderRadius:10, padding:"12px", marginBottom:8 }}>
<div style={{ fontSize:10, color:"#666", fontFamily:"sans-serif", marginBottom:4 }}>TU CÓDIGO DE CUPÓN</div>
<div style={{ fontSize:22, fontWeight:"bold", color:GOLD, fontFamily:"monospace", letterSpacing:"3px" }}>{cuponCode}</div>
</div>
<div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif" }}>Válido por 3 meses · Presentá este código al hacer tu próximo pedido</div>
</div>
<a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer"
style={{ display:"block", width:"100%", background:"linear-gradient(135deg,#4285F4,#34A853)", border:"none", color:"#FFF", padding:"14px", borderRadius:10, fontSize:15, fontFamily:"sans-serif", fontWeight:"bold", cursor:"pointer", textDecoration:"none", textAlign:"center", boxSizing:"border-box", marginBottom:10 }}>
⭐ Dejar reseña en Google y activar cupón
</a>
<button onClick={onClose} style={{ width:"100%", background:"none", border:`1px solid ${BORDER}`, color:"#888", padding:"12px", borderRadius:10, fontSize:14, fontFamily:"sans-serif", cursor:"pointer" }}>
Cerrar
</button>
</div>
);

if (step === 2) return (
<div style={{ background:CARD, border:`1px solid ${GOLD}44`, borderRadius:16, padding:20 }}>
<div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:12 }}>
{[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:28 }}>{s<=stars?"⭐":"☆"}</span>)}
</div>
<div style={{ fontSize:14, fontWeight:"bold", marginBottom:14, textAlign:"center" }}>
{stars>=4?"¡Nos alegra mucho! Contanos más:":"¿Cómo podemos mejorar?"}
</div>
<textarea value={comment} onChange={e=>setComment(e.target.value)}
placeholder="Contá tu experiencia con la parrilla, el servicio, la entrega..."
style={{ width:"100%", height:100, background:DARK3, border:`1px solid ${BORDER}`, color:"#F0F0F0", padding:"12px", borderRadius:10, fontSize:14, fontFamily:"sans-serif", outline:"none", resize:"none", boxSizing:"border-box", marginBottom:14 }}/>
<button onClick={submit}
style={{ width:"100%", background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, border:"none", color:DARK, padding:"14px", borderRadius:10, fontSize:14, fontFamily:"sans-serif", fontWeight:"bold", cursor:"pointer", marginBottom:8 }}>
ENVIAR RESEÑA
</button>
<button onClick={() => setStep(1)} style={{ width:"100%", background:"none", border:"none", color:"#888", padding:"8px", fontSize:13, fontFamily:"sans-serif", cursor:"pointer" }}>← Volver</button>
</div>
);

// Step 1: Stars
const labels = ["","Malo","Regular","Bueno","Muy bueno","Excelente"];
return (
<div style={{ background:CARD, border:`1px solid ${GOLD}44`, borderRadius:16, padding:20, textAlign:"center" }}>
<div style={{ fontSize:36, marginBottom:8 }}>🔥</div>
<div style={{ fontSize:18, fontWeight:"bold", marginBottom:4 }}>¡Tu parrilla fue entregada!</div>
<div style={{ fontSize:13, color:"#888", fontFamily:"sans-serif", marginBottom:20 }}>¿Cómo fue tu experiencia con Dr. Parrilla? #ElFuegoNosUne🔥</div>
<div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:8 }}>
{[1,2,3,4,5].map(s => (
<button key={s} onClick={() => setStars(s)}
style={{ background:"none", border:"none", cursor:"pointer", fontSize:36, transform: s<=stars?"scale(1.2)":"scale(1)", transition:"transform 0.1s" }}>
{s<=stars?"⭐":"☆"}
</button>
))}
</div>
{stars>0 && <div style={{ fontSize:14, color:GOLD, fontFamily:"sans-serif", marginBottom:16, fontWeight:"bold" }}>{labels[stars]}</div>}
<button onClick={() => stars>0&&setStep(2)} disabled={stars===0}
style={{ width:"100%", background:stars>0?`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`:BORDER, border:"none", color:stars>0?DARK:"#555", padding:"14px", borderRadius:10, fontSize:14, fontFamily:"sans-serif", fontWeight:"bold", cursor:stars>0?"pointer":"default", marginBottom:8 }}>
CONTINUAR
</button>
<button onClick={onClose} style={{ background:"none", border:"none", color:"#555", fontSize:12, fontFamily:"sans-serif", cursor:"pointer" }}>Ahora no</button>
</div>
);
}

// ── CELEBRATION COMPONENT ────────────────────────────────────────────────────
function CelebrationBanner({ modelo, onClose }) {
return (
<div style={{ background:"linear-gradient(135deg,#1A0D00,#0A0A0A)", border:`2px solid ${GOLD}`, borderRadius:16, padding:24, textAlign:"center", marginBottom:20, position:"relative" }}>
<div style={{ fontSize:48, marginBottom:8 }}>🎉</div>
<div style={{ fontSize:20, fontWeight:"bold", color:GOLD, marginBottom:6 }}>¡Tu parrilla está lista!</div>
<div style={{ fontSize:14, color:"#CCC", fontFamily:"sans-serif", marginBottom:4, lineHeight:1.6 }}>
El equipo de Dr. Parrilla terminó tu <strong>{modelo}</strong>.<br/>
Pronto coordinaremos la entrega.
</div>
<div style={{ fontSize:12, color:"#888", fontFamily:"sans-serif", marginTop:8, fontStyle:"italic" }}>
"El fuego perfecto te espera" · #ElFuegoNosUne🔥
</div>
<button onClick={onClose} style={{ position:"absolute", top:10, right:12, background:"none", border:"none", color:"#555", fontSize:18, cursor:"pointer" }}>✕</button>
</div>
);
}

// ── TIPS WHILE WAITING ────────────────────────────────────────────────────────
const TIPS = [
{ icon:"🔥", titulo:"El primer fuego", texto:"Antes de usar tu parrilla nueva, hacé un fuego de inicialización para curar la superficie. Esto elimina impurezas y potencia el sabor de tus asados." },
{ icon:"🧂", titulo:"El secreto de la sal", texto:"Salá la carne gruesa 45 minutos antes de poner al fuego. La sal penetra la carne y sella los jugos por dentro. Para cortes finos, salá justo antes." },
{ icon:"🪵", titulo:"Madera correcta", texto:"Usá quebracho o algarrobo. Generan brasas duraderas y aromáticas, perfectas para asados largos. Evitá madera resinosa que da sabor amargo." },
{ icon:"🌡️", titulo:"La temperatura ideal", texto:"Para vacío y costillas: fuego bajo 3+ horas. Para lomo y solomillo: fuego fuerte 8-10 minutos por lado. La paciencia es el ingrediente secreto." },
{ icon:"🥩", titulo:"No pinches la carne", texto:"Usá pinzas, nunca tenedor. Pinchar la carne deja salir los jugos y el resultado es una carne seca. Las pinzas son la herramienta del asador profesional." },
{ icon:"💧", titulo:"Reposo obligatorio", texto:"Después de sacar la carne del fuego, dejala reposar 5 minutos tapada con papel aluminio. Los jugos se redistribuyen y la carne queda jugosa y tierna." },
{ icon:"🫧", titulo:"Limpieza de la parrilla", texto:"Limpiá la parrilla cuando aún está caliente con un cepillo de acero. Es mucho más fácil que en frío. Una parrilla limpia da mejor sabor." },
{ icon:"🌬️", titulo:"Control del fuego", texto:"No soples las brasas directamente. Usá un abanico o cartón para avivar el fuego. El soplido directo esparce ceniza sobre la carne." },
{ icon:"🧈", titulo:"Aceite antes de cocinar", texto:"Pasá un papel con aceite por las rejas antes de poner la carne. Evita que se pegue y facilita el vuelta y vuelta sin romper la pieza." },
{ icon:"🌿", titulo:"Hierbas aromáticas", texto:"Colocá ramas de romero o tomillo sobre las brasas al cocinar. El humo aromático impregna la carne con un sabor único e inconfundible." },
{ icon:"🔩", titulo:"Cuidado del acero inox", texto:"El acero inoxidable 304 de tu Dr. Parrilla no necesita aceite ni pintura. Solo limpieza con agua y jabón neutro. Dura toda la vida con cuidado básico." },
{ icon:"⏰", titulo:"El punto exacto", texto:"Para saber el punto sin termómetro: toca la carne con el dedo. Blanda = jugosa, semi-firme = a punto, muy firme = bien cocida. Practicá y lo dominás." },
{ icon:"🐄", titulo:"Cortes paraguayos", texto:"El vacío, la tira de asado y el lomo son los favoritos nacionales. El vacío necesita fuego lento, la tira fuego medio y el lomo fuego alto y rápido." },
{ icon:"🧄", titulo:"Chimichurri casero", texto:"Mezcla: perejil, ajo, orégano, ají molido, aceite, vinagre y sal. Preparalo 24hs antes para que los sabores se integren. El acompañante perfecto." },
{ icon:"🌊", titulo:"Zona de calor directo e indirecto", texto:"Armá brasas de un lado y dejá el otro libre. Usá calor directo para sellar y calor indirecto para terminar la cocción sin quemar el exterior." },
{ icon:"🥓", titulo:"La panceta primero", texto:"Si vas a cocinar panceta y carne, empezá por la panceta. La grasa que suelta condimenta las brasas y le da un sabor especial a todo lo que viene después." },
{ icon:"🍋", titulo:"Marinadas que funcionan", texto:"Para cerdo: naranja + ajo + comino. Para pollo: limón + romero + ajo. Para res: vino tinto + hierbas. Marinado mínimo 2 horas, mejor toda la noche." },
{ icon:"🧱", titulo:"Temperatura de la parrilla", texto:"Colocá tu mano a 10cm de la parrilla. Si aguantás 2 segundos = fuego fuerte. 4 segundos = fuego medio. 6 segundos = fuego suave. Técnica del asador experto." },
{ icon:"🏆", titulo:"El secreto del quincho", texto:"Un buen quincho necesita ventilación, superficie resistente al calor y buena iluminación. Tu parrilla Dr. Parrilla está diseñada para ser el centro de cualquier quincho." },
{ icon:"❤️", titulo:"El asado es cultura", texto:"En Paraguay, el asado no es solo comida, es reunión familiar, celebración y tradición. Cada parrilla Dr. Parrilla nació para ser el centro de esos momentos inolvidables." },
];

function TipsSection() {
const [tipIdx, setTipIdx] = useState(0);
const tip = TIPS[tipIdx];
return (
<div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"16px", marginBottom:16 }}>
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:12 }}>🔥 MIENTRAS ESPERAS -- TIPS DEL ASADOR</div>
<div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:14 }}>
<span style={{ fontSize:28, flexShrink:0 }}>{tip.icon}</span>
<div>
<div style={{ fontSize:15, fontWeight:"bold", marginBottom:4 }}>{tip.titulo}</div>
<div style={{ fontSize:13, color:"#AAA", fontFamily:"sans-serif", lineHeight:1.6 }}>{tip.texto}</div>
</div>
</div>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<div style={{ display:"flex", gap:6 }}>
{TIPS.map((_,i) => <div key={i} onClick={() => setTipIdx(i)} style={{ width:i===tipIdx?20:6, height:6, borderRadius:3, background:i===tipIdx?GOLD:BORDER, cursor:"pointer", transition:"width 0.2s" }}/>)}
</div>
<button onClick={() => setTipIdx((tipIdx+1)%TIPS.length)} style={{ background:GOLD+"22", border:`1px solid ${GOLD}44`, color:GOLD, padding:"6px 14px", borderRadius:20, fontSize:12, fontFamily:"sans-serif", cursor:"pointer" }}>
Siguiente →
</button>
</div>
</div>
);
}

// ── ¿QUÉ PODÉS COCINAR? ────────────────────────────────────────────────────────────────
const COCINAR_IDEAS = [
{ emoji:"🍕", titulo:"Pizza a la parrilla",       desc:"Masa crocante con sabor ahumado único. La pizza más rica sale de tu Dr. Parrilla." },
{ emoji:"🍔", titulo:"Hamburguesas gourmet",      desc:"Smash burgers con sello de fuego perfecto. El sabor que ningún horno puede dar." },
{ emoji:"🥬", titulo:"Verduras a las brasas",     desc:"Morrones, berenjenas, zapallitos caramelizados. Sabor natural potenciado por el fuego." },
{ emoji:"🍖", titulo:"Costillar a la estaca",     desc:"Carne a la leña con cocción lenta tradicional. El asado más auténtico de Paraguay." },
{ emoji:"♨️",  titulo:"Módulos desmontables",     desc:"Plancha, wok, disco -- versatilidad total. Tu parrilla se adapta a lo que quieras cocinar." },
{ emoji:"🥚", titulo:"Desayuno a la parrilla",    desc:"Huevos, panceta, tostadas -- todo al fuego. Empezá el día con sabor a brasa." },
{ emoji:"🍮", titulo:"Postres al fuego",          desc:"Banana con chocolate, piña caramelizada, manzanas asadas. El dulce cierre de un gran asado." },
];

function CocinarSection() {
const [expanded, setExpanded] = useState(false);
const items = expanded ? COCINAR_IDEAS : COCINAR_IDEAS.slice(0, 4);
return (
<div style={{ marginBottom:16 }}>
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:12 }}>🔥 ¿SABÍAS TODO LO QUE PODÉS COCINAR?</div>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
{items.map((item, i) => (
<div key={i} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"14px 12px", textAlign:"center" }}>
<div style={{ fontSize:28, marginBottom:6 }}>{item.emoji}</div>
<div style={{ fontSize:12, fontWeight:"bold", color:GOLD, fontFamily:"sans-serif", marginBottom:4, letterSpacing:"0.5px" }}>{item.titulo.toUpperCase()}</div>
<div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", lineHeight:1.4 }}>{item.desc}</div>
</div>
))}
</div>
{COCINAR_IDEAS.length > 4 && (
<button onClick={() => setExpanded(!expanded)} style={{ width:"100%", background:GOLD+"11", border:`1px solid ${GOLD}33`, color:GOLD, padding:"10px", borderRadius:10, fontSize:12, fontFamily:"sans-serif", cursor:"pointer" }}>
{expanded ? "Ver menos ▲" : `Ver más recetas (${COCINAR_IDEAS.length - 4}+) ▼`}
</button>
)}
<div style={{ textAlign:"center", marginTop:10, fontSize:12, color:GOLD_DARK, fontFamily:"sans-serif", fontStyle:"italic" }}>#ElFuegoNosUne🔥 · Tu Dr. Parrilla es mucho más que una parrilla</div>
</div>
);
}

// ── COUNTRIES ─────────────────────────────────────────────────────────────────────────────
const PAISES = [
{ flag:"🇵🇾", nombre:"Paraguay",       desc:"Casa matriz · Lambaré" },
{ flag:"🇦🇷", nombre:"Argentina",      desc:"Exportación directa" },
{ flag:"🇧🇷", nombre:"Brasil",         desc:"Exportación directa" },
{ flag:"🇧🇴", nombre:"Bolivia",        desc:"Exportación directa" },
{ flag:"🇨🇴", nombre:"Colombia",       desc:"Exportación directa" },
{ flag:"🇸🇻", nombre:"El Salvador",    desc:"Exportación directa" },
{ flag:"🇵🇦", nombre:"Panamá",         desc:"Hub estratégico regional" },
{ flag:"🇺🇸", nombre:"Estados Unidos", desc:"Florida & expansión" },
{ flag:"🇪🇸", nombre:"España",         desc:"Exportación directa" },
{ flag:"🇷🇸", nombre:"Serbia",         desc:"Exportación directa" },
{ flag:"🇲🇽", nombre:"México",         desc:"Franquicia en desarrollo" },
];

function PaisesSection() {
return (
<div style={{ padding:"0 16px 20px" }}>
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:14, textAlign:"center" }}>
🌎 DR. PARRILLA EN EL MUNDO
</div>
<div style={{ background:"linear-gradient(135deg,#1A0D00,#0A0A0A)", border:`1px solid ${GOLD}33`, borderRadius:14, padding:"16px", marginBottom:12 }}>
<div style={{ textAlign:"center", marginBottom:12 }}>
<span style={{ fontSize:28, fontWeight:"bold", color:GOLD }}>11</span>
<span style={{ fontSize:13, color:"#888", fontFamily:"sans-serif", marginLeft:8 }}>países · De Paraguay para el mundo</span>
</div>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
{PAISES.map((p,i) => (
<div key={i} style={{ display:"flex", alignItems:"center", gap:8, background:"#0A0A0A", borderRadius:8, padding:"8px 10px", border:`1px solid ${i===0?GOLD+"55":BORDER}` }}>
<span style={{ fontSize:20 }}>{p.flag}</span>
<div>
<div style={{ fontSize:12, fontWeight:"bold", color:i===0?GOLD:"#CCC" }}>{p.nombre}</div>
<div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif" }}>{p.desc}</div>
</div>
</div>
))}
</div>
</div>
</div>
);
}

// ── SVG PROGRESS CIRCLE ───────────────────────────────────────────────────────
function CirculoProgreso({ estado, diasRestantes, modelo }) {
const pct = Math.round((estado / (ESTADO_LABELS.length - 1)) * 100);
const r = 52;
const circ = 2 * Math.PI * r;
const offset = circ - (pct / 100) * circ;
const retrasado = diasRestantes !== null && diasRestantes < 0;
const urgente = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 3;
const color = retrasado ? "#E57373" : urgente ? "#FF9800" : GOLD;

const mensajeRetraso = retrasado
? `Tu parrilla tiene ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes)>1?"s":""} de retraso. Nuestro equipo está trabajando para entregártela lo antes posible. Disculpá la demora.`
: urgente
? `¡Tu parrilla está casi lista! Quedan solo ${diasRestantes} día${diasRestantes>1?"s":""} hábil${diasRestantes>1?"es":""}. Pronto te contactamos para coordinar la entrega.`
: null;

return (
<div style={{ background:`${color}11`, border:`1px solid ${color}33`, borderRadius:14, padding:"20px 16px", marginBottom:20 }}>
<div style={{ display:"flex", alignItems:"center", gap:20 }}>
{/* SVG Circle */}
<div style={{ flexShrink:0, position:"relative", width:120, height:120 }}>
<svg width="120" height="120" style={{ transform:"rotate(-90deg)" }}>
<circle cx="60" cy="60" r={r} fill="none" stroke="#1A1A1A" strokeWidth="10"/>
<circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
strokeDasharray={circ} strokeDashoffset={offset}
strokeLinecap="round"
style={{ transition:"stroke-dashoffset 0.8s ease", filter:`drop-shadow(0 0 6px ${color}88)` }}/>
</svg>
<div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center" }}>
<div style={{ fontSize:22, fontWeight:"bold", color, lineHeight:1 }}>{pct}%</div>
<div style={{ fontSize:9, color:"#888", fontFamily:"sans-serif", marginTop:2 }}>avance</div>
</div>
</div>
{/* Info */}
<div style={{ flex:1 }}>
<div style={{ fontSize:13, color:"#AAA", fontFamily:"sans-serif", marginBottom:6 }}>Estado actual:</div>
<div style={{ fontSize:15, fontWeight:"bold", color, marginBottom:8 }}>{ESTADO_LABELS[estado]}</div>
{diasRestantes !== null && (
<div style={{ display:"flex", alignItems:"center", gap:6 }}>
<span style={{ fontSize:16 }}>{retrasado?"🚨":urgente?"⏳":"📅"}</span>
<span style={{ fontSize:12, color, fontFamily:"sans-serif", fontWeight:"bold" }}>
{retrasado
? `${Math.abs(diasRestantes)}d de retraso`
: diasRestantes === 0
? "¡Entrega hoy!"
: `${diasRestantes}d hábiles`}
</span>
</div>
)}
</div>
</div>
{/* Delay/urgent message */}
{mensajeRetraso && (
<div style={{ marginTop:14, background: retrasado?"#1A0000":"#1A0800", border:`1px solid ${color}44`, borderRadius:10, padding:"12px 14px", fontSize:12, color:"#CCC", fontFamily:"sans-serif", lineHeight:1.6 }}>
{retrasado?"⚠️ ":"🔥 "}{mensajeRetraso}
</div>
)}
</div>
);
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, clientes }) {
const [phone, setPhone] = useState("");
const [pass, setPass]   = useState("");
const [showPass, setShowPass] = useState(false);
const [error, setError] = useState("");
const isAdmin = !!findAdmin(phone);
const clienteMatch = !isAdmin ? findCliente(phone, clientes) : null;

const handleLogin = () => {
if (phone.length < 7) { setError("Ingresá tu número"); return; }
if (isAdmin) {
const admin = findAdmin(phone, pass);
if (!admin) { setError("Contraseña incorrecta"); return; }
onLogin(admin, null, true);
} else if (clienteMatch) {
onLogin(null, clienteMatch, false);
} else {
setError("Número no registrado");
}
};

return (
<div style={{ minHeight:"100vh", background:STEEL_BG, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, position:"relative", overflow:"hidden" }}>
{/* Flame decoration */}
<div style={{ position:"absolute", bottom:0, left:0, right:0, height:200, background:"linear-gradient(0deg, rgba(200,80,0,0.1) 0%, transparent 100%)", pointerEvents:"none" }}/>
{[{l:"15%",h:130},{l:"30%",h:80},{l:"50%",h:110},{r:"15%",h:150},{r:"35%",h:90}].map((f,i) => (
<div key={i} style={{ position:"absolute", bottom:0, left:f.l, right:f.r, width:f.l?"2px":"2px", height:f.h, background:"linear-gradient(0deg,#C84B00,transparent)", opacity:0.2, borderRadius:2, pointerEvents:"none" }}/>
))}
{/* Logo */}
<div style={{ marginBottom:8 }}>
<Logo width={260} style={{ filter:"drop-shadow(0 0 30px rgba(200,169,110,0.3))" }} />
</div>
<div style={{ fontSize:11, color:GOLD_DARK, fontFamily:"sans-serif", fontStyle:"italic", marginBottom:36, letterSpacing:"2px", textAlign:"center" }}>
"La parrilla de tus sueños te espera"
</div>
{/* Form */}
<div style={{ width:"100%", maxWidth:340 }}>
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:8 }}>TELÉFONO</div>
<input type="tel" placeholder="09XX XXX XXX" value={phone}
onChange={e => { setPhone(e.target.value); setError(""); setPass(""); }}
onKeyDown={e => e.key==="Enter" && handleLogin()}
style={{ width:"100%", background:CARD, border:`1px solid ${isAdmin||clienteMatch?GOLD+"88":BORDER2}`, color:CREAM, padding:"14px 16px", borderRadius:8, fontSize:16, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box", marginBottom:12 }}/>
{/* Admin password field */}
{isAdmin && (
<div style={{ marginBottom:12 }}>
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:8 }}>CONTRASEÑA</div>
<div style={{ position:"relative" }}>
<input type={showPass?"text":"password"} placeholder="••••••••" value={pass}
onChange={e => { setPass(e.target.value); setError(""); }}
onKeyDown={e => e.key==="Enter" && handleLogin()}
autoFocus
style={{ width:"100%", background:CARD, border:`1px solid ${GOLD}88`, color:CREAM, padding:"14px 48px 14px 16px", borderRadius:8, fontSize:16, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box" }}/>
<button onClick={() => setShowPass(!showPass)}
style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:GOLD_DARK, cursor:"pointer", fontSize:12, fontFamily:"sans-serif" }}>
{showPass?"Ocultar":"Ver"}
</button>
</div>
</div>
)}
{/* User preview */}
{(isAdmin || clienteMatch) && (
<div style={{ background:`${GOLD}11`, border:`1px solid ${GOLD}33`, borderRadius:8, padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
<div style={{ width:34, height:34, borderRadius:"50%", background:`${GOLD}22`, border:`1px solid ${GOLD}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:GOLD, fontWeight:"bold", fontFamily:"sans-serif" }}>
{isAdmin ? findAdmin(phone)?.avatar || "A" : clienteMatch?.nombre?.charAt(0)}
</div>
<div>
<div style={{ fontSize:13, fontWeight:"bold", color:GOLD }}>
{isAdmin ? findAdmin(phone)?.nombre : clienteMatch?.nombre}
</div>
<div style={{ fontSize:11, color:"#777", fontFamily:"sans-serif" }}>
{isAdmin ? findAdmin(phone)?.rol : "Cliente"}
</div>
</div>
</div>
)}
{/* Error */}
{error && <div style={{ color:"#E57373", fontSize:12, fontFamily:"sans-serif", marginBottom:10, textAlign:"center" }}>{error}</div>}
{/* Login button */}
<button onClick={handleLogin}
style={{ width:"100%", background:phone.length>4?GOLD_GRAD:BORDER, border:"none", color:phone.length>4?DARK:BORDER2, padding:"16px", borderRadius:8, fontSize:14, fontFamily:"sans-serif", fontWeight:"bold", letterSpacing:"3px", cursor:phone.length>4?"pointer":"default" }}>
{isAdmin ? "ACCEDER AL PANEL" : "INGRESAR"}
</button>
<div style={{ textAlign:"center", marginTop:16, fontSize:10, color:"#333", fontFamily:"sans-serif" }}>
#ElFuegoNosUne🔥
</div>
<div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif", marginTop:6 }}>Dr. Parrilla · Sistema de Gestión v2.0 · #ElFuegoNosUne🔥
</div>
</div>
</div>
);
}

// ── CLIENT: HOME ──────────────────────────────────────────────────────────────: HOME ──────────────────────────────────────────────────────────────
function HomeScreen({ setActive, clienteUser, pedidos, cupones }) {
const nombre = clienteUser?.nombre?.split(" ")[0] || "";
const misPedidos = clienteUser ? pedidos.filter(p => normalizePhone(p.tel)===normalizePhone(clienteUser.tel) && p.estado < 4) : [];
const urgente = misPedidos.find(p => {
const base = parseFecha(p.fecha); if (!base||!p.diasHabiles) return false;
const lim = addDiasHabiles(base, p.diasHabiles);
const d = diasHabilesRestantes(lim);
return d !== null && d <= 7;
});
return (
<div style={{ paddingBottom:80 }}>
<div style={{ padding:"28px 20px 24px", background:"linear-gradient(180deg, #1A0D00 0%, #111418 60%, #0A0A0A 100%)", borderBottom:`1px solid ${GOLD}22`, position:"relative", overflow:"hidden" }}>
<Logo width={140} style={{ marginBottom:14, filter:"drop-shadow(0 0 12px #C9A84C44)" }} />
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:6 }}>BIENVENIDO</div>
<div style={{ fontSize:24, fontWeight:"bold", marginBottom:4 }}>Hola, {nombre} 👋</div>
<div style={{ fontSize:13, color:"#666", fontFamily:"sans-serif" }}>¿Qué necesitás hoy?</div>
<div style={{ fontSize:12, color:GOLD, fontFamily:"Georgia, serif", fontStyle:"italic", marginTop:8, letterSpacing:1 }}>#ElFuegoNosUne🔥</div>
</div>
{urgente && (() => {
const base = parseFecha(urgente.fecha);
const lim = addDiasHabiles(base, urgente.diasHabiles);
const dias = diasHabilesRestantes(lim);
const color = getAlertaColor(dias);
return (
<div style={{ margin:"16px 16px 0", background:color+"15", border:`1px solid ${color}44`, borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
<span style={{ fontSize:24 }}>{dias<=0?"🚨":dias<=3?"🔴":"⏳"}</span>
<div style={{ flex:1 }}>
<div style={{ fontSize:12, color, fontFamily:"sans-serif", fontWeight:"bold" }}>
{dias<=0?"PEDIDO VENCIDO":`${dias} DÍAS HÁBILES PARA ENTREGA`}
</div>
<div style={{ fontSize:12, color:"#AAA", fontFamily:"sans-serif", marginTop:2 }}>{urgente.id} · {urgente.modelo}</div>
</div>
<button onClick={() => setActive("pedidos")} style={{ background:color, border:"none", color:DARK, fontSize:11, padding:"6px 12px", borderRadius:20, fontFamily:"sans-serif", fontWeight:"bold", cursor:"pointer", flexShrink:0 }}>VER</button>
</div>
);
})()}
<div style={{ padding:"16px 20px 0", display:"flex", flexDirection:"column", gap:12 }}>
{[{key:"catalogo",icon:"🔥",title:"Catálogo",desc:"Explorá todos nuestros modelos"},
{key:"pedidos",icon:"📦",title:"Mis Pedidos",desc: misPedidos.length > 0 ? `${misPedidos.length} pedido${misPedidos.length>1?"s":""} activo${misPedidos.length>1?"s":""}` : "Seguí el estado de tu pedido"},
{key:"cupones",icon:"🎟️",title:"Mis Cupones",desc: (() => { const mc = cupones ? cupones.filter(c => c.clienteTel && normalizePhone(c.clienteTel) === normalizePhone(clienteUser?.tel||"")) : []; const a = mc.filter(c => c.estado === "activo"); return a.length > 0 ? `${a.length} cupón${a.length>1?"es":""} disponible${a.length>1?"s":""}` : "Ver tus descuentos"; })()},
{key:"soporte",icon:"🔧",title:"Soporte",desc:"Reclamos y mantenimiento"}
].map(c => (
<button key={c.key} onClick={() => setActive(c.key)} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"20px", display:"flex", alignItems:"center", gap:16, cursor:"pointer", textAlign:"left" }}>
<div style={{ width:52, height:52, background:GOLD+"18", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, border:`1px solid ${GOLD}33`, flexShrink:0 }}>{c.icon}</div>
<div><div style={{ fontSize:17, fontWeight:"bold", marginBottom:3 }}>{c.title}</div><div style={{ fontSize:12, color:"#666", fontFamily:"sans-serif" }}>{c.desc}</div></div>
<span style={{ marginLeft:"auto", color:GOLD, fontSize:18 }}>›</span>
</button>
))}
</div>
<div style={{ margin:"16px 20px 0" }}>
<a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer"
style={{ display:"flex", alignItems:"center", gap:12, background:"#0A1F0A", border:"1px solid #1A3A1A", borderRadius:12, padding:"16px 20px", textDecoration:"none" }}>
<span style={{ fontSize:24 }}>💬</span>
<div><div style={{ fontSize:14, fontWeight:"bold", color:"#4CAF50" }}>WhatsApp Directo</div><div style={{ fontSize:12, color:"#666", fontFamily:"sans-serif" }}>+595 994 389 932</div></div>
<span style={{ marginLeft:"auto", color:"#4CAF50", fontSize:18 }}>›</span>
</a>
</div>
</div>
);
}

// ── CLIENT: CATÁLOGO ──────────────────────────────────────────────────────────
function CatalogoScreen({ productos }) {
const [selected, setSelected] = useState(null);
const [colorSel, setColorSel] = useState(null);
const [done, setDone] = useState(false);
if (done) return (
<div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", padding:32, textAlign:"center" }}>
<div style={{ fontSize:60, marginBottom:16 }}>✅</div>
<div style={{ fontSize:22, fontWeight:"bold", marginBottom:8 }}>¡Solicitud enviada!</div>
<div style={{ fontSize:14, color:"#888", fontFamily:"sans-serif", marginBottom:28 }}>Te contactamos en menos de 24hs. #ElFuegoNosUne🔥</div>
<button onClick={() => { setSelected(null); setDone(false); setColorSel(null); }} style={{ background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, border:"none", color:DARK, padding:"14px 32px", borderRadius:8, fontFamily:"sans-serif", fontWeight:"bold", fontSize:14, cursor:"pointer" }}>VOLVER AL CATÁLOGO</button>
</div>
);
if (selected !== null) {
const p = productos.find(x => x.id===selected);
const curColor = colorSel || ((p.colores||[])[0]||"");
return (
<div style={{ paddingBottom:100 }}>
<Header title={p.nombre} back onBack={() => { setSelected(null); setColorSel(null); }} />
{(() => {
const allFotos = p.fotos && p.fotos.length > 0 ? p.fotos : (p.foto ? [p.foto] : []);
return allFotos.length > 0 ? (
<div style={{ position:"relative" }}>
<div style={{ display:"flex",overflowX:"auto",scrollSnapType:"x mandatory",WebkitOverflowScrolling:"touch" }}>
{allFotos.map((foto,fi) => (
<div key={fi} style={{ minWidth:"100%",height:240,scrollSnapAlign:"start",background:"linear-gradient(135deg,#1A1200,#0D0D0D)",flexShrink:0 }}>
<img src={foto} alt={`${p.nombre} ${fi+1}`} style={{ width:"100%",height:"100%",objectFit:"cover",opacity:0.9,display:"block" }} />
</div>
))}
</div>
{allFotos.length > 1 && <div style={{ position:"absolute",bottom:10,left:0,right:0,display:"flex",justifyContent:"center",gap:6 }}>
{allFotos.map((_,fi) => <div key={fi} style={{ width:8,height:8,borderRadius:"50%",background:fi===0?GOLD:"#FFFFFF55" }} />)}
</div>}
</div>
) : (
<div style={{ height:200,background:"linear-gradient(135deg,#1A1200,#0D0D0D)",display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:88 }}>{p.emoji}</span></div>
);
})()}
<div style={{ padding:"20px" }}>
<div style={{ display:"flex", gap:8, marginBottom:12 }}><Tag label={p.tag} /></div>
<div style={{ fontSize:22, fontWeight:"bold", marginBottom:6 }}>{p.nombre}</div>
<div style={{ fontSize:22, color:GOLD, fontWeight:"bold", marginBottom:16 }}>{p.precio}</div>
<div style={{ fontSize:14, color:"#AAA", fontFamily:"sans-serif", lineHeight:1.7, marginBottom:24 }}>{p.desc}</div>
{(p.colores||[]).length > 0 && <>
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:12 }}>COLOR / ACABADO</div>
<div style={{ display:"flex", gap:10, marginBottom:24 }}>
{(p.colores||[]).map(c => (
<button key={c} onClick={() => setColorSel(c)} style={{ flex:1, padding:"12px", borderRadius:10, border:`2px solid ${curColor===c?GOLD:BORDER}`, background:curColor===c?GOLD+"18":CARD, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
<div style={{ width:28, height:28, borderRadius:"50%", background:c==="Negro"?"#1a1a1a":"#C0C0C0", border:`2px solid ${c==="Negro"?"#444":"#888"}` }} />
<span style={{ fontSize:12, color:curColor===c?GOLD:"#888", fontFamily:"sans-serif", fontWeight:curColor===c?"bold":"normal" }}>{c}</span>
</button>
))}
</div>
</>}
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:12 }}>ESPECIFICACIONES</div>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:28 }}>
{(p.specs||[]).map((s,i) => <div key={i} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 14px", fontSize:13, fontFamily:"sans-serif", color:"#CCC" }}>✓ {s}</div>)}
</div>
<button onClick={() => setDone(true)} style={{ width:"100%", background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, border:"none", color:DARK, padding:"16px", borderRadius:10, fontSize:15, fontFamily:"sans-serif", fontWeight:"bold", letterSpacing:"2px", cursor:"pointer", marginBottom:12 }}>SOLICITAR COTIZACIÓN</button>
<a href={`https://wa.me/${WA_NUMBER}?text=Hola! Me interesa la ${p.nombre} en color ${curColor}`} target="_blank" rel="noreferrer"
style={{ display:"block", textAlign:"center", width:"100%", background:"none", border:`1px solid ${BORDER}`, color:"#4CAF50", padding:"14px", borderRadius:10, fontSize:14, fontFamily:"sans-serif", textDecoration:"none", boxSizing:"border-box" }}>
💬 Consultar por WhatsApp
</a>
</div>
</div>
);
}
return (
<div style={{ paddingBottom:80 }}>
<Header title="Catálogo" subtitle="NUESTROS MODELOS · #ElFuegoNosUne🔥" />
<div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:12 }}>
{productos.map(p => (
<button key={p.id} onClick={() => setSelected(p.id)} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:0, cursor:"pointer", textAlign:"left", overflow:"hidden" }}>
<div style={{ height:120, background:"linear-gradient(135deg,#1A1200,#0D0D0D)", display:"flex", alignItems:"center", justifyContent:"center", borderBottom:`1px solid ${BORDER}`, overflow:"hidden", position:"relative" }}>
{(p.fotos && p.fotos.length > 0 ? p.fotos[0] : p.foto) ? <><img src={p.fotos && p.fotos.length > 0 ? p.fotos[0] : p.foto} alt={p.nombre} style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.85 }} />{(p.fotos||[]).length > 1 && <div style={{ position:"absolute",bottom:6,right:8,background:"#000000AA",borderRadius:12,padding:"2px 8px",fontSize:10,color:"#FFF",fontFamily:"sans-serif" }}>\U0001f4f7 {(p.fotos||[]).length}</div>}</> : <span style={{ fontSize:60 }}>{p.emoji}</span>}
</div>
<div style={{ padding:"14px 16px" }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
<div style={{ fontSize:16, fontWeight:"bold" }}>{p.nombre}</div><Tag label={p.tag} />
</div>
<div style={{ display:"flex", gap:6, marginBottom:8 }}>
{(p.colores||[]).map(c => <span key={c} style={{ fontSize:10, color:"#888", fontFamily:"sans-serif", background:DARK3, border:`1px solid ${BORDER}`, padding:"2px 8px", borderRadius:20 }}>{c}</span>)}
</div>
<div style={{ fontSize:13, color:"#666", fontFamily:"sans-serif", marginBottom:10, lineHeight:1.5 }}>{(p.desc||"").slice(0,80)}...</div>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<div style={{ fontSize:17, color:GOLD, fontWeight:"bold" }}>{p.precio}</div>
<span style={{ color:GOLD, fontSize:20 }}>›</span>
</div>
</div>
</button>
))}
</div>
</div>
);
}

// ── CLIENT: PEDIDOS ───────────────────────────────────────────────────────────
function PedidosScreen({ pedidos, setPedidos, clienteUser, cupones, setCupones }) {
const [selected, setSelected] = useState(null);
const [reviewData, setReviewData] = useState(null);
const [showCelebration, setShowCelebration] = useState(true);
const misPedidos = clienteUser ? pedidos.filter(p => normalizePhone(p.tel)===normalizePhone(clienteUser.tel)) : [];
const readyPedido = misPedidos.find(p => p.estado === 3);

// Save review when submitted
useEffect(() => {
if (!reviewData) return;
setPedidos(prev => prev.map(p => p.id===reviewData.pedidoId ? {...p, resena:reviewData.resena} : p));
setReviewData(null);
}, [reviewData]);
if (selected !== null) {
const p = misPedidos[selected];
const pct = Math.round((p.estado/(ESTADO_LABELS.length-1))*100);
const base = parseFecha(p.fecha);
const lim = base && p.diasHabiles ? addDiasHabiles(base, p.diasHabiles) : null;
return (
<div style={{ paddingBottom:80 }}>
<Header title={p.id} subtitle="DETALLE DE PEDIDO" back onBack={() => setSelected(null)} />
<div style={{ padding:"20px" }}>
{lim && p.estado < 4 && <div style={{ marginBottom:20 }}><CountdownBadge fecha={p.fecha} diasHabiles={p.diasHabiles} /></div>}
<div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"16px 20px", marginBottom:20 }}>
<div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif", marginBottom:4 }}>MODELO</div>
<div style={{ fontSize:20, fontWeight:"bold", marginBottom:14 }}>{p.modelo}</div>
<div style={{ height:1, background:BORDER, marginBottom:14 }} />
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
<div><div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif", marginBottom:3 }}>FECHA PEDIDO</div><div style={{ fontSize:13, color:"#CCC", fontFamily:"sans-serif" }}>{p.fecha}</div></div>
<div><div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif", marginBottom:3 }}>MONTO</div><div style={{ fontSize:15, color:GOLD, fontWeight:"bold" }}>{p.monto}</div></div>
</div>
{lim && <><div style={{ height:1, background:BORDER, margin:"12px 0" }} /><div style={{ display:"flex", justifyContent:"space-between" }}><div><div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif", marginBottom:3 }}>DÍAS HÁBILES ASIGNADOS</div><div style={{ fontSize:13, color:"#CCC", fontFamily:"sans-serif" }}>{p.diasHabiles} días (Lun-Vie)</div></div><div><div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif", marginBottom:3 }}>FECHA LÍMITE</div><div style={{ fontSize:13, color:GOLD, fontWeight:"bold" }}>{formatFechaCorta(lim)}</div></div></div></>}
{p.nota && <><div style={{ height:1, background:BORDER, margin:"12px 0" }} /><div style={{ fontSize:12, color:"#888", fontFamily:"sans-serif" }}>📍 {p.nota}</div></>}
</div>
<div style={{ background:`${GOLD}11`, border:`1px solid ${GOLD}22`, borderRadius:12, padding:"16px", marginBottom:20 }}>
<div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px" }}>PROGRESO</div>
<div style={{ fontSize:13, color:GOLD, fontWeight:"bold" }}>{pct}%</div>
</div>
<div style={{ background:"#1A1A1A", borderRadius:6, height:8, overflow:"hidden" }}>
<div style={{ background:`linear-gradient(90deg,${GOLD},${GOLD_LIGHT})`, width:`${pct}%`, height:"100%", borderRadius:6, boxShadow:`0 0 8px ${GOLD}66` }} />
</div>
<div style={{ fontSize:12, color:"#AAA", fontFamily:"sans-serif", marginTop:8 }}>Estado: <span style={{ color:GOLD, fontWeight:"bold" }}>{ESTADO_LABELS[p.estado]}</span></div>
</div>
<div style={{ background:"linear-gradient(135deg,#1A0800,#0A0A0A)", border:`1px solid ${GOLD}33`, borderRadius:12, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"flex-start", gap:10 }}>
<span style={{ fontSize:20, flexShrink:0 }}>🔥</span>
<div style={{ fontSize:13, color:"#CCC", fontFamily:"sans-serif", lineHeight:1.6, fontStyle:"italic" }}>{getNeuroMessage(p.estado)}</div>
<div style={{ fontSize:11, color:GOLD, fontFamily:"Georgia, serif", marginTop:6 }}>#ElFuegoNosUne🔥</div>
</div>
{/* Tips while in production */}
{(p.estado === 1 || p.estado === 2) && <TipsSection />}
{/* ¿Qué podés cocinar? - visible en todos los estados */}
<CocinarSection />
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:14 }}>LÍNEA DE TIEMPO</div>
{ESTADO_LABELS.map((est,i) => {
const done=i<=p.estado; const act=i===p.estado;
return (
<div key={i} style={{ display:"flex", gap:16 }}>
<div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:40, flexShrink:0 }}>
<div style={{ width:36,height:36,borderRadius:"50%",background:act?`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`:done?GOLD+"33":DARK3,border:`2px solid ${done?GOLD:BORDER}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:act?`0 0 16px ${GOLD}66`:"none" }}>{ESTADO_ICONS[i]}</div>
{i<ESTADO_LABELS.length-1 && <div style={{ width:2,height:36,background:i<p.estado?`linear-gradient(${GOLD},${GOLD}44)`:BORDER,margin:"2px 0" }} />}
</div>
<div style={{ paddingTop:8, paddingBottom:i<ESTADO_LABELS.length-1?24:16 }}>
<div style={{ fontSize:14,fontWeight:act?"bold":"normal",color:act?GOLD:done?"#CCC":"#444",fontFamily:"sans-serif" }}>{est}</div>
{act && <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:4 }}><div style={{ width:6,height:6,borderRadius:"50%",background:GOLD }} /><span style={{ fontSize:11,color:GOLD,fontFamily:"sans-serif" }}>En curso ahora</span></div>}
{done && !act && <div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif",marginTop:2 }}>✓ Completado</div>}
</div>
</div>
);
})}
{p.fotos && p.fotos.length > 0 && (
<div style={{ marginTop:12 }}>
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:14 }}>📸 FOTOS DE PRODUCCIÓN</div>
{p.fotos.map((f,i) => (
<div key={i} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
<img src={f.src} alt="Progreso" style={{ width:"100%", maxHeight:200, objectFit:"cover", display:"block" }} />
<div style={{ padding:"10px 14px" }}>
{f.nota && <div style={{ fontSize:13, color:"#CCC", fontFamily:"sans-serif", marginBottom:4 }}>{f.nota}</div>}
<div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif" }}>{ESTADO_LABELS[f.etapa]} · {f.fecha} · {f.autor}</div>
</div>
</div>
))}
</div>
)}
{/* Review when delivered */}
{p.estado === 4 && (
<div style={{ marginTop:16 }}>
{p.resena ? (
<div style={{ background:`${GOLD}11`, border:`1px solid ${GOLD}33`, borderRadius:12, padding:"16px", marginBottom:12 }}>
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:8 }}>TU RESENA</div>
<div style={{ display:"flex", gap:2, marginBottom:6 }}>
{[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:20 }}>{s<=p.resena.stars?"*":"-"}</span>)}
</div>
{p.resena.comment && <div style={{ fontSize:13, color:"#CCC", fontFamily:"sans-serif", fontStyle:"italic" }}>"{p.resena.comment}"</div>}
<a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer"
style={{ display:"block", marginTop:10, fontSize:12, color:"#4285F4", fontFamily:"sans-serif" }}>
Tambien dejar resena en Google →
</a>
</div>
) : (
<ReviewFlow
pedido={p}
cupones={cupones}
setCupones={setCupones}
onSave={(resena) => setReviewData({pedidoId: p.id, resena})}
onClose={() => setSelected(null)}
/>
)}
</div>
)}
<div style={{ marginTop:16 }}>
<a href={`https://wa.me/${WA_NUMBER}?text=Hola! Consulta sobre mi pedido ${p.id}`} target="_blank" rel="noreferrer"
style={{ display:"flex",alignItems:"center",gap:12,background:"#0A1F0A",border:"1px solid #1A3A1A",borderRadius:12,padding:"16px 20px",textDecoration:"none" }}>
<span style={{ fontSize:22 }}>💬</span>
<div><div style={{ fontSize:14,fontWeight:"bold",color:"#4CAF50" }}>Consultar por WhatsApp</div><div style={{ fontSize:12,color:"#666",fontFamily:"sans-serif" }}>+595 994 389 932</div></div>
<span style={{ marginLeft:"auto",color:"#4CAF50",fontSize:18 }}>›</span>
</a>
</div>
</div>
</div>
);
}
return (
<div style={{ paddingBottom:80 }}>
<Header title="Mis Pedidos" subtitle="SEGUIMIENTO · #ElFuegoNosUne🔥" />
<div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:12 }}>
{misPedidos.length===0 && (
<div style={{ textAlign:"center", padding:"40px 20px" }}>
<div style={{ fontSize:48, marginBottom:16 }}>🔥</div>
<div style={{ fontSize:18, fontWeight:"bold", marginBottom:8 }}>Todavía no tenés pedidos</div>
<div style={{ fontSize:11, color:GOLD, fontFamily:"Georgia, serif", fontStyle:"italic", marginTop:4 }}>#ElFuegoNosUne🔥</div>
<div style={{ fontSize:13, color:"#666", fontFamily:"sans-serif", marginBottom:24, lineHeight:1.6 }}>
¿Ya elegiste tu parrilla? Explorá el catálogo y contactanos para empezar.
</div>
<a href={`https://wa.me/${WA_NUMBER}?text=Hola! Me gustaria consultar sobre una parrilla`} target="_blank" rel="noreferrer"
style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#0A1F0A", border:"1px solid #1A3A1A", borderRadius:12, padding:"12px 20px", textDecoration:"none", color:"#4CAF50", fontFamily:"sans-serif", fontSize:14, fontWeight:"bold" }}>
💬 Consultar por WhatsApp
</a>
</div>
)}
{misPedidos.map((p,i) => {
const pct=Math.round((p.estado/(ESTADO_LABELS.length-1))*100);
const base = parseFecha(p.fecha);
const lim = base && p.diasHabiles ? addDiasHabiles(base, p.diasHabiles) : null;
const dias = lim ? diasHabilesRestantes(lim) : null;
return (
<button key={p.id} onClick={() => setSelected(i)} style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:"18px",cursor:"pointer",textAlign:"left" }}>
<div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
<div style={{ display:"flex", alignItems:"center", gap:8 }}>
<div style={{ fontSize:13, color:GOLD, fontFamily:"sans-serif", fontWeight:"bold" }}>{p.id}</div>
{p.serie && <span style={{ background:GOLD+"22", border:`1px solid ${GOLD}44`, color:GOLD, fontSize:9, padding:"2px 7px", borderRadius:20, fontFamily:"sans-serif", fontWeight:"bold", letterSpacing:"1px" }}>{p.serie}</span>}
</div>
<div style={{ fontSize:12,color:"#555",fontFamily:"sans-serif" }}>{p.fecha}</div>
</div>
<div style={{ fontSize:16,fontWeight:"bold",marginBottom:6 }}>{p.modelo}</div>
<div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
<div style={{ display:"flex",alignItems:"center",gap:8 }}>
<span>{ESTADO_ICONS[p.estado]}</span>
<span style={{ fontSize:13,color:ESTADO_COLORS[p.estado],fontFamily:"sans-serif" }}>{ESTADO_LABELS[p.estado]}</span>
</div>
{dias !== null && p.estado < 4 && <CountdownBadge fecha={p.fecha} diasHabiles={p.diasHabiles} size="small" />}
</div>
<div style={{ background:BORDER,borderRadius:4,height:4,marginBottom:8,overflow:"hidden" }}>
<div style={{ background:`linear-gradient(90deg,${GOLD},${GOLD_LIGHT})`,width:`${pct}%`,height:"100%",borderRadius:4 }} />
</div>
<div style={{ display:"flex",justifyContent:"space-between" }}>
<div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif" }}>{pct}% completado</div>
<div style={{ fontSize:14,color:GOLD,fontWeight:"bold" }}>{p.monto}</div>
</div>
</button>
);
})}
</div>
</div>
);
}

// ── CLIENT: SOPORTE ───────────────────────────────────────────────────────────
function SoporteScreen({ tickets, setTickets, clienteUser }) {
const [form, setForm] = useState(false);
const [tipo, setTipo] = useState("Mantenimiento");
const [desc, setDesc] = useState("");
const [ok, setOk] = useState(false);
const misTickets = clienteUser ? tickets.filter(t => normalizePhone(t.tel)===normalizePhone(clienteUser.tel)) : [];
const submit = () => {
if (desc.length<10||!clienteUser) return;
const maxTNum = tickets.reduce((max, t) => { const m = t.id?.match(/T-(\d+)/); return m ? Math.max(max, parseInt(m[1])) : max; }, 0);
setTickets([{ id:`T-${String(maxTNum+1).padStart(3,"0")}`, tel:clienteUser.tel, tipo, desc, fecha:new Date().toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"}), estado:"Abierto" }, ...tickets]);
setOk(true);
};
if (ok) return (
<div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",padding:32,textAlign:"center" }}>
<div style={{ fontSize:60,marginBottom:16 }}>✅</div>
<div style={{ fontSize:22,fontWeight:"bold",marginBottom:8 }}>¡Ticket creado!</div>
<div style={{ fontSize:14,color:"#888",fontFamily:"sans-serif",marginBottom:28 }}>Te respondemos en menos de 48hs. #ElFuegoNosUne🔥</div>
<button onClick={() => { setForm(false);setOk(false);setDesc(""); }} style={{ background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,border:"none",color:DARK,padding:"14px 32px",borderRadius:8,fontFamily:"sans-serif",fontWeight:"bold",fontSize:14,cursor:"pointer" }}>VER MIS TICKETS</button>
</div>
);
if (form) return (
<div style={{ paddingBottom:80 }}>
<Header title="Nueva Solicitud" back onBack={() => setForm(false)} />
<div style={{ padding:"20px" }}>
<div style={{ fontSize:11,color:"#888",fontFamily:"sans-serif",letterSpacing:"1px",marginBottom:10 }}>TIPO</div>
<div style={{ display:"flex",gap:8,marginBottom:20 }}>
{["Mantenimiento","Consulta"].map(t => (
<button key={t} onClick={() => setTipo(t)} style={{ flex:1,padding:"10px 4px",borderRadius:8,border:`1px solid ${tipo===t?GOLD:BORDER}`,background:tipo===t?GOLD+"18":CARD,color:tipo===t?GOLD:"#888",fontFamily:"sans-serif",fontSize:12,cursor:"pointer",fontWeight:tipo===t?"bold":"normal" }}>{t}</button>
))}
</div>
<div style={{ fontSize:11,color:"#888",fontFamily:"sans-serif",letterSpacing:"1px",marginBottom:10 }}>DESCRIPCIÓN</div>
<textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describí el problema o consulta..."
style={{ width:"100%",height:140,background:CARD,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"14px",borderRadius:10,fontSize:14,fontFamily:"sans-serif",outline:"none",resize:"none",boxSizing:"border-box",marginBottom:16 }} />
<button onClick={submit} style={{ width:"100%",background:desc.length>10?`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`:BORDER,border:"none",color:desc.length>10?DARK:"#555",padding:"16px",borderRadius:10,fontSize:15,fontFamily:"sans-serif",fontWeight:"bold",letterSpacing:"2px",cursor:desc.length>10?"pointer":"default" }}>ENVIAR SOLICITUD</button>
</div>
</div>
);
const tc = { "Abierto":"#E57373","En proceso":GOLD,"Resuelto":"#4CAF50" };
return (
<div style={{ paddingBottom:80 }}>
<Header title="Soporte" subtitle="RECLAMOS Y MANTENIMIENTO · #ElFuegoNosUne🔥" />
<div style={{ padding:"16px" }}>
<button onClick={() => setForm(true)} style={{ width:"100%",background:`${GOLD}11`,border:`1px solid ${GOLD}55`,borderRadius:12,padding:"18px 20px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",marginBottom:20 }}>
<div style={{ width:44,height:44,background:GOLD+"22",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>➕</div>
<div style={{ textAlign:"left" }}><div style={{ fontSize:16,fontWeight:"bold",color:GOLD }}>Nueva solicitud</div><div style={{ fontSize:12,color:"#888",fontFamily:"sans-serif" }}>Reclamo, mantenimiento o consulta</div></div>
</button>
{misTickets.length===0 && <div style={{ textAlign:"center",padding:"30px 20px",color:"#555",fontFamily:"sans-serif" }}><div style={{ fontSize:36,marginBottom:10 }}>🔧</div><div>No tenés solicitudes activas. #ElFuegoNosUne🔥</div></div>}
{misTickets.map(t => (
<div key={t.id} style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:"16px",marginBottom:10 }}>
<div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
<div style={{ display:"flex",gap:8,alignItems:"center" }}><span style={{ fontSize:12,color:"#666",fontFamily:"sans-serif" }}>{t.id}</span><Tag label={t.tipo} color={tc[t.estado]||GOLD} /></div>
<div style={{ background:tc[t.estado]+"22",border:`1px solid ${tc[t.estado]}44`,color:tc[t.estado],fontSize:11,padding:"3px 10px",borderRadius:20,fontFamily:"sans-serif" }}>{t.estado}</div>
</div>
<div style={{ fontSize:14,color:"#CCC",fontFamily:"sans-serif",marginBottom:6 }}>{t.desc}</div>
<div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif" }}>{t.fecha}</div>
</div>
))}
</div>
</div>
);
}

// ── ADMIN: CLIENTES ───────────────────────────────────────────────────────────
function AdminClientes({ clientes, setClientes }) {
const [view, setView] = useState("list");
const [idx, setIdx] = useState(null);
const emptyForm = { nombre:"", tel:"", dir:"", historial:"" };
const [form, setForm] = useState(emptyForm);
const [error, setError] = useState("");
const [search, setSearch] = useState("");
const openAdd  = () => { setForm(emptyForm); setIdx(null); setError(""); setView("form"); };
const openEdit = (i) => { setForm({ ...clientes[i] }); setIdx(i); setError(""); setView("form"); };
const guardar = () => {
if (!form.nombre.trim()) { setError("El nombre es obligatorio."); return; }
if (normalizePhone(form.tel).length < 7) { setError("Ingresá un número válido."); return; }
// Anti-duplicado: verificar que no exista otro cliente con el mismo teléfono
const telNorm = normalizePhone(form.tel);
const duplicado = clientes.find((c, i) => normalizePhone(c.tel||"") === telNorm && i !== idx);
if (duplicado) { setError("⚠️ Ya existe un cliente con ese número: " + duplicado.nombre.trim()); return; }
const nombreDup = clientes.find((c, i) => c.nombre.trim().toLowerCase() === form.nombre.trim().toLowerCase() && i !== idx);
if (nombreDup) { setError("⚠️ Ya existe un cliente con ese nombre: " + nombreDup.nombre.trim()); return; }
if (idx === null) {
const maxId = clientes.reduce((max, c) => { const m = c.id?.match(/C-(\d+)/); return m ? Math.max(max, parseInt(m[1])) : max; }, 0);
const next = [...clientes, { ...form, id:`C-${String(maxId+1).padStart(3,"0")}`, tel:normalizePhone(form.tel) }];
setClientes(next);
} else {
const next = clientes.map((c,i) => i===idx ? { ...c, ...form, tel:normalizePhone(form.tel) } : c);
setClientes(next);
}
setView("list"); setError("");
};
const eliminar = (i) => {
const next = clientes.filter((_,j)=>j!==i);
setClientes(next);
setView("list");
};
if (view==="form") return (
<div style={{ paddingBottom:80 }}>
<Header title={idx===null?"Nuevo Cliente":"Editar Cliente"} subtitle="GESTIÓN DE CLIENTES" back onBack={() => { setView(idx===null?"list":"detail"); setError(""); }} />
<div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:16 }}>
<div>
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:8 }}>CÓDIGO DE CLIENTE</div>
<input
placeholder="Ej: CLI-001, VIP-GARCIA..."
value={form.codigo || ""}
onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})}
style={{ width:"100%", background:CARD, border:`1px solid ${GOLD}55`, color:GOLD, padding:"14px 16px", borderRadius:8, fontSize:15, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box", fontWeight:"bold", letterSpacing:"2px" }}
/>
<div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif", marginTop:4 }}>Este código identifica al cliente en el sistema</div>
</div>
{[{label:"NOMBRE COMPLETO",key:"nombre",ph:"Ej: Juan Pérez",type:"text"},{label:"TELÉFONO",key:"tel",ph:"09XX XXX XXX",type:"tel"},{label:"DIRECCIÓN",key:"dir",ph:"Calle, ciudad...",type:"text"}].map(f => (
<div key={f.key}>
<div style={{ fontSize:11,color:"#888",fontFamily:"sans-serif",letterSpacing:"1px",marginBottom:8 }}>{f.label}</div>
<input type={f.type} placeholder={f.ph} value={form[f.key]} onChange={e => setForm({...form,[f.key]:e.target.value})}
style={{ width:"100%",background:CARD,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"14px 16px",borderRadius:8,fontSize:15,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box" }} />
</div>
))}
<div>
<div style={{ fontSize:11,color:"#888",fontFamily:"sans-serif",letterSpacing:"1px",marginBottom:8 }}>HISTORIAL / REFERENCIA</div>
<textarea value={form.historial} onChange={e => setForm({...form,historial:e.target.value})} placeholder="Observaciones, preferencias, historial de compras..."
style={{ width:"100%",height:100,background:CARD,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"14px",borderRadius:8,fontSize:14,fontFamily:"sans-serif",outline:"none",resize:"none",boxSizing:"border-box" }} />
</div>
{error && <div style={{ fontSize:12,color:"#E57373",fontFamily:"sans-serif" }}>{error}</div>}
<button onClick={guardar} style={{ width:"100%",background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,border:"none",color:DARK,padding:"16px",borderRadius:10,fontSize:15,fontFamily:"sans-serif",fontWeight:"bold",letterSpacing:"2px",cursor:"pointer" }}>{idx===null?"GUARDAR CLIENTE":"GUARDAR CAMBIOS"}</button>
{idx !== null && <button onClick={() => eliminar(idx)} style={{ width:"100%",background:"none",border:"1px solid #E57373",color:"#E57373",padding:"14px",borderRadius:10,fontSize:14,fontFamily:"sans-serif",cursor:"pointer" }}>🗑 Eliminar cliente</button>}
</div>
</div>
);
if (view==="detail" && idx!==null) {
const c = clientes[idx];
return (
<div style={{ paddingBottom:80 }}>
<Header title={c.nombre} subtitle="DETALLE DE CLIENTE" back onBack={() => setView("list")} />
<div style={{ padding:"20px" }}>
<div style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:"20px",marginBottom:16 }}>
<div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:20 }}>
<div style={{ width:56,height:56,borderRadius:"50%",background:`${GOLD}22`,border:`2px solid ${GOLD}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26 }}>👤</div>
<div><div style={{ fontSize:20,fontWeight:"bold" }}>{c.nombre}</div><div style={{ fontSize:12,color:"#666",fontFamily:"sans-serif",marginTop:2 }}>{c.id}</div></div>
</div>
<div style={{ height:1,background:BORDER,marginBottom:16 }} />
{[{icon:"📞",label:"Teléfono",val:c.tel},{icon:"📍",label:"Dirección",val:c.dir||"--"}].map(r => (
<div key={r.label} style={{ display:"flex",gap:12,alignItems:"flex-start",marginBottom:14 }}>
<span style={{ fontSize:18,marginTop:2 }}>{r.icon}</span>
<div><div style={{ fontSize:10,color:"#555",fontFamily:"sans-serif",marginBottom:2 }}>{r.label.toUpperCase()}</div><div style={{ fontSize:14,color:"#CCC",fontFamily:"sans-serif" }}>{r.val}</div></div>
</div>
))}
{c.historial && <><div style={{ height:1,background:BORDER,marginBottom:14 }} /><div style={{ fontSize:10,color:"#555",fontFamily:"sans-serif",marginBottom:6 }}>HISTORIAL</div><div style={{ fontSize:13,color:"#AAA",fontFamily:"sans-serif",lineHeight:1.6 }}>{c.historial}</div></>}
</div>
<button onClick={() => openEdit(idx)} style={{ width:"100%",background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,border:"none",color:DARK,padding:"14px",borderRadius:10,fontSize:14,fontFamily:"sans-serif",fontWeight:"bold",cursor:"pointer",marginBottom:10 }}>✏️ Editar cliente</button>
<a href={`https://wa.me/595${c.tel.replace(/^0/,"")}`} target="_blank" rel="noreferrer"
style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#0A1F0A",border:"1px solid #1A3A1A",borderRadius:10,padding:"14px",textDecoration:"none",color:"#4CAF50",fontFamily:"sans-serif",fontSize:14 }}>
💬 Contactar por WhatsApp
</a>
</div>
</div>
);
}
return (
<div style={{ paddingBottom:80 }}>
<div style={{ padding:"20px 20px 16px",borderBottom:`1px solid ${BORDER}` }}>
<div style={{ fontSize:10,color:GOLD,fontFamily:"sans-serif",letterSpacing:"3px",marginBottom:4 }}>PANEL DE GESTIÓN</div>
<div style={{ fontSize:22,fontWeight:"bold" }}>Clientes</div>
<div style={{ fontSize:10, color:GOLD_DARK, fontFamily:"Georgia, serif", fontStyle:"italic", marginTop:2 }}>#ElFuegoNosUne🔥</div>
</div>
<div style={{ padding:"16px 16px 0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4 }}>
<div style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"14px",textAlign:"center" }}><div style={{ fontSize:28,fontWeight:"bold",color:GOLD }}>{clientes.length}</div><div style={{ fontSize:11,color:"#666",fontFamily:"sans-serif",marginTop:2 }}>Total</div></div>
<div style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"14px",textAlign:"center" }}><div style={{ fontSize:28,fontWeight:"bold",color:"#4CAF50" }}>{clientes.filter(c=>c.historial).length}</div><div style={{ fontSize:11,color:"#666",fontFamily:"sans-serif",marginTop:2 }}>Con historial</div></div>
</div>
<div style={{ padding:"16px",display:"flex",flexDirection:"column",gap:10 }}>
<button onClick={openAdd} style={{ background:`${GOLD}11`,border:`1px solid ${GOLD}55`,borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",gap:14,cursor:"pointer" }}>
<div style={{ width:44,height:44,background:GOLD+"22",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>➕</div>
<div style={{ textAlign:"left" }}><div style={{ fontSize:16,fontWeight:"bold",color:GOLD }}>Agregar cliente</div><div style={{ fontSize:12,color:"#888",fontFamily:"sans-serif" }}>Nombre, teléfono, dirección e historial</div></div>
</button>
<div style={{ fontSize:11,color:GOLD,fontFamily:"sans-serif",letterSpacing:"2px",marginTop:4,marginBottom:2 }}>LISTA DE CLIENTES</div>
{clientes.map((c,i) => (
<button key={c.id} onClick={() => { setIdx(i); setView("detail"); }} style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:"16px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14 }}>
<div style={{ width:44,height:44,borderRadius:"50%",background:`${GOLD}18`,border:`1px solid ${GOLD}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>👤</div>
<div style={{ flex:1 }}>
<div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
<div style={{ fontSize:15, fontWeight:"bold", color:"#F5EDD6" }}>{c.nombre}</div>
{c.codigo && <span style={{ background:GOLD+"22", border:`1px solid ${GOLD}55`, color:GOLD, fontSize:9, padding:"2px 7px", borderRadius:20, fontFamily:"sans-serif", fontWeight:"bold", letterSpacing:"1px" }}>{c.codigo}</span>}
</div>
<div style={{ fontSize:12,color:GOLD,fontFamily:"sans-serif",marginBottom:2 }}>📞 {c.tel}</div>
{c.dir && <div style={{ fontSize:12,color:"#666",fontFamily:"sans-serif" }}>📍 {c.dir}</div>}
</div>
{c.historial && <span style={{ fontSize:16 }}>📋</span>}
<span style={{ color:GOLD,fontSize:18 }}>›</span>
</button>
))}
</div>
</div>
);
}

// ── ADMIN: CATÁLOGO ───────────────────────────────────────────────────────────
function AdminCatalog({ productos, setProductos }) {
const [view, setView] = useState("list");
const [idx, setIdx] = useState(null);
const emptyForm = { nombre:"", precio:"", desc:"", specs:[], colores:[], foto:null, fotos:[], tag:"", emoji:"🔥" };
const [form, setForm] = useState(emptyForm);
const [newSpec, setNewSpec] = useState("");
const COLORES_OPT = ["Grill","Negro"];
const openEdit = (i) => { setForm({ ...productos[i], specs:[...(productos[i].specs||[])], colores:[...(productos[i].colores||[])], fotos:[...(productos[i].fotos||( productos[i].foto ? [productos[i].foto] : []))] }); setIdx(i); setView("form"); };
const openAdd  = () => { setForm(emptyForm); setIdx(null); setView("form"); };
const toggleColor = (c) => setForm(f => ({ ...f, colores: f.colores.includes(c)?f.colores.filter(x=>x!==c):[...f.colores,c] }));
const addSpec = () => { if (newSpec.trim()) { setForm(f=>({...f,specs:[...f.specs,newSpec.trim()]})); setNewSpec(""); } };
const removeSpec = (i) => setForm(f=>({...f,specs:f.specs.filter((_,j)=>j!==i)}));
const guardar = () => {
if (!form.nombre.trim()) return;
const saveData = { ...form, foto: (form.fotos||[])[0] || form.foto || null, fotos: form.fotos || (form.foto ? [form.foto] : []) };
if (idx===null) setProductos([...productos,{...saveData,id:Date.now()}]);
else setProductos(productos.map((p,i)=>i===idx?{...p,...saveData}:p));
setView("list");
};
if (view==="form") return (
<div style={{ paddingBottom:80 }}>
<Header title={idx===null?"Nuevo Producto":"Editar Producto"} subtitle="CATÁLOGO" back onBack={() => setView("list")} />
<div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:18 }}>
<div>
<div style={{ fontSize:11,color:"#888",fontFamily:"sans-serif",letterSpacing:"1px",marginBottom:10 }}>FOTOS DEL PRODUCTO <span style={{ color:"#666",fontSize:10 }}>(mín. 1, máx. 6)</span></div>
{(form.fotos||[]).length > 0
? <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:10 }}>
{(form.fotos||[]).map((foto,fi) => (
<div key={fi} style={{ position:"relative",borderRadius:12,overflow:"hidden",border:`1px solid ${fi===0?GOLD:BORDER}` }}>
<img src={foto} alt={`producto-${fi+1}`} style={{ width:"100%",height:150,objectFit:"cover",display:"block" }} />
<div style={{ position:"absolute",top:8,left:8,background:fi===0?"#D4A017":"#000000AA",color:fi===0?"#000":"#FFF",borderRadius:20,padding:"2px 10px",fontSize:11,fontFamily:"sans-serif",fontWeight:"bold" }}>{fi===0?"PRINCIPAL":`Foto ${fi+1}`}</div>
<div style={{ position:"absolute",top:8,right:8,display:"flex",gap:6 }}>
{fi > 0 && <button onClick={() => setForm(f=>{const nf=[...f.fotos];[nf[fi-1],nf[fi]]=[nf[fi],nf[fi-1]];return{...f,fotos:nf,foto:nf[0]};})} style={{ background:"#000000AA",border:"none",color:"#FFF",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>⬆</button>}
{fi < (form.fotos||[]).length-1 && <button onClick={() => setForm(f=>{const nf=[...f.fotos];[nf[fi],nf[fi+1]]=[nf[fi+1],nf[fi]];return{...f,fotos:nf,foto:nf[0]};})} style={{ background:"#000000AA",border:"none",color:"#FFF",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>⬇</button>}
<button onClick={() => setForm(f=>{const nf=f.fotos.filter((_,j)=>j!==fi);return{...f,fotos:nf,foto:nf[0]||null};})} style={{ background:"#000000AA",border:"none",color:"#FF5252",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
</div>
</div>
))}
</div>
: <div style={{ height:120,background:DARK3,border:`1px dashed ${BORDER}`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,fontSize:40 }}>{form.emoji}</div>
}
{(form.fotos||[]).length < 6 && <PhotoUploadButton multiple onPhoto={(srcs) => setForm(f=>{const nf=[...(f.fotos||[]),...(Array.isArray(srcs)?srcs:[srcs])].slice(0,6);return{...f,fotos:nf,foto:nf[0]};})} label={`📷 ${(form.fotos||[]).length===0?"Subir fotos del producto":"Agregar más fotos"} (${(form.fotos||[]).length}/6)`} style={{ width:"100%",justifyContent:"center",boxSizing:"border-box" }} />}
</div>
{[{label:"NOMBRE",key:"nombre",ph:"Ej: El Patrón 900"},{label:"PRECIO",key:"precio",ph:"Ej: Gs. 4.200.000"},{label:"ETIQUETA",key:"tag",ph:"Ej: MÁS VENDIDO"}].map(f => (
<div key={f.key}>
<div style={{ fontSize:11,color:"#888",fontFamily:"sans-serif",letterSpacing:"1px",marginBottom:8 }}>{f.label}</div>
<input placeholder={f.ph} value={form[f.key]} onChange={e=>setForm(fm=>({...fm,[f.key]:e.target.value}))}
style={{ width:"100%",background:CARD,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"14px 16px",borderRadius:8,fontSize:15,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box" }} />
</div>
))}
<div>
<div style={{ fontSize:11,color:"#888",fontFamily:"sans-serif",letterSpacing:"1px",marginBottom:8 }}>DESCRIPCIÓN</div>
<textarea value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Descripción del producto..."
style={{ width:"100%",height:90,background:CARD,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"14px",borderRadius:8,fontSize:14,fontFamily:"sans-serif",outline:"none",resize:"none",boxSizing:"border-box" }} />
</div>
<div>
<div style={{ fontSize:11,color:"#888",fontFamily:"sans-serif",letterSpacing:"1px",marginBottom:10 }}>COLORES DISPONIBLES</div>
<div style={{ display:"flex",gap:10 }}>
{COLORES_OPT.map(c => (
<button key={c} onClick={() => toggleColor(c)} style={{ flex:1,padding:"14px",borderRadius:10,border:`2px solid ${form.colores.includes(c)?GOLD:BORDER}`,background:form.colores.includes(c)?GOLD+"18":CARD,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
<div style={{ width:32,height:32,borderRadius:"50%",background:c==="Negro"?"#1a1a1a":"#C0C0C0",border:`2px solid ${c==="Negro"?"#444":"#888"}` }} />
<span style={{ fontSize:13,color:form.colores.includes(c)?GOLD:"#888",fontFamily:"sans-serif",fontWeight:form.colores.includes(c)?"bold":"normal" }}>{c}</span>
</button>
))}
</div>
</div>
<div>
<div style={{ fontSize:11,color:"#888",fontFamily:"sans-serif",letterSpacing:"1px",marginBottom:10 }}>ESPECIFICACIONES</div>
<div style={{ display:"flex",gap:8,marginBottom:10 }}>
<input placeholder="Agregar especificación..." value={newSpec} onChange={e=>setNewSpec(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSpec()}
style={{ flex:1,background:CARD,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"12px 14px",borderRadius:8,fontSize:14,fontFamily:"sans-serif",outline:"none" }} />
<button onClick={addSpec} style={{ background:GOLD,border:"none",color:DARK,padding:"12px 16px",borderRadius:8,fontFamily:"sans-serif",fontWeight:"bold",cursor:"pointer",fontSize:16 }}>+</button>
</div>
<div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
{form.specs.map((s,i) => (
<div key={i} style={{ background:DARK3,border:`1px solid ${BORDER}`,borderRadius:20,padding:"6px 12px",display:"flex",alignItems:"center",gap:8 }}>
<span style={{ fontSize:13,color:"#CCC",fontFamily:"sans-serif" }}>✓ {s}</span>
<button onClick={() => removeSpec(i)} style={{ background:"none",border:"none",color:"#E57373",cursor:"pointer",fontSize:14 }}>✕</button>
</div>
))}
</div>
</div>
<button onClick={guardar} style={{ width:"100%",background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,border:"none",color:DARK,padding:"16px",borderRadius:10,fontSize:15,fontFamily:"sans-serif",fontWeight:"bold",letterSpacing:"2px",cursor:"pointer" }}>
{idx===null?"AGREGAR PRODUCTO":"GUARDAR CAMBIOS"}
</button>
</div>
</div>
);
return (
<div style={{ paddingBottom:80 }}>
<div style={{ padding:"20px 20px 16px",borderBottom:`1px solid ${BORDER}` }}>
<div style={{ fontSize:10,color:GOLD,fontFamily:"sans-serif",letterSpacing:"3px",marginBottom:4 }}>PANEL DE GESTIÓN</div>
<div style={{ fontSize:22,fontWeight:"bold" }}>Catálogo</div>
<div style={{ fontSize:10, color:GOLD_DARK, fontFamily:"Georgia, serif", fontStyle:"italic", marginTop:2 }}>#ElFuegoNosUne🔥</div>
</div>
<div style={{ padding:"16px",display:"flex",flexDirection:"column",gap:10 }}>
<button onClick={openAdd} style={{ background:`${GOLD}11`,border:`1px solid ${GOLD}55`,borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",gap:14,cursor:"pointer" }}>
<div style={{ width:44,height:44,background:GOLD+"22",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>➕</div>
<div style={{ textAlign:"left" }}><div style={{ fontSize:16,fontWeight:"bold",color:GOLD }}>Agregar producto</div><div style={{ fontSize:12,color:"#888",fontFamily:"sans-serif" }}>Con foto, color y especificaciones</div></div>
</button>
{productos.map((p,i) => (
<div key={p.id} style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,overflow:"hidden" }}>
{(p.fotos && p.fotos.length > 0 ? p.fotos[0] : p.foto) && <div style={{ position:"relative" }}><img src={p.fotos && p.fotos.length > 0 ? p.fotos[0] : p.foto} alt={p.nombre} style={{ width:"100%",height:110,objectFit:"cover",display:"block",borderBottom:`1px solid ${BORDER}` }} />{(p.fotos||[]).length > 1 && <div style={{ position:"absolute",bottom:6,right:8,background:"#000000AA",borderRadius:12,padding:"2px 8px",fontSize:10,color:"#FFF",fontFamily:"sans-serif" }}>\U0001f4f7 {(p.fotos||[]).length} fotos</div>}</div>}
<div style={{ padding:"14px 16px",display:"flex",alignItems:"center",gap:14 }}>
{!(p.fotos && p.fotos.length > 0 ? p.fotos[0] : p.foto) && <div style={{ width:48,height:48,background:"#1A1200",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0 }}>{p.emoji}</div>}
<div style={{ flex:1 }}>
<div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><div style={{ fontSize:15,fontWeight:"bold" }}>{p.nombre}</div><Tag label={p.tag} /></div>
<div style={{ fontSize:14,color:GOLD,fontFamily:"sans-serif",marginBottom:4 }}>{p.precio}</div>
<div style={{ display:"flex",gap:6 }}>{(p.colores||[]).map(c => <span key={c} style={{ fontSize:10,color:"#888",fontFamily:"sans-serif",background:DARK3,border:`1px solid ${BORDER}`,padding:"2px 8px",borderRadius:20 }}>{c}</span>)}</div>
</div>
<button onClick={() => openEdit(i)} style={{ background:GOLD+"22",border:`1px solid ${GOLD}44`,color:GOLD,padding:"8px 14px",borderRadius:8,fontFamily:"sans-serif",fontSize:12,cursor:"pointer",flexShrink:0 }}>✏️ Editar</button>
</div>
</div>
))}
</div>
</div>
);
}

// ── ADMIN: PEDIDOS ────────────────────────────────────────────────────────────
function AdminOrders({ pedidos, setPedidos, clientes, adminUser, productos }) {
const [selected, setSelected] = useState(null);
const [nota, setNota] = useState("");
const [view, setView] = useState("list"); // list | new
const [filterStatus, setFilterStatus] = useState("all");
const [newForm, setNewForm] = useState({
clienteId:"", modelo:"", monto:"", nota:"", serie:"", diasHabiles:10
});
const tc = { 0:"#888",1:GOLD,2:GOLD_LIGHT,3:"#4CAF50",4:"#4CAF50" };
const getNombre = (tel) => { const c=clientes.find(x=>normalizePhone(x.tel)===normalizePhone(tel)); return c?c.nombre:tel; };

const crearPedido = () => {
const cliente = newForm.clienteId ? clientes.find(c => (c.tel||"") === newForm.clienteId) : null;
if (!cliente || !newForm.modelo || !newForm.monto) return;
const fecha = new Date().toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"});
const year = new Date().getFullYear();
const maxNum = pedidos.reduce((max, p) => { const m = p.id?.match(/DP-\d+-(\d+)/); return m ? Math.max(max, parseInt(m[1])) : max; }, 0);
const num = String(maxNum + 1).padStart(3, "0");
const nuevo = {
id: `DP-${year}-${num}`,
serie: newForm.serie.trim().toUpperCase() || `PED-${year}-${num}`,
tel: cliente.tel,
modelo: newForm.modelo,
fecha,
estado: 0,
monto: newForm.monto,
nota: newForm.nota,
fotos: [],
diasHabiles: newForm.diasHabiles
};
setPedidos([nuevo, ...pedidos]);
setNewForm({ clienteId:"", modelo:"", monto:"", nota:"", serie:"", diasHabiles:10 });
setView("list");
};

// ── NEW ORDER FORM ──
if (view === "new") {
const clienteSeleccionado = newForm.clienteId ? clientes.find(c => normalizePhone(c.tel||"") === newForm.clienteId) : null;
const formOk = newForm.clienteId && newForm.modelo && newForm.monto;
return (
<div style={{ paddingBottom:80 }}>
<Header title="Nuevo Pedido" subtitle="CREAR PEDIDO" back onBack={() => setView("list")} />
<div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:16 }}>

      {/* Select client */}
      <div>
        <div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:10 }}>CLIENTE *</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:200, overflowY:"auto" }}>
          {clientes.map(c => (
            <button key={c.tel||c.id} onClick={() => setNewForm({...newForm, clienteId: c.tel||""})}
              style={{ background: (newForm.clienteId && c.tel === newForm.clienteId) ? GOLD+"22" : CARD, border:`1px solid ${(newForm.clienteId && c.tel === newForm.clienteId) ? GOLD : BORDER}`, borderRadius:10, padding:"12px 16px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:GOLD+"18", border:`1px solid ${GOLD}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>👤</div>
              <div>
                <div style={{ fontSize:14, fontWeight:"bold", color: (newForm.clienteId && c.tel === newForm.clienteId) ? GOLD : "#F0F0F0" }}>{c.nombre}</div>
                <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif" }}>{c.tel}{c.codigo ? ` · ${c.codigo}` : ""}</div>
              </div>
              {(newForm.clienteId && c.tel === newForm.clienteId) && <span style={{ marginLeft:"auto", color:GOLD, fontSize:18 }}>✓</span>}
            </button>
          ))}
          {clientes.length === 0 && <div style={{ color:"#555", fontFamily:"sans-serif", fontSize:13, padding:"16px", textAlign:"center" }}>No hay clientes registrados aún</div>}
        </div>
      </div>

      {/* Select model */}
      <div>
        <div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:10 }}>MODELO / PRODUCTO *</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {productos.map(p => (
            <button key={p.id} onClick={() => setNewForm({...newForm, modelo: p.nombre})}
              style={{ background: newForm.modelo===p.nombre ? GOLD+"22" : CARD, border:`1px solid ${newForm.modelo===p.nombre ? GOLD : BORDER}`, borderRadius:10, padding:"12px 16px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:24 }}>{p.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:"bold", color: newForm.modelo===p.nombre ? GOLD : "#F0F0F0" }}>{p.nombre}</div>
                <div style={{ fontSize:12, color:GOLD, fontFamily:"sans-serif" }}>{p.precio}</div>
              </div>
              {newForm.modelo===p.nombre && <span style={{ color:GOLD, fontSize:18 }}>✓</span>}
            </button>
          ))}
          {/* Custom model option */}
          <div>
            <input
              placeholder="O escribí un modelo personalizado..."
              value={productos.some(p=>p.nombre===newForm.modelo) ? "" : newForm.modelo}
              onChange={e => setNewForm({...newForm, modelo: e.target.value})}
              style={{ width:"100%", background:CARD, border:`1px solid ${BORDER}`, color:"#F0F0F0", padding:"12px 14px", borderRadius:10, fontSize:14, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box" }}
            />
          </div>
        </div>
      </div>

      {/* Monto */}
      <div>
        <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:8 }}>MONTO *</div>
        <input
          placeholder="Ej: Gs. 4.200.000"
          value={newForm.monto}
          onChange={e => setNewForm({...newForm, monto: e.target.value})}
          style={{ width:"100%", background:CARD, border:`1px solid ${BORDER}`, color:"#F0F0F0", padding:"14px 16px", borderRadius:8, fontSize:15, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box" }}
        />
      </div>

      {/* Serie */}
      <div>
        <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:8 }}>N° DE SERIE (opcional)</div>
        <input
          placeholder="Ej: PED-2026-004 (se genera automático)"
          value={newForm.serie}
          onChange={e => setNewForm({...newForm, serie: e.target.value.toUpperCase()})}
          style={{ width:"100%", background:CARD, border:`1px solid ${GOLD}44`, color:GOLD, padding:"14px 16px", borderRadius:8, fontSize:15, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box", fontWeight:"bold", letterSpacing:"1.5px" }}
        />
      </div>

      {/* Días hábiles */}
      <div>
        <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:10 }}>DÍAS HÁBILES DE ENTREGA</div>
        <div style={{ display:"flex", gap:8 }}>
          {[5,8,10,15,20].map(n => (
            <button key={n} onClick={() => setNewForm({...newForm, diasHabiles:n})}
              style={{ flex:1, padding:"10px 4px", borderRadius:8, border:`1px solid ${newForm.diasHabiles===n?GOLD:BORDER}`, background:newForm.diasHabiles===n?GOLD+"18":CARD, color:newForm.diasHabiles===n?GOLD:"#888", fontFamily:"sans-serif", fontSize:13, cursor:"pointer", fontWeight:newForm.diasHabiles===n?"bold":"normal" }}>
              {n}d
            </button>
          ))}
        </div>
      </div>

      {/* Nota */}
      <div>
        <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:8 }}>NOTA / OBSERVACIÓN</div>
        <input
          placeholder="Ej: Entrega a domicilio, retira en taller..."
          value={newForm.nota}
          onChange={e => setNewForm({...newForm, nota: e.target.value})}
          style={{ width:"100%", background:CARD, border:`1px solid ${BORDER}`, color:"#F0F0F0", padding:"14px 16px", borderRadius:8, fontSize:14, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box" }}
        />
      </div>

      {!formOk && <div style={{ fontSize:12, color:"#E57373", fontFamily:"sans-serif", textAlign:"center" }}>* Seleccioná cliente, modelo y monto para continuar</div>}

      <button onClick={crearPedido} disabled={!formOk}
        style={{ width:"100%", background:formOk?`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`:BORDER, border:"none", color:formOk?DARK:"#555", padding:"16px", borderRadius:10, fontSize:15, fontFamily:"sans-serif", fontWeight:"bold", letterSpacing:"2px", cursor:formOk?"pointer":"default" }}>
        ✅ CREAR PEDIDO
      </button>
    </div>
  </div>
);

}

if (selected !== null) {
const p = pedidos[selected];
const pct = Math.round((p.estado/(ESTADO_LABELS.length-1))*100);
const cliente = clientes.find(x=>normalizePhone(x.tel)===normalizePhone(p.tel));
const addFoto = (src) => {
const f = { src, nota:nota.trim(), etapa:p.estado, fecha:new Date().toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"}), autor:adminUser?.nombre||"Admin" };
setPedidos(pedidos.map((x,i)=>i===selected?{...x,fotos:[...(x.fotos||[]),f]}:x));
setNota("");
};
const setDiasHabiles = (val) => {
const num = parseInt(val);
if (isNaN(num)||num<1) return;
setPedidos(pedidos.map((x,i)=>i===selected?{...x,diasHabiles:num}:x));
};
const base = parseFecha(p.fecha);
const lim  = base && p.diasHabiles ? addDiasHabiles(base, p.diasHabiles) : null;
return (
<div style={{ paddingBottom:80 }}>
<Header title={p.id} subtitle="GESTIÓN DE PEDIDO" back onBack={() => { setSelected(null); setNota(""); }} />
<div style={{ padding:"20px" }}>
{lim && p.estado < 4 && <div style={{ marginBottom:20 }}><CountdownBadge fecha={p.fecha} diasHabiles={p.diasHabiles} /></div>}
<div style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:"16px 20px",marginBottom:20 }}>
{p.serie && (
<div style={{ background:GOLD+"15", border:`1px solid ${GOLD}44`, borderRadius:8, padding:"8px 14px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px" }}>N° DE SERIE</div>
<div style={{ fontSize:16, color:GOLD, fontWeight:"bold", fontFamily:"sans-serif", letterSpacing:"2px" }}>{p.serie}</div>
</div>
)}
<div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif",marginBottom:6 }}>CLIENTE</div>
<div style={{ fontSize:18,fontWeight:"bold",marginBottom:4 }}>{cliente?cliente.nombre:p.tel}</div>
<div style={{ fontSize:13,color:GOLD,fontFamily:"sans-serif",marginBottom:cliente?.dir?4:0 }}>{p.tel}</div>
{cliente?.dir && <div style={{ fontSize:12,color:"#888",fontFamily:"sans-serif",marginBottom:12 }}>📍 {cliente.dir}</div>}
<div style={{ height:1,background:BORDER,margin:"12px 0" }} />
<div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
<div><div style={{ fontSize:10,color:"#555",fontFamily:"sans-serif",marginBottom:3 }}>MODELO</div><div style={{ fontSize:13,color:"#CCC",fontFamily:"sans-serif" }}>{p.modelo}</div></div>
<div><div style={{ fontSize:10,color:"#555",fontFamily:"sans-serif",marginBottom:3 }}>MONTO</div><div style={{ fontSize:15,color:GOLD,fontWeight:"bold" }}>{p.monto}</div></div>
</div>
</div>

      <div style={{ background:CARD, border:`1px solid ${GOLD}44`, borderRadius:12, padding:"16px", marginBottom:16 }}>
        <div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:10 }}>📋 NÚMERO DE SERIE</div>
        <input
          placeholder="Ej: PED-2026-001"
          value={p.serie || ""}
          onChange={e => setPedidos(pedidos.map((x,i) => i===selected ? {...x, serie:e.target.value.toUpperCase()} : x))}
          style={{ width:"100%", background:DARK3, border:`1px solid ${GOLD}55`, color:GOLD, padding:"12px 14px", borderRadius:8, fontSize:15, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box", fontWeight:"bold", letterSpacing:"2px" }}
        />
        <div style={{ fontSize:10, color:"#555", fontFamily:"sans-serif", marginTop:4 }}>Visible para el cliente · Se guarda automáticamente</div>
      </div>
      <div style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:"16px",marginBottom:20 }}>
        <div style={{ fontSize:11,color:GOLD,fontFamily:"sans-serif",letterSpacing:"2px",marginBottom:12 }}>⏱ DÍAS HÁBILES DE ENTREGA</div>
        <div style={{ fontSize:12,color:"#888",fontFamily:"sans-serif",marginBottom:10 }}>Desde fecha del pedido · Solo Lunes a Viernes</div>
        <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:12 }}>
          <button onClick={() => setDiasHabiles((p.diasHabiles||10)-1)} style={{ width:40,height:40,background:DARK3,border:`1px solid ${BORDER}`,color:"#F0F0F0",borderRadius:8,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>−</button>
          <div style={{ flex:1,textAlign:"center" }}>
            <div style={{ fontSize:32,fontWeight:"bold",color:GOLD }}>{p.diasHabiles||10}</div>
            <div style={{ fontSize:11,color:"#888",fontFamily:"sans-serif" }}>días hábiles</div>
          </div>
          <button onClick={() => setDiasHabiles((p.diasHabiles||10)+1)} style={{ width:40,height:40,background:DARK3,border:`1px solid ${BORDER}`,color:"#F0F0F0",borderRadius:8,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>+</button>
        </div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {[5,8,10,15,20].map(n => (
            <button key={n} onClick={() => setDiasHabiles(n)} style={{ flex:1,minWidth:50,padding:"8px 4px",borderRadius:8,border:`1px solid ${(p.diasHabiles||10)===n?GOLD:BORDER}`,background:(p.diasHabiles||10)===n?GOLD+"18":DARK3,color:(p.diasHabiles||10)===n?GOLD:"#888",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",fontWeight:(p.diasHabiles||10)===n?"bold":"normal" }}>{n}d</button>
          ))}
        </div>
        {lim && <div style={{ marginTop:12,padding:"10px 14px",background:DARK3,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div style={{ fontSize:12,color:"#888",fontFamily:"sans-serif" }}>Fecha límite calculada</div>
          <div style={{ fontSize:14,color:GOLD,fontWeight:"bold",fontFamily:"sans-serif" }}>{formatFechaCorta(lim)}</div>
        </div>}
      </div>

      <div style={{ background:`${GOLD}11`,border:`1px solid ${GOLD}22`,borderRadius:12,padding:"16px",marginBottom:20 }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
          <div style={{ fontSize:11,color:GOLD,fontFamily:"sans-serif",letterSpacing:"2px" }}>PROGRESO</div>
          <div style={{ fontSize:13,color:GOLD,fontWeight:"bold" }}>{pct}%</div>
        </div>
        <div style={{ background:"#1A1A1A",borderRadius:6,height:8,overflow:"hidden" }}>
          <div style={{ background:`linear-gradient(90deg,${GOLD},${GOLD_LIGHT})`,width:`${pct}%`,height:"100%",borderRadius:6,boxShadow:`0 0 8px ${GOLD}66` }} />
        </div>
      </div>

      <div style={{ fontSize:11,color:GOLD,fontFamily:"sans-serif",letterSpacing:"2px",marginBottom:12 }}>CAMBIAR ESTADO</div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:24 }}>
        {ESTADO_LABELS.map((est,i) => {
          const isCurrentState = p.estado===i;
          const waMsg = `Hola ${cliente?.nombre?.split(" ")[0]||""} 👋! Somos de *Doctor Parrilla* 🔥\n\nTe informamos que tu parrilla *${p.modelo}* (Pedido ${p.id}) ahora está en: *${est}*\n\n${i===0?"Ya recibimos tu pedido. Nuestro equipo ya está planificando cada detalle.":i===1?"Manos expertas están forjando tu parrilla ahora mismo. ¡Cada soldadura es perfección!":i===2?"Tu parrilla está en control de calidad. Revisamos cada detalle para que sea perfecta. ¡Ya falta poco!":i===3?"¡Tu parrilla está lista para entrega! 🎉 Coordinaremos la entrega pronto. ¿Ya compraste la carne para el estreno?":"¡Tu parrilla ya fue entregada! 🎉 Disfrutala. Nos encantaría que nos dejes una reseña en Google."}\n\n#ElFuegoNosUne🔥 Gracias por confiar en Dr. Parrilla`;
          return (
          <button key={i} onClick={() => {
            const prevEstado = p.estado;
            setPedidos(pedidos.map((x,j)=>j===selected?{...x,estado:i}:x));
            if (i !== prevEstado) {
              const telClean = (p.tel||"").replace(/\D/g,"").replace(/^0/,"");
              window.open(`https://wa.me/595${telClean}?text=${encodeURIComponent(waMsg)}`, "_blank");
            }
          }}
            style={{ padding:"12px 16px",borderRadius:10,border:`1px solid ${isCurrentState?GOLD:BORDER}`,background:isCurrentState?GOLD+"18":CARD,cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left" }}>
            <span style={{ fontSize:18 }}>{ESTADO_ICONS[i]}</span>
            <span style={{ fontSize:14,color:isCurrentState?GOLD:"#AAA",fontFamily:"sans-serif",fontWeight:isCurrentState?"bold":"normal",flex:1 }}>{est}</span>
            {isCurrentState && <span style={{ fontSize:12,color:GOLD }}>✓ Actual</span>}
            {!isCurrentState && <span style={{ fontSize:10,color:"#4CAF50",fontFamily:"sans-serif" }}>💬 WhatsApp</span>}
          </button>
          );
        })}
      </div>

      <div style={{ fontSize:11,color:GOLD,fontFamily:"sans-serif",letterSpacing:"2px",marginBottom:12 }}>📸 FOTOS DE PRODUCCIÓN</div>
      <div style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:"16px",marginBottom:20 }}>
        <div style={{ fontSize:12,color:"#888",fontFamily:"sans-serif",marginBottom:8 }}>Nota para esta foto (opcional)</div>
        <input placeholder="Ej: Soldadura terminada..." value={nota} onChange={e=>setNota(e.target.value)}
          style={{ width:"100%",background:DARK3,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"12px 14px",borderRadius:8,fontSize:14,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box",marginBottom:12 }} />
        <PhotoUploadButton onPhoto={addFoto} label="📷 Subir foto del progreso" style={{ width:"100%",justifyContent:"center",boxSizing:"border-box" }} />
        {p.fotos?.length > 0 && (
          <div style={{ marginTop:14,display:"flex",flexDirection:"column",gap:10 }}>
            {p.fotos.map((f,i) => (
              <div key={i} style={{ borderRadius:10,overflow:"hidden",border:`1px solid ${BORDER}` }}>
                <img src={f.src} alt="Progreso" style={{ width:"100%",maxHeight:180,objectFit:"cover",display:"block" }} />
                <div style={{ padding:"8px 12px",background:DARK3 }}>
                  {f.nota && <div style={{ fontSize:13,color:"#CCC",fontFamily:"sans-serif",marginBottom:4 }}>{f.nota}</div>}
                  <div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif" }}>{ESTADO_LABELS[f.etapa]} · {f.fecha} · {f.autor}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <a href={`https://wa.me/595${p.tel.replace(/\D/g,"").replace(/^0/,"")}?text=Hola ${cliente?.nombre?.split(" ")[0]||""}! Tu pedido ${p.id} está en: ${ESTADO_LABELS[p.estado]}`} target="_blank" rel="noreferrer"
        style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#0A1F0A",border:"1px solid #1A3A1A",borderRadius:10,padding:"14px",textDecoration:"none",color:"#4CAF50",fontFamily:"sans-serif",fontSize:14 }}>
        💬 Notificar al cliente por WhatsApp
      </a>
      {p.estado === 4 && (
        <button
          onClick={() => {
            if (window.confirm(`¿Eliminar el pedido ${p.id} de forma permanente? Esta acción no se puede deshacer.`)) {
              const next = pedidos.filter((_,j) => j !== selected);
              setPedidos(next);
              setSelected(null);
              setNota("");
            }
          }}
          style={{ width:"100%", marginTop:10, background:"#180000", border:"1px solid #C0392B44", color:"#E57373", padding:"13px", borderRadius:10, fontSize:13, fontFamily:"sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          🗑️ Eliminar pedido entregado
        </button>
      )}
    </div>
  </div>
);

}

const stats = [
{ label:"Total",          value:pedidos.length,                                       color:GOLD,      icon:"📦" },
{ label:"Producción",     value:pedidos.filter(p=>p.estado===1||p.estado===2).length, color:GOLD,      icon:"⚙️" },
{ label:"Para entregar",  value:pedidos.filter(p=>p.estado===3).length,               color:"#4CAF50", icon:"🚀" },
{ label:"Entregados",     value:pedidos.filter(p=>p.estado===4).length,               color:"#4CAF50", icon:"✅" },
];
return (
<div style={{ paddingBottom:80 }}>
<div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<div>
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:4 }}>PANEL DE GESTIÓN</div>
<div style={{ fontSize:22, fontWeight:"bold", textShadow:`0 0 20px ${GOLD}33` }}>Pedidos</div>
<div style={{ fontSize:10, color:GOLD_DARK, fontFamily:"Georgia, serif", fontStyle:"italic", marginTop:2 }}>#ElFuegoNosUne🔥</div>
</div>
<button onClick={() => setView("new")} style={{ background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, border:"none", color:DARK, padding:"10px 18px", borderRadius:10, fontSize:13, fontFamily:"sans-serif", fontWeight:"bold", cursor:"pointer" }}>
➕ Nuevo pedido
</button>
</div>
<AlertaBanner pedidos={pedidos} />
<div style={{ padding:"16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4 }}>
{stats.map(s => (
<div key={s.label} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"14px", textAlign:"center" }}>
<div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
<div style={{ fontSize:26, fontWeight:"bold", color:s.color }}>{s.value}</div>
<div style={{ fontSize:10, color:"#666", fontFamily:"sans-serif", marginTop:2 }}>{s.label}</div>
</div>
))}
</div>
<div style={{ padding:"0 16px",display:"flex",flexDirection:"column",gap:10 }}>
{pedidos.filter(p => filterStatus==="all" || String(p.estado)===filterStatus).map((p,i) => {
const base = parseFecha(p.fecha);
const lim = base && p.diasHabiles ? addDiasHabiles(base, p.diasHabiles) : null;
const dias = lim ? diasHabilesRestantes(lim) : null;
const alertColor = dias !== null && p.estado < 4 ? getAlertaColor(dias) : null;
return (
<button key={p.id} onClick={() => setSelected(i)} style={{ background:CARD,border:`1px solid ${alertColor||BORDER}`,borderRadius:12,padding:"16px",cursor:"pointer",textAlign:"left" }}>
<div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
<div style={{ display:"flex", alignItems:"center", gap:8 }}>
<div style={{ fontSize:13, color:GOLD, fontFamily:"sans-serif", fontWeight:"bold" }}>{p.id}</div>
{p.serie && <span style={{ background:GOLD+"22", border:`1px solid ${GOLD}44`, color:GOLD, fontSize:9, padding:"2px 7px", borderRadius:20, fontFamily:"sans-serif", fontWeight:"bold", letterSpacing:"1px" }}>{p.serie}</span>}
</div>
<div style={{ background:tc[p.estado]+"22",color:tc[p.estado],fontSize:11,padding:"3px 10px",borderRadius:20,fontFamily:"sans-serif",border:`1px solid ${tc[p.estado]}44` }}>{ESTADO_LABELS[p.estado]}</div>
</div>
<div style={{ fontSize:15,fontWeight:"bold",marginBottom:2, color:"#F5EDD6", letterSpacing:"0.3px" }}>{getNombre(p.tel)}</div>
<div style={{ fontSize:13,color:"#888",fontFamily:"sans-serif",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
<span>{p.modelo}</span>
{dias !== null && p.estado < 4 && <CountdownBadge fecha={p.fecha} diasHabiles={p.diasHabiles} size="small" />}
</div>
<div style={{ background:BORDER,borderRadius:4,height:3 }}>
<div style={{ background:`linear-gradient(90deg,${GOLD},${GOLD_LIGHT})`,width:`${Math.round((p.estado/(ESTADO_LABELS.length-1))*100)}%`,height:"100%",borderRadius:4 }} />
</div>
</button>
);
})}
</div>
</div>
);
}

// ── ADMIN: TICKETS ────────────────────────────────────────────────────────────
function AdminTickets({ tickets, setTickets, clientes }) {
const [selected, setSelected] = useState(null);
const sc = { "Abierto":"#E57373","En proceso":GOLD,"Resuelto":"#4CAF50" };
const next = { "Abierto":"En proceso","En proceso":"Resuelto" };
const getNombre = (tel) => { const c=clientes.find(x=>normalizePhone(x.tel)===normalizePhone(tel)); return c?c.nombre:tel; };
if (selected !== null) {
const t = tickets[selected];
return (
<div style={{ paddingBottom:80 }}>
<Header title={t.id} subtitle="DETALLE DE TICKET" back onBack={() => setSelected(null)} />
<div style={{ padding:"20px" }}>
<div style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:"16px 20px",marginBottom:20 }}>
<div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
<Tag label={t.tipo} color={sc[t.estado]} />
<div style={{ background:sc[t.estado]+"22",color:sc[t.estado],fontSize:12,padding:"4px 12px",borderRadius:20,fontFamily:"sans-serif",fontWeight:"bold" }}>{t.estado}</div>
</div>
<div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif",marginBottom:4 }}>CLIENTE</div>
<div style={{ fontSize:18,fontWeight:"bold",marginBottom:14 }}>{getNombre(t.tel)}</div>
<div style={{ height:1,background:BORDER,marginBottom:14 }} />
<div style={{ fontSize:14,color:"#CCC",fontFamily:"sans-serif",lineHeight:1.6 }}>{t.desc}</div>
<div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif",marginTop:12 }}>📅 {t.fecha}</div>
</div>
{t.estado!=="Resuelto" && <button onClick={() => { setTickets(tickets.map((x,i)=>i===selected?{...x,estado:next[x.estado]}:x)); setSelected(null); }} style={{ width:"100%",background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,border:"none",color:DARK,padding:"16px",borderRadius:10,fontSize:15,fontFamily:"sans-serif",fontWeight:"bold",cursor:"pointer",marginBottom:12 }}>→ MARCAR COMO {next[t.estado].toUpperCase()}</button>}
{t.estado==="Resuelto" && (
<div>
<div style={{ background:"#0A1F0A",border:"1px solid #1A3A1A",borderRadius:10,padding:"16px",textAlign:"center",color:"#4CAF50",fontFamily:"sans-serif",fontWeight:"bold" }}>✅ TICKET RESUELTO</div>
<button
onClick={() => {
if (window.confirm(`¿Eliminar el ticket ${t.id} de forma permanente?`)) {
const next = tickets.filter((_,j) => j !== selected);
setTickets(next);
setSelected(null);
}
}}
style={{ width:"100%", marginTop:10, background:"#180000", border:"1px solid #C0392B44", color:"#E57373", padding:"13px", borderRadius:10, fontSize:13, fontFamily:"sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
🗑️ Eliminar ticket resuelto
</button>
</div>
)}
</div>
</div>
);
}
const stats = [
{ label:"Abiertos",value:tickets.filter(t=>t.estado==="Abierto").length,color:"#E57373" },
{ label:"En proceso",value:tickets.filter(t=>t.estado==="En proceso").length,color:GOLD },
{ label:"Resueltos",value:tickets.filter(t=>t.estado==="Resuelto").length,color:"#4CAF50" },
];
return (
<div style={{ paddingBottom:80 }}>
<div style={{ padding:"20px 20px 16px",borderBottom:`1px solid ${BORDER}` }}>
<div style={{ fontSize:10,color:GOLD,fontFamily:"sans-serif",letterSpacing:"3px",marginBottom:4 }}>PANEL DE GESTIÓN</div>
<div style={{ fontSize:22,fontWeight:"bold" }}>Soporte</div>
<div style={{ fontSize:10, color:GOLD_DARK, fontFamily:"Georgia, serif", fontStyle:"italic", marginTop:2 }}>#ElFuegoNosUne🔥</div>
</div>
<div style={{ padding:"16px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:4 }}>
{stats.map(s => <div key={s.label} style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"12px",textAlign:"center" }}><div style={{ fontSize:24,fontWeight:"bold",color:s.color }}>{s.value}</div><div style={{ fontSize:10,color:"#666",fontFamily:"sans-serif",marginTop:2 }}>{s.label}</div></div>)}
</div>
<div style={{ padding:"0 16px",display:"flex",flexDirection:"column",gap:10 }}>
{tickets.map((t,i) => (
<button key={t.id} onClick={() => setSelected(i)} style={{ background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:"16px",cursor:"pointer",textAlign:"left" }}>
<div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
<div style={{ display:"flex",gap:8,alignItems:"center" }}><span style={{ fontSize:12,color:"#666",fontFamily:"sans-serif" }}>{t.id}</span><Tag label={t.tipo} color={sc[t.estado]} /></div>
<div style={{ background:sc[t.estado]+"22",color:sc[t.estado],fontSize:11,padding:"3px 10px",borderRadius:20,fontFamily:"sans-serif" }}>{t.estado}</div>
</div>
<div style={{ fontSize:14,color:"#F5EDD6",fontFamily:"sans-serif",marginBottom:4, fontWeight:"bold" }}>{getNombre(t.tel)}</div>
<div style={{ fontSize:13,color:"#888",fontFamily:"sans-serif",lineHeight:1.5 }}>{(t.desc||"").slice(0,70)}...</div>
<div style={{ fontSize:11,color:"#555",fontFamily:"sans-serif",marginTop:8 }}>{t.fecha}</div>
</button>
))}
</div>
</div>
);
}


// -- CLIENT: MIS CUPONES --
function MisCuponesScreen({ cupones, clienteUser }) {
const misCupones = cupones.filter(c => c.clienteTel && normalizePhone(c.clienteTel) === normalizePhone(clienteUser?.tel||""));
const activos = misCupones.filter(c => c.estado === "activo" && !isCuponExpirado(c));
const expiradosOUsados = misCupones.filter(c => c.estado === "usado" || isCuponExpirado(c));

return (
<div style={{ paddingBottom:80 }}>
<Header title="Mis Cupones" subtitle="DESCUENTOS EXCLUSIVOS" />
{activos.length > 0 && (
<div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:12 }}>
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px" }}>CUPONES DISPONIBLES</div>
{activos.map(c => (
<div key={c.id} style={{ background:"linear-gradient(135deg,#1A0800,#0A0A0A)", border:`2px solid ${GOLD}66`, borderRadius:16, padding:"20px", position:"relative", overflow:"hidden" }}>
<div style={{ position:"absolute", top:0, right:0, width:80, height:80, background:`radial-gradient(circle at top right, ${GOLD}22, transparent)`, pointerEvents:"none" }} />
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
<div style={{ background:"#4CAF5022", color:"#4CAF50", fontSize:11, padding:"4px 12px", borderRadius:20, fontFamily:"sans-serif", fontWeight:"bold" }}>ACTIVO</div>
<div style={{ fontSize:11, color:"#666", fontFamily:"sans-serif" }}>{c.fecha}</div>
</div>
<div style={{ background:DARK, border:`2px dashed ${GOLD}66`, borderRadius:10, padding:"14px", marginBottom:12, textAlign:"center" }}>
<div style={{ fontSize:10, color:"#666", fontFamily:"sans-serif", marginBottom:4 }}>TU CÓDIGO DE CUPÓN</div>
<div style={{ fontSize:22, fontWeight:"bold", color:GOLD, fontFamily:"monospace", letterSpacing:"3px" }}>{c.id}</div>
</div>
<div style={{ fontSize:28, fontWeight:"bold", color:GOLD, textAlign:"center", marginBottom:8 }}>{c.descuento}% DESCUENTO</div>
{c.motivo && <div style={{ fontSize:13, color:"#AAA", fontFamily:"sans-serif", textAlign:"center", marginBottom:8, fontStyle:"italic" }}>{c.motivo}</div>}
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:`1px solid ${BORDER}`, paddingTop:10 }}>
<div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif" }}>Vence: {c.vence}</div>
<div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif" }}>Presentá este código</div>
</div>
</div>
))}
</div>
)}
{activos.length === 0 && (
<div style={{ textAlign:"center", padding:"60px 20px" }}>
<div style={{ fontSize:56, marginBottom:16 }}>{"🎟️"}</div>
<div style={{ fontSize:18, fontWeight:"bold", marginBottom:8 }}>No tenés cupones activos</div>
<div style={{ fontSize:13, color:"#666", fontFamily:"sans-serif", lineHeight:1.6 }}>Los cupones se generan cuando dejás una reseña o cuando el equipo de Dr. Parrilla te asigna uno. #ElFuegoNosUne{"🔥"}</div>
</div>
)}
{expiradosOUsados.length > 0 && (
<div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
<div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif", letterSpacing:"2px" }}>CUPONES ANTERIORES</div>
{expiradosOUsados.map(c => (
<div key={c.id} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"14px", opacity:0.6 }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
<div style={{ fontSize:14, fontWeight:"bold", color:"#888", fontFamily:"monospace", letterSpacing:"2px" }}>{c.id}</div>
<div style={{ background:"#88888822", color:"#888", fontSize:10, padding:"3px 10px", borderRadius:20, fontFamily:"sans-serif" }}>{isCuponExpirado(c) ? "EXPIRADO" : "USADO"}</div>
</div>
<div style={{ fontSize:13, color:"#666", fontFamily:"sans-serif" }}>{c.descuento}% descuento</div>
{c.fechaUso && <div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif", marginTop:4 }}>Usado: {c.fechaUso}</div>}
</div>
))}
</div>
)}
</div>
);
}

// ── ADMIN: CUPONES ─────────────────────────────────────────────────────────────────
function AdminCupones({ cupones, setCupones, clientes, pedidos }) {
const [showNew, setShowNew] = useState(false);
const [newCupon, setNewCupon] = useState({ clienteTel:"", descuento:"15", motivo:"", duracion:"3" });
const [search, setSearch] = useState("");
const [confirmDelete, setConfirmDelete] = useState(null);

const activos = cupones.filter(c => c.estado === "activo" && !isCuponExpirado(c));
const expirados = cupones.filter(c => c.estado === "activo" && isCuponExpirado(c));
const usados = cupones.filter(c => c.estado === "usado");

const crearCuponManual = () => {
if (!newCupon.motivo) return;
const code = `DRP-${String(cupones.length+1).padStart(3,"0")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
const fecha = new Date().toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"});
const meses = parseInt(newCupon.duracion) || 3;
const venceDate = new Date(Date.now() + meses*30*24*60*60*1000);
const vence = venceDate.toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"});
const clienteInfo = clientes.find(c => normalizePhone(c.tel) === normalizePhone(newCupon.clienteTel));
const cuponObj = {
id: code,
cliente: clienteInfo ? clienteInfo.nombre : (newCupon.clienteTel ? newCupon.clienteTel : "General"),
clienteTel: newCupon.clienteTel ? normalizePhone(newCupon.clienteTel) : "",
descuento: parseInt(newCupon.descuento)||15,
motivo: newCupon.motivo,
estado:"activo",
fecha,
vence,
tipo:"manual",
duracionMeses: meses
};
setCupones([cuponObj, ...cupones]);
setNewCupon({ clienteTel:"", descuento:"15", motivo:"", duracion:"3" });
setShowNew(false);
setSearch("");
if (newCupon.clienteTel) {
const tel = newCupon.clienteTel.replace(/^0/, "");
const msg = encodeURIComponent(`🎉 *Dr. Parrilla - Cupón de Descuento*\n\n🎟️ Código: *${code}*\n💰 Descuento: *${cuponObj.descuento}%*\n📝 Motivo: ${cuponObj.motivo}\n⏳ Vence: ${vence}\n\n_Presentá este código al hacer tu próximo pedido._\n\n🔥 #ElFuegoNosUne`);
window.open(`https://wa.me/595${tel}?text=${msg}`, "_blank");
}
};

const marcarUsado = (id) => {
const fecha = new Date().toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"});
setCupones(cupones.map(c => c.id===id ? {...c, estado:"usado", fechaUso:fecha} : c));
};

const eliminarCupon = (id) => {
setCupones(cupones.filter(c => c.id !== id));
setConfirmDelete(null);
};

const clientesFiltrados = search.length >= 2 ? clientes.filter(c =>
c.nombre.toLowerCase().includes(search.toLowerCase()) ||
c.tel.includes(search)
) : [];

return (
<div style={{ paddingBottom:80 }}>
<div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${BORDER}` }}>
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:4 }}>PANEL DE GESTIÓN</div>
<div style={{ fontSize:22, fontWeight:"bold" }}>Cupones 🎟️</div>
<div style={{ fontSize:10, color:GOLD_DARK, fontFamily:"Georgia, serif", fontStyle:"italic", marginTop:2 }}>#ElFuegoNosUne🔥</div>
</div>
  <div style={{ padding:"16px", display:"flex", gap:8, marginBottom:4 }}>
    <div style={{ flex:1, background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"12px", textAlign:"center" }}>
      <div style={{ fontSize:22, fontWeight:"bold", color:"#4CAF50" }}>{activos.length}</div>
      <div style={{ fontSize:9, color:"#888", fontFamily:"sans-serif" }}>Activos</div>
    </div>
    <div style={{ flex:1, background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"12px", textAlign:"center" }}>
      <div style={{ fontSize:22, fontWeight:"bold", color:"#E57373" }}>{expirados.length}</div>
      <div style={{ fontSize:9, color:"#888", fontFamily:"sans-serif" }}>Expirados</div>
    </div>
    <div style={{ flex:1, background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"12px", textAlign:"center" }}>
      <div style={{ fontSize:22, fontWeight:"bold", color:"#888" }}>{usados.length}</div>
      <div style={{ fontSize:9, color:"#888", fontFamily:"sans-serif" }}>Usados</div>
    </div>
    <div style={{ flex:1, background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"12px", textAlign:"center" }}>
      <div style={{ fontSize:22, fontWeight:"bold", color:GOLD }}>{cupones.length}</div>
      <div style={{ fontSize:9, color:"#888", fontFamily:"sans-serif" }}>Total</div>
    </div>
  </div>
  <div style={{ padding:"0 16px 16px" }}>
    <button onClick={() => setShowNew(!showNew)} style={{ width:"100%", background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, border:"none", color:DARK, padding:"14px", borderRadius:10, fontSize:14, fontFamily:"sans-serif", fontWeight:"bold", cursor:"pointer", letterSpacing:"1px" }}>
      + CREAR CUPÓN
    </button>
  </div>
  {showNew && (
    <div style={{ margin:"0 16px 16px", background:CARD, border:`1px solid ${GOLD}44`, borderRadius:12, padding:"16px" }}>
      <div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:10 }}>NUEVO CUPÓN</div>
      <div style={{ fontSize:10, color:"#888", fontFamily:"sans-serif", marginBottom:6 }}>ASIGNAR A CLIENTE</div>
      <input placeholder="Buscar cliente por nombre o teléfono..." value={search}
        onChange={e => { setSearch(e.target.value); }}
        style={{ width:"100%",background:DARK3,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"12px",borderRadius:8,fontSize:13,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box",marginBottom:4 }} />
      {search.length >= 2 && clientesFiltrados.length > 0 && (
        <div style={{ background:DARK3, border:`1px solid ${BORDER}`, borderRadius:8, marginBottom:10, maxHeight:150, overflowY:"auto" }}>
          {clientesFiltrados.map(c => (
            <button key={c.id} onClick={() => { setNewCupon({...newCupon, clienteTel:c.tel}); setSearch(c.nombre + " - " + c.tel); }}
              style={{ width:"100%", background:"none", border:"none", borderBottom:`1px solid ${BORDER}`, color:"#F0F0F0", padding:"10px 12px", textAlign:"left", cursor:"pointer", fontFamily:"sans-serif", fontSize:13 }}>
              <span style={{ color:GOLD }}>{c.nombre}</span> <span style={{ color:"#666" }}>- {c.tel}</span>
            </button>
          ))}
        </div>
      )}
      {!search && (
        <input placeholder="O ingresá teléfono directo (09XX...)" value={newCupon.clienteTel}
          onChange={e=>setNewCupon({...newCupon,clienteTel:e.target.value})}
          style={{ width:"100%",background:DARK3,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"12px",borderRadius:8,fontSize:13,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box",marginBottom:10 }} />
      )}
      <div style={{ display:"flex", gap:10, marginBottom:10, marginTop:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, color:"#888", fontFamily:"sans-serif", marginBottom:4 }}>% DESCUENTO</div>
          <input placeholder="15" value={newCupon.descuento} onChange={e=>setNewCupon({...newCupon,descuento:e.target.value})}
            style={{ width:"100%",background:DARK3,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"12px",borderRadius:8,fontSize:13,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box" }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, color:"#888", fontFamily:"sans-serif", marginBottom:4 }}>DURACIÓN</div>
          <select value={newCupon.duracion} onChange={e=>setNewCupon({...newCupon,duracion:e.target.value})}
            style={{ width:"100%",background:DARK3,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"12px",borderRadius:8,fontSize:13,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box" }}>
            <option value="1">1 mes</option>
            <option value="2">2 meses</option>
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
          </select>
        </div>
      </div>
      <input placeholder="Motivo (ej: Promoción especial, Fidelidad...)" value={newCupon.motivo} onChange={e=>setNewCupon({...newCupon,motivo:e.target.value})}
        style={{ width:"100%",background:DARK3,border:`1px solid ${BORDER}`,color:"#F0F0F0",padding:"12px",borderRadius:8,fontSize:13,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box",marginBottom:12 }} />
      <button onClick={crearCuponManual} style={{ width:"100%",background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,border:"none",color:DARK,padding:"12px",borderRadius:8,fontSize:13,fontFamily:"sans-serif",fontWeight:"bold",cursor:"pointer" }}>
        {newCupon.clienteTel ? "CREAR CUPÓN Y ENVIAR POR WHATSAPP" : "CREAR CUPÓN"}
      </button>
    </div>
  )}
  <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:10 }}>
    {cupones.length === 0 && (
      <div style={{ textAlign:"center", padding:"40px 20px" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🎟️</div>
        <div style={{ fontSize:16, fontWeight:"bold", marginBottom:6 }}>No hay cupones aún</div>
        <div style={{ fontSize:13, color:"#666", fontFamily:"sans-serif" }}>Creá un cupón manual o esperá a que un cliente deje una reseña. #ElFuegoNosUne🔥</div>
      </div>
    )}
    {activos.length > 0 && <div style={{ fontSize:11, color:"#4CAF50", fontFamily:"sans-serif", letterSpacing:"2px", marginTop:8 }}>ACTIVOS</div>}
    {activos.map(c => (
      <div key={c.id} style={{ background:CARD, border:`1px solid ${GOLD}66`, borderRadius:12, padding:"16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontSize:16, fontWeight:"bold", color:GOLD, fontFamily:"monospace", letterSpacing:"2px" }}>{c.id}</div>
          <div style={{ background:"#4CAF5022", color:"#4CAF50", fontSize:11, padding:"3px 10px", borderRadius:20, fontFamily:"sans-serif", fontWeight:"bold" }}>ACTIVO</div>
        </div>
        <div style={{ fontSize:13, color:"#CCC", fontFamily:"sans-serif", marginBottom:4 }}>{c.cliente}</div>
        {c.clienteTel && <div style={{ fontSize:12, color:"#888", fontFamily:"sans-serif", marginBottom:4 }}>Tel: {c.clienteTel}</div>}
        <div style={{ fontSize:14, color:GOLD, fontWeight:"bold", marginBottom:4 }}>{c.descuento}% descuento</div>
        {c.motivo && <div style={{ fontSize:12, color:"#888", fontFamily:"sans-serif", marginBottom:4, fontStyle:"italic" }}>{c.motivo}</div>}
        <div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif", marginBottom:8 }}>Vence: {c.vence} ({c.duracionMeses || 3} meses)</div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => marcarUsado(c.id)} style={{ flex:1,background:"none",border:`1px solid ${GOLD}44`,color:GOLD,padding:"10px",borderRadius:8,fontSize:12,fontFamily:"sans-serif",cursor:"pointer" }}>Marcar como usado</button>
          {c.clienteTel && (
            <button onClick={() => {
              const tel = c.clienteTel.replace(/^0/, "");
              const msg = encodeURIComponent(`🎉 *Recordatorio*\n\n🎟️ Código: *${c.id}*\n💰 ${c.descuento}%\n⏳ Vence: ${c.vence}\n\n🔥 #ElFuegoNosUne`);
              window.open(`https://wa.me/595${tel}?text=${msg}`, "_blank");
            }} style={{ background:"#0A1F0A",border:"1px solid #1A3A1A",color:"#4CAF50",padding:"10px 14px",borderRadius:8,fontSize:12,fontFamily:"sans-serif",cursor:"pointer" }}>
              WhatsApp
            </button>
          )}
        </div>
      </div>
    ))}
    {expirados.length > 0 && <div style={{ fontSize:11, color:"#E57373", fontFamily:"sans-serif", letterSpacing:"2px", marginTop:12 }}>EXPIRADOS</div>}
    {expirados.map(c => (
      <div key={c.id} style={{ background:CARD, border:"1px solid #E5737344", borderRadius:12, padding:"16px", opacity:0.7 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontSize:16, fontWeight:"bold", color:"#E57373", fontFamily:"monospace", letterSpacing:"2px" }}>{c.id}</div>
          <div style={{ background:"#E5737322", color:"#E57373", fontSize:11, padding:"3px 10px", borderRadius:20, fontFamily:"sans-serif", fontWeight:"bold" }}>EXPIRADO</div>
        </div>
        <div style={{ fontSize:13, color:"#888", fontFamily:"sans-serif" }}>{c.cliente} - {c.descuento}%</div>
        <div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif", marginTop:4 }}>Venció: {c.vence}</div>
        <button onClick={() => eliminarCupon(c.id)} style={{ marginTop:8,width:"100%",background:"none",border:"1px solid #E5737344",color:"#E57373",padding:"8px",borderRadius:8,fontSize:12,fontFamily:"sans-serif",cursor:"pointer" }}>Eliminar cupón expirado</button>
      </div>
    ))}
    {usados.length > 0 && <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", letterSpacing:"2px", marginTop:12 }}>USADOS</div>}
    {usados.map(c => (
      <div key={c.id} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"16px", opacity:0.6 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontSize:16, fontWeight:"bold", color:"#888", fontFamily:"monospace", letterSpacing:"2px" }}>{c.id}</div>
          <div style={{ background:"#88888822", color:"#888", fontSize:11, padding:"3px 10px", borderRadius:20, fontFamily:"sans-serif", fontWeight:"bold" }}>USADO</div>
        </div>
        <div style={{ fontSize:13, color:"#666", fontFamily:"sans-serif" }}>{c.cliente} - {c.descuento}%</div>
        <div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif", marginTop:4 }}>Usado: {c.fechaUso}</div>
        {confirmDelete === c.id ? (
          <div style={{ marginTop:8, display:"flex", gap:8 }}>
            <button onClick={() => eliminarCupon(c.id)} style={{ flex:1,background:"#E57373",border:"none",color:"#FFF",padding:"10px",borderRadius:8,fontSize:12,fontFamily:"sans-serif",cursor:"pointer",fontWeight:"bold" }}>Confirmar eliminar</button>
            <button onClick={() => setConfirmDelete(null)} style={{ flex:1,background:"none",border:`1px solid ${BORDER}`,color:"#888",padding:"10px",borderRadius:8,fontSize:12,fontFamily:"sans-serif",cursor:"pointer" }}>Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(c.id)} style={{ marginTop:8,width:"100%",background:"none",border:`1px solid ${BORDER}`,color:"#888",padding:"8px",borderRadius:8,fontSize:12,fontFamily:"sans-serif",cursor:"pointer" }}>Eliminar cupón usado</button>
        )}
      </div>
    ))}
  </div>
</div>
);
}

// ── ADMIN: RESENAS─────────────────────────────────────────────────────────
function AdminResenas({ pedidos, clientes }) {
const resenas = pedidos.filter(p => p.resena).map(p => {
const cliente = clientes.find(c => normalizePhone(c.tel||"")===normalizePhone(p.tel));
return { ...p.resena, cliente: cliente?.nombre || p.tel, modelo: p.modelo, pedidoId: p.id };
});

const avg = resenas.length > 0
? (resenas.reduce((s,r) => s+r.stars, 0) / resenas.length).toFixed(1)
: "--";

const dist = [5,4,3,2,1].map(s => ({
stars: s,
count: resenas.filter(r=>r.stars===s).length,
pct: resenas.length > 0 ? Math.round(resenas.filter(r=>r.stars===s).length/resenas.length*100) : 0
}));

const starColor = (s) => s>=4?"#4CAF50":s===3?GOLD:"#E57373";

return (
<div style={{ paddingBottom:80 }}>
<div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${BORDER}` }}>
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:4 }}>PANEL DE GESTIÓN</div>
<div style={{ fontSize:22, fontWeight:"bold" }}>Reseñas</div>
<div style={{ fontSize:10, color:GOLD_DARK, fontFamily:"Georgia, serif", fontStyle:"italic", marginTop:2 }}>#ElFuegoNosUne🔥</div>
</div>

  {/* Summary */}
  <div style={{ padding:"16px", display:"grid", gridTemplateColumns:"1fr 2fr", gap:12, marginBottom:4 }}>
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"20px", textAlign:"center" }}>
      <div style={{ fontSize:42, fontWeight:"bold", color:GOLD }}>{avg}</div>
      <div style={{ fontSize:24, marginBottom:4 }}>⭐</div>
      <div style={{ fontSize:11, color:"#666", fontFamily:"sans-serif" }}>{resenas.length} resenas</div>
    </div>
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"16px" }}>
      {dist.map(d => (
        <div key={d.stars} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <span style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", minWidth:12 }}>{d.stars}</span>
          <span style={{ fontSize:11 }}>⭐</span>
          <div style={{ flex:1, background:BORDER, borderRadius:4, height:8, overflow:"hidden" }}>
            <div style={{ background:starColor(d.stars), width:`${d.pct}%`, height:"100%", borderRadius:4 }}/>
          </div>
          <span style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", minWidth:24 }}>{d.count}</span>
        </div>
      ))}
    </div>
  </div>

  {/* Google Reviews CTA for admin */}
  <div style={{ margin:"0 16px 16px" }}>
    <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer"
      style={{ display:"flex", alignItems:"center", gap:12, background:"#0A0F1F", border:"1px solid #1A2A4A", borderRadius:12, padding:"14px 16px", textDecoration:"none" }}>
      <span style={{ fontSize:24 }}>🔍</span>
      <div>
        <div style={{ fontSize:13, fontWeight:"bold", color:"#4285F4" }}>Ver tu perfil de Google</div>
        <div style={{ fontSize:11, color:"#666", fontFamily:"sans-serif" }}>Respondé las reseñas públicas</div>
      </div>
      <span style={{ marginLeft:"auto", color:"#4285F4", fontSize:18 }}>›</span>
    </a>
  </div>

  {/* Individual reviews */}
  <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:10 }}>
    {resenas.length === 0 && (
      <div style={{ textAlign:"center", padding:"40px 20px", color:"#555", fontFamily:"sans-serif" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⭐</div>
        <div>Aun no hay resenas. Se muestran aqui cuando los clientes califiquen sus pedidos.</div>
      </div>
    )}
    {resenas.sort((a,b) => b.stars-a.stars).map((r,i) => (
      <div key={i} style={{ background:CARD, border:`1px solid ${starColor(r.stars)}44`, borderRadius:12, padding:"16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:"bold", marginBottom:2 }}>{r.cliente}</div>
            <div style={{ fontSize:11, color:"#666", fontFamily:"sans-serif" }}>{r.modelo} · {r.pedidoId}</div>
          </div>
          <div style={{ display:"flex", gap:2 }}>
            {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:16 }}>{s<=r.stars?"⭐":"☆"}</span>)}
          </div>
        </div>
        {r.comment && (
          <div style={{ fontSize:13, color:"#AAA", fontFamily:"sans-serif", fontStyle:"italic", lineHeight:1.6, padding:"10px 12px", background:DARK3, borderRadius:8, marginBottom:8 }}>
            "{r.comment}"
          </div>
        )}
        <div style={{ fontSize:11, color:"#555", fontFamily:"sans-serif" }}>{r.fecha}</div>
      </div>
    ))}
  </div>
</div>

);
}

// ── VISIT SCHEDULING ─────────────────────────────────────────────────────────
const HORARIOS = ["09:00","10:00","11:00","14:00","15:00","16:00","17:00"];

function AgendarVisitaScreen({ visitas, setVisitas, clienteUser }) {
const [step, setStep] = useState(1); // 1=date, 2=time, 3=confirm, 4=done
const [fecha, setFecha] = useState("");
const [hora, setHora]   = useState("");
const [nota, setNota]   = useState("");

const hoy = new Date();
const dias = Array.from({length:14}, (_,i) => {
const d = new Date(hoy);
d.setDate(hoy.getDate() + i + 1);
const dia = d.getDay();
if (dia === 0 || dia === 6) return null; // Skip weekends
return {
fecha: d.toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"}),
diaNombre: ["Dom","Lun","Mar","Mie","Jue","Vie","Sab"][dia],
diaNum: d.getDate(),
mes: d.toLocaleDateString("es-PY",{month:"short"}),
};
}).filter(Boolean);

const confirmar = () => {
const nueva = {
id: `VIS-${Date.now().toString().slice(-6)}`,
cliente: clienteUser?.nombre || "Cliente",
tel: clienteUser?.tel || "",
fecha, hora, nota: nota.trim(),
estado: "Pendiente",
createdAt: new Date().toLocaleDateString("es-PY",{day:"2-digit",month:"short",year:"numeric"})
};
setVisitas([nueva, ...(visitas||[])]);
setStep(4);
};

if (step === 4) return (
<div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", padding:32, textAlign:"center" }}>
<div style={{ fontSize:52, marginBottom:16 }}>✅</div>
<div style={{ fontSize:22, fontWeight:"bold", marginBottom:8 }}>¡Visita agendada!</div>
<div style={{ background:`${GOLD}11`, border:`1px solid ${GOLD}33`, borderRadius:12, padding:"16px 20px", marginBottom:24 }}>
<div style={{ fontSize:14, color:GOLD, fontWeight:"bold", marginBottom:4 }}>{fecha} · {hora}</div>
<div style={{ fontSize:12, color:"#AAA", fontFamily:"sans-serif" }}>Showroom Dr. Parrilla · Lambaré · #ElFuegoNosUne🔥</div>
</div>
<div style={{ fontSize:13, color:"#888", fontFamily:"sans-serif", marginBottom:24, lineHeight:1.6 }}>
Te confirmaremos por WhatsApp en menos de 2 horas.
</div>
<a href={`https://wa.me/${WA_NUMBER}?text=Hola! Agendé una visita para el ${fecha} a las ${hora}`} target="_blank" rel="noreferrer"
style={{ display:"flex", alignItems:"center", gap:10, background:"#0A1F0A", border:"1px solid #1A3A1A", borderRadius:12, padding:"14px 20px", textDecoration:"none", marginBottom:12 }}>
<span style={{ fontSize:20 }}>💬</span>
<span style={{ fontSize:14, color:"#4CAF50", fontWeight:"bold", fontFamily:"sans-serif" }}>Confirmar por WhatsApp</span>
</a>
<button onClick={() => { setStep(1); setFecha(""); setHora(""); setNota(""); }}
style={{ background:"none", border:"none", color:GOLD_DARK, fontSize:13, fontFamily:"sans-serif", cursor:"pointer" }}>
Agendar otra visita
</button>
</div>
);

return (
<div style={{ paddingBottom:80 }}>
<Header title="Agendar Visita" subtitle="SHOWROOM DR. PARRILLA"/>
<div style={{ padding:"16px 20px 0" }}>
{/* Step indicator */}
<div style={{ display:"flex", gap:8, marginBottom:20 }}>
{["Fecha","Horario","Confirmar"].map((s,i) => (
<div key={i} style={{ flex:1, textAlign:"center" }}>
<div style={{ height:3, borderRadius:2, background:i<step-1?GOLD:i===step-1?GOLD:"#1E2228", marginBottom:4 }}/>
<div style={{ fontSize:10, color:i<step?GOLD:"#555", fontFamily:"sans-serif" }}>{s}</div>
</div>
))}
</div>

    {step === 1 && (
      <div>
        <div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:14 }}>ELEGÍ UN DÍA</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:20 }}>
          {dias.map((d,i) => (
            <button key={i} onClick={() => { setFecha(d.fecha); setStep(2); }}
              style={{ background:fecha===d.fecha?`${GOLD}22`:CARD, border:`1px solid ${fecha===d.fecha?GOLD:BORDER}`, borderRadius:10, padding:"12px 6px", cursor:"pointer", textAlign:"center" }}>
              <div style={{ fontSize:10, color:fecha===d.fecha?GOLD:"#888", fontFamily:"sans-serif", marginBottom:4 }}>{d.diaNombre}</div>
              <div style={{ fontSize:18, fontWeight:"bold", color:fecha===d.fecha?GOLD:CREAM }}>{d.diaNum}</div>
              <div style={{ fontSize:10, color:"#666", fontFamily:"sans-serif" }}>{d.mes}</div>
            </button>
          ))}
        </div>
        <div style={{ background:`${GOLD}08`, border:`1px solid ${GOLD}22`, borderRadius:10, padding:"12px 14px", fontSize:12, color:"#888", fontFamily:"sans-serif" }}>
          📍 Showroom: Lambaré, Paraguay · Lun-Vie 9:00-17:00 · #ElFuegoNosUne🔥
        </div>
      </div>
    )}

    {step === 2 && (
      <div>
        <div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:4 }}>DÍA SELECCIONADO</div>
        <div style={{ fontSize:16, fontWeight:"bold", color:GOLD, marginBottom:16 }}>{fecha}</div>
        <div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:14 }}>ELEGÍ UN HORARIO</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
          {HORARIOS.map(h => (
            <button key={h} onClick={() => { setHora(h); setStep(3); }}
              style={{ background:hora===h?`${GOLD}22`:CARD, border:`1px solid ${hora===h?GOLD:BORDER}`, borderRadius:10, padding:"14px", cursor:"pointer", textAlign:"center", fontSize:15, fontWeight:"bold", color:hora===h?GOLD:CREAM, fontFamily:"sans-serif" }}>
              {h}
            </button>
          ))}
        </div>
        <button onClick={() => setStep(1)} style={{ background:"none", border:"none", color:GOLD_DARK, fontSize:13, fontFamily:"sans-serif", cursor:"pointer" }}>← Cambiar fecha</button>
      </div>
    )}

    {step === 3 && (
      <div>
        <div style={{ background:`${GOLD}11`, border:`1px solid ${GOLD}33`, borderRadius:12, padding:"20px", marginBottom:16 }}>
          <div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:12 }}>RESUMEN DE VISITA</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div><div style={{ fontSize:10, color:"#666", fontFamily:"sans-serif", marginBottom:4 }}>FECHA</div><div style={{ fontSize:14, fontWeight:"bold" }}>{fecha}</div></div>
            <div><div style={{ fontSize:10, color:"#666", fontFamily:"sans-serif", marginBottom:4 }}>HORARIO</div><div style={{ fontSize:14, fontWeight:"bold", color:GOLD }}>{hora}</div></div>
          </div>
          <div style={{ fontSize:12, color:"#888", fontFamily:"sans-serif" }}>📍 Showroom Dr. Parrilla · Lambaré · #ElFuegoNosUne🔥</div>
        </div>
        <div style={{ fontSize:10, color:"#888", fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:8 }}>NOTA OPCIONAL</div>
        <input value={nota} onChange={e => setNota(e.target.value)}
          placeholder="¿Qué modelo te interesa ver? ¿Tenés alguna consulta específica?"
          style={{ width:"100%", background:CARD, border:`1px solid ${BORDER}`, color:CREAM, padding:"12px 14px", borderRadius:8, fontSize:13, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box", marginBottom:16 }}/>
        <button onClick={confirmar}
          style={{ width:"100%", background:GOLD_GRAD, border:"none", color:DARK, padding:"16px", borderRadius:10, fontSize:15, fontFamily:"sans-serif", fontWeight:"bold", letterSpacing:"2px", cursor:"pointer", marginBottom:8 }}>
          CONFIRMAR VISITA
        </button>
        <button onClick={() => setStep(2)} style={{ width:"100%", background:"none", border:"none", color:GOLD_DARK, fontSize:13, fontFamily:"sans-serif", cursor:"pointer" }}>← Cambiar horario</button>
      </div>
    )}
  </div>
</div>

);
}

// ── ADMIN: VISITAS ────────────────────────────────────────────────────────────
function AdminVisitas({ visitas, setVisitas }) {
const estadoColors = { "Pendiente": ORANGE, "Confirmada": GREEN, "Realizada": GOLD_DARK, "Cancelada": RED };

const stats = [
{ label:"Pendientes", value:(visitas||[]).filter(v=>v.estado==="Pendiente").length, color:ORANGE },
{ label:"Confirmadas", value:(visitas||[]).filter(v=>v.estado==="Confirmada").length, color:GREEN },
{ label:"Total", value:(visitas||[]).length, color:GOLD },
];

return (
<div style={{ paddingBottom:80 }}>
<div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<div>
<div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:4 }}>PANEL DE GESTIÓN</div>
<div style={{ fontSize:22, fontWeight:"bold" }}>Visitas</div>
<div style={{ fontSize:10, color:GOLD_DARK, fontFamily:"Georgia, serif", fontStyle:"italic", marginTop:2 }}>#ElFuegoNosUne🔥</div>
</div>
</div>
<div style={{ padding:"16px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:4 }}>
{stats.map(s => (
<div key={s.label} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"12px", textAlign:"center" }}>
<div style={{ fontSize:22, fontWeight:"bold", color:s.color }}>{s.value}</div>
<div style={{ fontSize:10, color:"#666", fontFamily:"sans-serif", marginTop:2 }}>{s.label}</div>
</div>
))}
</div>
<div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:10 }}>
{(visitas||[]).length === 0 && (
<div style={{ textAlign:"center", padding:"40px 20px", color:"#555", fontFamily:"sans-serif" }}>
<div style={{ fontSize:40, marginBottom:12 }}>📅</div>
<div>No hay visitas agendadas aún</div>
</div>
)}
{(visitas||[]).map((v,i) => (
<div key={v.id} style={{ background:CARD, border:`1px solid ${estadoColors[v.estado]||BORDER}44`, borderRadius:12, padding:"16px" }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
<div style={{ fontSize:13, color:GOLD, fontFamily:"sans-serif", fontWeight:"bold" }}>{v.id}</div>
<select value={v.estado} onChange={e => setVisitas((visitas||[]).map((x,j) => j===i?{...x,estado:e.target.value}:x))}
style={{ background:CARD2, border:`1px solid ${estadoColors[v.estado]||BORDER}`, color:estadoColors[v.estado]||GOLD, padding:"4px 8px", borderRadius:6, fontSize:11, fontFamily:"sans-serif", cursor:"pointer", outline:"none" }}>
{["Pendiente","Confirmada","Realizada","Cancelada"].map(s => <option key={s} value={s}>{s}</option>)}
</select>
</div>
<div style={{ fontSize:15, fontWeight:"bold", marginBottom:4 }}>{v.cliente}</div>
<div style={{ display:"flex", gap:12, marginBottom:8 }}>
<span style={{ fontSize:13, color:GOLD, fontFamily:"sans-serif" }}>📅 {v.fecha}</span>
<span style={{ fontSize:13, color:GOLD_LIGHT, fontFamily:"sans-serif" }}>🕐 {v.hora}</span>
</div>
{v.nota && <div style={{ fontSize:12, color:"#888", fontFamily:"sans-serif", fontStyle:"italic", marginBottom:8 }}>"{v.nota}"</div>}
<a href={`https://wa.me/${v.tel.replace(/\D/g,"")}?text=Hola ${v.cliente.split(" ")[0]}! Tu visita del ${v.fecha} a las ${v.hora} está ${v.estado}.`} target="_blank" rel="noreferrer"
style={{ fontSize:12, color:"#4CAF50", fontFamily:"sans-serif", textDecoration:"none" }}>
💬 Notificar por WhatsApp
</a>
</div>
))}
</div>
</div>
);
}

export default function App() {
const [logged, setLogged]           = useState(false);
const [isAdmin, setIsAdmin]         = useState(false);
const [adminUser, setAdminUser]     = useState(null);
const [clienteUser, setClienteUser] = useState(null);
const [active, setActive]           = useState("home");
const [pedidos, setPedidos]         = useState(INITIAL_PEDIDOS);
const [tickets, setTickets]         = useState(INITIAL_TICKETS);
const [clientes, setClientes]       = useState(INITIAL_CLIENTES);
const [productos, setProductos]     = useState(INITIAL_PRODUCTOS);
const [storageReady, setStorageReady] = useState(false);
const [savingIndicator, setSavingIndicator] = useState(false);
const [firebaseOk, setFirebaseOk] = useState(false);
const [visitas, setVisitas] = useState([]);
const [cupones, setCupones] = useState([]);
const dataLoaded = useRef(false);

// ── Load from storage on mount + check Firebase ──
useEffect(() => {
const load = async () => {
const fbOk = await checkFirebase();
setFirebaseOk(fbOk);
try { const r1 = await appStorage.get("dp_clientes"); if (r1) { const raw=JSON.parse(r1); const seen=new Set(); const fixed=raw.map(c=>{if(!c.id||seen.has(c.id)){return{...c,id:"C-"+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase()};} seen.add(c.id); return c;}); setClientes(fixed); if(fixed.some((c,i)=>c.id!==raw[i]?.id))appStorage.set("dp_clientes",JSON.stringify(fixed)); } } catch(e) {}
try { const r2 = await appStorage.get("dp_pedidos");   if (r2) setPedidos(JSON.parse(r2));   } catch(e) {}
try { const r3 = await appStorage.get("dp_tickets");   if (r3) setTickets(JSON.parse(r3));   } catch(e) {}
try { const r4 = await appStorage.get("dp_productos"); if (r4) setProductos(JSON.parse(r4)); } catch(e) {}
try { const r5 = await appStorage.get("dp_visitas");   if (r5) setVisitas(JSON.parse(r5));   } catch(e) {}
try { const r6 = await appStorage.get("dp_cupones");   if (r6) setCupones(JSON.parse(r6));   } catch(e) {}
dataLoaded.current = true;
setStorageReady(true);
};
load();
}, []);

// ── Guardado inmediato: cada cambio se persiste al instante a Firebase ──
const saveNow = useCallback(async (key, data) => {
if (!dataLoaded.current) return; // No guardar si los datos aún no se cargaron de Firebase
setSavingIndicator(true);
try { await appStorage.set(key, JSON.stringify(data)); } catch(e) { console.warn('Error guardando', key, e); }
setTimeout(() => setSavingIndicator(false), 600);
}, []);

// Helpers: guardan a Firebase inmediatamente al cambiar estado
const savePedidos = useCallback((next) => {
setPedidos(prev => {
const data = typeof next === 'function' ? next(prev) : next;
saveNow("dp_pedidos", data);
return data;
});
}, [saveNow]);
const saveTickets = useCallback((next) => {
setTickets(prev => {
const data = typeof next === 'function' ? next(prev) : next;
saveNow("dp_tickets", data);
return data;
});
}, [saveNow]);
const saveVisitas = useCallback((next) => {
setVisitas(prev => {
const data = typeof next === 'function' ? next(prev) : next;
saveNow("dp_visitas", data);
return data;
});
}, [saveNow]);
const saveClientes = useCallback((next) => {
setClientes(prev => {
const data = typeof next === 'function' ? next(prev) : next;
if (FIREBASE_URL) {
fetch(`${FIREBASE_URL}/drparrilla/dp_clientes.json`)
.then(r => r.json())
.then(fbData => {
if (fbData && Array.isArray(fbData)) {
const newIds = new Set(data.map(c => c.id));
const fbOnly = fbData.filter(c => !newIds.has(c.id));
if (fbOnly.length > 0) {
const merged = [...data, ...fbOnly];
appStorage.set("dp_clientes", JSON.stringify(merged));
setClientes(merged);
return;
}
}
appStorage.set("dp_clientes", JSON.stringify(data));
})
.catch(() => appStorage.set("dp_clientes", JSON.stringify(data)));
} else {
saveNow("dp_clientes", data);
}
return data;
});
}, [saveNow]);
const saveProductos = useCallback((next) => {
setProductos(prev => {
const data = typeof next === 'function' ? next(prev) : next;
saveNow("dp_productos", data);
return data;
});
}, [saveNow]);
const saveCupones = useCallback((next) => {
setCupones(prev => {
const data = typeof next === 'function' ? next(prev) : next;
saveNow("dp_cupones", data);
return data;
});
}, [saveNow]);

// ── Auto-save de respaldo: guarda TODO cada 15s por si algo se escapó ──
useEffect(() => {
if (!storageReady || !dataLoaded.current) return;
const timer = setTimeout(async () => {
try { await appStorage.set("dp_clientes",  JSON.stringify(clientes)); } catch(e) {}
try { await appStorage.set("dp_pedidos",   JSON.stringify(pedidos)); } catch(e) {}
try { await appStorage.set("dp_tickets",   JSON.stringify(tickets)); } catch(e) {}
try { await appStorage.set("dp_productos", JSON.stringify(productos)); } catch(e) {}
try { await appStorage.set("dp_visitas",  JSON.stringify(visitas));   } catch(e) {}
try { await appStorage.set("dp_cupones",  JSON.stringify(cupones));   } catch(e) {}
}, 15000);
return () => clearTimeout(timer);
}, [clientes, pedidos, tickets, productos, visitas, cupones, storageReady]);

// ── Polling: sync desde Firebase cada 20s (lee TODAS las colecciones) ──
useEffect(() => {
if (!firebaseOk || !FIREBASE_URL || !dataLoaded.current) return;
const poll = setInterval(async () => {
try {
const [r1, r2, r3, r4, r5, r6] = await Promise.all([
fetch(`${FIREBASE_URL}/drparrilla/dp_pedidos.json`),
fetch(`${FIREBASE_URL}/drparrilla/dp_tickets.json`),
fetch(`${FIREBASE_URL}/drparrilla/dp_clientes.json`),
fetch(`${FIREBASE_URL}/drparrilla/dp_productos.json`),
fetch(`${FIREBASE_URL}/drparrilla/dp_visitas.json`),
fetch(`${FIREBASE_URL}/drparrilla/dp_cupones.json`)
]);
const [fbPedidos, fbTickets, fbClientes, fbProductos, fbVisitas, fbCupones] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json(), r5.json(), r6.json()]);
if (fbPedidos) setPedidos(prev => JSON.stringify(prev)===JSON.stringify(fbPedidos) ? prev : fbPedidos);
if (fbTickets) setTickets(prev => JSON.stringify(prev)===JSON.stringify(fbTickets) ? prev : fbTickets);
if (fbClientes) setClientes(prev => {
if (JSON.stringify(prev)===JSON.stringify(fbClientes)) return prev;
const fbIds = new Set(fbClientes.map(c => c.id));
const localOnly = prev.filter(c => !fbIds.has(c.id));
if (localOnly.length > 0) {
const merged = [...fbClientes, ...localOnly];
appStorage.set("dp_clientes", JSON.stringify(merged));
return merged;
}
return fbClientes;
});
if (fbProductos) setProductos(prev => JSON.stringify(prev)===JSON.stringify(fbProductos) ? prev : fbProductos);
if (fbVisitas) setVisitas(prev => JSON.stringify(prev)===JSON.stringify(fbVisitas) ? prev : fbVisitas);
if (fbCupones) setCupones(prev => JSON.stringify(prev)===JSON.stringify(fbCupones) ? prev : fbCupones);
} catch(e) {}
}, 20000);
return () => clearInterval(poll);
}, [firebaseOk]);

if (!logged) return (
<div style={{ fontFamily:"Georgia, serif",background:DARK,color:"#F0F0F0",minHeight:"100vh",maxWidth:430,margin:"0 auto" }}>
<LoginScreen clientes={clientes} onLogin={(admin,cliente,esAdmin) => { setAdminUser(admin); setClienteUser(cliente); setIsAdmin(esAdmin); setActive(esAdmin?"admin-orders":"home"); setLogged(true); }} />
</div>
);

const screens = {
home:             () => <HomeScreen setActive={setActive} clienteUser={clienteUser} pedidos={pedidos} cupones={cupones} />,
catalogo:         () => <CatalogoScreen productos={productos} />,
pedidos:          () => <PedidosScreen setPedidos={savePedidos} pedidos={pedidos} clienteUser={clienteUser} cupones={cupones} setCupones={saveCupones} />,
soporte:          () => <SoporteScreen tickets={tickets} setTickets={saveTickets} clienteUser={clienteUser} />,
"admin-orders":   () => <AdminOrders pedidos={pedidos} setPedidos={savePedidos} clientes={clientes} adminUser={adminUser} productos={productos} />,
"admin-tickets":  () => <AdminTickets tickets={tickets} setTickets={saveTickets} clientes={clientes} />,
"admin-clientes": () => <AdminClientes clientes={clientes} setClientes={saveClientes} />,
"admin-catalog":  () => <AdminCatalog productos={productos} setProductos={saveProductos} />,
"admin-cupones":  () => <AdminCupones cupones={cupones} setCupones={saveCupones} clientes={clientes} pedidos={pedidos} />,
"admin-resenas":  () => <AdminResenas pedidos={pedidos} clientes={clientes} />,
"admin-visitas":  () => <AdminVisitas visitas={visitas} setVisitas={saveVisitas} />,
"cupones":        () => <MisCuponesScreen cupones={cupones} clienteUser={clienteUser} />,
"agendar":        () => <AgendarVisitaScreen visitas={visitas} setVisitas={saveVisitas} clienteUser={clienteUser} />,
};
const Screen = screens[active] || screens["home"];

return (
<div style={{ fontFamily:"Georgia, serif",background:"linear-gradient(180deg, #0B0D10 0%, #09090B 15%, #080808 40%, #080A08 70%, #0A0808 100%)",color:"#F0F0F0",minHeight:"100vh",maxWidth:430,margin:"0 auto",position:"relative" }}>
<div style={{ background:"#080808", padding:"10px 20px 6px", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:"#555", fontFamily:"sans-serif" }}>
<span style={{ fontSize:10, minWidth:50, fontFamily:"sans-serif" }}>
{savingIndicator
? <span style={{ color:GOLD }}>💾 ...</span>
: FIREBASE_URL
? <span style={{ color: firebaseOk ? "#4CAF50" : "#E57373" }}>{firebaseOk ? "🔥 sync" : "📵 local"}</span>
: <span style={{ color:"#555" }}>📵 local</span>
}
</span>
<LogoIcon size={20} />
<span onClick={() => { setLogged(false);setActive("home");setAdminUser(null);setClienteUser(null);setIsAdmin(false); }} style={{ cursor:"pointer", color:"#E57373" }}>Salir</span>
</div>
{isAdmin && adminUser && (
<div style={{ background:"#0D0500", padding:"5px 16px", fontSize:10, fontFamily:"sans-serif", letterSpacing:"1px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<span style={{ color:GOLD }}>{adminUser.nombre} · {adminUser.rol}</span>
{FIREBASE_URL
? <span style={{ color: firebaseOk ? "#4CAF50" : "#E57373" }}>
{firebaseOk ? "🔥 Firebase sync" : "⚠️ Sin conexión"}
</span>
: <span style={{ color:"#666" }}>💾 Local -- configura Firebase</span>
}
</div>
)}
<div style={{ overflowY:"auto",maxHeight:"calc(100vh - 120px)" }}>
{Screen()}
</div>
<BottomNav active={active} setActive={setActive} isAdmin={isAdmin} />
</div>
);
}