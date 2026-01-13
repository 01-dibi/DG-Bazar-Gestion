
export enum OrderStatus {
  PENDING = 'PENDIENTE',
  COMPLETED = 'COMPLETADO',
  DISPATCHED = 'DESPACHO'
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
}

export interface PackagingEntry {
  id: string;
  deposit: string;
  type: string;
  quantity: number;
}

export interface Packaging {
  bolsas: number;
  bultos: number;
  cajas: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  locality?: string;
  items: OrderItem[];
  status: OrderStatus;
  packaging: Packaging; 
  detailedPackaging?: PackagingEntry[];
  location?: string;
  reviewer?: string;
  notes?: string; 
  carrier?: string; // Nuevo campo para transporte
  createdAt: string;
  source: 'Correo' | 'WhatsApp' | 'Manual';
  sourceDetail?: string;
  lockedBy?: string; 
}

export type View = 'DASHBOARD' | 'PENDING' | 'COMPLETED' | 'DISPATCHED' | 'NEW_ORDER' | 'NEW_ORDER_MANUAL' | 'ALL' | 'GENERAL_ENTRY';
