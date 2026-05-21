import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Expense, Trip, EXPENSE_CATEGORIES, MaintenanceRecord } from '../types';
import { 
  PlusCircle, Receipt, Trash2, Pencil, X, AlertTriangle, Droplet, 
  ArrowRightLeft, Gauge, Save, History, Check, Link as LinkIcon,
  Wrench, Cog, FlaskConical, ShieldCheck, FileBadge, CircleDollarSign, 
  Zap, MapPin, ChevronDown, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpenseTrackerProps {
  expenses: Expense[];
  trips: Trip[];
  onAddExpense: (expense: Expense) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onAddMaintenanceRecord?: (record: MaintenanceRecord) => void;
  vehicleId: string;
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-LK', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(val);
};

const formatLiters = (val: number) => {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatOdo = (val: number) => {
  return val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const getCategoryTheme = (category: string) => {
  switch (category) {
    case 'Fuel': return { icon: Droplet, bg: 'bg-emerald-500', text: 'text-emerald-600', lightBg: 'bg-emerald-50' };
    case 'Repairs & Servicing': return { icon: Wrench, bg: 'bg-blue-500', text: 'text-blue-600', lightBg: 'bg-blue-50' };
    case 'Spare Parts': return { icon: Cog, bg: 'bg-slate-600', text: 'text-slate-600', lightBg: 'bg-slate-50' };
    case 'Oils, Coolant & Fluids': return { icon: FlaskConical, bg: 'bg-cyan-500', text: 'text-cyan-600', lightBg: 'bg-cyan-50' };
    case 'Insurance': return { icon: ShieldCheck, bg: 'bg-indigo-500', text: 'text-indigo-600', lightBg: 'bg-indigo-50' };
    case 'Revenue License': return { icon: FileBadge, bg: 'bg-amber-500', text: 'text-amber-600', lightBg: 'bg-amber-50' };
    case 'Lease Interest': return { icon: CircleDollarSign, bg: 'bg-rose-500', text: 'text-rose-600', lightBg: 'bg-rose-50' };
    case 'Tyres / Battery': return { icon: Zap, bg: 'bg-yellow-500', text: 'text-yellow-600', lightBg: 'bg-yellow-50' };
    case 'Parking (Clinic/Business)': return { icon: MapPin, bg: 'bg-violet-500', text: 'text-violet-600', lightBg: 'bg-violet-50' };
    default: return { icon: Receipt, bg: 'bg-slate-400', text: 'text-slate-500', lightBg: 'bg-slate-50' };
  }
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

export default function ExpenseTracker({ expenses, trips, onAddExpense, onUpdateExpense, onDeleteExpense, vehicleId, onAddMaintenanceRecord }: ExpenseTrackerProps) {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [isTripDropdownOpen, setIsTripDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Creation state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [odoAtService, setOdoAtService] = useState('');
  const [skipOdo, setSkipOdo] = useState(false);
  const [tripIds, setTripIds] = useState<string[]>([]);
  const [addMaintenance, setAddMaintenance] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [intervalKm, setIntervalKm] = useState('');
  const [intervalMonths, setIntervalMonths] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTripDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // All unique historical merchants
  const allHistoricalMerchants = useMemo(() => {
    const merchants = expenses
      .map(e => e.merchant?.trim())
      .filter((m): m is string => !!m);
    return Array.from(new Set(merchants));
  }, [expenses]);

  // Suggestions that only appear when current input matches history
  const merchantSuggestions = useMemo(() => {
    const currentInput = (editingId ? editForm?.merchant : merchant)?.toLowerCase() || '';
    if (!currentInput || currentInput.length < 2) return [];
    return allHistoricalMerchants.filter(m => 
      m.toLowerCase().startsWith(currentInput) && m.toLowerCase() !== currentInput
    ).slice(0, 5);
  }, [allHistoricalMerchants, merchant, editForm?.merchant, editingId]);

  // Auto-calc fuel volume for creation
  useEffect(() => {
    if (category === 'Fuel' && amount && pricePerLiter) {
      const amt = parseFloat(amount);
      const price = parseFloat(pricePerLiter);
      if (price > 0 && !isNaN(amt)) setLiters((amt / price).toFixed(2));
      else setLiters('');
    }
  }, [amount, pricePerLiter, category]);

  // Auto-calc fuel volume for edit
  useEffect(() => {
    if (editForm && editForm.category === 'Fuel' && editForm.amount && editForm.pricePerLiter) {
      const amt = parseFloat(editForm.amount);
      const price = parseFloat(editForm.pricePerLiter);
      if (price > 0 && !isNaN(amt)) setEditForm({ ...editForm, liters: (amt / price).toFixed(2) });
      else setEditForm({ ...editForm, liters: '' });
    }
  }, [editForm?.amount, editForm?.pricePerLiter, editForm?.category]);

  const handleEdit = (expense: Expense) => {
    setEditForm({
      id: expense.id,
      amount: expense.amount.toFixed(2),
      category: expense.category,
      date: expense.date,
      merchant: expense.merchant || '',
      description: expense.description || '',
      liters: expense.liters ? expense.liters.toFixed(2) : '',
      pricePerLiter: expense.pricePerLiter ? expense.pricePerLiter.toFixed(2) : '',
      odometer: expense.odometer ? expense.odometer.toFixed(1) : '',
      skipOdo: expense.odometer === undefined || expense.odometer === null,
      tripIds: expense.tripIds || (expense.tripId ? [expense.tripId] : [])
    });
    setEditingId(expense.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSubmit = (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    const data = isEdit ? editForm : { amount, category, date, merchant, description, liters, pricePerLiter, odometer: odoAtService, skipOdo, tripIds, addMaintenance, maintenanceTitle, intervalKm, intervalMonths };
    
    if (!data.amount) return;
    
    const isFullyDeductible = data.category === "Parking (Clinic/Business)";
    const isOdometerCategory = data.category === "Repairs & Servicing" || data.category === "Tyres / Battery";
    const normalizedTripIds = (data.tripIds || []).filter((id: string) => !!id);
    
    const expenseData: Expense = {
      id: isEdit ? editingId! : generateId(), 
      vehicleId: vehicleId, 
      date: data.date, 
      category: data.category, 
      amount: parseFloat(parseFloat(data.amount).toFixed(2)), 
      liters: data.category === 'Fuel' && data.liters ? parseFloat(parseFloat(data.liters).toFixed(2)) : undefined, 
      pricePerLiter: data.category === 'Fuel' && data.pricePerLiter ? parseFloat(parseFloat(data.pricePerLiter).toFixed(2)) : undefined,
      odometer: (isOdometerCategory && !data.skipOdo && data.odometer) ? parseFloat(parseFloat(data.odometer).toFixed(1)) : undefined,
      isFullyDeductible, 
      merchant: data.merchant,
      description: data.description, 
      tripId: normalizedTripIds.length === 1 ? normalizedTripIds[0] : undefined,
      tripIds: normalizedTripIds.length > 0 ? normalizedTripIds : undefined
    };

    if (isEdit) {
      onUpdateExpense(expenseData);
      cancelEdit();
    } else {
      onAddExpense(expenseData);
      
      if (data.addMaintenance && data.maintenanceTitle && onAddMaintenanceRecord) {
        onAddMaintenanceRecord({
          id: generateId(),
          vehicleId: vehicleId,
          expenseId: expenseData.id,
          title: data.maintenanceTitle,
          datePerformed: data.date,
          odometerPerformed: expenseData.odometer,
          intervalKm: data.intervalKm ? parseFloat(data.intervalKm) : undefined,
          intervalMonths: data.intervalMonths ? parseFloat(data.intervalMonths) : undefined,
        });
      }

      setAmount('');
      setMerchant('');
      setDescription('');
      setLiters('');
      setPricePerLiter('');
      setOdoAtService('');
      setSkipOdo(false);
      setTripIds([]);
      setAddMaintenance(false);
      setMaintenanceTitle('');
      setIntervalKm('');
      setIntervalMonths('');
    }
  };

  const sortedExpensesList = useMemo(() => {
    let filtered = [...expenses];
    if (activeFilter !== 'All') {
        filtered = filtered.filter(e => e.category === activeFilter);
    }
    return filtered.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [expenses, activeFilter]);

  const renderFormFields = (formData: any, onChange: (updated: any) => void) => {
    const isOdometerCategory = formData.category === "Repairs & Servicing" || formData.category === "Tyres / Battery";
    const availableTrips = [...trips].sort((a, b) => b.date.localeCompare(a.date));
    const selectedTripIds = (formData.tripIds || []) as string[];
    const selectedTrips = availableTrips.filter(t => selectedTripIds.includes(t.id));
    const toggleTripId = (tripId: string) => {
      if (selectedTripIds.includes(tripId)) {
        onChange({ ...formData, tripIds: selectedTripIds.filter(id => id !== tripId) });
      } else {
        onChange({ ...formData, tripIds: [...selectedTripIds, tripId] });
      }
    };
    const selectedTripLabel = selectedTrips.length === 0
      ? "Select movement(s)..."
      : selectedTrips.length === 1
        ? `${selectedTrips[0].date}: ${selectedTrips[0].purpose} (${formatOdo(selectedTrips[0].distance)} KM)`
        : `${selectedTrips.length} movements selected`;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Spending Date</label>
            <input type="date" value={formData.date} onChange={(e) => onChange({...formData, date: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm text-slate-700" required />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Expense Nature</label>
            <select value={formData.category} onChange={(e) => onChange({...formData, category: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-black text-slate-700 transition-all">
              {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        <AnimatePresence mode="wait">
        {formData.category === 'Fuel' ? (
          <motion.div key="fuel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                  <Droplet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Fuel Transaction</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 ml-1 uppercase">Total Cost</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black">LKR</span>
                        <input type="text" inputMode="decimal" step="0.01" value={formData.amount} onChange={(e) => onChange({...formData, amount: e.target.value})} className="w-full pl-11 p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 text-sm placeholder:text-slate-200" placeholder="0.00" required />
                      </div>
                  </div>
                  <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 ml-1 uppercase">Price/Liter</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black">LKR</span>
                        <input type="text" inputMode="decimal" step="0.01" value={formData.pricePerLiter} onChange={(e) => onChange({...formData, pricePerLiter: e.target.value})} className="w-full pl-11 p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 text-sm placeholder:text-slate-200" placeholder="0.00" required />
                      </div>
                  </div>
              </div>

              {availableTrips.length > 0 && (
                <div className="space-y-1 relative" ref={dropdownRef}>
                  <label className="block text-[10px] font-black text-slate-400 ml-1 uppercase flex items-center gap-1.5">
                    <LinkIcon size={10} className="text-emerald-500" /> Link to Movement (Optional)
                  </label>
                  
                  <div className="relative">
                    <button 
                      type="button" 
                      onClick={() => setIsTripDropdownOpen(!isTripDropdownOpen)}
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 text-xs transition-all flex items-center justify-between shadow-sm hover:border-emerald-200"
                    >
                      <span className="truncate">
                        {selectedTripLabel}
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${isTripDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isTripDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden border-t-0"
                        >
                          <div className="max-h-60 overflow-y-auto">
                            <button 
                              type="button"
                              onClick={() => { onChange({...formData, tripIds: []}); setIsTripDropdownOpen(false); }}
                              className="w-full text-left px-4 py-3 text-[10px] font-black text-slate-400 hover:bg-slate-50 uppercase tracking-widest border-b border-slate-50"
                            >
                              Clear Selection
                            </button>
                            
                            {availableTrips.filter(t => t.date === formData.date).length > 0 && (
                                <div className="px-4 py-2 bg-slate-50 text-[9px] font-black text-emerald-600 uppercase tracking-widest">Movements on this date</div>
                            )}
                            {availableTrips.filter(t => t.date === formData.date).map(t => (
                              <button 
                                key={t.id} 
                                type="button" 
                                onClick={() => toggleTripId(t.id)}
                                className={`w-full text-left px-4 py-3 text-xs font-bold border-b border-slate-50 transition-colors flex items-center justify-between ${selectedTripIds.includes(t.id) ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'}`}
                              >
                                <span>{t.purpose} — {formatOdo(t.distance)} KM</span>
                                {selectedTripIds.includes(t.id) && <Check size={14} className="text-emerald-600" />}
                              </button>
                            ))}

                            <div className="px-4 py-2 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">Other Recent Movements</div>
                            {availableTrips.filter(t => t.date !== formData.date).slice(0, 30).map(t => (
                              <button 
                                key={t.id} 
                                type="button" 
                                onClick={() => toggleTripId(t.id)}
                                className={`w-full text-left px-4 py-3 text-xs font-bold border-b border-slate-50 transition-colors flex items-center justify-between ${selectedTripIds.includes(t.id) ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'}`}
                              >
                                <span>
                                  <span className="text-[10px] text-slate-400 mr-2">{t.date}</span>
                                  {t.purpose} — {formatOdo(t.distance)} KM
                                </span>
                                {selectedTripIds.includes(t.id) && <Check size={14} className="text-emerald-600" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-emerald-600 p-3 rounded-xl shadow-lg shadow-emerald-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-emerald-200 uppercase tracking-widest">Calculated Volume</span>
                  <span className="text-xl font-black text-white leading-none mt-0.5">{formData.liters || '0.00'} <span className="text-[10px] font-bold text-emerald-300">L</span></span>
                </div>
                <ArrowRightLeft size={18} className="text-emerald-300 opacity-50" />
              </div>
          </motion.div>
        ) : isOdometerCategory ? (
          <motion.div key="service" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Financial Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">LKR</span>
                  <input type="text" inputMode="decimal" step="0.01" value={formData.amount} onChange={(e) => onChange({...formData, amount: e.target.value})} className="w-full pl-14 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900 text-xl" placeholder="0.00" required />
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Maintenance Log</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={formData.skipOdo} onChange={(e) => onChange({...formData, skipOdo: e.target.checked})} className="hidden" />
                        <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${formData.skipOdo ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'}`}>
                            {formData.skipOdo && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skip Odometer</span>
                    </label>
                  </div>
                  
                  {!formData.skipOdo && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 ml-1 uppercase">Odometer at Service</label>
                        <div className="relative">
                        <input type="text" inputMode="decimal" step="0.1" value={formData.odometer} onChange={(e) => onChange({...formData, odometer: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 text-sm" placeholder="125400.0" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black uppercase">KM</span>
                        </div>
                    </motion.div>
                  )}
              </div>

              {!formData.isEdit && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                    <input type="checkbox" checked={formData.addMaintenance} onChange={(e) => onChange({...formData, addMaintenance: e.target.checked})} className="hidden" />
                    <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${formData.addMaintenance ? 'bg-blue-600 border-blue-600' : 'bg-white border-blue-200'}`}>
                        {formData.addMaintenance && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Create Maintenance Reminder</span>
                  </label>
                  
                  <AnimatePresence>
                    {formData.addMaintenance && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                        <div>
                          <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 ml-1">Service / Task Name</label>
                          <input type="text" value={formData.maintenanceTitle} onChange={(e) => onChange({...formData, maintenanceTitle: e.target.value})} className="w-full p-2.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 text-xs" placeholder="e.g. Engine Oil Change" required={formData.addMaintenance} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 ml-1">Interval (KM)</label>
                            <div className="relative">
                              <input type="number" step="0.1" value={formData.intervalKm} onChange={(e) => onChange({...formData, intervalKm: e.target.value})} className="w-full p-2.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 text-xs" placeholder="e.g. 5000" />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-300">KM</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 ml-1">Interval (Months)</label>
                            <input type="number" step="1" value={formData.intervalMonths} onChange={(e) => onChange({...formData, intervalMonths: e.target.value})} className="w-full p-2.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 text-xs" placeholder="e.g. 6" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
          </motion.div>
        ) : (
          <motion.div key="std" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Financial Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">LKR</span>
              <input type="text" inputMode="decimal" step="0.01" value={formData.amount} onChange={(e) => onChange({...formData, amount: e.target.value})} className="w-full pl-14 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900 text-xl" placeholder="0.00" required />
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="space-y-5">
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Merchants Details</label>
                
                {/* Custom suggestions only when typing matches history */}
                <AnimatePresence>
                  {merchantSuggestions.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                       <History size={10} className="text-slate-300 flex-shrink-0" />
                       {merchantSuggestions.map(m => (
                         <button key={m} type="button" onClick={() => onChange({...formData, merchant: m})} className="whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all">
                           {m}
                         </button>
                       ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <input 
                  type="text" 
                  value={formData.merchant} 
                  onChange={(e) => onChange({...formData, merchant: e.target.value})} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold placeholder:text-slate-300 text-slate-700" 
                  placeholder="e.g. Lanka IOC Ward Place" 
                />
            </div>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Additional Descriptions</label>
                <textarea value={formData.description} onChange={(e) => onChange({...formData, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold h-24 placeholder:text-slate-300 text-slate-700" placeholder="Breakdown of costs or special notes..."></textarea>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Background creation form */}
      <div className="rounded-3xl shadow-sm border p-6 bg-white border-slate-100">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-500"><Receipt size={20} /></div>
              Capture New Expense
            </h2>
        </div>
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {renderFormFields(
            { date, category, amount, liters, pricePerLiter, odometer: odoAtService, skipOdo, merchant, description, tripIds, addMaintenance, maintenanceTitle, intervalKm, intervalMonths, isEdit: false },
            (upd) => {
              if (upd.date !== undefined) setDate(upd.date);
              if (upd.category !== undefined) setCategory(upd.category);
              if (upd.amount !== undefined) setAmount(upd.amount);
              if (upd.liters !== undefined) setLiters(upd.liters);
              if (upd.pricePerLiter !== undefined) setPricePerLiter(upd.pricePerLiter);
              if (upd.odometer !== undefined) setOdoAtService(upd.odometer);
              if (upd.skipOdo !== undefined) setSkipOdo(upd.skipOdo);
              if (upd.merchant !== undefined) setMerchant(upd.merchant);
              if (upd.description !== undefined) setDescription(upd.description);
              if (upd.tripIds !== undefined) setTripIds(upd.tripIds);
              if (upd.addMaintenance !== undefined) setAddMaintenance(upd.addMaintenance);
              if (upd.maintenanceTitle !== undefined) setMaintenanceTitle(upd.maintenanceTitle);
              if (upd.intervalKm !== undefined) setIntervalKm(upd.intervalKm);
              if (upd.intervalMonths !== undefined) setIntervalMonths(upd.intervalMonths);
            }
          )}
          <button type="submit" className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-3xl transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 active:scale-[0.98] text-xs uppercase tracking-widest">
             <PlusCircle size={18} /> Commit Transaction
          </button>
        </form>
      </div>

      {/* Floating Edit Modal */}
      <AnimatePresence>
        {editingId && editForm && (
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xl border border-slate-100 relative">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-lg"><Pencil size={20} /></div>
                    Modify Expenditure
                  </h2>
                  <button onClick={cancelEdit} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
              </div>
              <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
                {renderFormFields({ ...editForm, isEdit: true }, setEditForm)}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button type="button" onClick={cancelEdit} className="py-4 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-50 transition-all">Discard</button>
                  <button type="submit" className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 active:scale-[0.98] text-xs uppercase tracking-widest"><Save size={18} /> Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Journal */}
      <div className="space-y-4 pt-4 px-2">
        <div className="sticky top-[108px] bg-slate-50/95 py-3 z-20 backdrop-blur-md px-2 border-b border-slate-200/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3">Transaction Journal</h3>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2">
                {['All', ...EXPENSE_CATEGORIES].map(opt => (
                    <button key={opt} onClick={() => setActiveFilter(opt)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeFilter === opt ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-500 border-slate-100'}`}>{opt}</button>
                ))}
            </div>
        </div>
        <div className="space-y-3">
        {sortedExpensesList.length === 0 ? (
          <div className="text-center py-20 text-slate-300">
             <Receipt size={48} className="mx-auto mb-4 opacity-10" />
             <p className="text-xs font-black uppercase tracking-widest">No matching records</p>
          </div>
        ) : (
          sortedExpensesList.map((exp) => {
            const linkedTripIds = exp.tripIds && exp.tripIds.length > 0 ? exp.tripIds : (exp.tripId ? [exp.tripId] : []);
            const linkedTrips = linkedTripIds.map(id => trips.find(t => t.id === id)).filter((t): t is Trip => !!t);
            const theme = getCategoryTheme(exp.category);
            const CategoryIcon = theme.icon;

            return (
              <motion.div layout key={exp.id} className="p-4 rounded-3xl border bg-white border-slate-100 hover:border-slate-200 shadow-sm relative group overflow-hidden transition-all">
                  <div className="flex gap-4 items-start">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${theme.bg} text-white`}>
                        <CategoryIcon size={18} />
                      </div>
                      
                      <div className="flex-grow">
                          <div className="mb-2">
                              <h3 className="text-xl font-black text-slate-900 leading-none tracking-tight">LKR {formatCurrency(exp.amount)}</h3>
                              <div className={`text-[9px] font-black ${theme.text} uppercase tracking-widest mt-1`}>{exp.category} EXPENDITURE</div>
                          </div>
                          
                          {(exp.description || exp.merchant) && (
                              <div className="mb-3 italic text-slate-600 font-medium text-[13px] leading-snug">
                                  "{exp.merchant ? exp.merchant : ''}{exp.merchant && exp.description ? ' - ' : ''}{exp.description ? exp.description : ''}"
                              </div>
                          )}

                          {exp.category === 'Fuel' && exp.liters && (
                            <div className="flex flex-col gap-2 mb-3">
                               <div className="flex items-center gap-2">
                                 <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-100 text-[9px] font-black">
                                    <Droplet size={10} /> {formatLiters(exp.liters)} L
                                 </div>
                                 <div className="text-[9px] font-bold text-slate-400">@ LKR {exp.pricePerLiter?.toFixed(2)}/L</div>
                               </div>
                               {linkedTrips.length > 0 && (
                                 <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50/50 px-2 py-1 rounded-lg border border-emerald-100/50 w-fit">
                                    <LinkIcon size={10} />
                                    <span className="mr-1">Linked:</span>
                                    {linkedTrips.slice(0, 3).map((trip, index) => (
                                      <span key={trip.id} className="text-emerald-700">
                                        {index > 0 ? ' / ' : ''}{trip.purpose} ({formatOdo(trip.distance)} KM)
                                      </span>
                                    ))}
                                    {linkedTrips.length > 3 && <span className="text-emerald-500">+{linkedTrips.length - 3} more</span>}
                                 </div>
                               )}
                            </div>
                          )}

                          {exp.odometer && (
                            <div className={`mb-3 text-[9px] font-black ${theme.text} ${theme.lightBg} px-2 py-1 rounded-lg border border-slate-100 w-fit flex items-center gap-1`}>
                              <Gauge size={10} /> Odo: {formatOdo(exp.odometer)} KM
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5">
                              <div className="text-[9px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-slate-100">{exp.date}</div>
                              <div className="text-[9px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-slate-100">
                                  {exp.isFullyDeductible ? 'FULL CLAIM' : 'PRO-RATA'}
                              </div>
                          </div>
                      </div>

                      <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all absolute right-3 top-3">
                          <button onClick={() => handleEdit(exp)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Pencil size={14} /></button>
                          <button onClick={() => setDeleteId(exp.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={14} /></button>
                      </div>
                  </div>
              </motion.div>
            );
          })
        )}
        </div>
      </div>
      
      <AnimatePresence>
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-6 backdrop-blur-md">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-sm border border-slate-100">
            <div className="flex flex-col items-center text-center">
               <div className="bg-red-50 p-5 rounded-full mb-5"><AlertTriangle className="w-10 h-10 text-red-500" /></div>
               <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Record?</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4">
              <button onClick={() => { onDeleteExpense(deleteId); setDeleteId(null); }} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs">Confirm Removal</button>
              <button onClick={() => setDeleteId(null)} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-xs">Retain Record</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
