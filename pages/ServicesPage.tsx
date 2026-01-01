import React, { useState, useMemo } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth, PERMISSIONS } from '../contexts/AuthContext';
import { Service } from '../types';
import { Plus, Trash2, Scissors, Clock, DollarSign, X, AlertCircle } from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { services, addService, removeService } = useDatabase();
  // Fix: Extract businessId from useAuth hook to satisfy the Service interface requirements
  const { can, businessId } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Hair');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = can(PERMISSIONS.MANAGE_SERVICES);

  // Derive unique categories from existing services
  const availableCategories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return Array.from(cats).sort();
  }, [services]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const finalCategory = isCustomCategory ? customCategory.trim() : selectedCategory;
      if (!finalCategory) throw new Error("Category is required");

      // Fix: Added businessId property to match the required type Service
      const service: Service = {
        id: `SRV-${Date.now()}`,
        businessId: businessId || '',
        name: newName,
        price: Number(newPrice),
        duration: Number(newDuration),
        category: finalCategory,
        version: 1
      };
      await addService(service);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to add service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewPrice('');
    setNewDuration('');
    setSelectedCategory('Hair');
    setCustomCategory('');
    setIsCustomCategory(false);
    setError(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the menu?`)) {
      removeService(id);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Hair': return 'bg-blue-100 text-blue-700';
      case 'Beard': return 'bg-orange-100 text-orange-700';
      case 'Color': return 'bg-purple-100 text-purple-700';
      case 'Treatment': return 'bg-teal-100 text-teal-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-3xl font-bold text-slate-800">Services Menu</h2>
           <p className="text-slate-500 mt-1">Manage the services available in the POS</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
          >
            <Plus size={20} />
            <span>Add Service</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <div key={service.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative">
             <div className="flex justify-between items-start mb-4">
               <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getCategoryColor(service.category)}`}>
                 {service.category}
               </div>
               {canManage && (
                 <button 
                  onClick={() => handleDelete(service.id, service.name)}
                  className="text-slate-300 hover:text-red-500 transition-colors p-1"
                  title="Remove Service"
                 >
                   <Trash2 size={18} />
                 </button>
               )}
             </div>
             
             <h3 className="text-xl font-bold text-slate-800 mb-2">{service.name}</h3>
             
             <div className="flex items-center gap-6 text-slate-500 text-sm mt-4">
                <div className="flex items-center gap-2">
                   <Clock size={16} />
                   <span>{service.duration} mins</span>
                </div>
                <div className="flex items-center gap-2 font-mono font-medium text-slate-900 bg-slate-50 px-2 py-1 rounded">
                   <span className="text-xs">KES</span>
                   <span className="text-lg">{service.price}</span>
                </div>
             </div>
             
             <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                <Scissors size={80} />
             </div>
          </div>
        ))}
      </div>

      {/* Add Service Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in zoom-in duration-200 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md p-8 shadow-2xl shadow-black border border-slate-800 relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Add New Service</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleAddService} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Service Name</label>
                <input 
                  required 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/50 outline-none transition-all" 
                  placeholder="e.g. Fade Cut" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Price (KES)</label>
                   <div className="relative">
                      <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                      <input 
                        required 
                        type="number" 
                        min="0" 
                        value={newPrice} 
                        onChange={e => setNewPrice(e.target.value)} 
                        className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/50 outline-none transition-all" 
                      />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Duration (Mins)</label>
                   <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                      <input 
                        required 
                        type="number" 
                        min="0"
                        step="5" 
                        value={newDuration} 
                        onChange={e => setNewDuration(e.target.value)} 
                        className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/50 outline-none transition-all" 
                      />
                   </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                {!isCustomCategory ? (
                  <select 
                    value={selectedCategory} 
                    onChange={e => {
                      if (e.target.value === 'NEW_CATEGORY_OPTION') {
                        setIsCustomCategory(true);
                      } else {
                        setSelectedCategory(e.target.value);
                      }
                    }} 
                    className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold focus:ring-4 focus:ring-blue-500/50 outline-none transition-all cursor-pointer"
                  >
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="NEW_CATEGORY_OPTION" className="font-bold text-blue-600">+ Create New Category</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      required
                      autoFocus
                      value={customCategory} 
                      onChange={e => setCustomCategory(e.target.value)}
                      placeholder="Enter new category name"
                      className="flex-1 px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold focus:ring-4 focus:ring-blue-500/50 outline-none transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(false);
                        setCustomCategory('');
                        setSelectedCategory(availableCategories[0] || 'Hair');
                      }}
                      className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-3 text-slate-300 hover:bg-slate-800 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-bold shadow-lg shadow-blue-900/50 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};