
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  CheckCircle2, 
  Truck, 
  PlusCircle, 
  Search, 
  MessageCircle, 
  ChevronRight, 
  Menu,
  User,
  Package,
  ArrowLeft,
  Loader2,
  ScanSearch,
  MapPin,
  FileDown,
  Lock,
  Mail,
  X,
  Plus,
  Share2,
  Send,
  PencilLine,
  History,
  ChevronLeft,
  Layers,
  StickyNote,
  ListFilter,
  ArrowRight,
  LogOut,
  BellRing,
  MailPlus,
  Download,
  Github,
  Info,
  ShieldCheck,
  UserCheck,
  Link,
  Copy,
  Check,
  UserPlus,
  ShieldAlert,
  Eye,
  Hammer,
  ExternalLink,
  MessageSquareQuote,
  UserCircle,
  Navigation,
  Trash2,
  PlusSquare,
  ClipboardCheck,
  Warehouse,
  RotateCcw,
  RefreshCcw,
  DownloadCloud
} from 'lucide-react';
import { Order, OrderStatus, View, OrderItem, Packaging, PackagingEntry } from './types';
import { analyzeOrderText } from './services/geminiService';

// CONFIGURACIÓN DE PRODUCCIÓN
const CENTRAL_WHATSAPP_NUMBER = "2974723835"; 
const CENTRAL_EMAIL = "depaoliroberto364@gmail.com";
const SUBJECT_PREFIX = "Gestión de Pedido - BIG SHOP - FIRMAT";

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
  
  // Persistencia con LocalStorage
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dg_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_ORDERS;
      }
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

  const handleCloseDetails = () => {
    if (selectedOrder && currentUser) {
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, lockedBy: undefined } : o));
    }
    setSelectedOrder(null);
  };

  const handleClearDatabase = () => {
    if (confirm("⚠️ ¿BORRAR TODA LA BASE DE DATOS?\nEsta acción no se puede deshacer y eliminará todos los pedidos registrados.")) {
      setOrders(INITIAL_ORDERS);
      setIsSidebarOpen(false);
      setView('DASHBOARD');
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(orders, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `dg_respaldo_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setIsSidebarOpen(false);
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

    let text = `*D&G BAZAR Y REGALERIA*\n`;
    text += `*ESTADO:* ${stageDisplay}\n`;
    text += `--------------------------\n`;
    text += `*Pedido:* ${order.orderNumber}\n`;
    text += `*Cliente:* ${order.customerName}\n`;
    if (order.locality) text += `*Localidad:* ${order.locality}\n`;
    
    if (detailedPkg.length > 0) {
      text += `*DETALLE DE EMPAQUE:*\n`;
      detailedPkg.forEach(p => {
        text += `- Dep. ${p.deposit}: ${p.quantity} ${p.type.toUpperCase()}(S)\n`;
      });
      text += `- *Total cantidad:* ${totalQty}\n`;
    }

    if (order.carrier) text += `*Transporte:* ${order.carrier}\n`;
    text += `*Responsable:* ${responsibleName}\n`;
    if (order.notes) text += `*Notas:* ${order.notes}\n`;
    
    text += `--------------------------\n`;
    text += `_Actualizado el ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}_`;

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
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, ...extraData, lockedBy: undefined } : o));
  };

  const addQuickOrder = (customer: string, locality: string, items: string, source: any, detail: string, orderNum: string, reviewer: string) => {
    const newOrder: Order = {
      id: Date.now().toString(),
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
      location: ''
    };
    setOrders([newOrder, ...orders]);
    setNewOrderNotification(newOrder);
  };

  if (!currentUser) return <LoginModal onLogin={u => setCurrentUser(u)} onClientPortal={() => setIsCustomerMode(true)} />;
  if (isCustomerMode) return <CustomerPortal onBack={() => setIsCustomerMode(false)} />;

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
                <SidebarItem icon={<DownloadCloud className="text-blue-600" />} label="EXPORTAR DATOS" active={false} onClick={handleExportData} />
                <SidebarItem icon={<RefreshCcw className="text-orange-600" />} label="LIMPIAR TODO" active={false} onClick={handleClearDatabase} />
                <SidebarItem icon={<LogOut className="text-red-500" />} label="CERRAR SESIÓN" active={false} onClick={() => setCurrentUser(null)} />
              </div>
            </nav>
          </aside>
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-2xl relative z-10">
        <div className="flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-white/10 rounded-2xl active:scale-90 transition-transform"><Menu size={22} /></button>
          <div className="text-center"><h1 className="text-lg font-black uppercase tracking-tighter">D&G LOGÍSTICA</h1><p className="text-[9px] text-teal-400 font-black tracking-widest uppercase">Big Shop Firmat</p></div>
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
                <div className="text-left">
                  <p className="font-black text-lg">ENTRADA GENERAL</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Carga rápida de pedidos</p>
                </div>
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
              <input type="text" placeholder="Buscar por cliente, nro o localidad..." className="w-full bg-white border-2 border-slate-100 rounded-3xl py-4 pl-12 pr-4 text-sm font-bold shadow-sm outline-none focus:border-teal-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3 pb-12">
              {filteredOrders.length === 0 ? <div className="text-center py-20 opacity-10"><Package size={80} className="mx-auto" /></div> : filteredOrders.map(order => (
                <div key={order.id} onClick={() => handleSelectOrder(order)} className={`bg-white border-2 rounded-[32px] p-5 shadow-sm transition-all cursor-pointer relative ${order.lockedBy ? 'border-orange-200 bg-orange-50/20' : 'border-slate-50 active:bg-slate-100'}`}>
                  {order.lockedBy && <div className="absolute top-0 right-0 px-3 py-1 bg-orange-500 text-white text-[8px] font-black rounded-bl-xl uppercase animate-pulse">{order.lockedBy} Preparando</div>}
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg">{order.orderNumber}</p>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${order.status === OrderStatus.PENDING ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{order.status}</span>
                  </div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight">{order.customerName}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {order.locality && (
                      <div className="flex items-center gap-1 text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                        <Navigation size={10} /> {order.locality}
                      </div>
                    )}
                    {(order.detailedPackaging?.length || 0) > 0 && (
                      <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                        <Package size={10} /> {order.detailedPackaging?.reduce((acc, curr) => acc + curr.quantity, 0)} Bultos
                      </div>
                    )}
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
            <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">¡Pedido Ingresado!</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">¿Desea notificar a Central?</p></div>
            <div className="space-y-3">
              <button onClick={() => shareOrder(newOrderNotification, 'whatsapp', 'RECEPCIÓN')} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-xs tracking-widest uppercase active:scale-95"><MessageCircle size={18} /> WhatsApp</button>
              <button onClick={() => shareOrder(newOrderNotification, 'email', 'RECEPCIÓN')} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-xs tracking-widest uppercase active:scale-95"><Mail size={18} /> Correo</button>
              <button onClick={() => setNewOrderNotification(null)} className="w-full text-slate-400 text-[9px] font-black uppercase py-2">Omitir aviso</button>
            </div>
          </div>
        </div>
      )}

      {showGeneralEntryModal && <GeneralEntryModal onClose={() => setShowGeneralEntryModal(false)} onAdd={addQuickOrder} currentUser={currentUser} />}
      {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={handleCloseDetails} onUpdate={handleUpdateStatus} onShare={shareOrder} currentUser={currentUser} />}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-between items-center z-50 max-w-md mx-auto rounded-t-[40px] shadow-2xl">
        <NavBtn active={view === 'DASHBOARD'} icon={<LayoutDashboard />} onClick={() => setView('DASHBOARD')} />
        <NavBtn active={view === 'PENDING'} icon={<ClipboardList />} onClick={() => setView('PENDING')} />
        <NavBtn active={view === 'COMPLETED'} icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
        <NavBtn active={view === 'DISPATCHED'} icon={<Truck />} onClick={() => setView('DISPATCHED')} />
      </nav>
    </div>
  );
}

const OrderDetailsModal = ({ order, onClose, onUpdate, onShare, currentUser }: any) => {
  const [detailedPkg, setDetailedPkg] = useState<PackagingEntry[]>(order.detailedPackaging || []);
  const [location, setLocation] = useState(order.location || '');
  const [locality, setLocality] = useState(order.locality || '');
  const [orderNum, setOrderNum] = useState(order.orderNumber);
  const [reviewer, setReviewer] = useState(order.reviewer || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [carrier, setCarrier] = useState(order.carrier || '');
  const [customCarrier, setCustomCarrier] = useState('');
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados para la carga parcial
  const [partialDeposit, setPartialDeposit] = useState(DEPOSITS[0]);
  const [customDeposit, setCustomDeposit] = useState('');
  const [partialType, setPartialType] = useState(PACKAGE_TYPES[0]);
  const [customType, setCustomType] = useState('');
  const [partialQty, setPartialQty] = useState(1);

  const isDispatchMode = order.status === OrderStatus.DISPATCHED;

  // Cálculo consolidado por depósito
  const consolidatedByDeposit = useMemo(() => {
    const summary: Record<string, number> = {};
    detailedPkg.forEach(e => {
      summary[e.deposit] = (summary[e.deposit] || 0) + e.quantity;
    });
    return summary;
  }, [detailedPkg]);

  const totalQuantity = useMemo(() => 
    detailedPkg.reduce((acc, curr) => acc + curr.quantity, 0), 
  [detailedPkg]);

  const handleConfirmPartial = () => {
    if (partialQty <= 0) return;
    const depositFinal = partialDeposit === 'OTRO' ? customDeposit : partialDeposit;
    const typeFinal = partialType === 'OTRO' ? customType : partialType;
    if (!depositFinal || !typeFinal) {
      alert("Por favor complete Depósito y Tipo");
      return;
    }
    const newEntry: PackagingEntry = {
      id: Date.now().toString(),
      deposit: depositFinal,
      type: typeFinal,
      quantity: partialQty
    };
    const newList = [...detailedPkg, newEntry];
    setDetailedPkg(newList);
    onUpdate(order.id, order.status, { detailedPackaging: newList, location, orderNumber: orderNum, reviewer, notes, locality });
    setPartialQty(1);
    setCustomDeposit('');
    setCustomType('');
  };

  const removeEntry = (id: string) => {
    const newList = detailedPkg.filter(e => e.id !== id);
    setDetailedPkg(newList);
    onUpdate(order.id, order.status, { detailedPackaging: newList });
  };

  const handleFinalConfirm = () => {
    if (detailedPkg.length === 0) {
      alert("Debe confirmar al menos una carga parcial antes de finalizar.");
      return;
    }
    setIsSaving(true);
    const nextStatus = order.status === OrderStatus.PENDING ? OrderStatus.COMPLETED : OrderStatus.DISPATCHED;
    const finalCarrier = carrier === 'OTRO' ? customCarrier : carrier;
    onUpdate(order.id, nextStatus, { 
      detailedPackaging: detailedPkg, 
      location, 
      orderNumber: orderNum, 
      reviewer, 
      notes, 
      locality,
      carrier: finalCarrier
    });
    setTimeout(() => { setIsSaving(false); setShowShareOptions(true); }, 500);
  };

  const handleRevert = () => {
    if (confirm("¿Seguro que desea borrar el despacho y volver a etapa COMPLETADO?")) {
      onUpdate(order.id, OrderStatus.COMPLETED, { carrier: '', lockedBy: undefined });
      onClose();
    }
  };

  const autoSave = () => {
    if (isSaving || order.status === OrderStatus.COMPLETED) return;
    onUpdate(order.id, order.status, { 
      detailedPackaging: detailedPkg, 
      location, 
      orderNumber: orderNum, 
      reviewer, 
      notes, 
      locality,
      carrier: carrier === 'OTRO' ? customCarrier : carrier
    });
  };

  const assignCurrent = () => {
    if (currentUser?.name) {
      setReviewer(currentUser.name);
      onUpdate(order.id, order.status, { reviewer: currentUser.name });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-6 space-y-4 max-h-[95vh] overflow-y-auto relative shadow-2xl border-t-8 border-teal-500">
        
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-tight">{order.customerName}</h2>
            {locality && (
              <div className="space-y-1 mt-1">
                <p className="text-[10px] text-teal-600 font-black uppercase flex items-center gap-1"><Navigation size={12}/> {locality}</p>
                {isDispatchMode && (
                  <button 
                    onClick={handleRevert} 
                    className="flex items-center gap-2 text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl uppercase active:scale-90 transition-all mt-2 shadow-sm"
                  >
                    <Trash2 size={12} /> BORRAR DESPACHO (VOLVER)
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-white bg-slate-800 px-3 py-1 rounded-full uppercase shadow-sm">#{order.orderNumber}</p>
            <button onClick={onClose} className="mt-2 p-2 bg-slate-100 rounded-full active:scale-90 transition-transform"><X size={16} /></button>
          </div>
        </div>

        {!showShareOptions ? (
          <div className="space-y-4 animate-in slide-in-from-bottom-2">
            
            {!isDispatchMode ? (
              <div className="p-4 bg-slate-50 border-2 border-slate-100 rounded-[32px] space-y-3">
                <div className="flex items-center gap-2 text-indigo-600"><PlusSquare size={18}/><h3 className="text-[11px] font-black uppercase tracking-widest">Carga Parcial</h3></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Depósito</label>
                    <select className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black outline-none focus:border-indigo-400" value={partialDeposit} onChange={(e) => setPartialDeposit(e.target.value)}>{DEPOSITS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Tipo Bulto</label>
                    <select className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-black outline-none focus:border-indigo-400" value={partialType} onChange={(e) => setPartialType(e.target.value)}>{PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                </div>
                {(partialDeposit === 'OTRO' || partialType === 'OTRO') && (
                  <div className="grid grid-cols-2 gap-2">
                    {partialDeposit === 'OTRO' && <input className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold outline-none" placeholder="¿Qué depósito?" value={customDeposit} onChange={e => setCustomDeposit(e.target.value)} />}
                    {partialType === 'OTRO' && <input className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold outline-none" placeholder="¿Qué bulto?" value={customType} onChange={e => setCustomType(e.target.value)} />}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Cantidad</label>
                    <input type="number" min="1" className="w-full bg-white border border-slate-200 rounded-xl p-2 text-center text-sm font-black outline-none" value={partialQty} onChange={e => setPartialQty(+e.target.value)} />
                  </div>
                  <button onClick={handleConfirmPartial} className="mt-4 bg-indigo-600 text-white font-black px-4 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] uppercase shadow-md active:scale-95 transition-all">Confirmar Parcial <Check size={14} /></button>
                </div>
              </div>
            ) : (
              /* PANEL DE CONTROL DE BULTOS PARA DESPACHO */
              <div className="p-5 bg-teal-900 text-white rounded-[32px] shadow-xl space-y-3">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <ClipboardCheck size={18} className="text-teal-400"/>
                  <h3 className="text-[11px] font-black uppercase tracking-widest">Resumen de Carga por Sector</h3>
                </div>
                <div className="space-y-2">
                  {Object.entries(consolidatedByDeposit).map(([dep, qty]) => (
                    <div key={dep} className="flex justify-between items-center text-xs border-b border-white/5 pb-1">
                      <span className="font-bold opacity-70">DEPÓSITO {dep}</span>
                      <span className="font-black text-teal-300">{qty} BULTOS</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 text-sm font-black text-white">
                    <span>TOTAL GENERAL</span>
                    <span className="bg-teal-500 px-3 py-1 rounded-lg shadow-lg">{totalQuantity} BULTOS</span>
                  </div>
                </div>
              </div>
            )}

            {!isDispatchMode && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><ClipboardCheck size={14}/> Resumen de Bultos</h3>
                <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                  {detailedPkg.length === 0 ? (
                    <p className="text-[10px] text-slate-300 font-bold italic text-center py-2 uppercase tracking-tighter">Sin cargas parciales confirmadas</p>
                  ) : detailedPkg.map(e => (
                    <div key={e.id} className="bg-indigo-50/50 border border-indigo-100 p-2 rounded-xl flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 text-white text-[9px] font-black w-7 h-7 flex items-center justify-center rounded-lg">{e.deposit}</div>
                        <div><p className="text-[10px] font-black text-indigo-900 uppercase">{e.type}</p><p className="text-[9px] font-bold text-indigo-400 uppercase">Cantidad: {e.quantity}</p></div>
                      </div>
                      <button onClick={() => removeEntry(e.id)} className="p-2 text-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin size={10}/> Ubicación Final</label>
              <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:border-teal-500 transition-all" placeholder="Ej: Estantería B-2" value={location} onChange={e => setLocation(e.target.value)} onBlur={autoSave} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Truck size={10}/> ¿QUIÉN LLEVA EL PEDIDO?</label>
              <select 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:border-teal-500 transition-all"
                value={carrier}
                onChange={(e) => { setCarrier(e.target.value); autoSave(); }}
              >
                <option value="">Seleccionar transporte...</option>
                <optgroup label="VIAJANTES">
                  <option value="VIAJANTE - MATÍAS">MATÍAS</option>
                  <option value="VIAJANTE - NICOLÁS">NICOLÁS</option>
                </optgroup>
                <optgroup label="VENDEDORES">
                  <option value="VENDEDOR - MAURO">MAURO</option>
                  <option value="VENDEDOR - GUSTAVO">GUSTAVO</option>
                </optgroup>
                <option value="OTRO">OTRO (ESPECIFICAR)</option>
              </select>
              {carrier === 'OTRO' && (
                <input 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none mt-2" 
                  placeholder="Especificar transporte..." 
                  value={customCarrier} 
                  onChange={e => setCustomCarrier(e.target.value)} 
                  onBlur={autoSave}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><StickyNote size={10}/> NOTA DE ENVÍO / TEXTO LIBRE</label>
              <textarea rows={2} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-teal-500 transition-all resize-none" placeholder="Ej: Envío no programado, cliente retira tarde, etc..." value={notes} onChange={e => setNotes(e.target.value)} onBlur={autoSave} />
            </div>

            <div className="p-4 bg-indigo-50 rounded-[28px] border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1"><UserCheck size={14}/> Responsable Etapa</label>
                <button onClick={assignCurrent} className="text-[8px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full uppercase active:scale-95 transition-all">Soy responsable</button>
              </div>
              <input className="w-full bg-white border-2 border-indigo-100 rounded-xl p-3 text-sm font-black outline-none focus:border-indigo-500 text-indigo-900 uppercase" placeholder="Su nombre..." value={reviewer} onChange={e => setReviewer(e.target.value)} onBlur={autoSave} />
            </div>

            <div className="pt-2 space-y-3">
               <button onClick={handleFinalConfirm} disabled={isSaving || detailedPkg.length === 0} className={`w-full py-5 rounded-3xl font-black text-white shadow-lg flex items-center justify-center gap-3 uppercase tracking-widest text-xs transition-all active:scale-95 ${detailedPkg.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 shadow-emerald-200'}`}>{isSaving ? <Loader2 className="animate-spin" /> : 'CONFIRMAR LISTO'}</button>
               <button onClick={() => { onShare({...order, reviewer, notes, location, detailedPackaging: detailedPkg, locality, carrier: carrier === 'OTRO' ? customCarrier : carrier}, 'whatsapp'); }} className="w-full text-slate-400 font-black text-[9px] uppercase tracking-widest py-2 flex items-center justify-center gap-2 hover:text-indigo-600 transition-colors"><Share2 size={12} /> Solo Notificar Progreso</button>
            </div>
          </div>
        ) : (
          <div className="py-8 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-1">
              <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner"><CheckCircle2 size={44} /></div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">¡Listo!</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Informando bultos de {detailedPkg.length} depósitos</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => { onShare({...order, reviewer, notes, location, detailedPackaging: detailedPkg, locality, carrier: carrier === 'OTRO' ? customCarrier : carrier}, 'whatsapp'); onClose(); }} className="w-full bg-green-600 text-white font-black py-6 rounded-[32px] shadow-2xl flex items-center justify-center gap-4 text-base active:scale-95 transition-all"><MessageCircle size={24} /> WhatsApp</button>
              {order.status !== OrderStatus.PENDING && order.status !== OrderStatus.COMPLETED && (
                <button onClick={() => { onShare({...order, reviewer, notes, location, detailedPackaging: detailedPkg, locality, carrier: carrier === 'OTRO' ? customCarrier : carrier}, 'email'); onClose(); }} className="w-full bg-blue-600 text-white font-black py-6 rounded-[32px] shadow-2xl flex items-center justify-center gap-4 text-base active:scale-95 transition-all"><Mail size={24} /> Correo</button>
              )}
            </div>
            <button onClick={onClose} className="w-full text-slate-300 font-black text-[9px] uppercase tracking-widest pt-4 border-t border-slate-50">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
};

const NavBtn = ({ active, icon, onClick }: any) => (
  <button onClick={onClick} className={`p-4 transition-all rounded-[22px] ${active ? 'text-teal-600 bg-teal-50 shadow-inner scale-110' : 'text-slate-300'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-5 rounded-[24px] font-black text-xs transition-all active:scale-95 ${active ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>{React.cloneElement(icon, { size: 20 })} <span className="tracking-widest uppercase">{label}</span></button>
);

const StatCard = ({ count, label, color, icon, onClick }: any) => (
  <button onClick={onClick} className={`${color} rounded-[36px] p-6 text-white text-left shadow-xl transform transition active:scale-95 flex flex-col justify-between h-44 relative overflow-hidden group`}>
    <div className="z-10 bg-white/20 p-3 rounded-2xl self-start group-hover:scale-110 transition-transform">{icon}</div>
    <div className="z-10"><h3 className="text-5xl font-black tracking-tighter leading-none">{count}</h3><p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-2">{label}</p></div>
    <div className="absolute -bottom-10 -right-10 bg-white/5 w-40 h-40 rounded-full blur-3xl group-hover:scale-125 transition-all"></div>
  </button>
);

const GeneralEntryModal = ({ onClose, onAdd, currentUser }: any) => {
  const [customer, setCustomer] = useState('');
  const [locality, setLocality] = useState('');
  const [items, setItems] = useState('');
  const [orderNum, setOrderNum] = useState('');
  const [reviewer, setReviewer] = useState(currentUser?.name || '');

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[56px] shadow-2xl p-10 space-y-6 animate-in zoom-in-95">
        <div className="flex justify-between items-center"><h2 className="font-black text-2xl uppercase tracking-tighter text-slate-800 leading-none">Nueva Carga</h2><button onClick={onClose} className="p-3 bg-slate-100 rounded-full active:scale-90"><X size={20}/></button></div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xs outline-none focus:border-teal-500 transition-all uppercase" placeholder="Nro Pedido" value={orderNum} onChange={e => setOrderNum(e.target.value)} />
            <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xs outline-none focus:border-teal-500 transition-all uppercase" placeholder="Responsable" value={reviewer} onChange={e => setReviewer(e.target.value)} />
          </div>
          <div className="space-y-3">
            <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xs outline-none focus:border-teal-500 transition-all uppercase" placeholder="NOMBRE DEL CLIENTE" value={customer} onChange={e => setCustomer(e.target.value)} />
            <div className="relative">
              <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500" size={14} />
              <input className="w-full bg-teal-50/50 border-2 border-teal-100 rounded-2xl p-4 pl-10 font-black text-xs outline-none focus:border-teal-500 transition-all uppercase placeholder:text-teal-300" placeholder="LOCALIDAD" value={locality} onChange={e => setLocality(e.target.value)} />
            </div>
            <textarea rows={4} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-medium text-xs outline-none focus:border-teal-500 transition-all resize-none" placeholder="Escriba o pegue la lista de productos aquí..." value={items} onChange={e => setItems(e.target.value)} />
          </div>
          <button onClick={() => { onAdd(customer, locality, items, 'Manual', '', orderNum, reviewer); onClose(); }} className="w-full bg-slate-900 text-white font-black py-6 rounded-[32px] shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm active:scale-95 transition-all">REGISTRAR <Send size={20} /></button>
        </div>
      </div>
    </div>
  );
};

const LoginModal = ({ onLogin, onClientPortal }: { onLogin: (user: any) => void, onClientPortal: () => void }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); const userRole = u.toLowerCase() === 'admin' ? 'admin' : 'staff'; setTimeout(() => { onLogin({ name: u, role: userRole }); setIsLoading(false); }, 800); };
  return (
    <div className="fixed inset-0 bg-slate-950 z-[1000] flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-500/10 via-slate-950 to-slate-950"></div>
      <div className="bg-white w-full max-w-xs rounded-[56px] p-12 space-y-10 shadow-2xl relative border border-white/20 animate-in zoom-in-95">
        <div className="text-center space-y-4"><div className="bg-slate-900 w-24 h-24 rounded-[36px] flex items-center justify-center mx-auto text-white shadow-2xl shadow-slate-900/40"><ShieldAlert size={44} className="text-teal-400" /></div><h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-tight text-center">LOGIN<br/>D&G</h2></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" required disabled={isLoading} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 text-sm font-bold outline-none focus:border-teal-500 transition-all uppercase text-center" placeholder="TU NOMBRE" value={u} onChange={e => setU(e.target.value)} />
          <input type="password" required disabled={isLoading} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 text-sm font-bold outline-none focus:border-teal-500 transition-all text-center" placeholder="PASSWORD" value={p} onChange={e => setP(e.target.value)} />
          <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-black py-5 rounded-[32px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs mt-6 flex items-center justify-center gap-3">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <>ACCEDER <ArrowRight size={18} /></>}</button>
        </form>
        <div className="pt-6 border-t border-slate-100"><button onClick={onClientPortal} className="w-full text-[10px] font-black text-teal-600 uppercase tracking-widest flex items-center justify-center gap-2">PORTAL CLIENTES <ExternalLink size={14} /></button></div>
      </div>
    </div>
  );
};

const CustomerPortal = ({ onBack }: { onBack: () => void }) => {
  const [name, setName] = useState('');
  const [orderText, setOrderText] = useState('');
  const sendWhatsApp = () => { const text = `*SOLICITUD DE PEDIDO - BIG SHOP*\n*Cliente:* ${name}\n*Detalle:* ${orderText}\n\nEnviado desde el Portal de Clientes.`; window.open(`https://wa.me/${CENTRAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank'); };
  const sendEmail = () => { const body = `Cliente: ${name}\n\nDetalle del Pedido:\n${orderText}`; window.location.href = `mailto:${CENTRAL_EMAIL}?subject=${encodeURIComponent(SUBJECT_PREFIX)}&body=${encodeURIComponent(body)}`; };
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-white p-10 flex flex-col justify-center">
      <div className="space-y-10 text-center">
        <div className="bg-teal-500 w-24 h-24 rounded-[36px] flex items-center justify-center mx-auto shadow-2xl shadow-teal-500/20 mb-4"><ScanSearch size={48} className="text-white" /></div>
        <h1 className="text-4xl font-black uppercase tracking-tighter">Big Shop<br/>Firmat</h1>
        <div className="bg-white rounded-[56px] p-10 space-y-8 shadow-2xl text-left border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-teal-500"></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TU NOMBRE O EMPRESA</label><input type="text" className="w-full bg-slate-50 border-2 border-slate-50 rounded-3xl p-5 text-slate-900 font-bold outline-none focus:border-teal-500 transition-all" placeholder="Ej: Supermercado Firmat" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">¿QUÉ PRODUCTOS NECESITAS?</label><textarea rows={6} className="w-full bg-slate-50 border-2 border-slate-50 rounded-3xl p-5 text-slate-900 font-medium outline-none resize-none focus:border-teal-500 transition-all" placeholder="Escribe tu lista aquí..." value={orderText} onChange={(e) => setOrderText(e.target.value)} /></div>
          <div className="pt-4 space-y-4"><button onClick={sendWhatsApp} disabled={!name || !orderText} className="w-full bg-green-600 text-white font-black py-6 rounded-[32px] shadow-2xl active:scale-95 transition flex items-center justify-center gap-4 uppercase text-xs tracking-widest disabled:opacity-30"><MessageCircle size={24} /> WHATSAPP</button><button onClick={sendEmail} disabled={!name || !orderText} className="w-full bg-blue-600 text-white font-black py-6 rounded-[32px] shadow-2xl active:scale-95 transition flex items-center justify-center gap-4 uppercase text-xs tracking-widest disabled:opacity-30"><Mail size={24} /> CORREO</button></div>
        </div>
        <button onClick={onBack} className="w-full text-slate-600 text-[10px] font-black uppercase tracking-widest mt-6">Volver al sistema principal</button>
      </div>
    </div>
  );
};

const INITIAL_ORDERS: Order[] = [
  {
    id: '1',
    orderNumber: '001-DG',
    customerName: 'Distribuidora García',
    locality: 'Firmat',
    status: OrderStatus.PENDING,
    items: [{ id: 'i1', name: 'Artículos Varios', quantity: 1 }],
    packaging: { bolsas: 0, bultos: 0, cajas: 0 },
    detailedPackaging: [],
    reviewer: 'Responsable',
    notes: '',
    createdAt: new Date().toISOString(),
    source: 'Manual',
    sourceDetail: CENTRAL_EMAIL,
    location: 'Estantería Principal'
  }
];
