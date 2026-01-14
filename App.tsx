
import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, 
  ClipboardList, 
  CheckCircle2, 
  Truck, 
  Search, 
  ChevronRight, 
  User, 
  Package, 
  ArrowLeft, 
  X, 
  Send, 
  History, 
  RefreshCcw, 
  UserCheck, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Save, 
  ScanSearch, 
  Wifi, 
  WifiOff, 
  Download, 
  Database
} from 'lucide-react';
import { Order, OrderStatus, View, PackagingEntry } from './types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const DEPOSITS = ['E', 'F', 'D1', 'D2', 'A1', 'OTRO'];
const PACKAGE_TYPES = ['CAJA', 'BOLSA', 'PAQUETE', 'BULTO', 'BOBINA', 'OTRO'];

// Componente de Logo Corporativo D&G - Identidad Oficial
const CorporateLogo = ({ className = "scale-100", showLogistica = false }) => (
  <div className={`flex flex-col items-center justify-center ${className} transition-all duration-500`}>
    <div className="flex items-center font-sans select-none">
      <span className="text-[#333333] text-6xl font-black leading-none -mr-1">d</span>
      <span className="text-[#f97316] text-7xl font-black tracking-tighter leading-none">D&G</span>
    </div>
    {showLogistica && (
      <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.7em] mt-1 ml-4 border-t border-slate-100 pt-1">
        LOGISTICA
      </p>
    )}
  </div>
);

