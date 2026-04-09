import { useState, useRef, useEffect } from "react";
import React from "react";

// ── EUROPEAN PREMIUM DESIGN SYSTEM ──────────────────────────────────────────
const GOLD        = "#C8A96E";
const GOLD_LIGHT  = "#E2C98A";
const GOLD_DARK   = "#9A7A3E";
const CREAM       = "#F5EDD6";
const DARK        = "#080808";
const DARK2       = "#0C0C0C";
const DARK3       = "#10131A";
const CARD        = "#0F1115";
const CARD2       = "#13161C";
const BORDER      = "#1D2025";
const BORDER2     = "#292E36";
const RED         = "#C0392B";
const GREEN       = "#27AE60";
const ORANGE      = "#E67E22";

const WA_NUMBER = "595994389932";
const GOOGLE_REVIEW_URL = "https://share.google/D7XEt1nQQzynvpxG5";

// ── FIREBASE + LOCAL STORAGE (MANUAL SAVE) ─────────────────────────────────
// IMPORTANTE: Reemplaza esta URL con tu Firebase Realtime Database URL
const FIREBASE_URL = "https://doctor-parrilla-clientes-default-rtdb.firebaseio.com";

const appStorage = {
  async get(key) {
    // 1. Try Firebase first
    if (FIREBASE_URL) {
      try {
        const response = await fetch(`${FIREBASE_URL}/drparrilla/${key}.json`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        
        if (response.ok) { 
          const data = await response.json(); 
          if (data !== null) {
            console.log(`✅ Firebase: Loaded ${key}`);
            return JSON.stringify(data);
          }
        } else if (response.status === 401 || response.status === 403) {
          console.error(`❌ Firebase: Permission denied for ${key}`);
        }
      } catch(error) {
        console.warn(`⚠️ Firebase read failed for ${key}:`, error.message);
      }
    }
    
    // 2. Fallback to localStorage
    try { 
      const data = localStorage.getItem(key);
      if (data) {
        console.log(`📱 localStorage: Loaded ${key}`);
        return data;
      }
    } catch(e) { 
      console.error(`❌ localStorage read error for ${key}:`, e);
    }
    
    return null;
  },
  
  async set(key, value) {
    let savedToFirebase = false;
    
    // 1. Save to Firebase (primary)
    if (FIREBASE_URL) {
      try {
        const response = await fetch(`${FIREBASE_URL}/drparrilla/${key}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: value
        });
        
        if (response.ok) {
          console.log(`✅ Firebase: Saved ${key}`);
          savedToFirebase = true;
        } else if (response.status === 401 || response.status === 403) {
          console.error(`❌ Firebase: Permission denied for ${key}`);
        }
      } catch(error) {
        console.warn(`⚠️ Firebase write failed for ${key}:`, error.message);
      }
    }
    
    // 2. Always backup to localStorage
    try { 
      localStorage.setItem(key, value);
      console.log(`📱 localStorage: Saved ${key}`);
    } catch(e) { 
      console.error(`❌ localStorage write error for ${key}:`, e);
    }
    
    return savedToFirebase;
  }
};

async function checkFirebase() {
  if (!FIREBASE_URL) return false;
  try {
    const response = await fetch(`${FIREBASE_URL}/.json?shallow=true`, { 
      signal: AbortSignal.timeout(3000),
      method: "GET"
    });
    const ok = response.ok;
    console.log(`🔥 Firebase: ${ok ? "CONNECTED" : "DISCONNECTED"}`);
    return ok;
  } catch(e) { 
    console.warn(`⚠️ Firebase connection check failed:`, e.message);
    return false;
  }
}

// ── ADMIN USERS ────────────────────────────────────────────────────────────
const ADMIN_USERS = [
  { phone: "0991935364", password: "drp2026", nombre: "Samuel García",  rol: "CEO",                avatar: "SG" },
  { phone: "0981707549", password: "drp2026", nombre: "Jorge",           rol: "Gerente General",    avatar: "JG" },
  { phone: "0992369143", password: "drp2026", nombre: "David",           rol: "Jefe de Producción", avatar: "DV" },
  { phone: "0982234753", password: "drp2026", nombre: "Dalila García",   rol: "Presidente",         avatar: "DG" },
];

function normalizePhone(p) { return p.replace(/[\s\-().]/g, ""); }
function findAdmin(phone, pass) {
  const c = normalizePhone(phone);
  const u = ADMIN_USERS.find(u => normalizePhone(u.phone)===c);
  if (!u) return null;
  if (pass !== undefined && u.password !== pass) return null;
  return u;
}

// ── COMPONENTS ──────────────────────────────────────────────────────────────
function Header({ title, subtitle, back, onBack }) {
  return (
    <div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${BORDER}` }}>
      {back && <button onClick={onBack} style={{ background:"none", border:"none", color:GOLD, cursor:"pointer", fontSize:20, marginBottom:12 }}>← Volver</button>}
      <div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:4 }}>{subtitle}</div>
      <div style={{ fontSize:22, fontWeight:"bold" }}>{title}</div>
    </div>
  );
}

