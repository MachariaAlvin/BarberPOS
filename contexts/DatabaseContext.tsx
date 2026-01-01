
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Staff, Service, Product, Transaction, Appointment, Customer, AppSettings } from '../types';
import { TransactionSchema } from '../utils/validation';
import { dbService } from '../services/db';
import { apiService } from '../services/api';

interface DatabaseContextType {
  staff: Staff[];
  services: Service[];
  products: Product[];
  transactions: Transaction[];
  appointments: Appointment[];
  customers: Customer[];
  settings: AppSettings;
  isLoading: boolean;
  isRemote: boolean;
  isConnected: boolean;
  processCheckout: (transaction: Transaction) => Promise<void>;
  updateProductStock: (id: string, qty: number, expectedVersion: number) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  addAppointment: (appointment: Appointment) => Promise<void>;
  updateAppointmentStatus: (id: string, status: string, expectedVersion: number) => Promise<void>;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  addService: (service: Service) => Promise<void>;
  removeService: (id: string) => Promise<void>;
  addStaff: (staff: Staff) => Promise<void>;
  updateStaff: (staff: Staff) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>, expectedVersion: number) => Promise<void>;
  syncData: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

const INITIAL_SETTINGS: AppSettings = {
  businessId: '',
  business: {
    name: 'BarberPro Shop',
    phone: '',
    email: '',
    location: '',
    receiptHeader: '',
    receiptFooter: '',
    autoPrintReceipt: false,
  },
  payment: {
    acceptCash: true,
    acceptMpesa: true,
    acceptCard: true,
    acceptSplit: false,
  },
  bible: {
    enabled: false,
    verseOfTheDay: '',
    showOnDashboard: false,
    showOnReceipt: false,
  },
  rolePermissions: {} as any,
  version: 1,
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [isRemote, setIsRemote] = useState(false);
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const refreshData = useCallback(async () => {
    const bid = localStorage.getItem('businessId');
    if (!bid) {
      setIsLoading(false);
      return;
    }

    try {
      await dbService.init();
      
      try {
        const [s, srv, p, c, t, a, set] = await Promise.all([
          apiService.getStaff(),
          apiService.getServices(),
          apiService.getProducts(),
          apiService.getCustomers(),
          apiService.getTransactions(),
          apiService.getAppointments(),
          apiService.getSettings()
        ]);
        
        setStaff(s || []);
        setServices(srv || []);
        setProducts(p || []);
        setCustomers(c || []);
        setTransactions(t || []);
        setAppointments(a || []);
        if (set?.business) setSettings(set);
        
        setIsConnected(true);
        setIsRemote(true);
      } catch (err: any) {
        console.warn("⚠️ API Unreachable, falling back to Local Mode.");
        setIsConnected(false);
        setIsRemote(false);
        
        setStaff(dbService.getStaff() || []);
        setServices(dbService.getServices() || []);
        setProducts(dbService.getProducts() || []);
        setCustomers(dbService.getCustomers() || []);
        setTransactions(dbService.getTransactions() || []);
        setAppointments(dbService.getAppointments() || []);
        const localSet = dbService.getSettings();
        if (localSet?.business) setSettings(localSet);
      }
    } catch (e) {
      console.error("❌ Database initialization error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const handleAuthChange = () => refreshData();
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, [refreshData]);

  const processCheckout = async (transaction: Transaction): Promise<void> => {
    const bid = localStorage.getItem('businessId');
    if (!bid) throw new Error("Tenant session missing");
    
    const enrichedTx = { ...transaction, businessId: bid };
    const validation = TransactionSchema.safeParse(enrichedTx);
    if (!validation.success) throw new Error(validation.error.issues[0].message);

    if (isRemote) await apiService.addTransaction(enrichedTx);
    else await dbService.addTransaction(enrichedTx);
    
    await refreshData();
  };

  const addStaff = async (staffMember: Staff) => {
    const bid = localStorage.getItem('businessId');
    if (isRemote) await apiService.addStaff({ ...staffMember, businessId: bid! });
    else await dbService.addStaff({ ...staffMember, businessId: bid! });
    await refreshData();
  };

  const addService = async (service: Service) => {
    const bid = localStorage.getItem('businessId');
    if (isRemote) await apiService.addService({ ...service, businessId: bid! });
    else await dbService.addService({ ...service, businessId: bid! });
    await refreshData();
  };

  const addProduct = async (product: Product) => {
    const bid = localStorage.getItem('businessId');
    if (isRemote) await apiService.addProduct({ ...product, businessId: bid! });
    else await dbService.addProduct({ ...product, businessId: bid! });
    await refreshData();
  };

  const addAppointment = async (appointment: Appointment) => {
    const bid = localStorage.getItem('businessId');
    if (isRemote) await apiService.addAppointment({ ...appointment, businessId: bid! });
    else await dbService.addAppointment({ ...appointment, businessId: bid! });
    await refreshData();
  };

  const addCustomer = async (customer: Customer) => {
    const bid = localStorage.getItem('businessId');
    if (isRemote) await apiService.addCustomer({ ...customer, businessId: bid! });
    else await dbService.addCustomer({ ...customer, businessId: bid! });
    await refreshData();
  };

  const updateProductStock = async (id: string, qty: number, expectedVersion: number) => {
    if (isRemote) await apiService.updateProductStock(id, qty, expectedVersion);
    else await dbService.updateProductStock(id, qty, expectedVersion);
    await refreshData();
  };

  const updateProduct = async (product: Product) => {
    if (isRemote) await apiService.updateProduct(product);
    else await dbService.updateProduct(product);
    await refreshData();
  };

  const deleteProduct = async (id: string) => {
    if (isRemote) await apiService.deleteProduct(id);
    else await dbService.deleteProduct(id);
    await refreshData();
  };

  const updateAppointmentStatus = async (id: string, status: string, expectedVersion: number) => {
    if (isRemote) await apiService.updateAppointmentStatus(id, status, expectedVersion);
    else await dbService.updateAppointmentStatus(id, status, expectedVersion);
    await refreshData();
  };

  const updateCustomer = async (customer: Customer) => {
    if (isRemote) await apiService.updateCustomer(customer);
    else await dbService.updateCustomer(customer);
    await refreshData();
  };

  const removeService = async (id: string) => {
    if (isRemote) await apiService.removeService(id);
    else await dbService.removeService(id);
    await refreshData();
  };

  const updateStaff = async (staffMember: Staff) => {
    if (isRemote) await apiService.updateStaff(staffMember);
    else await dbService.updateStaff(staffMember);
    await refreshData();
  };

  const deleteStaff = async (id: string) => {
    if (isRemote) await apiService.deleteStaff(id);
    else await dbService.deleteStaff(id);
    await refreshData();
  };

  const updateSettings = async (newSettings: Partial<AppSettings>, expectedVersion: number) => {
    if (isRemote) await apiService.updateSettings({ ...settings, ...newSettings });
    else await dbService.updateSettings({ ...settings, ...newSettings } as AppSettings);
    await refreshData();
  };

  return (
    <DatabaseContext.Provider value={{
      staff, services, products, transactions, appointments, customers, settings, isLoading, 
      isRemote, isConnected,
      processCheckout, updateProductStock, updateProduct, deleteProduct, addProduct, addAppointment, updateAppointmentStatus, addCustomer, updateCustomer,
      addService, removeService, addStaff, updateStaff, deleteStaff, updateSettings, syncData: async () => {}
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error("useDatabase must be used within a DatabaseProvider");
  return context;
};