export default function App() {
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  const [view, setView] = useState<View>('DASHBOARD');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showGeneralEntryModal, setShowGeneralEntryModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: 'admin' | 'staff' } | null>(null);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'local'>('local');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setIsLoading(true);
    if (!supabase) {
      const saved = localStorage.getItem('dg_orders');
      if (saved) setOrders(JSON.parse(saved));
      setDbStatus('local');
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.from('orders').select('payload').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const fetched = data.map(d => d.payload as Order);
        setOrders(fetched);
        localStorage.setItem('dg_orders', JSON.stringify(fetched));
        setDbStatus('connected');
      }
    } catch (err) {
      setDbStatus('error');
      const saved = localStorage.getItem('dg_orders');
      if (saved) setOrders(JSON.parse(saved));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (supabase) {
      const channel = supabase.channel('realtime_dg_v17_stable')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          if (payload.eventType === 'INSERT') setOrders(prev => [payload.new.payload as Order, ...prev]);
          else if (payload.eventType === 'UPDATE') setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new.payload as Order : o));
          else if (payload.eventType === 'DELETE') setOrders(prev => prev.filter(o => o.id !== payload.old.id));
        }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  const syncOrder = async (order: Order) => {
    setOrders(prev => {
      const newList = prev.find(o => o.id === order.id) ? prev.map(o => o.id === order.id ? order : o) : [order, ...prev];
      localStorage.setItem('dg_orders', JSON.stringify(newList));
      return newList;
    });
    if (supabase && dbStatus === 'connected') {
      await supabase.from('orders').upsert({ id: order.id, payload: order, created_at: order.createdAt });
    }
  };

  const filteredOrders = useMemo(() => {
    let base = orders;
    if (view === 'PENDING') base = orders.filter(o => o.status === OrderStatus.PENDING);
    if (view === 'COMPLETED') base = orders.filter(o => o.status === OrderStatus.COMPLETED);
    if (view === 'DISPATCHED') base = orders.filter(o => o.status === OrderStatus.DISPATCHED);
    const lowSearch = searchTerm.toLowerCase();
    return base.filter(o => o.customerName.toLowerCase().includes(lowSearch) || o.orderNumber.toLowerCase().includes(lowSearch));
  }, [orders, view, searchTerm]);

  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} allOrders={orders} showToast={showToast} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientPortal={() => setIsCustomerMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 relative font-sans overflow-x-hidden animate-custom">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest bg-orange-600 text-white animate-bounce">
          {toast.message}
        </div>
      )}

      <header className="bg-white p-6 rounded-b-[48px] shadow-xl relative z-10 border-b-4 border-orange-500/10">
        <div className="flex justify-between items-center">
          <button onClick={loadData} className="p-3 bg-slate-50 rounded-2xl active:scale-90 transition-transform text-slate-400">
            <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <div className="flex flex-col items-center scale-[0.45] -my-6">
             <CorporateLogo />
          </div>
          <div className="flex flex-col items-end">
            <div className="p-2.5 rounded-2xl bg-[#f97316] shadow-lg text-white"><User size={18} /></div>
            <p className="text-[7px] font-black mt-1 text-slate-400 uppercase tracking-widest">{currentUser.name}</p>
          </div>
        </div>
        <div className="text-center mt-2">
           <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest">v1.7.1 - OFICIAL</span>
        </div>
      </header>

      <main className="p-5 space-y-6">
        {isLoading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-4 opacity-40">
            <Database className="animate-bounce text-[#f97316]" size={48} />
            <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando D&G...</p>
          </div>
        ) : view === 'DASHBOARD' ? (
          <div className="grid grid-cols-2 gap-4">
            <StatCard count={orders.filter(o => o.status === OrderStatus.PENDING).length} label="PENDIENTES" color="bg-[#f97316]" icon={<ClipboardList size={20} />} onClick={() => setView('PENDING')} />
            <StatCard count={orders.filter(o => o.status === OrderStatus.COMPLETED).length} label="LISTOS" color="bg-[#333333]" icon={<CheckCircle2 size={20} />} onClick={() => setView('COMPLETED')} />
            <StatCard count={orders.length} label="HISTORIAL" color="bg-slate-600" icon={<History size={20} />} onClick={() => setView('ALL')} />
            <StatCard count={orders.filter(o => o.status === OrderStatus.DISPATCHED).length} label="DESPACHO" color="bg-orange-700" icon={<Truck size={20} />} onClick={() => setView('DISPATCHED')} />
            
            <button onClick={() => setShowGeneralEntryModal(true)} className="col-span-2 bg-white border-2 border-slate-100 rounded-[36px] p-6 flex items-center justify-between shadow-sm active:scale-95 transition-all">
              <div className="flex items-center gap-4"><div className="bg-[#f97316] text-white p-3 rounded-2xl shadow-lg"><Plus size={24} /></div><div><p className="font-black text-lg uppercase leading-none text-slate-800">NUEVA CARGA</p><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Alta de Pedidos</p></div></div>
              <ChevronRight size={24} className="text-slate-200" />
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase tracking-widest"><ArrowLeft size={16} /> Panel</button>
              <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">{view}</div>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Buscar cliente o pedido..." className="w-full bg-white border-2 border-slate-100 rounded-3xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-orange-500 transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3 pb-20">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-20 opacity-20 font-black uppercase text-[10px] tracking-widest">Sin registros</div>
              ) : filteredOrders.map(order => (
                <div key={order.id} onClick={() => {
                  if (order.lockedBy && order.lockedBy !== currentUser.name && currentUser.role !== 'admin') {
                    alert(`EN USO POR: ${order.lockedBy}`);
                    return;
                  }
                  const updated = { ...order, lockedBy: currentUser.name };
                  syncOrder(updated);
                  setSelectedOrder(updated);
                }} className={`bg-white border-2 rounded-[32px] p-5 shadow-sm relative active:scale-[0.98] transition-all cursor-pointer ${order.lockedBy ? 'border-orange-200' : 'border-slate-50'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">{order.orderNumber}</p>
                    {order.lockedBy && <div className="text-[7px] font-black text-orange-500 uppercase flex items-center gap-1 animate-pulse"><UserCheck size={10}/> EDITANDO: {order.lockedBy}</div>}
                  </div>
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-tighter leading-none">{order.customerName}</h3>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-[9px] font-black text-orange-700 bg-orange-50 px-3 py-1 rounded-full uppercase">{order.detailedPackaging?.reduce((a,c) => a+c.quantity, 0) || 0} BULTOS</div>
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
          onSave={(ord: Order) => { syncOrder(ord); showToast("Sincronizado"); }}
          onStatusUpdate={(status: OrderStatus, data: any) => {
             const updated = { ...selectedOrder, ...data, status, lockedBy: undefined };
             syncOrder(updated);
             setSelectedOrder(null);
             showToast(`Pedido ${status}`);
          }}
        />
      )}

      {showGeneralEntryModal && (
        <GeneralEntryModal 
          onClose={() => setShowGeneralEntryModal(false)} 
          onAdd={(c, l, n) => {
            const newOrder: Order = {
              id: Date.now().toString(),
              orderNumber: n || `DG-${Math.floor(Math.random()*900)+100}`,
              customerName: c,
              locality: l,
              status: OrderStatus.PENDING,
              items: [],
              packaging: { bolsas: 0, bultos: 0, cajas: 0 },
              detailedPackaging: [],
              reviewer: currentUser?.name || '',
              createdAt: new Date().toISOString(),
              source: 'Manual',
              history: [{ status: OrderStatus.PENDING, label: 'Ingreso manual', timestamp: new Date().toISOString() }]
            };
            syncOrder(newOrder);
            showToast("Pedido creado");
            setShowGeneralEntryModal(false);
          }} 
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-between items-center z-50 max-w-md mx-auto rounded-t-[44px] shadow-2xl">
        <NavBtn active={view === 'DASHBOARD'} icon={<LayoutDashboard />} onClick={() => setView('DASHBOARD')} />
        <NavBtn active={view === 'PENDING'} icon={<ClipboardList />} onClick={() => setView('PENDING')} />
        <NavBtn active={view === 'COMPLETED'} icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
        <NavBtn active={view === 'DISPATCHED'} icon={<Truck />} onClick={() => setView('DISPATCHED')} />
      </nav>
    </div>
  );
}

const StatCard = ({ count, label, color, icon, onClick }: any) => (
  <button onClick={onClick} className={`${color} rounded-[48px] p-7 text-white text-left shadow-2xl flex flex-col justify-between h-52 active:scale-95 transition-all overflow-hidden relative group`}>
    <div className="z-10 bg-white/10 p-4 rounded-2xl self-start border border-white/10">{icon}</div>
    <div className="z-10"><h3 className="text-6xl font-black tracking-tighter leading-none">{count}</h3><p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70 mt-4">{label}</p></div>
    <div className="absolute -bottom-10 -right-10 bg-white/10 w-48 h-48 rounded-full blur-3xl opacity-30"></div>
  </button>
);

const NavBtn = ({ active, icon, onClick }: any) => (
  <button onClick={onClick} className={`p-5 rounded-[28px] transition-all duration-300 ${active ? 'text-orange-500 bg-orange-50 shadow-inner scale-110' : 'text-slate-300 hover:text-slate-400'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

const OrderDetailsModal = ({ order, onClose, onSave, onStatusUpdate }: any) => {
  const [pkg, setPkg] = useState<PackagingEntry[]>(order.detailedPackaging || []);
  const [loc, setLoc] = useState(DEPOSITS[0]);
  const [custLoc, setCustLoc] = useState('');
  const [type, setType] = useState(PACKAGE_TYPES[0]);
  const [custType, setCustType] = useState('');
  const [qty, setQty] = useState(1);
  const total = pkg.reduce((a, c) => a + c.quantity, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[150] flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-[56px] p-6 space-y-6 max-h-[96vh] overflow-y-auto shadow-2xl border-t-[12px] border-orange-500 animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-start border-b pb-6 sticky top-0 bg-white z-20">
          <div><h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{order.customerName}</h2><p className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase mt-2">#{order.orderNumber}</p></div>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-full active:scale-90 text-slate-400"><X size={20} /></button>
        </div>
        <section className="bg-slate-50 p-6 rounded-[48px] border border-slate-200 shadow-inner space-y-5 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-2">BULTOS CONSOLIDADOS</p>
          <span className="text-9xl font-black text-orange-500 drop-shadow-lg">{total}</span>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">DEPÓSITO</label>
              <select className="w-full bg-white border-2 border-slate-200 p-4 rounded-3xl text-[11px] font-black outline-none focus:border-orange-400" value={loc} onChange={e => setLoc(e.target.value)}>{DEPOSITS.map(d => <option key={d} value={d}>{d}</option>)}</select>
              {loc === 'OTRO' && <input className="w-full bg-white border-2 border-orange-200 p-4 rounded-3xl text-[11px] font-bold mt-2" placeholder="¿Dónde?" value={custLoc} onChange={e => setCustLoc(e.target.value.toUpperCase())}/>}
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">TIPO</label>
              <select className="w-full bg-white border-2 border-slate-200 p-4 rounded-3xl text-[11px] font-black outline-none focus:border-orange-400" value={type} onChange={e => setType(e.target.value)}>{PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
              {type === 'OTRO' && <input className="w-full bg-white border-2 border-orange-200 p-4 rounded-3xl text-[11px] font-bold mt-2" placeholder="¿Qué es?" value={custType} onChange={e => setCustType(e.target.value.toUpperCase())}/>}
            </div>
          </div>
          <div className="flex gap-2">
            <input type="number" className="w-24 bg-white border-2 border-slate-200 p-4 rounded-3xl text-center font-black text-orange-600 text-xl shadow-inner" value={qty} onChange={e => setQty(+e.target.value)}/>
            <button onClick={() => { if(qty<=0) return; setPkg([...pkg, { id: Date.now().toString(), deposit: loc === 'OTRO' ? custLoc : loc, type: type === 'OTRO' ? custType : type, quantity: qty }]); setQty(1); }} className="flex-1 bg-orange-500 text-white font-black py-5 rounded-[32px] text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus size={18}/> AGREGAR BULTOS</button>
          </div>
          <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
            {pkg.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-3xl flex justify-between items-center border border-slate-100 shadow-sm">
                <span className="text-[11px] font-black uppercase text-slate-800 flex items-center">
                  <span className="text-orange-600 text-lg mr-4 bg-orange-50 w-10 h-10 flex items-center justify-center rounded-2xl">{p.quantity}</span> 
                  {p.type} <span className="text-slate-200 mx-2">|</span> <span className="text-slate-400">{p.deposit}</span>
                </span>
                <button onClick={() => setPkg(pkg.filter(x => x.id !== p.id))} className="text-red-400 p-3 hover:bg-red-50 rounded-2xl transition-colors"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
        </section>
        <div className="flex flex-col gap-4 pb-12 pt-4 border-t">
          <button onClick={() => onSave({ ...order, detailedPackaging: pkg })} className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"><Save size={22}/> GUARDAR CAMBIOS</button>
          {order.status === OrderStatus.PENDING && (
            <button onClick={() => onStatusUpdate(OrderStatus.COMPLETED, { detailedPackaging: pkg })} className="w-full bg-emerald-600 text-white font-black py-7 rounded-[32px] uppercase text-xs tracking-widest border-b-8 border-emerald-800 shadow-xl active:scale-95 transition-all">FINALIZAR CONTROL ✅</button>
          )}
          {order.status === OrderStatus.COMPLETED && (
            <button onClick={() => onStatusUpdate(OrderStatus.DISPATCHED, { detailedPackaging: pkg })} className="w-full bg-orange-600 text-white font-black py-7 rounded-[32px] uppercase text-xs tracking-widest border-b-8 border-orange-800 shadow-xl active:scale-95 transition-all">SALIDA A LOGÍSTICA 🚛</button>
          )}
        </div>
      </div>
    </div>
  );
};

const GeneralEntryModal = ({ onClose, onAdd }: any) => {
  const [c, setC] = useState(''); const [l, setL] = useState(''); const [n, setN] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[64px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95">
        <div className="text-center space-y-1">
          <h2 className="font-black text-3xl uppercase tracking-tighter text-slate-800">NUEVA CARGA</h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ingrese los datos del cliente</p>
        </div>
        <div className="space-y-3">
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-black text-xs uppercase outline-none focus:border-orange-500 shadow-inner" placeholder="NRO PEDIDO" value={n} onChange={(e) => setN(e.target.value)} />
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-black text-xs uppercase outline-none focus:border-orange-500 shadow-inner" placeholder="NOMBRE DEL CLIENTE" value={c} onChange={(e) => setC(e.target.value)} />
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 font-black text-xs uppercase outline-none focus:border-orange-500 shadow-inner" placeholder="LOCALIDAD / DESTINO" value={l} onChange={(e) => setL(e.target.value)} />
          <button onClick={() => { if(!c || !n) return; onAdd(c, l, n); }} className="w-full bg-orange-600 text-white font-black py-6 rounded-[32px] uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">INICIAR CONTROL <Send size={20}/></button>
          <button onClick={onClose} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] text-center mt-4">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

const CustomerPortal = ({ onBack, allOrders, showToast }: any) => {
  const [n, setN] = useState(''); const [f, setF] = useState<Order | null>(null);
  const track = () => { 
    if(!n) return;
    const o = allOrders.find((x: Order) => x.orderNumber.toLowerCase().trim() === n.toLowerCase().trim()); 
    setF(o || null); 
    if(!o) showToast("Pedido no encontrado", "error"); 
  };
  
  return (
    <div className="min-h-screen bg-white text-slate-900 p-8 flex flex-col items-center py-16 space-y-12">
      <div className="animate-in slide-in-from-top-10 duration-700">
         <CorporateLogo className="scale-125" showLogistica={true} />
      </div>
      
      <div className="bg-slate-50 rounded-[56px] p-10 w-full max-w-md space-y-6 shadow-2xl border-t-8 border-[#f97316]">
        <div className="text-center space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Seguimiento de Envío</p>
        </div>
        <input className="w-full bg-white p-6 rounded-[32px] text-slate-900 font-black uppercase text-center border-2 border-slate-100 outline-none focus:border-orange-500 text-lg shadow-inner" placeholder="NRO DE PEDIDO" value={n} onChange={e => setN(e.target.value)} />
        <button onClick={track} className="w-full bg-[#f97316] py-7 rounded-[32px] font-black uppercase text-xs tracking-[0.3em] text-white flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"><ScanSearch size={28}/> BUSCAR ESTADO</button>
      </div>
      {f && (
        <div className="bg-white border-2 border-slate-50 rounded-[64px] p-10 w-full max-w-md text-slate-900 space-y-8 animate-in zoom-in-95 shadow-2xl">
          <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DESTINATARIO</p><h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{f.customerName}</h3></div>
          <div className="bg-orange-50 p-10 rounded-[48px] text-center shadow-inner relative overflow-hidden">
             <p className="text-[11px] font-black text-orange-400 uppercase tracking-[0.4em] mb-2">BULTOS PROCESADOS</p>
             <p className="text-8xl font-black text-orange-600">{f.detailedPackaging?.reduce((a,c) => a+c.quantity, 0) || 0}</p>
          </div>
          <div className={`py-5 rounded-[28px] text-[12px] font-black uppercase text-center tracking-[0.3em] shadow-lg text-white ${f.status === OrderStatus.PENDING ? 'bg-orange-500' : 'bg-emerald-600'}`}>{f.status}</div>
        </div>
      )}
      <button onClick={onBack} className="text-slate-400 text-[10px] font-black uppercase flex items-center gap-2 hover:text-orange-600 transition-colors tracking-widest"><ArrowLeft size={16}/> VOLVER</button>
    </div>
  );
};

const LoginModal = ({ onLogin, onClientPortal }: any) => {
  const [u, setU] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-950 z-[1000] flex items-center justify-center p-8">
      <div className="bg-white w-full max-w-xs rounded-[72px] p-12 text-center space-y-12 shadow-2xl border-t-8 border-orange-500">
        <CorporateLogo className="scale-100" showLogistica={false} />
        <div className="space-y-6">
          <h2 className="text-xs font-black text-slate-300 uppercase tracking-[0.5em]">Acceso Privado</h2>
          <form onSubmit={e => { e.preventDefault(); if(!u) return; onLogin({ name: u, role: u.toLowerCase() === 'admin' ? 'admin' : 'staff' }); }} className="space-y-6">
            <input className="w-full bg-slate-50 p-6 rounded-[32px] text-sm font-bold text-center border-2 border-slate-100 uppercase focus:border-orange-500 outline-none shadow-inner" placeholder="USUARIO" value={u} onChange={e => setU(e.target.value)} required />
            <button className="w-full bg-[#333333] text-white font-black py-7 rounded-[32px] shadow-2xl uppercase text-xs tracking-[0.4em] active:scale-95 transition-all">ENTRAR</button>
          </form>
        </div>
        <button onClick={onClientPortal} className="text-[#f97316] font-black text-[10px] uppercase tracking-[0.4em] hover:text-orange-400 transition-colors block mx-auto">Portal Clientes</button>
      </div>
    </div>
  );
};