function SaveButton({ onClick, loading, success }) {
  return (
    <button onClick={onClick} style={{
      width:"100%",
      background: success ? GREEN : GOLD,
      color: DARK,
      padding:"14px",
      borderRadius:10,
      border:"none",
      fontWeight:"bold",
      cursor: loading ? "wait" : "pointer",
      fontSize:15,
      fontFamily:"sans-serif",
      letterSpacing:"1px",
      opacity: loading ? 0.7 : 1,
      transition:"all 0.3s ease"
    }}>
      {loading ? "💾 Guardando..." : success ? "✅ Guardado" : "💾 Guardar Cambios"}
    </button>
  );
}

function LoginScreen({ clientes, onLogin }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const handleLogin = (e) => {
    e.preventDefault();
    const admin = findAdmin(phone, password);
    if (admin) {
      onLogin(admin, null, true);
      return;
    }
    setError("Credenciales inválidas");
  };
  
  return (
    <div style={{ padding:"40px 20px", display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔥</div>
        <h1 style={{ fontSize:28, fontWeight:"bold", color:CREAM, marginBottom:8 }}>Doctor Parrilla</h1>
        <p style={{ fontSize:14, color:GOLD_LIGHT }}>Sistema de Gestión Premium</p>
      </div>
      
      <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" style={{ width:"100%", padding:"12px", background:CARD, border:`1px solid ${BORDER}`, color:CREAM, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" style={{ width:"100%", padding:"12px", background:CARD, border:`1px solid ${BORDER}`, color:CREAM, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }} />
        {error && <div style={{ color:RED, fontSize:12, fontFamily:"sans-serif" }}>{error}</div>}
        <button type="submit" style={{ background:GOLD, color:DARK, padding:"12px", borderRadius:8, border:"none", fontWeight:"bold", cursor:"pointer", fontSize:14 }}>Ingresar</button>
      </form>
      
      <div style={{ fontSize:11, color:"#666", fontFamily:"sans-serif", textAlign:"center", marginTop:20 }}>
        <p>Demo: 0991935364 / drp2026</p>
      </div>
    </div>
  );
}

function AdminClientes({ clientes, setClientes, onSave }) {
  const [view, setView] = useState("list");
  const [idx, setIdx] = useState(null);
  const [form, setForm] = useState({ nombre:"", tel:"", dir:"", historial:"", codigo:"" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  
  const openAdd = () => {
    setForm({ nombre:"", tel:"", dir:"", historial:"", codigo:"" });
    setIdx(null);
    setError("");
    setView("form");
  };
  
  const openEdit = (i) => {
    setForm({ ...clientes[i] });
    setIdx(i);
    setError("");
    setView("form");
  };
  
  const guardar = async () => {
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (normalizePhone(form.tel).length < 7) {
      setError("Ingresá un número válido");
      return;
    }
    
    setSaving(true);
    let next;
    
    if (idx === null) {
      next = [...clientes, { 
        ...form, 
        id:`C-${String(clientes.length+1).padStart(3,"0")}`, 
        tel:normalizePhone(form.tel) 
      }];
    } else {
      next = clientes.map((c,i) => i===idx ? { ...c, ...form, tel:normalizePhone(form.tel) } : c);
    }
    
    setClientes(next);
    await onSave("dp_clientes", next);
    
    setSaving(false);
    setView("list");
    setForm({ nombre:"", tel:"", dir:"", historial:"", codigo:"" });
    setError("");
  };
  
  const eliminar = async (i) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este cliente?")) return;
    setSaving(true);
    const next = clientes.filter((_,j)=>j!==i);
    setClientes(next);
    await onSave("dp_clientes", next);
    setSaving(false);
    setView("list");
  };
  
  if (view === "form") {
    return (
      <div style={{ paddingBottom:80 }}>
        <Header title={idx===null?"Nuevo Cliente":"Editar Cliente"} subtitle="GESTIÓN DE CLIENTES" back onBack={() => setView("list")} />
        <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <div style={{ fontSize:11, color:GOLD, fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:8 }}>CÓDIGO DE CLIENTE</div>
            <input placeholder="Ej: CLI-001, VIP-GARCIA..." value={form.codigo || ""} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})}
              style={{ width:"100%", background:CARD, border:`1px solid ${GOLD}55`, color:GOLD, padding:"14px 16px", borderRadius:8, fontSize:15, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box", fontWeight:"bold", letterSpacing:"2px" }} />
          </div>
          
          <div>
            <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:8 }}>NOMBRE COMPLETO *</div>
            <input placeholder="Ej: Juan Pérez" value={form.nombre} onChange={e => setForm({...form, nombre:e.target.value})}
              style={{ width:"100%", background:CARD, border:`1px solid ${BORDER}`, color:"#F0F0F0", padding:"14px 16px", borderRadius:8, fontSize:15, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box" }} />
          </div>
          
          <div>
            <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:8 }}>TELÉFONO *</div>
            <input placeholder="09XX XXX XXX" value={form.tel} onChange={e => setForm({...form, tel:e.target.value})}
              style={{ width:"100%", background:CARD, border:`1px solid ${BORDER}`, color:"#F0F0F0", padding:"14px 16px", borderRadius:8, fontSize:15, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box" }} />
          </div>
          
          <div>
            <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:8 }}>DIRECCIÓN</div>
            <input placeholder="Calle, ciudad..." value={form.dir} onChange={e => setForm({...form, dir:e.target.value})}
              style={{ width:"100%", background:CARD, border:`1px solid ${BORDER}`, color:"#F0F0F0", padding:"14px 16px", borderRadius:8, fontSize:15, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box" }} />
          </div>
          
          <div>
            <div style={{ fontSize:11, color:"#888", fontFamily:"sans-serif", letterSpacing:"1px", marginBottom:8 }}>HISTORIAL / REFERENCIA</div>
            <textarea value={form.historial} onChange={e => setForm({...form, historial:e.target.value})} placeholder="Observaciones, preferencias, historial de compras…"
              style={{ width:"100%", height:100, background:CARD, border:`1px solid ${BORDER}`, color:"#F0F0F0", padding:"14px", borderRadius:8, fontSize:14, fontFamily:"sans-serif", outline:"none", resize:"none", boxSizing:"border-box" }} />
          </div>
          
          {error && <div style={{ fontSize:12, color:RED, fontFamily:"sans-serif" }}>❌ {error}</div>}
          
          <SaveButton onClick={guardar} loading={saving} success={false} />
          
          {idx !== null && (
            <button onClick={() => eliminar(idx)} style={{ width:"100%", background:"none", border:`1px solid ${RED}`, color:RED, padding:"14px", borderRadius:10, fontSize:14, fontFamily:"sans-serif", cursor:"pointer" }}>
              🗑 Eliminar cliente
            </button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ fontSize:10, color:GOLD, fontFamily:"sans-serif", letterSpacing:"3px", marginBottom:4 }}>PANEL DE GESTIÓN</div>
        <div style={{ fontSize:22, fontWeight:"bold" }}>Clientes</div>
      </div>
      
      <div style={{ padding:"16px 16px 0", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:4 }}>
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"14px", textAlign:"center" }}>
          <div style={{ fontSize:28, fontWeight:"bold", color:GOLD }}>{clientes.length}</div>
          <div style={{ fontSize:11, color:"#666", fontFamily:"sans-serif", marginTop:2 }}>Total</div>
        </div>
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"14px", textAlign:"center" }}>
          <div style={{ fontSize:28, fontWeight:"bold", color:GREEN }}>{clientes.filter(c=>c.historial).length}</div>
          <div style={{ fontSize:11, color:"#666", fontFamily:"sans-serif", marginTop:2 }}>Con historial</div>
        </div>
      </div>
      
      <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
        <button onClick={openAdd} style={{ background:`${GOLD}11`, border:`1px solid ${GOLD}55`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}>
          <div style={{ width:44, height:44, background:GOLD+"22", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>➕</div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:16, fontWeight:"bold", color:GOLD }}>Agregar cliente</div>
            <div style={{ fontSize:12, color:"#888", fontFamily:"sans-serif" }}>Nuevo registro en el sistema</div>
          </div>
        </button>
        
        {clientes.map((c, i) => (
          <div key={c.id || i} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"16px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:GOLD+"18", border:`1px solid ${GOLD}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>👤</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:"bold", color:"#F0F0F0" }}>{c.nombre}</div>
              <div style={{ fontSize:12, color:GOLD_LIGHT, fontFamily:"sans-serif" }}>{c.tel}{c.codigo ? ` · ${c.codigo}` : ""}</div>
            </div>
            <button onClick={() => openEdit(i)} style={{ background:GOLD+"22", border:`1px solid ${GOLD}44`, color:GOLD, padding:"8px 14px", borderRadius:8, fontFamily:"sans-serif", fontSize:12, cursor:"pointer", flexShrink:0 }}>✏️ Editar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPedidos({ pedidos, setPedidos, clientes, onSave }) {
  return (
    <div style={{ padding:"20px", paddingBottom:100 }}>
      <Header title="Pedidos" subtitle="GESTIÓN DE PEDIDOS" />
      <div style={{ color:GOLD, marginTop:20 }}>Próximamente: Sistema de pedidos con sincronización en tiempo real</div>
    </div>
  );
}

function AdminTickets({ tickets, setTickets, onSave }) {
  return (
    <div style={{ padding:"20px", paddingBottom:100 }}>
      <Header title="Tickets" subtitle="SOPORTE TÉCNICO" />
      <div style={{ color:GOLD, marginTop:20 }}>Próximamente: Sistema de tickets de soporte</div>
    </div>
  );
}

function AdminCatalog({ productos, setProductos, onSave }) {
  return (
    <div style={{ padding:"20px", paddingBottom:100 }}>
      <Header title="Catálogo" subtitle="GESTIÓN DE PRODUCTOS" />
      <div style={{ color:GOLD, marginTop:20 }}>Próximamente: Gestión de productos</div>
    </div>
  );
}

function BottomNav({ active, setActive, isAdmin }) {
  const items = isAdmin 
    ? [
        { id:"admin-clientes", label:"Clientes", icon:"👥" },
        { id:"admin-orders", label:"Pedidos", icon:"📦" },
        { id:"admin-tickets", label:"Tickets", icon:"💬" },
        { id:"admin-catalog", label:"Catálogo", icon:"🔥" },
      ]
    : [];
  
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:DARK2, borderTop:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-around", maxWidth:430, margin:"0 auto" }}>
      {items.map(item => (
        <button key={item.id} onClick={() => setActive(item.id)} style={{ flex:1, background:"none", border:"none", color:active===item.id?GOLD:"#666", cursor:"pointer", padding:"12px", fontSize:12, fontFamily:"sans-serif", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:20 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [logged, setLogged] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [active, setActive] = useState("admin-clientes");
  const [pedidos, setPedidos] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [storageReady, setStorageReady] = useState(false);
  const [firebaseOk, setFirebaseOk] = useState(false);
  const [lastSave, setLastSave] = useState(null);

  // ── Load from storage on mount ──
  React.useEffect(() => {
    const load = async () => {
      console.log("🔄 Loading data from storage...");
      const fbOk = await checkFirebase();
      setFirebaseOk(fbOk);
      
      try { 
        const r1 = await appStorage.get("dp_clientes");  
        if (r1) { 
          const parsed = JSON.parse(r1);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClientes(parsed);
            console.log(`✅ Loaded ${parsed.length} clientes`);
          }
        }
      } catch(e) { console.error("Error loading clientes:", e); }
      
      try { 
        const r2 = await appStorage.get("dp_pedidos");   
        if (r2) { 
          const parsed = JSON.parse(r2);
          if (Array.isArray(parsed) && parsed.length > 0) setPedidos(parsed);
        }
      } catch(e) { console.error("Error loading pedidos:", e); }
      
      try { 
        const r3 = await appStorage.get("dp_tickets");   
        if (r3) { 
          const parsed = JSON.parse(r3);
          if (Array.isArray(parsed) && parsed.length > 0) setTickets(parsed);
        }
      } catch(e) { console.error("Error loading tickets:", e); }
      
      setStorageReady(true);
      console.log("✅ Storage ready");
    };
    load();
  }, []);

  // ── Manual save function ──
  const handleSave = async (key, data) => {
    console.log(`💾 Saving ${key}...`);
    const saved = await appStorage.set(key, JSON.stringify(data));
    setLastSave({ key, saved, time: new Date().toLocaleTimeString() });
    console.log(`✅ Save complete for ${key}`);
  };

  if (!logged) return (
    <div style={{ fontFamily:"Georgia, serif", background:DARK, color:"#F0F0F0", minHeight:"100vh", maxWidth:430, margin:"0 auto" }}>
      <LoginScreen clientes={clientes} onLogin={(admin, _, esAdmin) => {
        setAdminUser(admin);
        setIsAdmin(esAdmin);
        setLogged(true);
      }} />
    </div>
  );

  const screens = {
    "admin-clientes": () => <AdminClientes clientes={clientes} setClientes={setClientes} onSave={handleSave} />,
    "admin-orders": () => <AdminPedidos pedidos={pedidos} setPedidos={setPedidos} clientes={clientes} onSave={handleSave} />,
    "admin-tickets": () => <AdminTickets tickets={tickets} setTickets={setTickets} onSave={handleSave} />,
    "admin-catalog": () => <AdminCatalog productos={productos} setProductos={setProductos} onSave={handleSave} />,
  };
  const Screen = screens[active] || screens["admin-clientes"];

  return (
    <div style={{ fontFamily:"Georgia, serif", background:DARK, color:"#F0F0F0", minHeight:"100vh", maxWidth:430, margin:"0 auto", position:"relative" }}>
      <div style={{ background:"#080808", padding:"10px 20px 6px", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:"#555", fontFamily:"sans-serif" }}>
        <span style={{ fontSize:10, minWidth:50 }}>
          {firebaseOk
            ? <span style={{ color: GREEN }}>🔥 Firebase</span>
            : <span style={{ color:"#E57373" }}>📵 Local</span>
          }
        </span>
        <span style={{ fontSize:12 }}>🔥 Doctor Parrilla</span>
        <span onClick={() => { setLogged(false); setAdminUser(null); }} style={{ cursor:"pointer", color:RED }}>Salir</span>
      </div>
      
      {adminUser && (
        <div style={{ background:"#0D0500", padding:"10px 16px", fontSize:11, fontFamily:"sans-serif", letterSpacing:"1px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ color:GOLD }}>👤 {adminUser.nombre}</span>
          <span style={{ color:"#666", fontSize:10 }}>
            {lastSave ? `Última sincronización: ${lastSave.time}` : "Listo para guardar"}
          </span>
        </div>
      )}
      
      <div style={{ overflowY:"auto", maxHeight:"calc(100vh - 140px)" }}>
        {Screen()}
      </div>
      
      <BottomNav active={active} setActive={setActive} isAdmin={isAdmin} />
    </div>
  );
}
