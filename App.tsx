
import React, { useState, useMemo, useEffect } from 'react';
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
  Loader2,
  ScanSearch,
  Mail,
  X,
  Share2,
  Send,
  History,
  ChevronLeft,
  Layers,
  StickyNote,
  BellRing,
  LogOut,
  DownloadCloud,
  RefreshCcw,
  Navigation,
  Trash2,
  PlusSquare,
  ClipboardCheck,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Clock,
  MapPin,
  CheckCircle
} from 'lucide-react';
import { Order, OrderStatus, View, PackagingEntry, HistoryEntry } from './types';

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
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dg_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_ORDERS; }
    }
    return INITIAL_ORDERS;
  });

  useEffect(() => {
    localStorage.setItem('dg_orders', JSON.stringify(orders));
  }, [orders]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGeneralEntryModal, setShowGeneralEntryModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: 'admin' | 'staff' } | null>(null);
  const [newOrderNotification, setNewOrderNotification] = useState<Order | null>(null);

  const isAdmin = currentUser?.role === 'admin';

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

  const handleSelectOrder = (order: Order) => {
    if (!currentUser) return;
    if (order.lockedBy && order.lockedBy !== currentUser.name && !isAdmin) {
      alert(`⚠️ TRABAJO EN CURSO: ${order.lockedBy} está editando este pedido.`);
      return;
    }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, lockedBy: currentUser.name } : o));
    setSelectedOrder({ ...order, lockedBy: currentUser.name });
  };

  const shareOrder = async (order: Order, type: 'whatsapp' | 'email', customStage?: string) => {
    const stageDisplay = customStage || {
      [OrderStatus.PENDING]: 'EN PREPARACIÓN',
      [OrderStatus.COMPLETED]: 'LISTO PARA DESPACHO',
      [OrderStatus.DISPATCHED]: 'DESPACHADO'
    }[order.status];
    
    const detailedPkg = order.detailedPackaging || [];
    const totalQty = detailedPkg.reduce((acc, curr) => acc + curr.quantity, 0);
    const responsibleName = order.reviewer || (currentUser?.name || "Responsable");

    let text = `📦 *D&G LOGISTICA*\n`;
    text += `*#${order.orderNumber}* | *${order.customerName}*\n`;
    if (order.locality) text += `📍 ${order.locality}\n`;
    text += `--------------------------\n`;
    
    if (detailedPkg.length > 0) {
      detailedPkg.forEach(p => {
        text += `• ${p.quantity} ${p.type.substring(0,6)} (${p.deposit})\n`;
      });
      text += `Total: *${totalQty} bultos*\n`;
      text += `--------------------------\n`;
    }

    let logInfo = [];
    if (order.carrier) logInfo.push(`🚛 ${order.carrier}`);
    if (responsibleName) logInfo.push(`👤 ${responsibleName}`);
    if (logInfo.length > 0) text += logInfo.join(' | ') + `\n`;
    
    if (order.notes) text += `📝 ${order.notes}\n`;
    
    text += `--------------------------\n`;
    text += `*ESTADO:* ${stageDisplay}\n`;
    text += `--------------------------\n`;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR');
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    text += `${dateStr} - ${timeStr}`;

    if (type === 'whatsapp') {
      const waNumber = customStage === 'RECEPCIÓN' ? CENTRAL_WHATSAPP_NUMBER : "";
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      const emailTarget = customStage === 'RECEPCIÓN' ? CENTRAL_EMAIL : "";
      const emailBody = text.replace(/\*/g, '');
      window.location.href = `mailto:${emailTarget}?subject=${encodeURIComponent(stageDisplay + ' - ' + order.customerName)}&body=${encodeURIComponent(emailBody)}`;
    }
    if (customStage === 'RECEPCIÓN') setNewOrderNotification(null);
  };

  const handleUpdateStatus = (id: string, newStatus: OrderStatus, extraData?: Partial<Order>) => {
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        const historyLabel = newStatus === OrderStatus.COMPLETED 
          ? 'Preparación finalizada en depósito' 
          : newStatus === OrderStatus.DISPATCHED 
          ? 'Pedido entregado a logística/transporte' 
          : 'Estado actualizado';
        
        const newHistoryEntry: HistoryEntry = {
          status: newStatus,
          label: historyLabel,
          timestamp: new Date().toISOString()
        };

        return { 
          ...o, 
          status: newStatus, 
          ...extraData, 
          lockedBy: undefined,
          history: [...(o.history || []), newHistoryEntry]
        };
      }
      return o;
    }));
  };

  const addQuickOrder = (customer: string, locality: string, items: string, source: any, detail: string, orderNum: string, reviewer: string) => {
    const orderId = Date.now().toString();
    const newOrder: Order = {
      id: orderId,
      orderNumber: orderNum || `P-${Math.floor(Math.random() * 900) + 100}`,
      customerName: customer,
      locality: locality,
      status: OrderStatus.PENDING,
      items: [{ id: '1', name: items, quantity: 1 }],
      packaging: { bolsas: 0, bultos: 0, cajas: 0 },
      detailedPackaging: [],
      reviewer: reviewer || currentUser?.name || 'Responsable',
      notes: '',
      createdAt: new Date().toISOString(),
      source: 'Manual',
      sourceDetail: detail,
      history: [{
        status: OrderStatus.PENDING,
        label: 'Pedido ingresado al sistema',
        timestamp: new Date().toISOString()
      }]
    };
    setOrders([newOrder, ...orders]);
    setNewOrderNotification(newOrder);
  };

  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} allOrders={orders} />;
  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientPortal={() => setIsCustomerMode(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 relative overflow-x-hidden font-sans selection:bg-teal-100">
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="relative bg-white w-72 h-full shadow-2xl flex flex-col">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div><h2 className="font-black text-lg uppercase">Menú</h2><p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Operaciones Depósito</p></div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white/10 rounded-full"><ChevronLeft size={20} /></button>
            </div>
            <nav className="p-4 flex flex-col gap-1 flex-1 overflow-y-auto">
              <SidebarItem icon={<LayoutDashboard />} label="TABLERO" active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Layers className="text-teal-500" />} label="ENTRADA GENERAL" active={false} onClick={() => { setShowGeneralEntryModal(true); setIsSidebarOpen(false); }} />
              <div className="h-px bg-slate-100 my-2" />
              <SidebarItem icon={<ClipboardList className="text-orange-500" />} label="PENDIENTES" active={view === 'PENDING'} onClick={() => { setView('PENDING'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<CheckCircle2 className="text-emerald-500" />} label="COMPLETADOS" active={view === 'COMPLETED'} onClick={() => { setView('COMPLETED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<Truck className="text-indigo-500" />} label="DESPACHO" active={view === 'DISPATCHED'} onClick={() => { setView('DISPATCHED'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<History className="text-slate-500" />} label="HISTORICO" active={view === 'ALL'} onClick={() => { setView('ALL'); setIsSidebarOpen(false); }} />
              <div className="mt-auto space-y-2 pt-4 border-t border-slate-100">
                <SidebarItem icon={<DownloadCloud className="text-blue-600" />} label="EXPORTAR DATOS" active={false} onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(orders, null, 2));
                  const downloadAnchorNode = document.createElement('a');
                  downloadAnchorNode.setAttribute("href", dataStr);
                  downloadAnchorNode.setAttribute("download", `dg_respaldo_${new Date().toISOString().split('T')[0]}.json`);
                  document.body.appendChild(downloadAnchorNode);
                  downloadAnchorNode.click();
                  downloadAnchorNode.remove();
                  setIsSidebarOpen(false);
                }} />
                <SidebarItem icon={<RefreshCcw className="text-orange-600" />} label="LIMPIAR TODO" active={false} onClick={() => {
                  if (confirm("⚠️ ¿BORRAR TODA LA BASE DE DATOS?")) {
                    setOrders(INITIAL_ORDERS);
                    setIsSidebarOpen(false);
                  }
                }} />
                <SidebarItem icon={<LogOut className="text-red-500" />} label="CERRAR SESIÓN" active={false} onClick={() => setCurrentUser(null)} />
              </div>
            </nav>
          </aside>
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-2xl relative z-10">
        <div className="flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-white/10 rounded-2xl active:scale-90 transition-transform"><Menu size={22} /></button>
          <div className="text-center"><h1 className="text-lg font-black uppercase tracking-tighter">D&G LOGISTICA</h1></div>
          <div className="p-2.5 rounded-2xl bg-teal-500 shadow-lg"><User size={20} /></div>
        </div>
      </header>

      <main className="p-5 space-y-6">
        {view === 'DASHBOARD' && (
          <div className="grid grid-cols-2 gap-4">
            <StatCard count={stats.pending} label="PENDIENTES" color="bg-orange-500" icon={<ClipboardList size={20} />} onClick={() => setView('PENDING')} />
            <StatCard count={stats.completed} label="COMPLETOS" color="bg-emerald-600" icon={<CheckCircle2 size={20} />} onClick={() => setView('COMPLETED')} />
            <StatCard count={stats.total} label="HISTORIAL" color="bg-teal-600" icon={<History size={20} />} onClick={() => setView('ALL')} />
            <StatCard count={stats.dispatched} label="DESPACHO" color="bg-indigo-600" icon={<Truck size={20} />} onClick={() => setView('DISPATCHED')} />
            <button onClick={() => setShowGeneralEntryModal(true)} className="col-span-2 bg-slate-900 text-white rounded-[32px] p-6 flex items-center justify-between shadow-xl active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-teal-500 p-3 rounded-2xl"><Layers size={24} /></div>
                <div className="text-left"><p className="font-black text-lg">ENTRADA GENERAL</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Carga rápida</p></div>
              </div>
              <ChevronRight size={24} className="text-teal-500" />
            </button>
          </div>
        )}

        {['PENDING', 'COMPLETED', 'DISPATCHED', 'ALL'].includes(view) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600"><ArrowLeft size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Volver</span></button>
              <h2 className="font-black text-xs text-slate-300 uppercase tracking-widest">{viewNames[view]}</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Buscar cliente..." className="w-full bg-white border-2 border-slate-100 rounded-3xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm outline-none focus:border-teal-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3 pb-12">
              {filteredOrders.length === 0 ? <div className="text-center py-20 opacity-10"><Package size={80} className="mx-auto" /></div> : filteredOrders.map(order => (
                <div key={order.id} onClick={() => handleSelectOrder(order)} className={`bg-white border-2 rounded-[32px] p-5 shadow-sm transition-all cursor-pointer relative ${order.lockedBy ? 'border-orange-200 bg-orange-50/20' : 'border-slate-50 active:bg-slate-100'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">{order.orderNumber}</p>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${order.status === OrderStatus.PENDING ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{order.status}</span>
                  </div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight">{order.customerName}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {order.locality && <div className="flex items-center gap-1 text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"><Navigation size={10} /> {order.locality}</div>}
                    {(order.detailedPackaging?.length || 0) > 0 && <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"><Package size={10} /> {order.detailedPackaging?.reduce((acc, curr) => acc + curr.quantity, 0)} Bultos</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {newOrderNotification && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[600] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-[48px] p-8 text-center space-y-6 animate-in zoom-in-95 shadow-2xl">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-indigo-600"><BellRing size={32} className="animate-bounce" /></div>
            <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">¡Pedido Ingresado!</h2></div>
            <div className="space-y-3">
              <button onClick={() => shareOrder(newOrderNotification, 'whatsapp', 'RECEPCIÓN')} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 text-xs tracking-widest uppercase"><MessageCircle size={18} /> WhatsApp</button>
              <button onClick={() => setNewOrderNotification(null)} className="w-full text-slate-400 text-[9px] font-black uppercase">Omitir</button>
            </div>
          </div>
        </div>
      )}

      {showGeneralEntryModal && <GeneralEntryModal onClose={() => setShowGeneralEntryModal(false)} onAdd={addQuickOrder} currentUser={currentUser} />}
      {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => {
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, lockedBy: undefined } : o));
        setSelectedOrder(null);
      }} onUpdate={handleUpdateStatus} onShare={shareOrder} currentUser={currentUser} />}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-between items-center z-50 max-w-md mx-auto rounded-t-[40px] shadow-2xl">
        <NavBtn active={view === 'DASHBOARD'} icon={<LayoutDashboard />} onClick={() => setView('DASHBOARD')} />
        <NavBtn active={view === 'PENDING'} icon={<ClipboardList />} onClick={() => setView('PENDING')} />
        <NavBtn active={view === 'COMPLETED'} icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
        <NavBtn active={view === 'DISPATCHED'} icon={<Truck />} onClick={() => setView('DISPATCHED')} />
      </nav>
    </div>
  );
}

const NavBtn = ({ active, icon, onClick }: any) => (
  <button onClick={onClick} className={`p-4 transition-all rounded-[22px] ${active ? 'text-teal-600 bg-teal-50 shadow-inner' : 'text-slate-300'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-5 rounded-[24px] font-black text-xs ${active ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>{React.cloneElement(icon, { size: 20 })} <span className="tracking-widest uppercase">{label}</span></button>
);

const StatCard = ({ count, label, color, icon, onClick }: any) => (
  <button onClick={onClick} className={`${color} rounded-[36px] p-6 text-white text-left shadow-xl transform active:scale-95 flex flex-col justify-between h-44 relative overflow-hidden group`}>
    <div className="z-10 bg-white/20 p-3 rounded-2xl self-start">{icon}</div>
    <div className="z-10"><h3 className="text-5xl font-black tracking-tighter leading-none">{count}</h3><p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-2">{label}</p></div>
    <div className="absolute -bottom-10 -right-10 bg-white/5 w-40 h-40 rounded-full blur-3xl"></div>
  </button>
);

const GeneralEntryModal = ({ onClose, onAdd, currentUser }: any) => {
  const [customer, setCustomer] = useState('');
  const [locality, setLocality] = useState('');
  const [items, setItems] = useState('');
  const [orderNum, setOrderNum] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[56px] shadow-2xl p-10 space-y-6">
        <div className="flex justify-between items-center"><h2 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Nueva Carga</h2><button onClick={onClose} className="p-3 bg-slate-100 rounded-full"><X size={20}/></button></div>
        <div className="space-y-4">
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xs uppercase" placeholder="Nro Pedido" value={orderNum} onChange={e => setOrderNum(e.target.value)} />
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xs uppercase" placeholder="NOMBRE DEL CLIENTE" value={customer} onChange={e => setCustomer(e.target.value)} />
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xs uppercase" placeholder="LOCALIDAD" value={locality} onChange={e => setLocality(e.target.value)} />
          <textarea rows={4} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-medium text-xs resize-none" placeholder="Pegue la lista aquí..." value={items} onChange={e => setItems(e.target.value)} />
          <button onClick={() => { onAdd(customer, locality, items, 'Manual', '', orderNum, currentUser?.name || ''); onClose(); }} className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] uppercase text-sm">REGISTRAR <Send size={20} className="inline ml-2" /></button>
        </div>
      </div>
    </div>
  );
};

const OrderDetailsModal = ({ order, onClose, onUpdate, onShare, currentUser }: any) => {
  const [detailedPkg, setDetailedPkg] = useState<PackagingEntry[]>(order.detailedPackaging || []);
  const [reviewer, setReviewer] = useState(order.reviewer || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [carrier, setCarrier] = useState(order.carrier || '');
  const [customCarrier, setCustomCarrier] = useState('');
  const [partialDeposit, setPartialDeposit] = useState(DEPOSITS[0]);
  const [partialType, setPartialType] = useState(PACKAGE_TYPES[0]);
  const [partialQty, setPartialQty] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const handleConfirmPartial = () => {
    if (partialQty <= 0) return;
    const newEntry: PackagingEntry = { id: Date.now().toString(), deposit: partialDeposit, type: partialType, quantity: partialQty };
    const newList = [...detailedPkg, newEntry];
    setDetailedPkg(newList);
    onUpdate(order.id, order.status, { detailedPackaging: newList });
  };

  const handleFinalConfirm = () => {
    if (detailedPkg.length === 0) return alert("Cargue bultos");
    setIsSaving(true);
    const nextStatus = order.status === OrderStatus.PENDING ? OrderStatus.COMPLETED : OrderStatus.DISPATCHED;
    onUpdate(order.id, nextStatus, { detailedPackaging: detailedPkg, reviewer, notes, carrier: carrier === 'OTRO' ? customCarrier : carrier });
    setTimeout(() => { setIsSaving(false); setShowShare(true); }, 500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[150] flex items-end justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-t-[48px] p-8 space-y-4 max-h-[90vh] overflow-y-auto relative border-t-8 border-teal-500 shadow-2xl">
        {!showShare ? (
          <>
            <div className="flex justify-between items-start"><h2 className="text-xl font-black uppercase text-slate-800 tracking-tighter">{order.customerName}</h2><button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X size={16} /></button></div>
            <div className="bg-slate-50 p-4 rounded-[32px] space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select className="bg-white border p-2 rounded-xl text-xs font-black" value={partialDeposit} onChange={e => setPartialDeposit(e.target.value)}>{DEPOSITS.map(d => <option key={d}>{d}</option>)}</select>
                <select className="bg-white border p-2 rounded-xl text-xs font-black" value={partialType} onChange={e => setPartialType(e.target.value)}>{PACKAGE_TYPES.map(t => <option key={t}>{t}</option>)}</select>
              </div>
              <div className="flex gap-2">
                <input type="number" className="flex-1 bg-white border p-2 rounded-xl text-center font-black" value={partialQty} onChange={e => setPartialQty(+e.target.value)} />
                <button onClick={handleConfirmPartial} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Cargar</button>
              </div>
            </div>
            <div className="space-y-2">
              <select className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" value={carrier} onChange={e => setCarrier(e.target.value)}>
                <option value="">Seleccionar transporte...</option>
                <option value="VIAJANTE - MATÍAS">MATÍAS</option>
                <option value="VIAJANTE - NICOLÁS">NICOLÁS</option>
                <option value="VENDEDOR - MAURO">MAURO</option>
                <option value="VENDEDOR - GUSTAVO">GUSTAVO</option>
                <option value="OTRO">OTRO</option>
              </select>
              {carrier === 'OTRO' && <input className="w-full bg-slate-50 border p-4 rounded-2xl text-xs" placeholder="¿Quién?" value={customCarrier} onChange={e => setCustomCarrier(e.target.value)} />}
            </div>
            <textarea className="w-full bg-slate-50 border p-4 rounded-2xl text-xs resize-none" placeholder="Notas..." value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex items-center justify-between gap-2">
               <input className="flex-1 bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-xs font-black uppercase" placeholder="Responsable" value={reviewer} onChange={e => setReviewer(e.target.value)} />
               <button onClick={() => setReviewer(currentUser?.name || '')} className="p-3 bg-indigo-600 text-white rounded-xl"><UserCheck size={16}/></button>
            </div>
            <button onClick={handleFinalConfirm} className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl uppercase tracking-widest text-xs shadow-lg">{isSaving ? <Loader2 className="animate-spin mx-auto"/> : 'CONFIRMAR ESTADO'}</button>
          </>
        ) : (
          <div className="py-10 text-center space-y-8 animate-in zoom-in-95">
            <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-emerald-600"><CheckCircle2 size={40}/></div>
            <h3 className="text-2xl font-black uppercase tracking-tighter">¡Pedido Actualizado!</h3>
            <button onClick={() => { onShare({...order, reviewer, notes, detailedPackaging: detailedPkg, carrier: carrier === 'OTRO' ? customCarrier : carrier}, 'whatsapp'); onClose(); }} className="w-full bg-green-600 text-white font-black py-6 rounded-[32px] shadow-xl flex items-center justify-center gap-4 text-base uppercase"><MessageCircle size={24} /> WhatsApp</button>
            <button onClick={onClose} className="w-full text-slate-300 font-black text-[10px] uppercase">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
};

const LoginModal = ({ onLogin, onClientPortal }: { onLogin: (user: any) => void, onClientPortal: () => void }) => {
  const [u, setU] = useState('');
  const handleSubmit = (e: any) => { e.preventDefault(); onLogin({ name: u, role: u.toLowerCase() === 'admin' ? 'admin' : 'staff' }); };
  return (
    <div className="fixed inset-0 bg-slate-950 z-[1000] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-xs rounded-[56px] p-12 text-center space-y-10 shadow-2xl">
        <ShieldAlert size={50} className="mx-auto text-teal-500" />
        <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">D&G LOGISTICA</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full bg-slate-50 p-5 rounded-3xl text-sm font-bold text-center outline-none focus:border-teal-500 border-2 border-transparent uppercase" placeholder="TU NOMBRE" value={u} onChange={e => setU(e.target.value)} required />
          <button className="w-full bg-slate-900 text-white font-black py-5 rounded-[32px] shadow-xl uppercase text-xs tracking-widest">ACCEDER</button>
        </form>
        <button onClick={onClientPortal} className="text-teal-600 font-black text-[10px] uppercase tracking-widest">Portal Clientes</button>
      </div>
    </div>
  );
};

const CustomerPortal = ({ onBack, allOrders }: { onBack: () => void, allOrders: Order[] }) => {
  const [mode, setMode] = useState<'FORM' | 'TRACKING'>('FORM');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  
  const [name, setName] = useState('');
  const [txt, setTxt] = useState('');

  const sendOrder = () => { 
    window.open(`https://wa.me/${CENTRAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(`*PEDIDO PORTAL*\n*Cliente:* ${name}\n*Detalle:* ${txt}`)}`, '_blank'); 
  };

  const handleTrack = () => {
    const order = allOrders.find(o => o.orderNumber.toLowerCase() === trackingNumber.toLowerCase());
    setFoundOrder(order || null);
    if (!order) alert("No se encontró el pedido. Verifique el número.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter">D&G LOGISTICA</h1>
          <p className="text-[10px] text-teal-500 font-black uppercase tracking-[0.2em] mt-2">Portal de Servicios</p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-3xl">
          <button onClick={() => setMode('FORM')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${mode === 'FORM' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>Nuevo Pedido</button>
          <button onClick={() => setMode('TRACKING')} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${mode === 'TRACKING' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>Seguimiento</button>
        </div>

        {mode === 'FORM' ? (
          <div className="bg-white rounded-[48px] p-8 space-y-6 text-left animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tu Nombre</label>
              <input className="w-full bg-slate-50 p-5 rounded-3xl text-slate-900 font-bold uppercase border-2 border-transparent focus:border-teal-500 outline-none transition-all" placeholder="EJ: JUAN PEREZ" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Detalle del Pedido</label>
              <textarea className="w-full bg-slate-50 p-5 rounded-3xl text-slate-900 border-2 border-transparent focus:border-teal-500 outline-none transition-all resize-none" rows={6} placeholder="PRODUCTOS Y CANTIDADES..." value={txt} onChange={e => setTxt(e.target.value)} />
            </div>
            <button onClick={sendOrder} className="w-full bg-green-600 py-6 rounded-[32px] font-black uppercase text-xs tracking-[0.1em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"><MessageCircle size={20}/> ENVIAR POR WHATSAPP</button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[48px] p-8 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input className="w-full bg-slate-50 p-5 pl-12 rounded-3xl text-slate-900 font-black uppercase outline-none focus:border-teal-500 border-2 border-transparent transition-all" placeholder="N° DE PEDIDO (EJ: 001-DG)" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
              </div>
              <button onClick={handleTrack} className="w-full bg-slate-900 py-5 rounded-[32px] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3"><ScanSearch size={20}/> CONSULTAR ESTADO</button>
            </div>

            {foundOrder && (
              <div className="bg-white rounded-[48px] p-8 space-y-8 text-slate-900 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">{foundOrder.customerName}</h3>
                    <p className="text-[10px] text-teal-600 font-bold mt-2 uppercase tracking-widest">Pedido #{foundOrder.orderNumber}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${foundOrder.status === OrderStatus.DISPATCHED ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{foundOrder.status}</div>
                </div>

                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {(foundOrder.history || []).map((entry, idx) => (
                    <div key={idx} className="flex gap-4 relative z-10">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${idx === (foundOrder.history?.length || 1) - 1 ? 'bg-teal-500 animate-pulse' : 'bg-slate-200'}`}>
                        {idx === (foundOrder.history?.length || 1) - 1 ? <CheckCircle size={10} className="text-white"/> : <Clock size={10} className="text-slate-400"/>}
                      </div>
                      <div className="flex-1">
                        <p className={`font-black text-xs uppercase ${idx === (foundOrder.history?.length || 1) - 1 ? 'text-slate-900' : 'text-slate-400'}`}>{entry.label}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(entry.timestamp).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                  
                  {foundOrder.status !== OrderStatus.DISPATCHED && (
                    <div className="flex gap-4 opacity-30">
                      <div className="w-6 h-6 rounded-full bg-slate-100 border-4 border-white"></div>
                      <div className="flex-1">
                        <p className="font-black text-xs uppercase text-slate-400">Entrega a Logística</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">Pendiente...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={onBack} className="w-full text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 mt-4 hover:text-white transition-colors"><ArrowLeft size={14}/> VOLVER AL ACCESO PERSONAL</button>
      </div>
    </div>
  );
};

const INITIAL_ORDERS: Order[] = [
  { 
    id: '1', 
    orderNumber: '001-DG', 
    customerName: 'D&G Distribución', 
    locality: 'Firmat', 
    status: OrderStatus.PENDING, 
    items: [], 
    packaging: { bolsas: 0, bultos: 0, cajas: 0 }, 
    detailedPackaging: [], 
    createdAt: new Date().toISOString(), 
    source: 'Manual',
    history: [{ status: OrderStatus.PENDING, label: 'Pedido inicializado', timestamp: new Date().toISOString() }]
  }
];
