
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

export interface Packaging {
  bolsas: number;
  bultos: number;
  cajas: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  status: OrderStatus;
  packaging: Packaging;
  location?: string;
  createdAt: string;
  source: 'Correo' | 'WhatsApp' | 'Manual';
  sourceDetail?: string; // Ejemplo: email o número de teléfono
}

export type View = 'DASHBOARD' | 'PENDING' | 'COMPLETED' | 'DISPATCHED' | 'NEW_ORDER' | 'NEW_ORDER_MANUAL' | 'ALL' | 'GENERAL_ENTRY';
