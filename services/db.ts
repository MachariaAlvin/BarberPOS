
import { Staff, Service, Product, Customer, Transaction, Appointment, AppSettings, Role } from '../types';

declare global {
  interface Window {
    initSqlJs: (config: { locateFile: (file: string) => string }) => Promise<any>;
  }
}

const DB_NAME = 'barberpro_db';
const STORE_NAME = 'sqlite_store';
const KEY_NAME = 'db_file';

class DatabaseService {
  private db: any = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;

    try {
      if (!window.initSqlJs) {
        throw new Error("SQL.js library not found on page. Check script tags.");
      }

      const SQL = await window.initSqlJs({
        locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });

      const savedData = await this.loadFromIDB();

      if (savedData) {
        this.db = new SQL.Database(new Uint8Array(savedData));
        console.log("Database loaded from IndexedDB");
      } else {
        this.db = new SQL.Database();
        console.log("New in-memory database created");
        this.runMigrations();
        this.seedData();
        await this.saveToIDB();
      }
      this.initialized = true;
    } catch (err) {
      console.error("Failed to initialize database:", err);
      throw err;
    }
  }

  private async loadFromIDB(): Promise<ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(KEY_NAME);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async saveToIDB() {
    if (!this.db) return;
    const data = this.db.export();
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const putReq = store.put(data, KEY_NAME);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => reject(putReq.error);
      };
    });
  }

  private runMigrations() {
    if (!this.db) return;
    this.db.run(`
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        commissionRate REAL,
        phone TEXT,
        avatar TEXT,
        username TEXT,
        passwordHash TEXT,
        status TEXT DEFAULT 'Active',
        version INTEGER
      );
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT,
        price REAL,
        duration INTEGER,
        category TEXT,
        version INTEGER
      );
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        price REAL,
        stock INTEGER,
        category TEXT,
        version INTEGER
      );
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        email TEXT,
        notes TEXT,
        joinDate TEXT,
        version INTEGER
      );
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        customerName TEXT,
        customerPhone TEXT,
        serviceId TEXT,
        staffId TEXT,
        date TEXT,
        status TEXT,
        version INTEGER
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        items TEXT,
        total REAL,
        paymentMethod TEXT,
        status TEXT,
        customerId TEXT,
        customerName TEXT,
        isSynced INTEGER
      );
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        json_content TEXT,
        version INTEGER
      );
    `);
  }

  private seedData() {
    if (!this.db) return;
    const res = this.db.exec("SELECT count(*) FROM staff");
    if (res[0].values[0][0] > 0) return;

    this.db.run(`INSERT INTO staff (id, name, role, commissionRate, phone, avatar, username, passwordHash, status, version) VALUES 
      ('s1', 'James Carter', 'Owner', 0.0, '0712345678', 'https://picsum.photos/100/100?random=1', 'admin', 'password', 'Active', 1),
      ('s2', 'Sarah Mwangi', 'Manager', 0.10, '0722334455', 'https://picsum.photos/100/100?random=2', 'sarah', 'password', 'Active', 1),
      ('s3', 'David Kimani', 'Barber', 0.4, '0799887766', 'https://picsum.photos/100/100?random=3', 'barber', 'password', 'Active', 1),
      ('s4', 'Lisa Achieng', 'Cashier', 0.0, '0711122233', 'https://picsum.photos/100/100?random=4', 'cashier', 'password', 'Active', 1)
    `);

    this.db.run(`INSERT INTO services VALUES 
      ('srv1', 'Standard Haircut', 500, 45, 'Hair', 1),
      ('srv2', 'Beard Trim & Shape', 300, 20, 'Beard', 1),
      ('srv3', 'Full Head Dye', 1500, 90, 'Color', 1),
      ('srv4', 'Hot Towel Shave', 800, 30, 'Treatment', 1)
    `);

    this.db.run(`INSERT INTO products VALUES 
      ('p1', 'Matte Pomade', 800, 15, 'Retail', 1),
      ('p2', 'Beard Oil', 1200, 8, 'Retail', 1),
      ('p3', 'Shampoo (Internal)', 0, 5, 'Internal', 1)
    `);

    this.db.run(`INSERT INTO customers VALUES 
      ('c1', 'Michael Omondi', '0711223344', 'mike@example.com', 'Prefers scissors over clippers.', '2023-01-15', 1),
      ('c2', 'John Doe', '0722000000', 'john@example.com', 'Allergic to latex.', '2023-05-20', 1)
    `);

    const initialSettings = {
      business: {
        name: 'BarberPro',
        phone: '0712 345 678',
        email: 'info@barberpro.co.ke',
        location: 'Nairobi, Kenya',
        receiptHeader: 'Thank you for visiting!',
        receiptFooter: 'See you next time.',
        autoPrintReceipt: false,
      },
      payment: {
        acceptCash: true,
        acceptMpesa: true,
        acceptCard: true,
        acceptSplit: true,
      },
      bible: {
        enabled: true,
        verseOfTheDay: 'Proverbs 27:17 - As iron sharpens iron, so one person sharpens another.',
        showOnDashboard: true,
        showOnReceipt: true,
      },
      rolePermissions: {
         Owner: ['view_dashboard', 'view_reports', 'manage_staff', 'manage_inventory', 'manage_services', 'manage_customers', 'process_sale', 'process_refund', 'view_all_appointments', 'view_own_appointments', 'view_all_commissions', 'manage_settings'],
         Manager: ['view_dashboard', 'view_reports', 'manage_staff', 'manage_inventory', 'manage_services', 'manage_customers', 'process_sale', 'process_refund', 'view_all_appointments', 'view_all_commissions'],
         Barber: ['view_dashboard', 'view_own_appointments', 'process_sale', 'manage_customers'],
         Cashier: ['view_dashboard', 'process_sale', 'manage_customers', 'view_all_appointments', 'manage_inventory'],
      },
      version: 1,
    };
    this.db.run(`INSERT INTO settings (id, json_content, version) VALUES (1, ?, 1)`, [JSON.stringify(initialSettings)]);
  }

  getStaff(): Staff[] {
    if (!this.initialized || !this.db) return [];
    const res = this.db.exec("SELECT * FROM staff");
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  getServices(): Service[] {
    if (!this.initialized || !this.db) return [];
    const res = this.db.exec("SELECT * FROM services");
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  getProducts(): Product[] {
    if (!this.initialized || !this.db) return [];
    const res = this.db.exec("SELECT * FROM products");
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  getCustomers(): Customer[] {
    if (!this.initialized || !this.db) return [];
    const res = this.db.exec("SELECT * FROM customers");
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  getTransactions(): Transaction[] {
    if (!this.initialized || !this.db) return [];
    const res = this.db.exec("SELECT * FROM transactions ORDER BY timestamp DESC");
    if (!res.length) return [];
    const rows = this.mapResults(res[0]);
    return rows.map((r: any) => ({
      ...r,
      items: JSON.parse(r.items),
      isSynced: !!r.isSynced
    }));
  }

  getAppointments(): Appointment[] {
    if (!this.initialized || !this.db) return [];
    const res = this.db.exec("SELECT * FROM appointments");
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  getSettings(): AppSettings {
    if (!this.initialized || !this.db) return {} as AppSettings;
    const res = this.db.exec("SELECT json_content FROM settings WHERE id = 1");
    if (!res.length) return {} as AppSettings;
    return JSON.parse(res[0].values[0][0] as string);
  }

  async addTransaction(t: Transaction) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO transactions (id, timestamp, items, total, paymentMethod, status, customerId, customerName, isSynced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.timestamp, JSON.stringify(t.items), t.total ?? null, t.paymentMethod, t.status, t.customerId || null, t.customerName || null, t.isSynced ? 1 : 0]
    );
    await this.saveToIDB();
  }

  async addStaff(s: Staff) {
    if (!this.db) return;
    this.db.run(`INSERT INTO staff (id, name, role, commissionRate, phone, avatar, username, passwordHash, status, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [s.id, s.name, s.role, s.commissionRate, s.phone, s.avatar, s.username || null, s.passwordHash || null, s.status, s.version]);
    await this.saveToIDB();
  }

  async updateStaff(s: Staff) {
    if (!this.db) return;
    this.db.run(`UPDATE staff SET name=?, role=?, commissionRate=?, phone=?, avatar=?, username=?, passwordHash=?, status=?, version=? WHERE id=?`, [s.name, s.role, s.commissionRate, s.phone, s.avatar, s.username || null, s.passwordHash || null, s.status, s.version, s.id]);
    await this.saveToIDB();
  }

  async deleteStaff(id: string) {
    if (!this.db) return;
    this.db.run(`DELETE FROM staff WHERE id=?`, [id]);
    await this.saveToIDB();
  }

  async addService(s: Service) {
    if (!this.db) return;
    this.db.run(`INSERT INTO services VALUES (?, ?, ?, ?, ?, ?)`, [s.id, s.name, s.price, s.duration, s.category, s.version]);
    await this.saveToIDB();
  }
  
  async removeService(id: string) {
    if (!this.db) return;
    this.db.run(`DELETE FROM services WHERE id = ?`, [id]);
    await this.saveToIDB();
  }

  async addProduct(p: Product) {
    if (!this.db) return;
    this.db.run(`INSERT INTO products VALUES (?, ?, ?, ?, ?, ?)`, [p.id, p.name, p.price, p.stock, p.category, p.version]);
    await this.saveToIDB();
  }

  async updateProductStock(id: string, newStock: number, newVersion: number) {
    if (!this.db) return;
    this.db.run(`UPDATE products SET stock = ?, version = ? WHERE id = ?`, [newStock, newVersion, id]);
    await this.saveToIDB();
  }

  async updateProduct(p: Product) {
    if (!this.db) return;
    this.db.run(`UPDATE products SET name = ?, price = ?, stock = ?, category = ?, version = ? WHERE id = ?`, [p.name, p.price, p.stock, p.category, p.version, p.id]);
    await this.saveToIDB();
  }

  async deleteProduct(id: string) {
    if (!this.db) return;
    this.db.run(`DELETE FROM products WHERE id = ?`, [id]);
    await this.saveToIDB();
  }

  async addCustomer(c: Customer) {
    if (!this.db) return;
    this.db.run(`INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?, ?)`, [c.id, c.name, c.phone, c.email || '', c.notes || '', c.joinDate, c.version]);
    await this.saveToIDB();
  }

  async updateCustomer(c: Customer) {
    if (!this.db) return;
    this.db.run(`UPDATE customers SET name = ?, phone = ?, email = ?, notes = ?, version = ? WHERE id = ?`, [c.name, c.phone, c.email || '', c.notes || '', c.version, c.id]);
    await this.saveToIDB();
  }

  async addAppointment(a: Appointment) {
    if (!this.db) return;
    this.db.run(`INSERT INTO appointments VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [a.id, a.customerName, a.customerPhone, a.serviceId, a.staffId, a.date, a.status, a.version]);
    await this.saveToIDB();
  }

  async updateAppointmentStatus(id: string, status: string, version: number) {
    if (!this.db) return;
    this.db.run(`UPDATE appointments SET status = ?, version = ? WHERE id = ?`, [status, version, id]);
    await this.saveToIDB();
  }

  async updateSettings(s: AppSettings) {
    if (!this.db) return;
    this.db.run(`UPDATE settings SET json_content = ?, version = ? WHERE id = 1`, [JSON.stringify(s), s.version]);
    await this.saveToIDB();
  }

  private mapResults(res: any) {
    const columns = res.columns;
    return res.values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }
}

export const dbService = new DatabaseService();
