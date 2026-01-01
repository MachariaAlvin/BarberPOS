
import React, { useState } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth, PERMISSIONS } from '../contexts/AuthContext';
import { Product } from '../types';
import { AlertTriangle, Plus, X, AlertCircle, Pencil, Trash2, Package } from 'lucide-react';

export const Inventory: React.FC = () => {
  const { products, updateProductStock, addProduct, updateProduct, deleteProduct } = useDatabase();
  const { can, businessId } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newCategory, setNewCategory] = useState<'Retail' | 'Internal'>('Retail');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permission Checks
  const canManage = can(PERMISSIONS.MANAGE_INVENTORY);

  // Fix: Added missing resetForm function
  const resetForm = () => {
    setEditingId(null);
    setNewName('');
    setNewPrice('');
    setNewStock('');
    setNewCategory('Retail');
    setError(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setNewName(product.name);
    setNewPrice(product.price.toString());
    setNewStock(product.stock.toString());
    setNewCategory(product.category);
    setError(null);
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    
    try {
      if (editingId) {
        // UPDATE MODE
        const existing = products.find(p => p.id === editingId);
        if (!existing) throw new Error("Product not found");

        const updatedProduct: Product = {
          ...existing,
          name: newName,
          price: Number(newPrice),
          stock: Number(newStock),
          category: newCategory,
        };
        await updateProduct(updatedProduct);

      } else {
        // ADD MODE
        const product: Product = {
          id: `P-${Date.now()}`,
          businessId: businessId || '',
          name: newName,
          price: Number(newPrice),
          stock: Number(newStock),
          category: newCategory,
          version: 1 // Initial Version
        };
        await addProduct(product);
      }
      
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      try {
        await deleteProduct(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete product");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500">Track and manage your retail and internal stock</p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
          >
            <Plus size={20} />
            Add Product
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group overflow-hidden">
            <div className={`absolute top-0 right-0 p-1 px-3 text-[10px] font-bold uppercase rounded-bl-lg ${product.category === 'Retail' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
              {product.category}
            </div>

            <div className="mb-4">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mb-3">
                <Package size={24} />
              </div>
              <h3 className="font-bold text-slate-800 truncate">{product.name}</h3>
              <p className="text-xl font-bold text-slate-900 mt-1">KES {product.price.toLocaleString()}</p>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase font-bold">Stock Level</span>
                <span className={`text-lg font-black ${product.stock < 10 ? 'text-red-500' : 'text-green-600'}`}>
                  {product.stock} units
                </span>
              </div>
              {product.stock < 10 && <AlertTriangle size={20} className="text-red-500 animate-pulse" />}
            </div>

            {canManage && (
              <div className="flex gap-2">
                <button 
                  onClick={() => openEditModal(product)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-100"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button 
                  onClick={() => handleDelete(product.id, product.name)}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in zoom-in duration-200 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl shadow-black border border-slate-800 relative">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h3 className="text-2xl font-bold text-white">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Product Name</label>
                  <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-4 py-3 bg-white border-none rounded-xl text-slate-900 font-bold outline-none" placeholder="e.g. Matte Pomade" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Price (KES)</label>
                    <input required type="number" min="0" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full px-4 py-3 bg-white border-none rounded-xl text-slate-900 font-bold outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Initial Stock</label>
                    <input required type="number" min="0" value={newStock} onChange={e => setNewStock(e.target.value)} className="w-full px-4 py-3 bg-white border-none rounded-xl text-slate-900 font-bold outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value as any)} className="w-full px-4 py-3 bg-white border-none rounded-xl text-slate-900 font-bold outline-none cursor-pointer">
                    <option value="Retail">Retail Sale</option>
                    <option value="Internal">Internal Usage</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-300 hover:bg-slate-800 rounded-xl font-bold transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
