
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
  ShieldCheck
} from 'lucide-react';
import { Order, OrderStatus, View, OrderItem, Packaging } from './types';
import { analyzeOrderText } from './services/geminiService';

// CONFIGURACIÓN DE PRODUCCIÓN - NÚMERO DE PRUEBA ACTUALIZADO
const CENTRAL_WHATSAPP_NUMBER = "542974723835"; 

const viewNames: Record<View, string> = {
  DASHBOARD: 'Tablero Principal',
  PENDING: 'Pedidos Pendientes',
  COMPLETED: 'Pedidos Completados',
  DISPATCHED: 'Pedidos Despachados',
  NEW_ORDER: 'Cargar Nuevo Pedido (IA)',
  NEW_ORDER_MANUAL: 'Escribir Pedido Manual',
  ALL: 'Historial de Pedidos',
  GENERAL_ENTRY: 'Acceso General de Entrada'
};

const INITIAL_ORDERS: Order[] = [
  {
    id: '1',
    orderNumber: 'P-001',
    customerName: 'Distribuidora García',
    status: OrderStatus.PENDING,
    items: [{ id: 'i1', name: 'Harina 000', quantity: 10 }, { id: 'i2', name: 'Azúcar 1kg', quantity: 5 }],
    packaging: { bolsas: 0, bultos: 0, cajas: 0 },
    createdAt: new Date().toISOString(),
    source: 'Correo',
    sourceDetail: 'depaoliroberto364@gmail.com',
    location: ''
  }
];

