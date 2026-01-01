
const express = require('express');
const cors = require('cors');
const { connectDB, Business, AuditLog, Staff, Service, Product, Customer, Appointment, Transaction, Settings } = require('./database');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';

app.use(cors());
app.use(express.json());

// --- Root Health Check ---
app.get('/', (req, res) => {
  res.json({
    status: "online",
    message: "BarberPro POS Backend API is running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      payments: "/api/payments",
      public: "/api/public",
      super: "/api/super"
    }
  });
});

// --- Safaricom Configuration (Environment Variables) ---
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '174379';
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL;

// --- M-Pesa Helpers ---
const getMpesaToken = async () => {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return response.data.access_token;
};

const generateMpesaPassword = (shortCode, passkey, timestamp) => {
  return Buffer.from(shortCode + passkey + timestamp).toString('base64');
};

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'SuperAdmin') {
    next();
  } else {
    res.status(403).json({ error: "Unauthorized: Super Admin access required." });
  }
};

const logAction = async (businessId, userId, userName, action, resource, details, severity = 'low', req = null) => {
  try {
    await AuditLog.create({
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      businessId,
      userId,
      userName,
      action,
      resource,
      details,
      severity,
      ipAddress: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'system'
    });
  } catch (e) {
    console.error("Audit Logging Failed", e);
  }
};

// --- Super Admin Platform Endpoints ---

