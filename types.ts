
export type Role = 'Owner' | 'Manager' | 'Barber' | 'Cashier' | 'SuperAdmin';

export interface Business {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  status: 'Active' | 'Suspended';
  plan: 'Basic' | 'Pro' | 'Enterprise';
}

export interface AuditLog {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  timestamp: string;
  details: string;
  ipAddress?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Staff {
  id: string;
  businessId: string;
  name: string;
  role: Role;
  commissionRate: number;
  phone: string;
  email?: string;
  avatar: string;
  username?: string;
  passwordHash?: string;
  version: number;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  version: number;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  price: number;
  stock: number;
  category: 'Retail' | 'Internal';
  version: number;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  joinDate: string;
  version: number;
}

export interface CartItem {
  itemId: string;
  type: 'service' | 'product';
  name: string;
  price: number;
  quantity: number;
  barberId?: string;
  barberName?: string;
  staffIds?: string[];
  staffNames?: string[];
  commissionSplits?: CommissionSplit[];
  itemVersion?: number;
}

export interface CommissionSplit {
  staffId: string;
  staffName: string;
  amount: number;
  percentage: number;
}

export interface Transaction {
  id: string;
  businessId: string;
  timestamp: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'Cash' | 'M-Pesa' | 'Card' | 'Split';
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  customerId?: string;
  customerName?: string;
  isSynced?: boolean;
  paymentReference?: string;
  mpesaPhoneNumber?: string;
  mpesaCheckoutRequestId?: string; // New field for STK Push tracking
  mpesaReceiptNumber?: string;    // New field for confirmation
  metadata?: {
    userId: string;
    userName: string;
    ipAddress?: string;
    deviceId?: string;
  };
}

export interface Appointment {
  id: string;
  businessId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  staffId: string;
  date: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  version: number;
}

export interface AppSettings {
  businessId: string;
  business: {
    name: string;
    phone: string;
    email: string;
    location: string;
    receiptHeader: string;
    receiptFooter: string;
    autoPrintReceipt: boolean;
  };
  payment: {
    acceptCash: boolean;
    acceptMpesa: boolean;
    acceptCard: boolean;
    acceptSplit: boolean;
    lipaOnlineApiKey?: string;
    lipaOnlineShortcode?: string;
    lipaOnlineEndpoint?: string;
    lipaOnlineCallbackUrl?: string;
  };
  bible: {
    enabled: boolean;
    verseOfTheDay: string;
    showOnDashboard: boolean;
    showOnReceipt: boolean;
  };
  rolePermissions: Record<Role, string[]>;
  version: number;
}
