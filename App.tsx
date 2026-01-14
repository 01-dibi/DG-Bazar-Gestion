
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
  ScanSearch,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Order, OrderStatus, View, PackagingEntry, HistoryEntry } from './types';

// Inyección de variables desde Vercel
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
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'local'>('local');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const initDatabase = async () => {
      if (!supabase) {
        setDbStatus('local');
        const saved = localStorage.getItem('dg_orders');
        if (saved) setOrders(JSON.parse(saved));
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.from('orders').select('payload').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          setOrders(data.map(d => d.payload as Order));
          setDbStatus('connected');
        }
      } catch (err) {
        console.error("Supabase Error:", err);
        setDbStatus('error');
        const saved = localStorage.getItem('dg_orders');
        if (saved) setOrders(JSON.parse(saved));
      } finally {
        setIsLoading(false);
      }

      const channel = supabase
        .channel('realtime_dg_prod')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new.payload as Order, ...prev]);
            showToast("📦 Nuevo pedido recibido");
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new.payload as Order : o));
            // No mostrar toast en update para evitar spam de ediciones de otros
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
    if (supabase && dbStatus === 'connected') {
      const { error } = await supabase.from('orders').upsert({ id: order.id, payload: order, created_at: order.createdAt });
      if (error) {
        console.error("Error sync:", error);
        showToast("Error al sincronizar", "error");
      }
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
      alert(`⚠️ BLOQUEADO: ${order.lockedBy} está editando ahora.`);
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
    showToast("Pedido creado con éxito");
  };

  const filteredOrders = useMemo(() => {
    let base = orders;
    if (view === 'PENDING') base = orders.filter(o => o.status === OrderStatus.PENDING);
    if (view === 'COMPLETED') base = orders.filter(o => o.status === OrderStatus.COMPLETED);
    if (view === 'DISPATCHED') base = orders.filter(o => o.status === OrderStatus.DISPATCHED);
    const lowSearch = searchTerm.toLowerCase();
    return base.filter(o => 
      o.customerName.toLowerCase().includes(lowSearch) || 
      o.orderNumber.toLowerCase().includes(lowSearch)
    );
  }, [orders, view, searchTerm]);

  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} allOrders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientPortal={() => setIsCustomerMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 relative font-sans overflow-x-hidden">
      {/* Toast Notification System */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest animate-in slide-in-from-top-10 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-2xl relative z-10 border-b-4 border-indigo-500/30">
        <div className="flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white/5 rounded-2xl active:scale-90 transition-transform"><Menu size={22} /></button>
          <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter">D&G PRODUCCIÓN</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              {dbStatus === 'connected' ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-red-500" />}
              <p className="text-[7px] font-black tracking-widest uppercase opacity-60">
                {dbStatus === 'connected' ? 'NUBE ACTIVA' : 'MODO LOCAL'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="p-2.5 rounded-2xl bg-indigo-600 shadow-lg border border-white/10"><User size={18} /></div>
            <p className="text-[6px] font-black mt-1 opacity-40 uppercase">{currentUser.name}</p>
          </div>
        </div>
      </header>

      <main className="p-5 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <RefreshCcw className="animate-spin text-indigo-600 mb-4" size={48} />
            <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando DG_LOGISTICA...</p>
          </div>
        ) : view === 'DASHBOARD' ? (
          <div className="grid grid-cols-2 gap-4">
            <StatCard count={orders.filter(o => o.status === OrderStatus.PENDING).length} label="PENDIENTES" color="bg-orange-500" icon={<ClipboardList size={20} />} onClick={() => setView('PENDING')} />
            <StatCard count={orders.filter(o => o.status === OrderStatus.COMPLETED).length} label="LISTOS" color="bg-emerald-600" icon={<CheckCircle2 size={20} />} onClick={() => setView('COMPLETED')} />
            <StatCard count={orders.length} label="TOTAL" color="bg-slate-800" icon={<History size={20} />} onClick={() => setView('ALL')} />
            <StatCard count={orders.filter(o => o.status === OrderStatus.DISPATCHED).length} label="DESPACHO" color="bg-indigo-600" icon={<Truck size={20} />} onClick={() => setView('DISPATCHED')} />
            <button onClick={() => setShowGeneralEntryModal(true)} className="col-span-2 bg-indigo-600 text-white rounded-[32px] p-6 flex items-center justify-between shadow-xl active:scale-95 transition-all border-b-4 border-indigo-800">
              <div className="flex items-center gap-4"><div className="bg-white/20 p-3 rounded-2xl"><Plus size={24} /></div><div><p className="font-black text-lg uppercase leading-none">NUEVA CARGA</p><p className="text-[9px] opacity-70 font-bold uppercase tracking-widest mt-1">Ingreso de pedidos</p></div></div>
              <ChevronRight size={24} className="opacity-50" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase tracking-widest"><ArrowLeft size={16} /> Panel Principal</button>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input type="text" placeholder="Buscar cliente o nro..." className="w-full bg-white border-2 border-slate-100 rounded-3xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3 pb-20">
              {filteredOrders.map(order => (
                <div key={order.id} onClick={() => handleSelectOrder(order)} className={`bg-white border-2 rounded-[32px] p-5 shadow-sm relative active:scale-[0.98] transition-all cursor-pointer ${order.lockedBy ? 'border-orange-300 bg-orange-50/30' : 'border-slate-50'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{order.orderNumber}</p>
                    {order.lockedBy && <div className="text-[7px] font-black text-orange-600 uppercase flex items-center gap-1 animate-pulse"><UserCheck size={10}/> EN USO POR {order.lockedBy}</div>}
                  </div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tighter">{order.customerName}</h3>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">{order.detailedPackaging?.reduce((acc, curr) => acc + curr.quantity, 0) || 0} BULTOS</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{order.locality || 'Sin destino'}</div>
                  </div>
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
          onSave={(ord: Order) => { syncOrder(ord); showToast("Sincronización OK"); }}
          onStatusUpdate={(status: OrderStatus, data: any) => {
             const updated = { ...selectedOrder, ...data, status, lockedBy: undefined };
             syncOrder(updated);
             setSelectedOrder(null);
             showToast(`Pedido ${status}`);
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
    const finalLoc = loc === 'OTRO' ? (custLoc || 'LIBRE') : loc;
    const finalType = type === 'OTRO' ? (custType || 'LIBRE') : type;
    setPkg([...pkg, { id: Date.now().toString(), deposit: finalLoc, type: finalType, quantity: qty }]);
    setCustLoc(''); setCustType('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[150] flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-[56px] p-6 space-y-6 max-h-[96vh] overflow-y-auto shadow-2xl border-t-[12px] border-indigo-600 animate-in slide-in-from-bottom-10 duration-500">
        <div className="flex justify-between items-start border-b pb-6 sticky top-0 bg-white z-20">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 leading-none">{order.customerName}</h2>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">#{order.orderNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-full active:scale-90 text-slate-400"><X size={20} /></button>
        </div>

        <section className="bg-slate-50 p-6 rounded-[48px] border border-slate-200 shadow-inner space-y-5">
          <div className="text-center py-8 bg-white rounded-[40px] border-2 border-indigo-100 shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-2 relative z-10">BULTOS TOTALES</p>
            <span className="text-9xl font-black text-indigo-600 tabular-nums relative z-10 drop-shadow-lg">{total}</span>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] scale-150 group-hover:scale-175 transition-transform duration-1000">
              <Package size={140} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">UBICACIÓN</label>
              <select className="w-full bg-white border-2 border-slate-200 p-4 rounded-3xl text-[11px] font-black outline-none focus:border-indigo-400" value={loc} onChange={e => setLoc(e.target.value)}>{DEPOSITS.map(d => <option key={d} value={d}>{d}</option>)}</select>
              {loc === 'OTRO' && <input className="w-full bg-white border-2 border-indigo-200 p-4 rounded-3xl text-[11px] font-bold animate-in zoom-in-95" placeholder="¿Dónde?" value={custLoc} onChange={e => setCustLoc(e.target.value.toUpperCase())}/>}
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">TIPO</label>
              <select className="w-full bg-white border-2 border-slate-200 p-4 rounded-3xl text-[11px] font-black outline-none focus:border-indigo-400" value={type} onChange={e => setType(e.target.value)}>{PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
              {type === 'OTRO' && <input className="w-full bg-white border-2 border-indigo-200 p-4 rounded-3xl text-[11px] font-bold animate-in zoom-in-95" placeholder="¿Qué es?" value={custType} onChange={e => setCustType(e.target.value.toUpperCase())}/>}
            </div>
          </div>

          <div className="flex gap-2">
            <input type="number" className="w-24 bg-white border-2 border-slate-200 p-4 rounded-3xl text-center font-black text-indigo-700 text-xl" value={qty} onChange={e => setQty(+e.target.value)}/>
            <button onClick={add} className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-[32px] text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"><Plus size={18}/> AGREGAR</button>
          </div>

          <div className="space-y-2 mt-4 max-h-48 overflow-y-auto scrollbar-hide">
            {pkg.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-3xl flex justify-between items-center border border-slate-100 shadow-sm animate-in slide-in-from-right-3">
                <span className="text-[11px] font-black uppercase text-slate-800 flex items-center">
                  <span className="text-indigo-600 text-lg mr-4 bg-indigo-50 w-10 h-10 flex items-center justify-center rounded-2xl">{p.quantity}</span> 
                  {p.type} <span className="text-slate-200 mx-2">|</span> <span className="text-slate-400">{p.deposit}</span>
                </span>
                <button onClick={() => setPkg(pkg.filter(x => x.id !== p.id))} className="text-red-400 p-3 hover:bg-red-50 rounded-2xl transition-colors"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
        </section>

        <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[32px] text-xs h-28 font-medium" placeholder="Notas adicionales..." value={notes} onChange={e => setNotes(e.target.value)}/>

        <div className="flex flex-col gap-4 pb-12 pt-4 border-t">
          <button onClick={() => onSave({ ...order, detailedPackaging: pkg, notes })} className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"><Save size={22}/> GUARDAR CAMBIOS</button>
          
          {order.status === OrderStatus.PENDING && (
            <button onClick={() => onStatusUpdate(OrderStatus.COMPLETED, { detailedPackaging: pkg, notes })} className="w-full bg-emerald-600 text-white font-black py-7 rounded-[32px] uppercase text-xs tracking-widest border-b-8 border-emerald-800 shadow-xl active:scale-95 transition-all">FINALIZAR CONTROL ✅</button>
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
  <button onClick={onClick} className={`${color} rounded-[48px] p-7 text-white text-left shadow-2xl flex flex-col justify-between h-52 active:scale-95 transition-all overflow-hidden relative group`}>
    <div className="z-10 bg-white/10 p-4 rounded-2xl self-start group-hover:bg-white/20 transition-colors">{icon}</div>
    <div className="z-10"><h3 className="text-6xl font-black tracking-tighter leading-none">{count}</h3><p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70 mt-4">{label}</p></div>
    <div className="absolute -bottom-10 -right-10 bg-white/10 w-48 h-48 rounded-full blur-3xl opacity-30"></div>
  </button>
);

const NavBtn = ({ active, icon, onClick }: any) => (
  <button onClick={onClick} className={`p-5 rounded-[28px] transition-all ${active ? 'text-indigo-600 bg-indigo-50 shadow-inner scale-110' : 'text-slate-300'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

const GeneralEntryModal = ({ onClose, onAdd }: any) => {
  const [c, setC] = useState(''); const [l, setL] = useState(''); const [n, setN] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[64px] shadow-2xl p-12 space-y-8 animate-in zoom-in-95 duration-300">
        <h2 className="font-black text-3xl uppercase tracking-tighter text-slate-800 text-center">NUEVA CARGA</h2>
        <div className="space-y-4">
          <input className="w-full bg-slate-50 border-2 rounded-3xl p-5 font-black text-xs uppercase" placeholder="NRO PEDIDO" value={n} onChange={e => setN(e.target.value)} />
          <input className="w-full bg-slate-50 border-2 rounded-3xl p-5 font-black text-xs uppercase" placeholder="CLIENTE" value={c} onChange={e => setC(e.target.value)} />
          <input className="w-full bg-slate-50 border-2 rounded-3xl p-5 font-black text-xs uppercase" placeholder="LOCALIDAD" value={l} onChange={e => setL(e.target.value)} />
          <button onClick={() => { if(!c || !n) return; onAdd(c, l, n); onClose(); }} className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">INICIAR CONTROL <Send size={22}/></button>
          <button onClick={onClose} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest text-center mt-4">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

const CustomerPortal = ({ onBack, allOrders }: any) => {
  const [n, setN] = useState(''); const [f, setF] = useState<Order | null>(null);
  const track = () => { const o = allOrders.find((x: Order) => x.orderNumber.toLowerCase() === n.toLowerCase()); setF(o || null); if(!o) alert("N° No encontrado"); };
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center py-20 space-y-12">
      <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">D&G BAZAR</h1>
      <div className="bg-white rounded-[56px] p-10 w-full max-w-md space-y-6 shadow-2xl border-t-8 border-indigo-600">
        <input className="w-full bg-slate-50 p-6 rounded-[32px] text-slate-900 font-black uppercase text-center border-2 border-slate-100 outline-none focus:border-indigo-500 text-lg" placeholder="NRO PEDIDO" value={n} onChange={e => setN(e.target.value)} />
        <button onClick={track} className="w-full bg-slate-900 py-7 rounded-[32px] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all"><ScanSearch size={28}/> CONSULTAR</button>
      </div>
      {f && (
        <div className="bg-white rounded-[64px] p-10 w-full max-w-md text-slate-900 space-y-8 animate-in zoom-in-95 shadow-2xl">
          <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CLIENTE</p><h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{f.customerName}</h3></div>
          <div className="bg-indigo-50 p-10 rounded-[48px] text-center shadow-inner relative overflow-hidden">
             <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2">BULTOS LISTOS</p>
             <p className="text-8xl font-black text-indigo-900">{f.detailedPackaging?.reduce((a,c) => a+c.quantity, 0) || 0}</p>
          </div>
          <div className="bg-emerald-600 text-white py-4 rounded-[28px] text-[12px] font-black uppercase text-center tracking-[0.3em]">{f.status}</div>
        </div>
      )}
      <button onClick={onBack} className="text-slate-500 text-[10px] font-black uppercase flex items-center gap-2 hover:text-white transition-colors tracking-widest"><ArrowLeft size={16}/> Volver</button>
    </div>
  );
};

const LoginModal = ({ onLogin, onClientPortal }: any) => {
  const [u, setU] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950 z-[1000] flex items-center justify-center p-8">
      <div className="bg-white w-full max-w-xs rounded-[72px] p-12 text-center space-y-12 shadow-2xl border-t-8 border-indigo-600">
        <div className="space-y-4">
           <div className="bg-indigo-600 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto shadow-xl"><ShieldAlert size={32} className="text-white" /></div>
           <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">D&G LOGISTICA</h2>
        </div>
        <form onSubmit={e => { e.preventDefault(); onLogin({ name: u, role: u.toLowerCase() === 'admin' ? 'admin' : 'staff' }); }} className="space-y-6">
          <input className="w-full bg-slate-50 p-6 rounded-[32px] text-sm font-bold text-center border-2 border-slate-50 uppercase focus:border-indigo-500 outline-none" placeholder="TU NOMBRE" value={u} onChange={e => setU(e.target.value)} required />
          <button className="w-full bg-slate-900 text-white font-black py-7 rounded-[32px] shadow-2xl uppercase text-xs tracking-[0.4em] active:scale-95 transition-all">INGRESAR</button>
        </form>
        <button onClick={onClientPortal} className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.4em]">Seguimiento Clientes</button>
      </div>
    </div>
  );
};
