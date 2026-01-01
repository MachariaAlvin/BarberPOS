import { z } from 'zod';

// --- Shared Validators ---
const idSchema = z.string().min(1, "ID is required");
const priceSchema = z.number().min(0, "Price must be non-negative");
const phoneSchema = z.string().regex(/^(?:\+254|0)?[17]\d{8}$/, "Invalid phone number format (e.g., 0712345678)");
const versionSchema = z.number().int().default(1);

// --- Domain Schemas ---

export const StaffSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Name is required"),
  role: z.enum(['Owner', 'Manager', 'Barber', 'Cashier']),
  commissionRate: z.number().min(0).max(1),
  phone: phoneSchema,
  avatar: z.string(),
  username: z.string().optional(),
  passwordHash: z.string().optional(),
  version: versionSchema,
});

export const ServiceSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Name is required"),
  price: priceSchema,
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  category: z.string().min(1, "Category is required"),
  version: versionSchema,
});

export const ProductSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Name is required"),
  price: priceSchema,
  stock: z.number().int().min(0),
  category: z.enum(['Retail', 'Internal']),
  version: versionSchema,
});

export const CustomerSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Name is required"),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  joinDate: z.string(),
  version: versionSchema,
});

export const AppointmentSchema = z.object({
  id: idSchema,
  customerName: z.string().min(1, "Customer Name is required"),
  customerPhone: phoneSchema,
  serviceId: z.string().min(1, "Service is required"),
  staffId: z.string().min(1, "Staff is required"),
  date: z.string(),
  status: z.enum(['Scheduled', 'Completed', 'Cancelled']),
  version: versionSchema,
});

const CommissionSplitSchema = z.object({
  staffId: z.string(),
  staffName: z.string(),
  percentage: z.number().min(0).max(100),
  roleLabel: z.string().optional(),
});

const CartItemSchema = z.object({
  itemId: z.string(),
  type: z.enum(['service', 'product']),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  barberId: z.string().optional(),
  barberName: z.string().optional(),
  staffIds: z.array(z.string()).optional(),
  staffNames: z.array(z.string()).optional(),
  commissionSplits: z.array(CommissionSplitSchema).optional(),
  itemVersion: z.number().optional(),
});

export const TransactionSchema = z.object({
  id: idSchema,
  timestamp: z.string(),
  items: z.array(CartItemSchema),
  total: z.number(),
  paymentMethod: z.enum(['Cash', 'M-Pesa', 'Card', 'Split']),
  status: z.enum(['Pending', 'Completed', 'Failed', 'Refunded']),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  isSynced: z.boolean().optional(),
  paymentReference: z.string().optional(),
  mpesaPhoneNumber: z.string().optional(),
});