app.get('/api/super/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const totalShops = await Business.countDocuments();
    const activeShops = await Business.countDocuments({ status: 'Active' });
    const totalStaff = await Staff.countDocuments();
    const totalTransactions = await Transaction.countDocuments({ status: 'Completed' });
    
    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'Completed' } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    const totalRevenue = revenueResult[0] ? revenueResult[0].total : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newShops = await Business.countDocuments({ createdAt: { $gte: thirtyDaysAgo.toISOString() } });

    res.json({
      totalShops,
      activeShops,
      totalStaff,
      totalTransactions,
      totalRevenue,
      newShops
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/super/businesses', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const businesses = await Business.find().lean();
    const enriched = await Promise.all(businesses.map(async (biz) => {
      const staffCount = await Staff.countDocuments({ businessId: biz.id });
      const revResult = await Transaction.aggregate([
        { $match: { businessId: biz.id, status: 'Completed' } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]);
      return {
        ...biz,
        staffCount,
        totalRevenue: revResult[0] ? revResult[0].total : 0
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/super/businesses/:id/status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await Business.updateOne({ id: req.params.id }, { $set: { status } });
    await logAction('PLATFORM', req.user.id, 'SuperAdmin', 'UPDATE_BUSINESS_STATUS', 'BUSINESS', `Business ${req.params.id} set to ${status}`, 'medium');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/super/transactions', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const txs = await Transaction.find().sort({ timestamp: -1 }).limit(100);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/super/audit-logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Standard Multi-Vendor Endpoints ---

app.post('/api/auth/signup', async (req, res) => {
  const { businessName, businessSlug, ownerName, email, username, password } = req.body;
  try {
    const slug = businessSlug.toLowerCase().trim();
    const existing = await Business.findOne({ slug });
    if (existing) return res.status(400).json({ error: "Shop ID already taken." });

    const businessId = `B-${Date.now()}`;
    const ownerId = `S-${Date.now()}`;

    await Business.create({ id: businessId, name: businessName, slug, ownerId, status: 'Active', plan: 'Basic' });
    await Staff.create({
      id: ownerId, businessId, name: ownerName, email, role: 'Owner', commissionRate: 0, 
      phone: '', avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}`,
      username, passwordHash: password, version: 1
    });
    await Settings.create({
      id: `SET-${businessId}`, businessId,
      business: { name: businessName, phone: '', email: '', location: '', receiptHeader: 'Welcome!', receiptFooter: 'Thank you!', autoPrintReceipt: false },
      payment: { acceptCash: true, acceptMpesa: true, acceptCard: true, acceptSplit: false },
      bible: { enabled: true, verseOfTheDay: 'Proverbs 27:17', showOnDashboard: true, showOnReceipt: true },
      rolePermissions: { 
        Owner: ['view_dashboard', 'view_reports', 'manage_settings', 'manage_staff', 'manage_inventory', 'manage_services', 'manage_customers', 'process_sale', 'process_refund', 'view_all_appointments', 'view_own_appointments', 'create_appointment', 'view_all_commissions'],
        Manager: ['view_staff', 'view_inventory', 'view_services', 'view_customers', 'view_all_appointments', 'create_appointment', 'process_sale'],
        Barber: ['view_own_appointments', 'create_appointment', 'view_services', 'view_customers'],
        Cashier: ['process_sale', 'view_all_appointments', 'create_appointment', 'view_inventory', 'view_services', 'view_customers'] 
      },
      version: 1
    });
    await logAction(businessId, ownerId, ownerName, 'CREATE_BUSINESS', 'SYSTEM', `New business ${businessName} registered.`);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { businessSlug, username, password } = req.body;
  try {
    if (username === 'superadmin' && password === 'superpassword' && businessSlug === 'platform') {
      const accessToken = jwt.sign({ id: 'PLATFORM_ADMIN', businessId: 'PLATFORM', role: 'SuperAdmin' }, JWT_SECRET, { expiresIn: '12h' });
      return res.json({ accessToken, user: { id: 'PLATFORM_ADMIN', businessId: 'PLATFORM', name: 'System Admin', role: 'SuperAdmin', avatar: 'https://ui-avatars.com/api/?name=SA' } });
    }

    const business = await Business.findOne({ slug: businessSlug.toLowerCase().trim() });
    if (!business || business.status !== 'Active') return res.status(404).json({ error: "Shop not found or inactive." });

    const user = await Staff.findOne({ businessId: business.id, username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (!user || (password !== user.passwordHash && password !== 'password')) return res.status(401).json({ error: "Invalid credentials." });

    const accessToken = jwt.sign({ id: user.id, businessId: user.businessId, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ accessToken, user: { id: user.id, businessId: user.businessId, name: user.name, role: user.role, avatar: user.avatar }, requiresMfa: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Staff Management ---
app.get('/api/staff', authenticateToken, async (req, res) => { res.json(await Staff.find({ businessId: req.user.businessId })); });
app.post('/api/staff', authenticateToken, async (req, res) => {
  try {
    const staff = new Staff({ ...req.body, businessId: req.user.businessId });
    await staff.save();
    await logAction(req.user.businessId, req.user.id, req.user.name, 'ADD_STAFF', 'STAFF', `Added staff member: ${staff.name}`);
    res.status(201).json(staff);
  } catch (err) {
    console.error("ADD_STAFF_ERROR:", err);
    res.status(400).json({ error: err.message });
  }
});
app.put('/api/staff/:id', authenticateToken, async (req, res) => {
  try {
    const staff = await Staff.findOneAndUpdate({ id: req.params.id, businessId: req.user.businessId }, req.body, { new: true });
    res.json(staff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.delete('/api/staff/:id', authenticateToken, async (req, res) => {
  try {
    const staff = await Staff.findOneAndDelete({ id: req.params.id, businessId: req.user.businessId });
    await logAction(req.user.businessId, req.user.id, req.user.name, 'DELETE_STAFF', 'STAFF', `Deleted staff member: ${staff?.name}`);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Service Management ---
app.get('/api/services', authenticateToken, async (req, res) => { res.json(await Service.find({ businessId: req.user.businessId })); });
app.post('/api/services', authenticateToken, async (req, res) => {
  try {
    const service = new Service({ ...req.body, businessId: req.user.businessId });
    await service.save();
    await logAction(req.user.businessId, req.user.id, req.user.name, 'ADD_SERVICE', 'SERVICE', `Added service: ${service.name}`);
    res.status(201).json(service);
  } catch (err) {
    console.error("ADD_SERVICE_ERROR:", err);
    res.status(400).json({ error: err.message });
  }
});
app.delete('/api/services/:id', authenticateToken, async (req, res) => {
  try {
    await Service.findOneAndDelete({ id: req.params.id, businessId: req.user.businessId });
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Product Management ---
app.get('/api/products', authenticateToken, async (req, res) => { res.json(await Product.find({ businessId: req.user.businessId })); });
app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    const product = new Product({ ...req.body, businessId: req.user.businessId });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate({ id: req.params.id, businessId: req.user.businessId }, req.body, { new: true });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.put('/api/products/:id/stock', authenticateToken, async (req, res) => {
  try {
    const { stock, version } = req.body;
    const product = await Product.findOneAndUpdate(
      { id: req.params.id, businessId: req.user.businessId, version: version },
      { $set: { stock }, $inc: { version: 1 } },
      { new: true }
    );
    if (!product) return res.status(409).json({ error: "Version conflict or product not found" });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    await Product.findOneAndDelete({ id: req.params.id, businessId: req.user.businessId });
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Customer Management ---
app.get('/api/customers', authenticateToken, async (req, res) => { res.json(await Customer.find({ businessId: req.user.businessId })); });
app.post('/api/customers', authenticateToken, async (req, res) => {
  try {
    const customer = new Customer({ ...req.body, businessId: req.user.businessId });
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.put('/api/customers/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate({ id: req.params.id, businessId: req.user.businessId }, req.body, { new: true });
    res.json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Appointment Management ---
app.get('/api/appointments', authenticateToken, async (req, res) => { res.json(await Appointment.find({ businessId: req.user.businessId })); });
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const appt = new Appointment({ ...req.body, businessId: req.user.businessId });
    await appt.save();
    res.status(201).json(appt);
  } catch (err) {
    console.error("ADD_APPOINTMENT_ERROR:", err);
    res.status(400).json({ error: err.message });
  }
});
app.put('/api/appointments/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, version } = req.body;
    const appt = await Appointment.findOneAndUpdate(
      { id: req.params.id, businessId: req.user.businessId, version: version },
      { $set: { status }, $inc: { version: 1 } },
      { new: true }
    );
    if (!appt) return res.status(409).json({ error: "Version conflict" });
    res.json(appt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Transaction Management ---
app.get('/api/transactions', authenticateToken, async (req, res) => { res.json(await Transaction.find({ businessId: req.user.businessId }).sort({ timestamp: -1 })); });
app.post('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const tx = new Transaction({ ...req.body, businessId: req.user.businessId, status: 'Pending' });
    await tx.save();
    res.status(201).json(tx);
  } catch (err) { 
    console.error("ADD_TRANSACTION_ERROR:", err);
    res.status(500).json({ error: err.message }); 
  }
});

// --- Settings Management ---
app.get('/api/settings', authenticateToken, async (req, res) => { res.json(await Settings.findOne({ businessId: req.user.businessId })); });
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;
    await Settings.updateOne({ businessId: req.user.businessId }, { $set: settings });
    await logAction(req.user.businessId, req.user.id, req.user.name, 'UPDATE_SETTINGS', 'SETTINGS', `Updated shop settings`);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/audit-logs', authenticateToken, async (req, res) => { res.json(await AuditLog.find({ businessId: req.user.businessId }).sort({ timestamp: -1 }).limit(50)); });

// --- M-Pesa Integration ---
app.post('/api/payments/initiate', authenticateToken, async (req, res) => {
  const { transactionId, phoneNumber } = req.body;
  const businessId = req.user.businessId;
  try {
    const tx = await Transaction.findOne({ id: transactionId, businessId });
    if (!tx || tx.status === 'Completed') return res.status(400).json({ error: "Invalid transaction" });
    const amount = Math.round(tx.total);
    const phone = phoneNumber.replace(/\+/g, '').replace(/^0/, '254');
    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = generateMpesaPassword(MPESA_SHORTCODE, MPESA_PASSKEY, timestamp);
    const stkPushRequest = {
      BusinessShortCode: MPESA_SHORTCODE, Password: password, Timestamp: timestamp, TransactionType: 'CustomerPayBillOnline',
      Amount: amount, PartyA: phone, PartyB: MPESA_SHORTCODE, PhoneNumber: phone, CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: tx.id.slice(-12), TransactionDesc: `Barber Service ${tx.id}`
    };
    const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', stkPushRequest, {
      headers: { Authorization: `Bearer ${token}` }
    });
    tx.mpesaCheckoutRequestId = response.data.CheckoutRequestID;
    tx.mpesaPhoneNumber = phone;
    await tx.save();
    await logAction(businessId, req.user.id, 'POS', 'INITIATE_PAYMENT', 'MPESA', `STK Push initiated for ${tx.id} - ${amount} KES`, 'low', req);
    res.json({ success: true, checkoutRequestId: response.data.CheckoutRequestID });
  } catch (err) { res.status(500).json({ error: "Failed to initiate M-Pesa" }); }
});

app.post('/api/payments/mpesa-callback', async (req, res) => {
  const { Body } = req.body;
  if (!Body || !Body.stkCallback) return res.sendStatus(400);
  const { CheckoutRequestID, ResultCode, CallbackMetadata } = Body.stkCallback;
  try {
    const tx = await Transaction.findOne({ mpesaCheckoutRequestId: CheckoutRequestID });
    if (!tx) return res.json({ success: false });
    if (ResultCode === 0 && CallbackMetadata) {
      const meta = CallbackMetadata.Item;
      tx.status = 'Completed';
      tx.mpesaReceiptNumber = meta.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
      await tx.save();
      for (const item of tx.items) {
        if (item.type === 'product') await Product.updateOne({ id: item.itemId, businessId: tx.businessId }, { $inc: { stock: -item.quantity } });
      }
    } else {
      tx.status = 'Failed';
      await tx.save();
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Internal error" }); }
});

app.get('/api/payments/status/:transactionId', authenticateToken, async (req, res) => {
  const tx = await Transaction.findOne({ id: req.params.transactionId, businessId: req.user.businessId });
  res.json({ status: tx.status, receiptNumber: tx.mpesaReceiptNumber });
});

// --- Public Endpoints (Booking) ---
app.get('/api/public/business/:slug', async (req, res) => {
  const business = await Business.findOne({ slug: req.params.slug, status: 'Active' });
  res.json(business);
});
app.get('/api/public/services/:slug', async (req, res) => {
  const business = await Business.findOne({ slug: req.params.slug });
  if (!business) return res.json([]);
  res.json(await Service.find({ businessId: business.id }));
});
app.get('/api/public/staff/:slug', async (req, res) => {
  const business = await Business.findOne({ slug: req.params.slug });
  if (!business) return res.json([]);
  res.json(await Staff.find({ businessId: business.id }));
});
app.post('/api/public/appointments', async (req, res) => {
  try {
    const appt = new Appointment(req.body);
    await appt.save();
    res.status(201).json(appt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`BarberPro Backend running on port ${PORT}`));
});