export default function App() {
  const [view, setView] = useState<View>('DASHBOARD');
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGeneralEntryModal, setShowGeneralEntryModal] = useState(false);
  const [showBackupInfo, setShowBackupInfo] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(null);
  const [newOrderNotification, setNewOrderNotification] = useState<Order | null>(null);

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
    
    return base.filter(o => 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, view, searchTerm]);

  const handleLogout = () => {
    setCurrentUser(null);
    setIsSidebarOpen(false);
    setView('DASHBOARD');
  };

  const exportHistory = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(orders, null, 2));
    const downloadAnchorNode = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `DG_HISTORICO_${date}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const shareOrder = async (order: Order, type: 'whatsapp' | 'email', customStage?: string) => {
    const stageDisplay = customStage || {
      [OrderStatus.PENDING]: 'PREPARACIÓN',
      [OrderStatus.COMPLETED]: 'COMPLETADO',
      [OrderStatus.DISPATCHED]: 'DESPACHO'
    }[order.status];
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR');
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const responsible = currentUser?.name || 'Administrador';
    const pkg = order.packaging;

    let text = "";
    if (customStage === 'RECEPCIÓN') {
      text = `*D&G BAZAR - NUEVO PEDIDO RECIBIDO*\n*ESTADO:* RECEPCIÓN\n*FECHA:* ${dateStr} - ${timeStr}\n*Pedido:* ${order.orderNumber}\n*Cliente:* ${order.customerName}\n*Gestionado por:* ${responsible}\n\nAcceda a la App para ver el detalle.`;
    } else {
      text = `*D&G Bazar y Regaleria*\n*ESTADO:* ${stageDisplay}\n*FECHA:* ${dateStr} - ${timeStr}\n*Pedido:* ${order.orderNumber}\n*Cliente:* ${order.customerName}\n*Embalaje:* ${pkg.bolsas} Bolsas, ${pkg.bultos} Bultos, ${pkg.cajas} Cajas.\n*Ubicación:* ${order.location || 'N/A'}\n\n¡Gracias por su compra!`;
    }

    const subject = `Estado del Pedido ${order.orderNumber} - ${stageDisplay}`;

    if (type === 'whatsapp') {
      const waNumber = customStage === 'RECEPCIÓN' ? CENTRAL_WHATSAPP_NUMBER : "";
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      const emailBody = text.replace(/\*/g, '');
      if (navigator.share) {
        try {
          await navigator.share({ title: subject, text: emailBody });
        } catch {
          window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        }
      } else {
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
      }
    }
    if (customStage === 'RECEPCIÓN') setNewOrderNotification(null);
  };

  const handleUpdateStatus = (id: string, newStatus: OrderStatus, extraData?: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, ...extraData } : o));
    setSelectedOrder(prev => prev && prev.id === id ? { ...prev, status: newStatus, ...extraData } : prev);
  };

  const navigateTo = (newView: View) => {
    setView(newView);
    setIsSidebarOpen(false);
  };

  const addQuickOrder = (customer: string, items: string, source: any, detail: string) => {
    const newOrder: Order = {
      id: Date.now().toString(),
      orderNumber: `P-${Math.floor(Math.random() * 900) + 100}`,
      customerName: customer,
      status: OrderStatus.PENDING,
      items: [{ id: '1', name: items, quantity: 1 }],
      packaging: { bolsas: 0, bultos: 0, cajas: 0 },
      createdAt: new Date().toISOString(),
      source: source,
      sourceDetail: detail,
      location: ''
    };
    setOrders([newOrder, ...orders]);
    setNewOrderNotification(newOrder);
  };

  if (!currentUser) {
    return <LoginModal onLogin={u => setCurrentUser(u)} />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 relative overflow-x-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="relative bg-white w-72 h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div><h2 className="font-black text-lg leading-tight uppercase">Menú Principal</h2><p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">D&G Bazar</p></div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white/10 rounded-full"><ChevronLeft size={20} /></button>
            </div>
            <nav className="p-4 flex flex-col gap-1 flex-1 overflow-y-auto">
              <SidebarItem icon={<LayoutDashboard />} label="TABLERO" active={view === 'DASHBOARD'} onClick={() => navigateTo('DASHBOARD')} />
              <div className="h-px bg-slate-100 my-2" />
              <SidebarItem icon={<Layers className="text-indigo-500" />} label="ENTRADA GENERAL" active={false} onClick={() => { setShowGeneralEntryModal(true); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<ClipboardList className="text-orange-500" />} label="PENDIENTES" active={view === 'PENDING'} onClick={() => navigateTo('PENDING')} />
              <SidebarItem icon={<CheckCircle2 className="text-emerald-500" />} label="COMPLETADOS" active={view === 'COMPLETED'} onClick={() => navigateTo('COMPLETED')} />
              <SidebarItem icon={<Truck className="text-indigo-500" />} label="DESPACHO" active={view === 'DISPATCHED'} onClick={() => navigateTo('DISPATCHED')} />
              <SidebarItem icon={<History className="text-slate-500" />} label="HISTORICO" active={view === 'ALL'} onClick={() => navigateTo('ALL')} />
              <div className="h-px bg-slate-100 my-2" />
              <SidebarItem icon={<Github className="text-slate-900" />} label="RESPALDO GITHUB" active={false} onClick={() => { setShowBackupInfo(true); setIsSidebarOpen(false); }} />
              <SidebarItem icon={<LogOut className="text-red-500" />} label="SALIR" active={false} onClick={handleLogout} />
            </nav>
            <div className="p-6 border-t border-slate-100 bg-slate-50 text-center"><p className="text-[9px] text-slate-400 font-black uppercase mb-1">Operador Activo</p><p className="text-sm font-black text-slate-800">{currentUser.name}</p></div>
          </aside>
        </div>
      )}

      <header className="bg-slate-900 text-white p-6 rounded-b-[40px] shadow-xl relative z-10 border-b border-white/5">
        <div className="flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-transform"><Menu size={22} className="text-slate-200" /></button>
          <div className="text-center">
            <h1 className="text-lg font-black tracking-tighter uppercase">D&G Gestión</h1>
            <p className="text-[9px] text-teal-400 font-black tracking-widest uppercase">Bazar y Regaleria</p>
          </div>
          <div className="bg-gradient-to-br from-teal-500 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-teal-500/20"><User size={20} className="text-white" /></div>
        </div>
      </header>

      <main className="p-5">
        {view === 'DASHBOARD' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard count={stats.pending} label="PENDIENTES" color="bg-orange-500" icon={<ClipboardList size={20} />} onClick={() => setView('PENDING')} />
              <StatCard count={stats.completed} label="COMPLETOS" color="bg-emerald-600" icon={<CheckCircle2 size={20} />} onClick={() => setView('COMPLETED')} />
              <StatCard count={stats.total} label="HISTORIAL" color="bg-teal-600" icon={<History size={20} />} onClick={() => setView('ALL')} />
              <StatCard count={stats.dispatched} label="DESPACHO" color="bg-indigo-600" icon={<Truck size={20} />} onClick={() => setView('DISPATCHED')} />
            </div>
            <button onClick={() => setShowGeneralEntryModal(true)} className="w-full bg-slate-900 text-white rounded-3xl p-6 flex items-center justify-between border border-white/10 shadow-2xl group active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-indigo-500 transition-colors"><Layers size={28} /></div>
                <div className="text-left"><p className="font-black text-lg leading-tight">ENTRADA GENERAL</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cargar nuevos pedidos</p></div>
              </div>
              <ChevronRight size={20} className="text-slate-500" />
            </button>
          </div>
        )}

        {(view === 'PENDING' || view === 'COMPLETED' || view === 'DISPATCHED' || view === 'ALL') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-1.5 text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 active:scale-95 transition-all"><ArrowLeft size={16} /><span className="text-[10px] font-black uppercase">Volver</span></button>
              <h2 className="font-black text-sm tracking-widest text-slate-400 uppercase">{viewNames[view]}</h2>
              {view === 'ALL' && (
                <button onClick={exportHistory} className="bg-teal-600 text-white p-2 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2 px-3">
                  <Download size={16} /> <span className="text-[10px] font-black uppercase">Exportar</span>
                </button>
              )}
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" size={18} />
              <input type="text" placeholder="Buscar cliente o número..." className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-teal-500/10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="space-y-3 pb-8">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-20 opacity-20"><Package size={80} className="mx-auto mb-4" /><p className="font-black uppercase text-xs">Vacio</p></div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white border border-slate-200 rounded-[30px] p-5 shadow-sm active:bg-slate-50 transition-all cursor-pointer group hover:shadow-md hover:border-teal-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded-lg">{order.orderNumber}</p>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${
                        order.status === OrderStatus.PENDING ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                        order.status === OrderStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-slate-800 text-lg leading-tight group-hover:text-teal-600 transition-colors">{order.customerName}</h3>
                      <ChevronRight size={18} className="text-slate-200 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(order.createdAt).toLocaleDateString()}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase px-2 py-0.5 bg-slate-100 rounded-md">{order.source}</span>
                      </div>
                      {order.packaging.bolsas + order.packaging.bultos + order.packaging.cajas > 0 && (
                        <div className="flex items-center gap-1.5 text-indigo-600"><Package size={12} /><span className="text-[10px] font-black">{order.packaging.bolsas + order.packaging.bultos + order.packaging.cajas} UN.</span></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL GITHUB BACKUP INFO */}
      {showBackupInfo && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-xl z-[700] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4"><button onClick={() => setShowBackupInfo(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button></div>
            <div className="bg-slate-900 w-16 h-16 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl"><Github size={32} /></div>
            <h2 className="text-2xl font-black text-slate-800 uppercase leading-none mb-2">Centro de Respaldo</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-8">Estructura del Repositorio GitHub</p>
            <div className="space-y-6">
              <BackupStep icon={<PencilLine />} title="/app" desc="Contiene los archivos fuente (.tsx, .html) de la aplicación." />
              <BackupStep icon={<History />} title="/historico" desc="Contiene los archivos .json exportados con el detalle de pedidos." />
              <div className="bg-teal-50 border border-teal-100 p-4 rounded-3xl flex items-center gap-3">
                <ShieldCheck className="text-teal-600" size={24} />
                <p className="text-[10px] text-teal-700 font-bold uppercase leading-relaxed">Sus datos están seguros mediante exportación manual.</p>
              </div>
            </div>
            <button onClick={() => setShowBackupInfo(false)} className="w-full mt-8 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition text-xs uppercase tracking-widest">Entendido</button>
          </div>
        </div>
      )}

      {/* MODAL NOTIFICACIÓN NUEVA ENTRADA (RECEPCIÓN) */}
      {newOrderNotification && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-lg z-[600] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-[40px] p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-indigo-600">
              <BellRing size={40} className="animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase leading-tight">¡Pedido Guardado!</h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-2">¿Cómo deseas avisar de la RECEPCIÓN?</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => shareOrder(newOrderNotification, 'whatsapp', 'RECEPCIÓN')} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition flex items-center justify-center gap-3 text-sm">
                <MessageCircle size={20} /> WHATSAPP CENTRAL
              </button>
              <button onClick={() => shareOrder(newOrderNotification, 'email', 'RECEPCIÓN')} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition flex items-center justify-center gap-3 text-sm">
                <MailPlus size={20} /> NOTIFICAR CORREO
              </button>
              <button onClick={() => setNewOrderNotification(null)} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest py-2">CANCELAR AVISO</button>
            </div>
          </div>
        </div>
      )}

      {showGeneralEntryModal && <GeneralEntryModal orders={orders} onClose={() => setShowGeneralEntryModal(false)} onAdd={addQuickOrder} onSelectOrder={o => { setSelectedOrder(o); setShowGeneralEntryModal(false); }} />}
      {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdate={handleUpdateStatus} onShare={shareOrder} currentUser={currentUser} />}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-8 py-4 flex justify-between items-center z-50 max-w-md mx-auto rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <NavBtn active={view === 'DASHBOARD'} icon={<LayoutDashboard />} onClick={() => setView('DASHBOARD')} />
        <NavBtn active={view === 'PENDING'} icon={<ClipboardList />} onClick={() => setView('PENDING')} />
        <NavBtn active={view === 'COMPLETED'} icon={<CheckCircle2 />} onClick={() => setView('COMPLETED')} />
        <NavBtn active={view === 'DISPATCHED'} icon={<Truck />} onClick={() => setView('DISPATCHED')} />
      </nav>
    </div>
  );
}

const BackupStep = ({ icon, title, desc }: any) => (
  <div className="flex gap-4">
    <div className="bg-slate-100 p-3 rounded-2xl text-slate-500 self-start">{React.cloneElement(icon, { size: 18 })}</div>
    <div><h4 className="font-black text-slate-800 text-xs uppercase mb-0.5">{title}</h4><p className="text-[10px] text-slate-400 font-medium leading-normal">{desc}</p></div>
  </div>
);

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black text-xs transition-all active:scale-95 ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
    {React.cloneElement(icon, { size: 18 })} <span className="tracking-widest uppercase">{label}</span>
  </button>
);

const StatCard = ({ count, label, color, icon, onClick }: any) => (
  <button onClick={onClick} className={`${color} rounded-[32px] p-5 text-white text-left shadow-lg transform transition active:scale-95 flex flex-col justify-between h-40 relative overflow-hidden border border-white/10`}>
    <div className="z-10 bg-white/20 p-2.5 rounded-2xl self-start">{icon}</div>
    <div className="z-10"><h3 className="text-4xl font-black tracking-tight">{count}</h3><p className="text-[9px] font-black uppercase tracking-widest opacity-70 mt-1">{label}</p></div>
    <div className="absolute -bottom-4 -right-4 bg-white/5 w-24 h-24 rounded-full blur-2xl"></div>
  </button>
);

const NavBtn = ({ active, icon, onClick }: any) => (
  <button onClick={onClick} className={`p-3 transition-all rounded-2xl ${active ? 'text-teal-600 bg-teal-50 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}>{React.cloneElement(icon, { size: 24 })}</button>
);

