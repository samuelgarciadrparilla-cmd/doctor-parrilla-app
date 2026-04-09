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

// ── FIREBASE REALTIME DATABASE ──────────────────────────────────────────────
// IMPORTANTE: Reemplaza con tu URL de Firebase
const FIREBASE_URL = "https://doctor-parrilla-clientes-default-rtdb.firebaseio.com";

class FirebaseSync {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.listeners = {};
  }

  async get(path) {
    if (!this.baseUrl) return null;
    try {
      const response = await fetch(`${this.baseUrl}/${path}.json`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Firebase GET: ${path}`, data);
        return data;
      }
    } catch (error) {
      console.warn(`⚠️ Firebase GET failed for ${path}:`, error.message);
    }
    return null;
  }

  async set(path, data) {
    if (!this.baseUrl) {
      console.warn("⚠️ Firebase URL not configured");
      return false;
    }
    try {
      const response = await fetch(`${this.baseUrl}/${path}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        console.log(`✅ Firebase SET: ${path}`);
        return true;
      } else {
        console.error(`❌ Firebase SET failed for ${path}:`, response.status);
      }
    } catch (error) {
      console.error(`❌ Firebase SET error for ${path}:`, error.message);
    }
    return false;
  }

  async update(path, data) {
    if (!this.baseUrl) return false;
    try {
      const response = await fetch(`${this.baseUrl}/${path}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        console.log(`✅ Firebase UPDATE: ${path}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Firebase UPDATE error:`, error.message);
    }
    return false;
  }

  async delete(path) {
    if (!this.baseUrl) return false;
    try {
      const response = await fetch(`${this.baseUrl}/${path}.json`, {
        method: "DELETE"
      });
      if (response.ok) {
        console.log(`✅ Firebase DELETE: ${path}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Firebase DELETE error:`, error.message);
    }
    return false;
  }

  // Polling para sincronización en tiempo real
  poll(path, callback, interval = 3000) {
    const pollId = `${path}_${Date.now()}`;
    const pollFn = async () => {
      const data = await this.get(path);
      if (data) callback(data);
    };
    
    this.listeners[pollId] = setInterval(pollFn, interval);
    pollFn(); // Ejecutar inmediatamente
    console.log(`🔄 Polling started for ${path} (${interval}ms)`);
    
    return () => {
      clearInterval(this.listeners[pollId]);
      delete this.listeners[pollId];
      console.log(`🛑 Polling stopped for ${path}`);
    };
  }

  stopAllListeners() {
    Object.values(this.listeners).forEach(listener => clearInterval(listener));
    this.listeners = {};
  }
}

const firebase = new FirebaseSync(FIREBASE_URL);

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

function SaveButton({ onClick, loading, label = "Guardar Cambios" }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width:"100%",
      background: loading ? "#666" : GOLD,
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
      {loading ? "💾 Guardando..." : `💾 ${label}`}
    </button>
  );
}

function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const handleLogin = (e) => {
    e.preventDefault();
    const admin = findAdmin(phone, password);
    if (admin) {
      onLogin(admin, true);
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
        {error && <div style={{ color:RED, fontSize:12, fontFamily:"sans-serif" }}>❌ {error}</div>}
        <button type="submit" style={{ background:GOLD, color:DARK, padding:"12px", borderRadius:8, border:"none", fontWeight:"bold", cursor:"pointer", fontSize:14 }}>Ingresar</button>
      </form>
      
      <div style={{ fontSize:11, color:"#666", fontFamily:"sans-serif", textAlign:"center", marginTop:20 }}>
        <p>Demo: 0991935364 / drp2026</p>
      </div>
    </div>
  );
}

function AdminClientes({ clientes, setClientes, firebaseOk }) {
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
    
    // Guardar en Firebase
    if (firebaseOk) {
      await firebase.set("drparrilla/dp_clientes", next);
    }
    
    // Guardar en localStorage como respaldo
    try {
      localStorage.setItem("dp_clientes", JSON.stringify(next));
    } catch(e) {}
    
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
    
    if (firebaseOk) {
      await firebase.set("drparrilla/dp_clientes", next);
    }
    
    try {
      localStorage.setItem("dp_clientes", JSON.stringify(next));
    } catch(e) {}
    
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
          
          <SaveButton onClick={guardar} loading={saving} label={idx===null?"Crear Cliente":"Actualizar Cliente"} />
          
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

function AdminPedidos() {
  return (
    <div style={{ padding:"20px", paddingBottom:100 }}>
      <Header title="Pedidos" subtitle="GESTIÓN DE PEDIDOS" />
      <div style={{ color:GOLD, marginTop:20 }}>📦 Próximamente: Sistema de pedidos con sincronización en tiempo real</div>
    </div>
  );
}

function AdminTickets() {
  return (
    <div style={{ padding:"20px", paddingBottom:100 }}>
      <Header title="Tickets" subtitle="SOPORTE TÉCNICO" />
      <div style={{ color:GOLD, marginTop:20 }}>💬 Próximamente: Sistema de tickets de soporte</div>
    </div>
  );
}

function AdminCatalog() {
  return (
    <div style={{ padding:"20px", paddingBottom:100 }}>
      <Header title="Catálogo" subtitle="GESTIÓN DE PRODUCTOS" />
      <div style={{ color:GOLD, marginTop:20 }}>🔥 Próximamente: Gestión de productos</div>
    </div>
  );
}

function BottomNav({ active, setActive }) {
  const items = [
    { id:"admin-clientes", label:"Clientes", icon:"👥" },
    { id:"admin-orders", label:"Pedidos", icon:"📦" },
    { id:"admin-tickets", label:"Tickets", icon:"💬" },
    { id:"admin-catalog", label:"Catálogo", icon:"🔥" },
  ];
  
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
  const [adminUser, setAdminUser] = useState(null);
  const [active, setActive] = useState("admin-clientes");
  const [clientes, setClientes] = useState([]);
  const [firebaseOk, setFirebaseOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef(null);

  // ── Load data on mount and setup realtime sync ──
  React.useEffect(() => {
    const initializeApp = async () => {
      console.log("🚀 Initializing Doctor Parrilla...");
      
      // Check Firebase connection
      try {
        const response = await fetch(`${FIREBASE_URL}/.json?shallow=true`);
        setFirebaseOk(response.ok);
        console.log(`🔥 Firebase: ${response.ok ? "CONNECTED" : "DISCONNECTED"}`);
      } catch(e) {
        console.warn("⚠️ Firebase connection failed");
        setFirebaseOk(false);
      }
      
      // Load initial data
      try {
        const data = await firebase.get("drparrilla/dp_clientes");
        if (data && Array.isArray(data)) {
          setClientes(data);
          localStorage.setItem("dp_clientes", JSON.stringify(data));
          console.log(`✅ Loaded ${data.length} clientes`);
        } else {
          // Try localStorage
          const stored = localStorage.getItem("dp_clientes");
          if (stored) {
            setClientes(JSON.parse(stored));
          }
        }
      } catch(e) {
        console.error("Error loading data:", e);
      }
      
      setLoading(false);
      
      // Setup realtime polling
      unsubscribeRef.current = firebase.poll("drparrilla/dp_clientes", (data) => {
        if (Array.isArray(data)) {
          console.log("🔄 Realtime update received:", data);
          setClientes(data);
        }
      }, 2000); // Poll every 2 seconds
    };
    
    initializeApp();
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      firebase.stopAllListeners();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ fontFamily:"Georgia, serif", background:DARK, color:"#F0F0F0", minHeight:"100vh", maxWidth:430, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔥</div>
          <p style={{ color:GOLD }}>Cargando Doctor Parrilla...</p>
        </div>
      </div>
    );
  }

  if (!logged) return (
    <div style={{ fontFamily:"Georgia, serif", background:DARK, color:"#F0F0F0", minHeight:"100vh", maxWidth:430, margin:"0 auto" }}>
      <LoginScreen onLogin={(admin, _) => {
        setAdminUser(admin);
        setLogged(true);
      }} />
    </div>
  );

  const screens = {
    "admin-clientes": () => <AdminClientes clientes={clientes} setClientes={setClientes} firebaseOk={firebaseOk} />,
    "admin-orders": () => <AdminPedidos />,
    "admin-tickets": () => <AdminTickets />,
    "admin-catalog": () => <AdminCatalog />,
  };
  const Screen = screens[active] || screens["admin-clientes"];

  return (
    <div style={{ fontFamily:"Georgia, serif", background:DARK, color:"#F0F0F0", minHeight:"100vh", maxWidth:430, margin:"0 auto", position:"relative" }}>
      <div style={{ background:"#080808", padding:"10px 20px 6px", display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:"#555", fontFamily:"sans-serif" }}>
        <span style={{ fontSize:10 }}>
          {firebaseOk
            ? <span style={{ color: GREEN }}>🔥 Firebase LIVE</span>
            : <span style={{ color:"#E57373" }}>📵 Local Mode</span>
          }
        </span>
        <span style={{ fontSize:12 }}>🔥 Doctor Parrilla</span>
        <span onClick={() => { setLogged(false); setAdminUser(null); }} style={{ cursor:"pointer", color:RED }}>Salir</span>
      </div>
      
      {adminUser && (
        <div style={{ background:"#0D0500", padding:"10px 16px", fontSize:11, fontFamily:"sans-serif", letterSpacing:"1px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ color:GOLD }}>👤 {adminUser.nombre}</span>
          <span style={{ color:"#666", fontSize:10 }}>
            {firebaseOk ? "🔄 Sincronizando en tiempo real..." : "📱 Modo local"}
          </span>
        </div>
      )}
      
      <div style={{ overflowY:"auto", maxHeight:"calc(100vh - 140px)" }}>
        {Screen()}
      </div>
      
      <BottomNav active={active} setActive={setActive} />
    </div>
  );
}
