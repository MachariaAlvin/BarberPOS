
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');

const connectDB = async () => {
  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/barberpro';
  try {
    await mongoose.connect(uri);
    await seedData();
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
  }
};

// --- Multi-Tenant Schemas ---

const businessSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  ownerId: String,
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  plan: { type: String, enum: ['Basic', 'Pro', 'Enterprise'], default: 'Basic' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

const auditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  userId: String,
  userName: String,
  action: String,
  resource: String,
  timestamp: { type: String, default: () => new Date().toISOString() },
  details: String,
  ipAddress: String,
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
});

const staffSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  name: String,
  role: String,
  commissionRate: Number,
  phone: String,
  email: String,
  avatar: String,
  username: String,
  passwordHash: String,
  version: { type: Number, default: 1 }
});

const serviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  name: String,
  price: Number,
  duration: Number,
  category: String,
  version: { type: Number, default: 1 }
});

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  name: String,
  price: Number,
  stock: Number,
  category: String,
  version: { type: Number, default: 1 }
});

const customerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  name: String,
  phone: String,
  email: String,
  notes: String,
  joinDate: String,
  version: { type: Number, default: 1 }
});

const appointmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  customerName: String,
  customerPhone: String,
  serviceId: String,
  staffId: String,
  date: String,
  status: String,
  version: { type: Number, default: 1 }
});

const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  timestamp: String,
  items: { type: Array, default: [] },
  total: Number,
  paymentMethod: String,
  status: { type: String, enum: ['Pending', 'Completed', 'Failed', 'Refunded'], default: 'Pending' },
  customerId: String,
  customerName: String,
  mpesaPhoneNumber: String,
  mpesaCheckoutRequestId: { type: String, index: true },
  mpesaReceiptNumber: String,
  metadata: {
    userId: String,
    userName: String,
    ipAddress: String
  },
  isSynced: { type: Boolean, default: true }
});

const settingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Make required to prevent null values
  businessId: { type: String, required: true, unique: true },
  business: {
      name: String,
      phone: String,
      email: String,
      location: String,
      receiptHeader: String,
      receiptFooter: String,
      autoPrintReceipt: Boolean
  },
  payment: {
      acceptCash: Boolean,
      acceptMpesa: Boolean,
      acceptCard: Boolean,
      acceptSplit: Boolean,
      lipaOnlineApiKey: String,
      lipaOnlineShortcode: String,
      lipaOnlineEndpoint: String,
      lipaOnlineCallbackUrl: String
  },
  bible: {
      enabled: Boolean,
      verseOfTheDay: String,
      showOnDashboard: Boolean,
      showOnReceipt: Boolean
  },
  rolePermissions: { type: Object },
  version: { type: Number, default: 1 }
}, {
  id: false // Disable the default Mongoose 'id' virtual to avoid conflict with our 'id' field
});

const Business = mongoose.model('Business', businessSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const Staff = mongoose.model('Staff', staffSchema);
const Service = mongoose.model('Service', serviceSchema);
const Product = mongoose.model('Product', productSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Settings = mongoose.model('Settings', settingsSchema);

async function seedData() {
  try {
    const bid = 'b1';
    const sid = 's1';

    // 1. Check if Default Business exists
    const existingBusiness = await Business.findOne({ id: bid });
    if (!existingBusiness) {
      console.log("🌱 Seeding Default Business...");
      await Business.create({
        id: bid,
        name: 'BarberPro Flagship',
        slug: 'barberpro',
        ownerId: sid,
        status: 'Active',
        plan: 'Pro'
      });
    }

    // 2. Check if Default Admin Staff exists
    const existingStaff = await Staff.findOne({ id: sid });
    if (!existingStaff) {
      console.log("🌱 Seeding Default Admin Staff...");
      await Staff.create({ 
        id: sid, 
        businessId: bid,
        name: 'Admin User', 
        role: 'Owner', 
        commissionRate: 0.0, 
        phone: '0712345678', 
        email: 'admin@barberpro.com',
        avatar: 'https://ui-avatars.com/api/?name=Admin', 
        username: 'admin', 
        passwordHash: 'password', 
        version: 1 
      });
    }

    // 3. Check if Default Settings exist
    const existingSettings = await Settings.findOne({ businessId: bid });
    if (!existingSettings) {
      console.log("🌱 Seeding Default Settings...");
      await Settings.create({
        id: `SET-${bid}`, // Ensure unique id is populated
        businessId: bid,
        business: { 
          name: 'BarberPro Flagship', 
          phone: '0712 345 678', 
          email: 'admin@barberpro.com', 
          location: 'Main Street', 
          receiptHeader: 'Welcome!', 
          receiptFooter: 'Thanks!', 
          autoPrintReceipt: false 
        },
        payment: { 
          acceptCash: true, 
          acceptMpesa: true, 
          acceptCard: true, 
          acceptSplit: false, 
          lipaOnlineApiKey: '', 
          lipaOnlineShortcode: '', 
          lipaOnlineEndpoint: '', 
          lipaOnlineCallbackUrl: '' 
        },
        bible: { 
          enabled: true, 
          verseOfTheDay: 'Proverbs 27:17', 
          showOnDashboard: true, 
          showOnReceipt: true 
        },
        rolePermissions: { 
          Owner: ['view_dashboard', 'view_reports', 'manage_settings', 'manage_staff', 'manage_inventory', 'manage_services', 'manage_customers', 'process_sale', 'process_refund', 'view_all_appointments', 'view_own_appointments', 'create_appointment', 'view_all_commissions'],
          Manager: ['view_staff', 'view_inventory', 'view_services', 'view_customers', 'view_all_appointments', 'create_appointment', 'process_sale'],
          Barber: ['view_own_appointments', 'create_appointment', 'view_services', 'view_customers'],
          Cashier: ['process_sale', 'view_all_appointments', 'create_appointment', 'view_inventory', 'view_services', 'view_customers'] 
        },
        version: 1
      });
    }
  } catch (err) {
    console.error("Seeding error:", err);
  }
}

module.exports = {
  connectDB, Business, AuditLog, Staff, Service, Product, Customer, Appointment, Transaction, Settings
};
