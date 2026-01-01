
import { Staff, Service, Product, Customer, Transaction, Appointment, AppSettings, Business, AuditLog } from '../types';

const API_URL = 'http://localhost:3001/api';

class ApiService {
  private getHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async signup(data: any): Promise<any> {
    const res = await fetch(`${API_URL}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Signup failed");
    return result;
  }

  async login(businessSlug: string, username: string, password: string): Promise<any> {
    const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessSlug, username, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
  }

  async getStaff(): Promise<Staff[]> { return fetch(`${API_URL}/staff`, { headers: this.getHeaders() }).then(res => res.json()); }
  async getServices(): Promise<Service[]> { return fetch(`${API_URL}/services`, { headers: this.getHeaders() }).then(res => res.json()); }
  async getProducts(): Promise<Product[]> { return fetch(`${API_URL}/products`, { headers: this.getHeaders() }).then(res => res.json()); }
  async getCustomers(): Promise<Customer[]> { return fetch(`${API_URL}/customers`, { headers: this.getHeaders() }).then(res => res.json()); }
  async getTransactions(): Promise<Transaction[]> { return fetch(`${API_URL}/transactions`, { headers: this.getHeaders() }).then(res => res.json()); }
  async getSettings(): Promise<AppSettings> { return fetch(`${API_URL}/settings`, { headers: this.getHeaders() }).then(res => res.json()); }
  async getAppointments(): Promise<Appointment[]> { return fetch(`${API_URL}/appointments`, { headers: this.getHeaders() }).then(res => res.json()); }
  async getAuditLogs(): Promise<AuditLog[]> { return fetch(`${API_URL}/audit-logs`, { headers: this.getHeaders() }).then(res => res.json()); }

  // --- Super Admin Global Methods ---
  async getPlatformStats(): Promise<any> {
    return fetch(`${API_URL}/super/stats`, { headers: this.getHeaders() }).then(res => res.json());
  }
  async getGlobalBusinesses(): Promise<Business[]> { 
    return fetch(`${API_URL}/super/businesses`, { headers: this.getHeaders() }).then(res => res.json()); 
  }
  async getGlobalTransactions(): Promise<Transaction[]> {
    return fetch(`${API_URL}/super/transactions`, { headers: this.getHeaders() }).then(res => res.json());
  }
  async getGlobalAuditLogs(): Promise<AuditLog[]> {
    return fetch(`${API_URL}/super/audit-logs`, { headers: this.getHeaders() }).then(res => res.json());
  }
  async updateBusinessStatus(id: string, status: 'Active' | 'Suspended'): Promise<void> {
    const res = await fetch(`${API_URL}/super/businesses/${id}/status`, { 
      method: 'PUT', 
      headers: this.getHeaders(), 
      body: JSON.stringify({ status }) 
    });
    if (!res.ok) throw new Error("Status update failed");
  }

  // --- CRUD Methods with Error Validation ---

  async addTransaction(tx: Transaction) { 
    return fetch(`${API_URL}/transactions`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(tx) })
      .then(async res => { if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to add transaction"); } return res.json(); }); 
  }

  async addStaff(s: Staff) { 
    return fetch(`${API_URL}/staff`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(s) })
      .then(async res => { if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to add staff"); } return res.json(); }); 
  }

  async addService(s: Service) { 
    return fetch(`${API_URL}/services`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(s) })
      .then(async res => { if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to add service"); } return res.json(); }); 
  }

  async addProduct(p: Product) { 
    return fetch(`${API_URL}/products`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(p) })
      .then(async res => { if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to add product"); } return res.json(); }); 
  }

  async addCustomer(c: Customer) { 
    return fetch(`${API_URL}/customers`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(c) })
      .then(async res => { if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to add customer"); } return res.json(); }); 
  }

  async addAppointment(a: Appointment) { 
    return fetch(`${API_URL}/appointments`, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(a) })
      .then(async res => { if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to add appointment"); } return res.json(); }); 
  }

  async updateProductStock(id: string, stock: number, version: number) { 
    return fetch(`${API_URL}/products/${id}/stock`, { method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ stock, version }) })
      .then(res => { if (!res.ok) throw new Error("Stock update failed"); return res.json(); }); 
  }

  async updateProduct(p: Product) { 
    return fetch(`${API_URL}/products/${p.id}`, { method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(p) })
      .then(res => { if (!res.ok) throw new Error("Update failed"); return res.json(); }); 
  }

  async deleteProduct(id: string) { 
    return fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: this.getHeaders() })
      .then(res => { if (!res.ok) throw new Error("Delete failed"); }); 
  }

  async updateCustomer(c: Customer) { 
    return fetch(`${API_URL}/customers/${c.id}`, { method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(c) })
      .then(res => { if (!res.ok) throw new Error("Update failed"); return res.json(); }); 
  }

  async removeService(id: string) { 
    return fetch(`${API_URL}/services/${id}`, { method: 'DELETE', headers: this.getHeaders() })
      .then(res => { if (!res.ok) throw new Error("Delete failed"); }); 
  }

  async updateStaff(s: Staff) { 
    return fetch(`${API_URL}/staff/${s.id}`, { method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(s) })
      .then(res => { if (!res.ok) throw new Error("Update failed"); return res.json(); }); 
  }

  async deleteStaff(id: string) { 
    return fetch(`${API_URL}/staff/${id}`, { method: 'DELETE', headers: this.getHeaders() })
      .then(res => { if (!res.ok) throw new Error("Delete failed"); }); 
  }

  async updateSettings(s: AppSettings) { 
    return fetch(`${API_URL}/settings`, { method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ settings: s, version: s.version }) })
      .then(res => { if (!res.ok) throw new Error("Update settings failed"); return res.json(); }); 
  }

  async updateAppointmentStatus(id: string, status: string, version: number) { 
    return fetch(`${API_URL}/appointments/${id}/status`, { method: 'PUT', headers: this.getHeaders(), body: JSON.stringify({ status, version }) })
      .then(res => { if (!res.ok) throw new Error("Update failed"); return res.json(); }); 
  }

  async getPublicBusiness(slug: string): Promise<Business> { return fetch(`${API_URL}/public/business/${slug}`).then(res => res.json()); }
  async getPublicServices(slug: string): Promise<Service[]> { return fetch(`${API_URL}/public/services/${slug}`).then(res => res.json()); }
  async getPublicStaff(slug: string): Promise<Staff[]> { return fetch(`${API_URL}/public/staff/${slug}`).then(res => res.json()); }
  async createPublicAppointment(a: Appointment) { return fetch(`${API_URL}/public/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).then(res => res.json()); }
}

export const apiService = new ApiService();