const LoginModal = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-900 z-[500] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-xs rounded-[44px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-500 to-indigo-600"></div>
        <div className="text-center space-y-3">
          <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-slate-900 border border-slate-100 shadow-inner"><Lock size={36} /></div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Acceso D&G</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Consola Administrativa</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); onLogin({ name: u || 'Administrador' }); }} className="space-y-4">
          <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-all" placeholder="ID de Usuario" value={u} onChange={e => setU(e.target.value)} />
          <input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-all" placeholder="Contraseña" value={p} onChange={e => setP(e.target.value)} />
          <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition uppercase tracking-widest text-xs mt-4">Ingresar al Sistema</button>
        </form>
      </div>
    </div>
  );
};

const GeneralEntryModal = ({ orders, onClose, onAdd, onSelectOrder }: any) => {
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState('');
  const [source, setSource] = useState<'Manual' | 'Correo' | 'WhatsApp'>('Manual');
  const [detail, setDetail] = useState('');

  const handleSave = () => {
    if (!customer || !items) return;
    onAdd(customer, items, source, detail);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[44px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-4"><div className="bg-indigo-500 p-3 rounded-2xl"><Layers size={24} /></div><div><h2 className="font-black text-xl uppercase tracking-tighter">Nueva Entrada</h2><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Recepción de Pedidos</p></div></div>
          <button onClick={onClose} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Cliente</label>
              <input type="text" placeholder="Ej: Distribuidora Norte" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10" value={customer} onChange={e => setCustomer(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Detalle de Productos</label>
              <textarea rows={4} placeholder="Pega el texto del pedido aquí..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none" value={items} onChange={e => setItems(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Origen</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-black outline-none" value={source} onChange={e => setSource(e.target.value as any)}>
                  <option value="Manual">Manual</option><option value="Correo">Correo</option><option value="WhatsApp">WhatsApp</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Referencia</label>
                <input type="text" placeholder="ID o Mail" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none" value={detail} onChange={e => setDetail(e.target.value)} />
              </div>
            </div>
            <button onClick={handleSave} disabled={!customer || !items} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3 uppercase tracking-widest text-xs mt-4 group">
              <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> GUARDAR Y NOTIFICAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrderDetailsModal = ({ order, onClose, onUpdate, onShare, currentUser }: any) => {
  const [pkg, setPkg] = useState<Packaging>(order.packaging);
  const [location, setLocation] = useState(order.location || '');
  const [postActionOptions, setPostActionOptions] = useState(false);

  const handleAction = () => {
    const nextStatusMap: Record<OrderStatus, OrderStatus> = {
      [OrderStatus.PENDING]: OrderStatus.COMPLETED,
      [OrderStatus.COMPLETED]: OrderStatus.DISPATCHED,
      [OrderStatus.DISPATCHED]: OrderStatus.DISPATCHED,
    };
    onUpdate(order.id, nextStatusMap[order.status], { packaging: pkg, location: location });
    setPostActionOptions(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-t-[44px] sm:rounded-[44px] p-8 space-y-6 max-h-[90vh] overflow-y-auto relative shadow-2xl border-t border-white/20">
        <div className="flex justify-between items-start mb-2">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded-lg">{order.orderNumber}</span>
            <h2 className="text-2xl font-black text-slate-800 leading-none tracking-tighter uppercase">{order.customerName}</h2>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-100 rounded-full active:scale-90 transition-transform"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">Embalaje del Pedido</h3>
          <div className="grid grid-cols-3 gap-3">
            <PkgInput label="Bolsas" val={pkg.bolsas} onChange={(v: number) => setPkg({...pkg, bolsas: v})} />
            <PkgInput label="Bultos" val={pkg.bultos} onChange={(v: number) => setPkg({...pkg, bultos: v})} />
            <PkgInput label="Cajas" val={pkg.cajas} onChange={(v: number) => setPkg({...pkg, cajas: v})} />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">Ubicación en Depósito</h3>
          <textarea rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 outline-none resize-none" placeholder="Estante, pasillo, etc..." value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <div className="pt-6 border-t border-slate-100 space-y-4">
          {!postActionOptions ? (
            <button onClick={handleAction} className={`w-full py-5 rounded-3xl font-black text-white shadow-xl transition active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-4 ${order.status === OrderStatus.PENDING ? 'bg-orange-500 shadow-orange-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>
              {order.status === OrderStatus.PENDING ? <ClipboardList size={22}/> : <Truck size={22}/>} {order.status === OrderStatus.PENDING ? 'Confirmar Preparación' : 'Confirmar Despacho'}
            </button>
          ) : (
            <div className="space-y-6 p-2">
              <div className="text-center space-y-1"><p className="text-emerald-600 font-black text-sm uppercase">¡Estado Actualizado!</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enviar aviso al cliente</p></div>
              <div className="flex gap-4">
                <button onClick={() => { onShare(order, 'whatsapp'); onClose(); }} className="flex-1 bg-green-600 text-white p-5 rounded-3xl flex flex-col items-center gap-2 shadow-xl shadow-green-600/20 active:scale-95 transition-all"><MessageCircle size={28}/><span className="text-[10px] font-black uppercase">WA</span></button>
                <button onClick={() => { onShare(order, 'email'); onClose(); }} className="flex-1 bg-blue-600 text-white p-5 rounded-3xl flex flex-col items-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"><Mail size={28}/><span className="text-[10px] font-black uppercase">Correo</span></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PkgInput = ({ label, val, onChange }: any) => (
  <div className="text-center space-y-2">
    <label className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">{label}</label>
    <div className="relative">
      <input type="number" value={val} onChange={e => onChange(+e.target.value)} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-center text-xl font-black focus:border-teal-500 focus:bg-white outline-none bg-slate-50 transition-all shadow-inner" />
    </div>
  </div>
);
