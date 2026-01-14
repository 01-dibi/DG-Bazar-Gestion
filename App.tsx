
import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, 
  ClipboardList, 
  CheckCircle2, 
  Truck, 
  Search, 
  MessageCircle, 
  ChevronRight, 
  Menu,
  User,
  Package,
  ArrowLeft,
  X,
  Send,
  History,
  Layers,
  LogOut,
  RefreshCcw,
  Navigation,
  UserCheck,
  ShieldAlert,
  Plus,
  Trash2,
  Save,
  ScanSearch
} from 'lucide-react';
import { Order, OrderStatus, View, PackagingEntry, HistoryEntry } from './types';

// Las variables de entorno ahora se inyectan correctamente vía vite.config.ts
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const DEPOSITS = ['E', 'F', 'D1', 'D2', 'A1', 'OTRO'];
const PACKAGE_TYPES = ['CAJA', 'BOLSA', 'PAQUETE', 'BULTO', 'BOBINA', 'OTRO'];

export default function App() {
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  const [view, setView] = useState<View>('DASHBOARD');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGeneralEntryModal, setShowGeneralEntryModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: 'admin' | 'staff' } | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      if (!supabase) {
        const saved = localStorage.getItem('dg_orders');
        if (saved) setOrders(JSON.parse(saved));
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.from('orders').select('payload');
      if (!error && data) {
        setOrders(data.map(d => d.payload as Order));
      }
      setIsLoading(false);

      const channel = supabase
        .channel('db_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new.payload as Order, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new.payload as Order : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    initDatabase();
  }, []);

  const syncOrder = async (order: Order) => {
    if (supabase) {
      await supabase.from('orders').upsert({ id: order.id, payload: order });
    } else {
      setOrders(prev => {
        const exists = prev.find(o => o.id === order.id);
        const newList = exists ? prev.map(o => o.id === order.id ? order : o) : [order, ...prev];
        localStorage.setItem('dg_orders', JSON.stringify(newList));
        return newList;
      });
    }
  };

  const handleSelectOrder = (order: Order) => {
    if (!currentUser) return;
    const isLocked = order.lockedBy && order.lockedBy !== currentUser.name && currentUser.role !== 'admin';
    if (isLocked) {
      alert(`⚠️ EN CURSO: ${order.lockedBy} está editando.`);
      return;
    }
    const updated = { ...order, lockedBy: currentUser.name };
    syncOrder(updated);
    setSelectedOrder(updated);
  };

  const addOrder = (customer: string, locality: string, orderNum: string) => {
    const newOrder: Order = {
      id: Date.now().toString(),
      orderNumber: orderNum || `DG-${Math.floor(Math.random()*900)+100}`,
      customerName: customer,
      locality: locality,
      status: OrderStatus.PENDING,
      items: [],
      packaging: { bolsas: 0, bultos: 0, cajas: 0 },
      detailedPackaging: [],
      reviewer: currentUser?.name || '',
      createdAt: new Date().toISOString(),
      source: 'Manual',
      history: [{ status: OrderStatus.PENDING, label: 'Ingreso a sistema', timestamp: new Date().toISOString() }]
    };
    syncOrder(newOrder);
  };

  const filteredOrders = useMemo(() => {
    let base = orders;
    if (view === 'PENDING') base = orders.filter(o => o.status === OrderStatus.PENDING);
    if (view === 'COMPLETED') base = orders.filter(o => o.status === OrderStatus.COMPLETED);
    if (view === 'DISPATCHED') base = orders.filter(o => o.status === OrderStatus.DISPATCHED);
    const lowSearch = searchTerm.toLowerCase();
    return base.filter(o => o.customerName.toLowerCase().includes(lowSearch) || o.orderNumber.toLowerCase().includes(lowSearch));
  }, [orders, view, searchTerm]);

  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} allOrders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientPortal={() => setIsCustomerMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 relative font-sans">
      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-xl relative z-10">
        <div className="flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-white/10 rounded-2xl"><Menu size={22} /></button>
          <div className="text-center">
            <h1 className="text-lg font-black uppercase tracking-tighter">D&G LOGISTICA</h1>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${supabase ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></div>
              <p className="text-[7px] font-black tracking-[0.2em] uppercase opacity-80">{supabase ? 'CONECTADO A SUPABASE' : 'MODO LOCAL'}</p>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-teal-500 shadow-lg"><User size={20} /></div>
        </div>
      </header>

      <main className="p-5 space-y-6">
        {isLoading ? (
          <div className="text-center py-20"><RefreshCcw className="animate-spin mx-auto text-teal-600 mb-4" size={40} /><p className="text-[10px] font-black uppercase opacity-40">Accediendo a DG_LOGISTICA...</p></div>
        ) : view === 'DASHBOARD' ? (
          <div className="grid grid-cols-2 gap-4">
            <StatCard count={orders.filter(o => o.status === OrderStatus.PENDING).length} label="PENDIENTES" color="bg-orange-500" icon={<ClipboardList size={20} />} onClick={() => setView('PENDING')} />
            <StatCard count={orders.filter(o => o.status === OrderStatus.COMPLETED).length} label="COMPLETOS" color="bg-emerald-600" icon={<CheckCircle2 size={20} />} onClick={() => setView('COMPLETED')} />
            <StatCard count={orders.length} label="HISTORIAL" color="bg-teal-600" icon={<History size={20} />} onClick={() => setView('ALL')} />
            <StatCard count={orders.filter(o => o.status === OrderStatus.DISPATCHED).length} label="DESPACHO" color="bg-indigo-600" icon={<Truck size={20} />} onClick={() => setView('DISPATCHED')} />
            <button onClick={() => setShowGeneralEntryModal(true)} className="col-span-2 bg-slate-900 text-white rounded-[32px] p-6 flex items-center justify-between shadow-xl active:scale-95 transition-all">
              <div className="flex items-center gap-4"><div className="bg-teal-500 p-3 rounded-2xl"><Layers size={24} /></div><p className="font-black text-lg uppercase">ENTRADA GENERAL</p></div>
              <ChevronRight size={24} className="text-teal-500" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase tracking-widest"><ArrowLeft size={16} /> Volver</button>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Filtrar por nombre o nro..." className="w-full bg-white border-2 border-slate-100 rounded-3xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-teal-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3">
              {filteredOrders.map(order => (
                <div key={order.id} onClick={() => handleSelectOrder(order)} className={`bg-white border-2 rounded-[32px] p-5 shadow-sm relative active:scale-[0.98] transition-all ${order.lockedBy ? 'border-orange-200 bg-orange-50/20' : 'border-slate-50'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">{order.orderNumber}</p>
                    {order.lockedBy && <div className="text-[7px] font-black text-orange-600 uppercase flex items-center gap-1 animate-pulse"><UserCheck size={10}/> EDITANDO: {order.lockedBy}</div>}
                  </div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight">{order.customerName}</h3>
                  <div className="mt-2 text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider">{order.detailedPackaging?.reduce((acc, curr) => acc + curr.quantity, 0) || 0} BULTOS TOTALES</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => { syncOrder({ ...selectedOrder, lockedBy: undefined }); setSelectedOrder(null); }} 
          onSave={syncOrder}
          onStatusUpdate={(status: OrderStatus, data: any) => {
             const updated = { ...selectedOrder, ...data, status, lockedBy: undefined };
             syncOrder(updated);
             setSelectedOrder(null);
          }}
          currentUser={currentUser} 
        />
      )}

      {showGeneralEntryModal && <GeneralEntryModal onClose={() => setShowGeneralEntryModal(false)} onAdd={addOrder} />}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-between items-center z-50 max-w-md mx-auto rounded-t-[40px] shadow-2xl">
        <NavBtn active={view === 'DASHBOARD'} icon={<LayoutDashboard />} onClick={() => setView('DASHBOARD')} />
        <NavBtn active={view === 'PENDING'} icon={<ClipboardList />} onClick={() => setView('PENDING')} />
        <NavBtn active={view === 'COMPLETED'} icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
        <NavBtn active={view === 'DISPATCHED'} icon={<Truck />} onClick={() => setView('DISPATCHED')} />
      </nav>
    </div>
  );
}

const OrderDetailsModal = ({ order, onClose, onSave, onStatusUpdate, currentUser }: any) => {
  const [pkg, setPkg] = useState<PackagingEntry[]>(order.detailedPackaging || []);
  const [loc, setLoc] = useState(DEPOSITS[0]);
  const [custLoc, setCustLoc] = useState('');
  const [type, setType] = useState(PACKAGE_TYPES[0]);
  const [custType, setCustType] = useState('');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState(order.notes || '');

  const total = pkg.reduce((a, c) => a + c.quantity, 0);

  const add = () => {
    if (qty <= 0) return;
    const finalLoc = loc === 'OTRO' ? (custLoc || 'UBICACIÓN MANUAL') : loc;
    const finalType = type === 'OTRO' ? (custType || 'TIPO MANUAL') : type;
    setPkg([...pkg, { id: Date.now().toString(), deposit: finalLoc, type: finalType, quantity: qty }]);
    setCustLoc(''); setCustType('');
    setLoc(DEPOSITS[0]); setType(PACKAGE_TYPES[0]);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[150] flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-[48px] p-6 space-y-6 max-h-[96vh] overflow-y-auto shadow-2xl border-t-[12px] border-indigo-600">
        <div className="flex justify-between items-start border-b pb-4 sticky top-0 bg-white z-20">
          <div><h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{order.customerName}</h2><p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg inline-block mt-2">PEDIDO #{order.orderNumber}</p></div>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-full active:scale-90 transition-all"><X size={20} /></button>
        </div>

        <section className="bg-slate-50 p-6 rounded-[44px] border border-slate-200 shadow-inner space-y-4">
          <div className="text-center py-6 bg-white rounded-[32px] border-2 border-indigo-100 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 relative z-10">BULTOS CONSOLIDADOS</p>
            <span className="text-8xl font-black text-indigo-600 tabular-nums relative z-10 drop-shadow-md">{total}</span>
            <div className="absolute top-0 right-0 p-4 opacity-5"><Package size={80} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">UBICACIÓN</label>
              <select className="w-full bg-white border-2 border-slate-200 p-4 rounded-3xl text-[11px] font-black outline-none focus:border-indigo-400" value={loc} onChange={e => setLoc(e.target.value)}>{DEPOSITS.map(d => <option key={d} value={d}>{d}</option>)}</select>
              {loc === 'OTRO' && <input className="w-full bg-indigo-50 border-2 border-indigo-100 p-4 rounded-3xl text-[11px] font-bold animate-in slide-in-from-top-2" placeholder="Nombre Ubicación..." value={custLoc} onChange={e => setCustLoc(e.target.value.toUpperCase())}/>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">TIPO DE BULTO</label>
              <select className="w-full bg-white border-2 border-slate-200 p-4 rounded-3xl text-[11px] font-black outline-none focus:border-indigo-400" value={type} onChange={e => setType(e.target.value)}>{PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
              {type === 'OTRO' && <input className="w-full bg-indigo-50 border-2 border-indigo-100 p-4 rounded-3xl text-[11px] font-bold animate-in slide-in-from-top-2" placeholder="Nombre Embalaje..." value={custType} onChange={e => setCustType(e.target.value.toUpperCase())}/>}
            </div>
          </div>

          <div className="flex gap-2">
            <input type="number" className="w-24 bg-white border-2 border-slate-200 p-4 rounded-3xl text-center font-black text-indigo-700 text-lg" value={qty} onChange={e => setQty(+e.target.value)}/>
            <button onClick={add} className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-[28px] text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><Plus size={18}/> AGREGAR BULTOS</button>
          </div>

          <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1">
            {pkg.length === 0 ? (
              <p className="text-center text-[10px] font-bold text-slate-300 py-6 uppercase tracking-widest">Esperando carga de bultos...</p>
            ) : pkg.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-3xl flex justify-between items-center border border-slate-100 shadow-sm animate-in slide-in-from-right-2">
                <span className="text-[11px] font-black uppercase text-slate-800"><span className="text-indigo-600 text-lg mr-3">{p.quantity}</span> {p.type} <span className="text-slate-300 mx-1">|</span> {p.deposit}</span>
                <button onClick={() => setPkg(pkg.filter(x => x.id !== p.id))} className="text-red-500 p-2 hover:bg-red-50 rounded-xl"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </section>

        <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-[28px] text-xs h-24 font-medium" placeholder="Notas adicionales del pedido o entrega..." value={notes} onChange={e => setNotes(e.target.value)}/>

        <div className="flex flex-col gap-4 pb-12 pt-2 border-t">
          <button onClick={() => {
            onSave({ ...order, detailedPackaging: pkg, notes });
            alert("✓ Cambios guardados en DG_LOGISTICA");
          }} className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"><Save size={22}/> GUARDAR OPERACIÓN</button>
          
          {order.status === OrderStatus.PENDING && (
            <button onClick={() => onStatusUpdate(OrderStatus.COMPLETED, { detailedPackaging: pkg, notes })} className="w-full bg-emerald-600 text-white font-black py-7 rounded-[32px] uppercase text-xs tracking-widest border-b-8 border-emerald-800 shadow-xl active:scale-95 transition-all">MARCAR COMO LISTO ✅</button>
          )}
          {order.status === OrderStatus.COMPLETED && (
            <button onClick={() => onStatusUpdate(OrderStatus.DISPATCHED, { detailedPackaging: pkg, notes })} className="w-full bg-indigo-600 text-white font-black py-7 rounded-[32px] uppercase text-xs tracking-widest border-b-8 border-indigo-800 shadow-xl active:scale-95 transition-all">ENTREGAR A LOGÍSTICA 🚛</button>
          )}
        </div>
      </div>
    </div>
  );
};

// COMPONENTES DE APOYO
const StatCard = ({ count, label, color, icon, onClick }: any) => (
  <button onClick={onClick} className={`${color} rounded-[40px] p-6 text-white text-left shadow-2xl flex flex-col justify-between h-48 active:scale-95 transition-all overflow-hidden relative group`}>
    <div className="z-10 bg-white/20 p-4 rounded-2xl self-start group-hover:bg-white/30 transition-colors">{icon}</div>
    <div className="z-10"><h3 className="text-6xl font-black tracking-tighter leading-none">{count}</h3><p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-3">{label}</p></div>
    <div className="absolute -bottom-10 -right-10 bg-white/5 w-44 h-44 rounded-full blur-3xl opacity-20"></div>
  </button>
);

const NavBtn = ({ active, icon, onClick }: any) => (
  <button onClick={onClick} className={`p-4 rounded-[24px] transition-all ${active ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-300'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

const GeneralEntryModal = ({ onClose, onAdd }: any) => {
  const [c, setC] = useState(''); const [l, setL] = useState(''); const [n, setN] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[56px] shadow-2xl p-10 space-y-6">
        <h2 className="font-black text-2xl uppercase tracking-tighter text-slate-800 text-center">NUEVA CARGA</h2>
        <div className="space-y-4">
          <input className="w-full bg-slate-50 border-2 rounded-3xl p-5 font-black text-xs uppercase" placeholder="NRO PEDIDO" value={n} onChange={e => setN(e.target.value)} />
          <input className="w-full bg-slate-50 border-2 rounded-3xl p-5 font-black text-xs uppercase" placeholder="CLIENTE" value={c} onChange={e => setC(e.target.value)} />
          <input className="w-full bg-slate-50 border-2 rounded-3xl p-5 font-black text-xs uppercase" placeholder="LOCALIDAD" value={l} onChange={e => setL(e.target.value)} />
          <button onClick={() => { onAdd(c, l, n); onClose(); }} className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] uppercase text-sm tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">INICIAR CONTROL <Send size={22}/></button>
          <button onClick={onClose} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest text-center">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const CustomerPortal = ({ onBack, allOrders }: any) => {
  const [n, setN] = useState(''); const [f, setF] = useState<Order | null>(null);
  const track = () => { const o = allOrders.find((x: Order) => x.orderNumber.toLowerCase() === n.toLowerCase()); setF(o || null); if(!o) alert("Número de pedido no encontrado."); };
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center py-20 space-y-10">
      <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">D&G LOGISTICA</h1>
      <div className="bg-white rounded-[48px] p-8 w-full max-w-md space-y-5 shadow-2xl">
        <input className="w-full bg-slate-50 p-6 rounded-[32px] text-slate-900 font-black uppercase text-center border-2 outline-none focus:border-indigo-500" placeholder="Nro de Pedido" value={n} onChange={e => setN(e.target.value)} />
        <button onClick={track} className="w-full bg-indigo-600 py-6 rounded-[32px] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"><ScanSearch size={24}/> CONSULTAR ESTADO</button>
      </div>
      {f && <div className="bg-white rounded-[56px] p-8 w-full max-w-md text-slate-900 space-y-6 animate-in zoom-in-95"><h3 className="text-2xl font-black uppercase text-center">{f.customerName}</h3><div className="bg-indigo-50 p-8 rounded-[40px] text-center shadow-inner"><p className="text-[11px] font-black text-slate-400 uppercase mb-2">BULTOS CONSOLIDADOS</p><p className="text-7xl font-black text-indigo-900">{f.detailedPackaging?.reduce((a,c) => a+c.quantity, 0) || 0}</p></div><div className="bg-emerald-100 text-emerald-700 py-3 rounded-2xl text-[10px] font-black uppercase text-center tracking-widest">{f.status}</div></div>}
      <button onClick={onBack} className="text-slate-500 text-[10px] font-black uppercase flex items-center gap-2 hover:text-white transition-colors"><ArrowLeft size={16}/> Volver al Panel</button>
    </div>
  );
};

const LoginModal = ({ onLogin, onClientPortal }: any) => {
  const [u, setU] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950 z-[1000] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-xs rounded-[64px] p-12 text-center space-y-12 shadow-2xl border-t-8 border-teal-500">
        <ShieldAlert size={60} className="mx-auto text-teal-500" />
        <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">D&G LOGISTICA</h2>
        <form onSubmit={e => { e.preventDefault(); onLogin({ name: u, role: u.toLowerCase() === 'admin' ? 'admin' : 'staff' }); }} className="space-y-5">
          <input className="w-full bg-slate-50 p-6 rounded-[32px] text-sm font-bold text-center border-2 uppercase outline-none focus:border-teal-500" placeholder="TU NOMBRE" value={u} onChange={e => setU(e.target.value)} required />
          <button className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">INGRESAR</button>
        </form>
        <button onClick={onClientPortal} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:text-indigo-400 transition-colors">Acceso de Clientes</button>
      </div>
    </div>
  );
};
