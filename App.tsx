
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
  ChevronLeft,
  Layers,
  BellRing,
  LogOut,
  DownloadCloud,
  RefreshCcw,
  Navigation,
  UserCheck,
  ShieldAlert,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
  Save,
  // Add missing ScanSearch import
  ScanSearch
} from 'lucide-react';
import { Order, OrderStatus, View, PackagingEntry, HistoryEntry } from './types';

// Inicialización de Supabase (Asumiendo variables de entorno configuradas)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CENTRAL_WHATSAPP_NUMBER = "2974723835"; 
const CENTRAL_EMAIL = "depaoliroberto364@gmail.com";

const DEPOSITS = ['E', 'F', 'D1', 'D2', 'A1', 'OTRO'];
const PACKAGE_TYPES = ['CAJA', 'BOLSA', 'PAQUETE', 'BULTO', 'BOBINA', 'OTRO'];

const viewNames: Record<View, string> = {
  DASHBOARD: 'TABLERO',
  PENDING: 'PENDIENTES',
  COMPLETED: 'COMPLETADOS',
  DISPATCHED: 'DESPACHO',
  NEW_ORDER: 'NUEVO PEDIDO',
  NEW_ORDER_MANUAL: 'CARGA MANUAL',
  ALL: 'HISTORIAL COMPLETO',
  GENERAL_ENTRY: 'ENTRADA GENERAL'
};

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
  const [newOrderNotification, setNewOrderNotification] = useState<Order | null>(null);

  // 1. CARGA INICIAL Y SUSCRIPCIÓN REALTIME
  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase.from('orders').select('payload');
      if (!error && data) {
        setOrders(data.map(d => d.payload as Order));
      }
      setIsLoading(false);
    };

    fetchOrders();

    // Escuchar cambios en tiempo real
    const channel = supabase
      .channel('schema-db-changes')
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
  }, []);

  const stats = useMemo(() => ({
    pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
    completed: orders.filter(o => o.status === OrderStatus.COMPLETED).length,
    dispatched: orders.filter(o => o.status === OrderStatus.DISPATCHED).length,
    total: orders.length
  }), [orders]);

  const filteredOrders = useMemo(() => {
    let base = orders;
    if (view === 'PENDING') base = orders.filter(o => o.status === OrderStatus.PENDING);
    if (view === 'COMPLETED') base = orders.filter(o => o.status === OrderStatus.COMPLETED);
    if (view === 'DISPATCHED') base = orders.filter(o => o.status === OrderStatus.DISPATCHED);
    
    const lowSearch = searchTerm.toLowerCase();
    return base.filter(o => 
      o.customerName.toLowerCase().includes(lowSearch) || 
      o.orderNumber.toLowerCase().includes(lowSearch) ||
      (o.locality || '').toLowerCase().includes(lowSearch)
    );
  }, [orders, view, searchTerm]);

  const syncOrderToDB = async (order: Order) => {
    await supabase.from('orders').upsert({ id: order.id, payload: order });
  };

  const handleSelectOrder = (order: Order) => {
    if (!currentUser) return;
    const isLocked = order.lockedBy && order.lockedBy !== currentUser.name && currentUser.role !== 'admin';
    if (isLocked) {
      alert(`⚠️ TRABAJO EN CURSO: ${order.lockedBy} está editando.`);
      return;
    }
    const updatedOrder = { ...order, lockedBy: currentUser.name };
    syncOrderToDB(updatedOrder);
    setSelectedOrder(updatedOrder);
  };

  const handleUpdateStatus = (id: string, newStatus: OrderStatus, extraData?: Partial<Order>) => {
    const orderToUpdate = orders.find(o => o.id === id);
    if (!orderToUpdate) return;

    let historyLabel = 'Actualización';
    if (newStatus === OrderStatus.COMPLETED) historyLabel = 'Preparación finalizada en depósito';
    if (newStatus === OrderStatus.DISPATCHED) historyLabel = 'Entregado a transporte';

    const newHistoryEntry: HistoryEntry = {
      status: newStatus,
      label: historyLabel,
      timestamp: new Date().toISOString()
    };

    const updatedOrder: Order = { 
      ...orderToUpdate, 
      status: newStatus, 
      ...extraData, 
      lockedBy: undefined,
      history: [...(orderToUpdate.history || []), newHistoryEntry]
    };

    syncOrderToDB(updatedOrder);
    setSelectedOrder(null);
  };

  const addQuickOrder = (customer: string, locality: string, orderNum: string, reviewer: string) => {
    const orderId = Date.now().toString();
    const newOrder: Order = {
      id: orderId,
      orderNumber: orderNum || `P-${Math.floor(Math.random() * 900) + 100}`,
      customerName: customer,
      locality: locality,
      status: OrderStatus.PENDING,
      items: [],
      packaging: { bolsas: 0, bultos: 0, cajas: 0 },
      detailedPackaging: [],
      reviewer: reviewer || currentUser?.name || 'Responsable',
      notes: '',
      createdAt: new Date().toISOString(),
      source: 'Manual',
      history: [{
        status: OrderStatus.PENDING,
        label: 'Pedido ingresado al sistema',
        timestamp: new Date().toISOString()
      }]
    };
    syncOrderToDB(newOrder);
    setNewOrderNotification(newOrder);
  };

  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} allOrders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientPortal={() => setIsCustomerMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 relative overflow-x-hidden font-sans">
      {/* Header */}
      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-xl relative z-10">
        <div className="flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-white/10 rounded-2xl active:scale-95 transition-transform"><Menu size={22} /></button>
          <div className="text-center"><h1 className="text-lg font-black uppercase tracking-tighter">D&G LOGISTICA</h1></div>
          <div className="p-2.5 rounded-2xl bg-teal-500 shadow-lg"><User size={20} /></div>
        </div>
      </header>

      {/* Main Area */}
      <main className="p-5 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
            <RefreshCcw className="animate-spin text-teal-600" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Base de Datos...</p>
          </div>
        ) : view === 'DASHBOARD' ? (
          <div className="grid grid-cols-2 gap-4">
            <StatCard count={stats.pending} label="PENDIENTES" color="bg-orange-500" icon={<ClipboardList size={20} />} onClick={() => setView('PENDING')} />
            <StatCard count={stats.completed} label="COMPLETOS" color="bg-emerald-600" icon={<CheckCircle2 size={20} />} onClick={() => setView('COMPLETED')} />
            <StatCard count={stats.total} label="HISTORIAL" color="bg-teal-600" icon={<History size={20} />} onClick={() => setView('ALL')} />
            <StatCard count={stats.dispatched} label="DESPACHO" color="bg-indigo-600" icon={<Truck size={20} />} onClick={() => setView('DISPATCHED')} />
            <button onClick={() => setShowGeneralEntryModal(true)} className="col-span-2 bg-slate-900 text-white rounded-[32px] p-6 flex items-center justify-between shadow-xl active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-teal-500 p-3 rounded-2xl"><Layers size={24} /></div>
                <div><p className="font-black text-lg uppercase leading-none">ENTRADA GENERAL</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Control de Bultos</p></div>
              </div>
              <ChevronRight size={24} className="text-teal-500" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase tracking-widest"><ArrowLeft size={16} /> Volver</button>
              <h2 className="font-black text-xs text-slate-300 uppercase tracking-widest">{viewNames[view]}</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Buscar cliente o pedido..." className="w-full bg-white border-2 border-slate-100 rounded-3xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm outline-none focus:border-teal-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3 pb-12">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-20 opacity-10"><Package size={80} className="mx-auto" /></div>
              ) : filteredOrders.map(order => (
                <div key={order.id} onClick={() => handleSelectOrder(order)} className={`bg-white border-2 rounded-[32px] p-5 shadow-sm transition-all cursor-pointer relative ${order.lockedBy ? 'border-orange-200 bg-orange-50/20' : 'border-slate-50'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">{order.orderNumber}</p>
                    {order.lockedBy && <div className="flex items-center gap-1 text-[8px] font-black text-orange-600 animate-pulse"><User size={10}/> TRABAJANDO: {order.lockedBy}</div>}
                  </div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight">{order.customerName}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {order.locality && <div className="flex items-center gap-1 text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"><Navigation size={10} /> {order.locality}</div>}
                    <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                      <Package size={10} /> {order.detailedPackaging?.reduce((acc, curr) => acc + curr.quantity, 0) || 0} Bultos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sidebar (Simplificado) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="relative bg-white w-72 h-full shadow-2xl flex flex-col p-6 space-y-4">
             <h2 className="font-black text-xl uppercase tracking-tighter border-b pb-4">Menú Logístico</h2>
             <SidebarItem icon={<LogOut className="text-red-500" />} label="CERRAR SESIÓN" onClick={() => setCurrentUser(null)} />
          </aside>
        </div>
      )}

      {/* Modal Detalle Pedido (REDISEÑADO SEGÚN REQUERIMIENTO) */}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => {
            const unlocked = { ...selectedOrder, lockedBy: undefined };
            syncOrderToDB(unlocked);
            setSelectedOrder(null);
          }} 
          onUpdate={handleUpdateStatus} 
          onSave={(data) => {
             const updated = { ...selectedOrder, ...data };
             syncOrderToDB(updated);
             setSelectedOrder(updated);
             alert("✅ Cambios guardados y sincronizados");
          }}
          currentUser={currentUser} 
        />
      )}

      {/* Modal Carga General */}
      {showGeneralEntryModal && <GeneralEntryModal onClose={() => setShowGeneralEntryModal(false)} onAdd={addQuickOrder} currentUser={currentUser} />}

      {/* Nav Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-between items-center z-50 max-w-md mx-auto rounded-t-[40px] shadow-2xl">
        <NavBtn active={view === 'DASHBOARD'} icon={<LayoutDashboard />} onClick={() => setView('DASHBOARD')} />
        <NavBtn active={view === 'PENDING'} icon={<ClipboardList />} onClick={() => setView('PENDING')} />
        <NavBtn active={view === 'COMPLETED'} icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
        <NavBtn active={view === 'DISPATCHED'} icon={<Truck />} onClick={() => setView('DISPATCHED')} />
      </nav>
    </div>
  );
}

// Subcomponentes

const OrderDetailsModal = ({ order, onClose, onUpdate, onSave, currentUser }: any) => {
  const [detailedPkg, setDetailedPkg] = useState<PackagingEntry[]>(order.detailedPackaging || []);
  const [reviewer, setReviewer] = useState(order.reviewer || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [carrier, setCarrier] = useState(order.carrier || '');
  const [customCarrier, setCustomCarrier] = useState('');
  
  const [pDeposit, setPDeposit] = useState(DEPOSITS[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [pType, setPType] = useState(PACKAGE_TYPES[0]);
  const [customType, setCustomType] = useState('');
  const [pQty, setPQty] = useState(1);

  const totalBultos = detailedPkg.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleAddPkg = () => {
    if (pQty <= 0) return;
    const location = pDeposit === 'OTRO' ? (customLocation || 'UBICACIÓN LIBRE') : pDeposit;
    const type = pType === 'OTRO' ? (customType || 'EMBALAJE LIBRE') : pType;
    setDetailedPkg([...detailedPkg, { id: Date.now().toString(), deposit: location, type: type, quantity: pQty }]);
    setCustomLocation(''); setCustomType('');
  };

  const removePkg = (id: string) => setDetailedPkg(detailedPkg.filter(p => p.id !== id));

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[150] flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-[48px] p-6 space-y-6 max-h-[95vh] overflow-y-auto relative shadow-2xl border-t-8 border-indigo-600">
        <div className="flex justify-between items-start sticky top-0 bg-white z-20 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-black uppercase text-slate-800 tracking-tighter leading-none">{order.customerName}</h2>
            <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg inline-block mt-2">PEDIDO #{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-full"><X size={20} /></button>
        </div>

        {/* Sección Preparación de Embalaje */}
        <section className="space-y-4 bg-slate-50 p-6 rounded-[40px] border border-slate-200">
           {/* Totalizador Centrado y Gigante */}
          <div className="text-center py-4 bg-white rounded-[32px] border-2 border-indigo-100 shadow-inner">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">TOTAL BULTOS</p>
             <span className="text-8xl font-black text-indigo-600 leading-none tabular-nums drop-shadow-sm">{totalBultos}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">UBICACIÓN</label>
              <select className="w-full bg-white border-2 border-slate-200 p-3 rounded-2xl text-[10px] font-black outline-none" value={pDeposit} onChange={e => setPDeposit(e.target.value)}>
                {DEPOSITS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {pDeposit === 'OTRO' && <input className="w-full bg-white border-2 border-indigo-200 p-3 rounded-2xl text-[10px] font-bold mt-1" placeholder="Nueva Ubicación..." value={customLocation} onChange={e => setCustomLocation(e.target.value.toUpperCase())} />}
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">TIPO DE BULTO</label>
              <select className="w-full bg-white border-2 border-slate-200 p-3 rounded-2xl text-[10px] font-black outline-none" value={pType} onChange={e => setPType(e.target.value)}>
                {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {pType === 'OTRO' && <input className="w-full bg-white border-2 border-indigo-200 p-3 rounded-2xl text-[10px] font-bold mt-1" placeholder="Nuevo Tipo..." value={customType} onChange={e => setCustomType(e.target.value.toUpperCase())} />}
            </div>
          </div>

          <div className="flex gap-2">
            <input type="number" className="w-20 bg-white border-2 border-slate-200 p-3 rounded-2xl text-center font-black text-indigo-700" value={pQty} onChange={e => setPQty(+e.target.value)} />
            <button onClick={handleAddPkg} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"><Plus size={18}/> AGREGAR AL ENVÍO</button>
          </div>

          {/* Lista de Bultos */}
          <div className="space-y-2 mt-4 max-h-40 overflow-y-auto">
            {detailedPkg.map(p => (
              <div key={p.id} className="bg-white p-3 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-700">
                   <span className="text-indigo-600 font-black mr-2">{p.quantity}</span> {p.type} <span className="text-slate-300 mx-1">|</span> [{p.deposit}]
                </span>
                <button onClick={() => removePkg(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </section>

        {/* Datos de Despacho */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2"><Truck size={14}/> Datos de Despacho</div>
          <select className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-[24px] text-xs font-black uppercase" value={carrier} onChange={e => setCarrier(e.target.value)}>
            <option value="">TRANSPORTE / VENDEDOR...</option>
            <option value="MATÍAS">VIAJANTE MATÍAS</option>
            <option value="NICOLÁS">VIAJANTE NICOLÁS</option>
            <option value="OTRO">OTRO TRANSPORTE</option>
          </select>
          {carrier === 'OTRO' && <input className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-[24px] text-xs font-bold uppercase" placeholder="NOMBRE TRANSPORTE" value={customCarrier} onChange={e => setCustomCarrier(e.target.value.toUpperCase())} />}
          
          <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-[24px] text-xs resize-none h-20 font-medium" placeholder="Notas de la preparación..." value={notes} onChange={e => setNotes(e.target.value)} />
          
          <div className="flex gap-2">
            <input className="flex-1 bg-teal-50 border-2 border-teal-100 p-4 rounded-[24px] text-xs font-black uppercase" placeholder="RESPONSABLE" value={reviewer} onChange={e => setReviewer(e.target.value)} />
            <button onClick={() => setReviewer(currentUser?.name || '')} className="p-4 bg-teal-600 text-white rounded-[24px] shadow-lg"><UserCheck size={20}/></button>
          </div>
        </section>

        {/* BOTONERA JERARQUIZADA */}
        <div className="flex flex-col gap-3 pb-8">
          {/* 1. GUARDAR CAMBIOS */}
          <button onClick={() => onSave({ detailedPackaging: detailedPkg, reviewer, notes, carrier: carrier === 'OTRO' ? customCarrier : carrier })} className="w-full bg-slate-900 text-white font-black py-5 rounded-[32px] uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            <Save size={20}/> GUARDAR OPERACIÓN
          </button>

          {/* 2. TRANSICIÓN DE ETAPA */}
          {order.status === OrderStatus.PENDING && (
            <button onClick={() => onUpdate(order.id, OrderStatus.COMPLETED, { detailedPackaging: detailedPkg, reviewer, notes })} className="w-full bg-emerald-600 text-white font-black py-6 rounded-[32px] uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all border-b-8 border-emerald-800">
              MARCAR COMO LISTO ✅
            </button>
          )}
          {order.status === OrderStatus.COMPLETED && (
            <button onClick={() => onUpdate(order.id, OrderStatus.DISPATCHED, { detailedPackaging: detailedPkg, reviewer, notes })} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[32px] uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all border-b-8 border-indigo-800">
              ENTREGAR A LOGÍSTICA 🚛
            </button>
          )}

          {/* 3. WHATSAPP */}
          <button onClick={() => {}} className="w-full bg-green-600 text-white font-black py-4 rounded-[32px] uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 active:opacity-90">
            <MessageCircle size={18}/> NOTIFICAR POR WHATSAPP
          </button>
        </div>
      </div>
    </div>
  );
};

// Componentes Reutilizables
const NavBtn = ({ active, icon, onClick }: any) => (
  <button onClick={onClick} className={`p-4 transition-all rounded-[22px] ${active ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-300'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

const SidebarItem = ({ icon, label, onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-2xl font-black text-xs text-slate-600 hover:bg-slate-50">{icon} <span className="uppercase">{label}</span></button>
);

const StatCard = ({ count, label, color, icon, onClick }: any) => (
  <button onClick={onClick} className={`${color} rounded-[36px] p-6 text-white text-left shadow-xl transform active:scale-95 flex flex-col justify-between h-44 relative overflow-hidden`}>
    <div className="z-10 bg-white/20 p-3 rounded-2xl self-start">{icon}</div>
    <div className="z-10"><h3 className="text-5xl font-black tracking-tighter leading-none">{count}</h3><p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-2">{label}</p></div>
    <div className="absolute -bottom-10 -right-10 bg-white/5 w-40 h-40 rounded-full blur-3xl opacity-20"></div>
  </button>
);

const GeneralEntryModal = ({ onClose, onAdd, currentUser }: any) => {
  const [customer, setCustomer] = useState('');
  const [locality, setLocality] = useState('');
  const [orderNum, setOrderNum] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[56px] shadow-2xl p-10 space-y-6">
        <h2 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Nueva Carga</h2>
        <div className="space-y-4">
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xs uppercase" placeholder="NRO PEDIDO" value={orderNum} onChange={e => setOrderNum(e.target.value)} />
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xs uppercase" placeholder="CLIENTE" value={customer} onChange={e => setCustomer(e.target.value)} />
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xs uppercase" placeholder="LOCALIDAD" value={locality} onChange={e => setLocality(e.target.value)} />
          <button onClick={() => { onAdd(customer, locality, orderNum, currentUser?.name || ''); onClose(); }} className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] uppercase text-sm flex items-center justify-center gap-3">INICIAR CONTROL <Send size={20}/></button>
          <button onClick={onClose} className="w-full text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

const CustomerPortal = ({ onBack, allOrders }: any) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);

  const handleTrack = () => {
    const o = allOrders.find((ord: Order) => ord.orderNumber.trim().toLowerCase() === trackingNumber.trim().toLowerCase());
    setFoundOrder(o || null);
    if (!o) alert("Nro no encontrado");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">D&G LOGISTICA</h1>
          <p className="text-[10px] font-black text-teal-500 uppercase tracking-[0.3em] mt-2">Portal de Seguimiento</p>
        </div>
        <div className="bg-white rounded-[48px] p-8 space-y-4 shadow-2xl">
          <input className="w-full bg-slate-50 p-5 rounded-3xl text-slate-900 font-black uppercase text-center border-2 border-transparent outline-none focus:border-indigo-500 transition-all shadow-inner" placeholder="Escribe tu nro (ej: 001-DG)" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
          <button onClick={handleTrack} className="w-full bg-indigo-600 py-5 rounded-[32px] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3"><ScanSearch size={20}/> Consultar</button>
        </div>
        {foundOrder && (
          <div className="bg-white rounded-[48px] p-8 space-y-6 text-slate-900 animate-in zoom-in-95 shadow-2xl">
            <h3 className="text-xl font-black tracking-tighter uppercase">{foundOrder.customerName}</h3>
            <div className="bg-indigo-50 p-6 rounded-[32px] border-2 border-indigo-100 flex flex-col items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Bultos Consolidados</p>
              <p className="text-5xl font-black text-indigo-900">{foundOrder.detailedPackaging?.reduce((a,c) => a+c.quantity, 0) || 0}</p>
            </div>
          </div>
        )}
        <button onClick={onBack} className="w-full text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 mt-4"><ArrowLeft size={14}/> Acceso Personal</button>
      </div>
    </div>
  );
};

const LoginModal = ({ onLogin, onClientPortal }: any) => {
  const [u, setU] = useState('');
  const handleSubmit = (e: any) => { e.preventDefault(); onLogin({ name: u, role: u.toLowerCase() === 'admin' ? 'admin' : 'staff' }); };
  return (
    <div className="fixed inset-0 bg-slate-950 z-[1000] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-xs rounded-[56px] p-12 text-center space-y-10 shadow-2xl">
        <ShieldAlert size={50} className="mx-auto text-indigo-500" />
        <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">D&G LOGISTICA</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full bg-slate-50 p-5 rounded-3xl text-sm font-bold text-center outline-none focus:border-indigo-500 border-2 border-transparent uppercase" placeholder="TU NOMBRE" value={u} onChange={e => setU(e.target.value)} required />
          <button className="w-full bg-slate-900 text-white font-black py-5 rounded-[32px] shadow-xl uppercase text-xs tracking-widest">INGRESAR</button>
        </form>
        <button onClick={onClientPortal} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Portal Clientes</button>
      </div>
    </div>
  );
};

const INITIAL_ORDERS: Order[] = [];
