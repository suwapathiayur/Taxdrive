import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trip, TripType, Expense } from '../types';
import { Trash2, Pencil, X, AlertTriangle, ArrowRight, Gauge, History, PlusCircle, Navigation, Save, Plus, Droplet, MinusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as db from '../services/db';

interface TripLogProps {
  trips: Trip[];
  expenses: Expense[];
  onAddTrip: (trip: Trip) => void;
  onUpdateTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onUpdateExpense: (expense: Expense) => void;
  vehicleId: string;
  lastOdometer: number;
}

const INITIAL_PURPOSES = [
  "Clinic Visit", 
  "Hospital Rounds", 
  "Home Visit", 
  "Travel", 
  "Garage", 
  "Service", 
  "Family"
];

const formatOdo = (val: number) => {
  return val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const formatLiters = (val: number) => {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

const TripLog: React.FC<TripLogProps> = ({ trips, expenses, onAddTrip, onUpdateTrip, onDeleteTrip, onUpdateExpense, vehicleId, lastOdometer }) => {
  // Purpose state
  const [basePurposes, setBasePurposes] = useState<string[]>(INITIAL_PURPOSES);
  const [customPurposes, setCustomPurposes] = useState<string[]>([]);
  const [suppressedPurposes, setSuppressedPurposes] = useState<string[]>([]);
  const [showNewPurposeInput, setShowNewPurposeInput] = useState(false);
  const [newPurposeName, setNewPurposeName] = useState('');
  const [isEditPurposesMode, setIsEditPurposesMode] = useState(false);

  // Timer for long press
  const pressTimerRef = useRef<any>(null);

  // Load saved purposes from DB
  useEffect(() => {
    Promise.all([
      db.getSuppressedPurposes(),
      db.getCustomPurposes()
    ]).then(([suppressed, custom]) => {
      setSuppressedPurposes(suppressed);
      setCustomPurposes(custom);
    });
  }, []);

  // Combined list for chips based on base + custom + history
  const purposeSuggestions = useMemo(() => {
    const historical = trips
      .map(t => t.purpose?.trim())
      .filter((p): p is string => !!p);
    
    const merged = Array.from(new Set([...basePurposes, ...customPurposes, ...historical]));
    return merged.filter(p => !suppressedPurposes.includes(p));
  }, [trips, basePurposes, customPurposes, suppressedPurposes]);

  // Filtering for the logs list
  const [activeFilter, setActiveFilter] = useState<'All' | TripType>('All');

  // New Trip form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TripType>(TripType.BUSINESS);
  const [startKm, setStartKm] = useState<string>('');
  const [endKm, setEndKm] = useState<string>('');
  const [formDistance, setFormDistance] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [details, setDetails] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Auto-set startKm based on latest trip log
  useEffect(() => {
    if (trips.length > 0) {
      const sorted = [...trips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
      const lastTrip = sorted[0];
      setStartKm(lastTrip.endKm.toFixed(1));
    } else {
      setStartKm(lastOdometer.toFixed(1));
    }
  }, [trips, lastOdometer]);

  const handleAddCustomPurpose = (activeData: any, onDataChange: (upd: any) => void) => {
    const pName = newPurposeName.trim();
    if (!pName) return;

    // 1. Persist as custom purpose if new
    if (!customPurposes.includes(pName) && !basePurposes.includes(pName)) {
      const newList = [...customPurposes, pName];
      setCustomPurposes(newList);
      db.saveCustomPurposes(newList);
    }

    // 2. Un-suppress if previously deleted
    if (suppressedPurposes.includes(pName)) {
      const newList = suppressedPurposes.filter(p => p !== pName);
      setSuppressedPurposes(newList);
      db.saveSuppressedPurposes(newList);
    }

    // 3. Select it for the current form
    onDataChange({ ...activeData, purpose: pName });
    
    // 4. Reset input
    setNewPurposeName('');
    setShowNewPurposeInput(false);
  };

  const toggleEditPurposes = () => {
    setIsEditPurposesMode(!isEditPurposesMode);
    if (!isEditPurposesMode) setShowNewPurposeInput(true);
  };

  const suppressPurpose = (pName: string) => {
    const newList = [...suppressedPurposes, pName];
    setSuppressedPurposes(newList);
    db.saveSuppressedPurposes(newList);
    
    // Clear selection if active
    if (purpose === pName) setPurpose('');
    if (editForm && editForm.purpose === pName) setEditForm({ ...editForm, purpose: '' });
  };

  const handleEdit = (trip: Trip) => {
    setEditForm({
      id: trip.id,
      date: trip.date,
      type: trip.type,
      startKm: trip.startKm.toFixed(1),
      endKm: trip.endKm.toFixed(1),
      distance: trip.distance.toFixed(1),
      purpose: trip.purpose,
      details: trip.details || ''
    });
    setEditingId(trip.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSubmit = (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    const data = isEdit ? editForm : { date, type, startKm, endKm, distance: formDistance, purpose, details };
    
    const s = parseFloat(data.startKm);
    const eKmVal = parseFloat(data.endKm);

    if (!isNaN(s) && !isNaN(eKmVal) && eKmVal <= s) {
      const target = e.currentTarget as HTMLFormElement;
      const endInput = target.querySelector('input[placeholder="End"]') as HTMLInputElement;
      if (endInput) {
        endInput.setCustomValidity("please fill with valid value");
        endInput.reportValidity();
        return;
      }
    }

    const sVal = parseFloat(parseFloat(data.startKm).toFixed(1)) || 0;
    const distVal = parseFloat(parseFloat(data.distance).toFixed(1)) || 0;
    const eKmValFinal = parseFloat(parseFloat(data.endKm).toFixed(1)) || (sVal + distVal);

    const tripData: Trip = {
      id: isEdit ? editingId! : generateId(),
      vehicleId,
      date: data.date,
      startKm: sVal,
      endKm: eKmValFinal,
      distance: distVal,
      purpose: data.purpose,
      type: data.type,
      details: data.details
    };

    if (isEdit) {
      onUpdateTrip(tripData);
      cancelEdit();
    } else {
      onAddTrip(tripData);
      setEndKm('');
      setFormDistance('');
      setPurpose('');
      setDetails('');
    }
  };

  const filteredSortedTrips = useMemo(() => {
    let list = [...trips];
    if (activeFilter !== 'All') {
      list = list.filter(t => t.type === activeFilter);
    }
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [trips, activeFilter]);

  const renderFormFields = (data: any, onChange: (upd: any) => void) => {
    const isPersonal = data.type === TripType.PERSONAL;
    const themeColor = isPersonal ? 'indigo' : 'emerald';
    const normalizedPurpose = (data.purpose || '').trim().toLowerCase();
    const isSharedUsage = normalizedPurpose === 'garage' || normalizedPurpose === 'service';

    const handleDistanceChange = (newDistStr: string) => {
        const d = parseFloat(newDistStr);
        const s = parseFloat(data.startKm);
        const updates: any = { distance: newDistStr };
        if (!isNaN(d) && !isNaN(s)) {
            updates.endKm = (s + d).toFixed(1);
        }
        onChange({ ...data, ...updates });
    };

    const handleOdoChange = (field: 'startKm' | 'endKm', val: string) => {
        const updates: any = { [field]: val };
        const s = parseFloat(field === 'startKm' ? val : data.startKm);
        const e = parseFloat(field === 'endKm' ? val : data.endKm);
        if (!isNaN(s) && !isNaN(e)) {
            const diff = e - s;
            if (diff >= 0) {
                updates.distance = diff.toFixed(1);
            }
        }
        onChange({ ...data, ...updates });
    };

    const onChipPointerDown = (pName: string) => {
      if (!isEditPurposesMode) return;
      pressTimerRef.current = setTimeout(() => {
        suppressPurpose(pName);
        pressTimerRef.current = null;
      }, 500);
    };

    const onChipPointerUp = () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    };

    const handleChipClick = (p: string) => {
      if (isEditPurposesMode) return; 
      onChange({...data, purpose: p});
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Trip Date</label>
            <input 
              type="date" 
              value={data.date} 
              onChange={(e) => onChange({...data, date: e.target.value})} 
              className={`w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-${themeColor}-500 outline-none font-bold text-sm transition-all text-slate-700`} 
              required 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Usage Classification</label>
            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
              <button 
                type="button" 
                onClick={() => !isSharedUsage && onChange({...data, type: TripType.BUSINESS})} 
                disabled={isSharedUsage}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${data.type === TripType.BUSINESS ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400'} ${isSharedUsage ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Clinical
              </button>
              <button 
                type="button" 
                onClick={() => !isSharedUsage && onChange({...data, type: TripType.PERSONAL})} 
                disabled={isSharedUsage}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${data.type === TripType.PERSONAL ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400'} ${isSharedUsage ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Personal
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 mb-0.5">
              <Gauge className={`w-3.5 h-3.5 ${isPersonal ? 'text-indigo-600' : 'text-emerald-600'}`} />
              <span className={`text-[10px] font-black text-slate-700 uppercase tracking-widest`}>Odometer Tracking</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={`block text-[10px] font-black text-slate-400 ml-1 uppercase`}>Starting (KM)</label>
                <input 
                  type="text" 
                  inputMode="decimal" 
                  step="0.1"
                  value={data.startKm} 
                  onChange={(e) => handleOdoChange('startKm', e.target.value)} 
                  className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none transition-all`} 
                  placeholder="Start" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className={`block text-[10px] font-black text-slate-400 ml-1 uppercase`}>Ending (KM)</label>
                <input 
                  type="text" 
                  inputMode="decimal" 
                  step="0.1"
                  value={data.endKm} 
                  onChange={(e) => handleOdoChange('endKm', e.target.value)} 
                  className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-sm focus:ring-2 focus:ring-${themeColor}-500 outline-none transition-all`} 
                  placeholder="End" 
                  required
                />
              </div>
          </div>
          <div className={`flex items-center justify-between ${isPersonal ? 'bg-indigo-600 shadow-indigo-100' : 'bg-emerald-600 shadow-emerald-100'} p-3 rounded-xl shadow-lg`}>
            <div className="flex flex-col">
              <span className={`text-[9px] font-black ${isPersonal ? 'text-indigo-200' : 'text-emerald-200'} uppercase tracking-widest`}>Traveled Distance</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <input 
                  type="text" 
                  value={data.distance} 
                  onChange={(e) => handleDistanceChange(e.target.value)} 
                  className="bg-transparent text-xl font-black text-white focus:outline-none w-24" 
                  placeholder="0.0" 
                />
                <span className={`text-[10px] font-bold ${isPersonal ? 'text-indigo-300' : 'text-emerald-300'}`}>KM</span>
              </div>
            </div>
            <ArrowRight size={18} className={`${isPersonal ? 'text-indigo-300' : 'text-emerald-300'} opacity-50`} />
          </div>
        </div>

        <div className="space-y-5">
           <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose of Visit</label>
                <button 
                  type="button" 
                  onClick={toggleEditPurposes} 
                  className={`p-1.5 transition-all rounded-lg flex items-center gap-1.5 shadow-sm ${isEditPurposesMode ? 'bg-red-50 text-red-600 px-3' : (isPersonal ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600')} hover:text-white`}
                >
                  {isEditPurposesMode ? <><X size={14} /><span className="text-[9px] font-black uppercase">Done</span></> : <Plus size={14} />}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                 <AnimatePresence>
                 {purposeSuggestions.map(p => (
                     <motion.button 
                       key={p} 
                       type="button" 
                       layout
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={{ 
                         opacity: 1, 
                         scale: 1,
                         rotate: isEditPurposesMode ? [0, -1, 0, 1, 0] : 0,
                         transition: isEditPurposesMode ? { repeat: Infinity, duration: 0.2 } : { duration: 0.2 }
                       }}
                       exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                       onPointerDown={() => onChipPointerDown(p)}
                       onPointerUp={onChipPointerUp}
                       onPointerLeave={onChipPointerUp}
                       onClick={() => handleChipClick(p)} 
                       className={`whitespace-nowrap text-[9px] font-black px-3 py-2 rounded-xl border transition-all select-none touch-none flex items-center gap-2 ${data.purpose === p ? (isPersonal ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-emerald-600 text-white border-emerald-600 shadow-md') : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'} ${isEditPurposesMode ? 'border-red-200 ring-2 ring-red-50' : ''}`}
                     >
                       {isEditPurposesMode && <MinusCircle size={10} className="text-red-500" />}
                       {p}
                     </motion.button>
                 ))}
                 </AnimatePresence>
              </div>
              
              <AnimatePresence>
                {(showNewPurposeInput || isEditPurposesMode) && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex gap-2 mb-4 pt-2">
                    <input 
                      type="text" 
                      autoFocus 
                      value={newPurposeName} 
                      onChange={(e) => setNewPurposeName(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPurpose(data, onChange)} 
                      className={`flex-grow p-3 bg-white border ${isPersonal ? 'border-indigo-200' : 'border-emerald-200'} rounded-xl outline-none text-sm font-bold shadow-sm text-slate-700`} 
                      placeholder="Add custom purpose..." 
                    />
                    <button 
                      type="button" 
                      onClick={() => handleAddCustomPurpose(data, onChange)} 
                      className={`px-4 py-2 ${isPersonal ? 'bg-indigo-600' : 'bg-emerald-600'} text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-md active:scale-95`}
                    >
                      Add
                    </button>
                    {showNewPurposeInput && !isEditPurposesMode && (
                      <button type="button" onClick={() => setShowNewPurposeInput(false)} className="px-4 py-2 bg-slate-100 text-slate-400 font-black rounded-xl text-xs uppercase tracking-widest">Cancel</button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
           
           <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Additional Descriptions</label>
              <textarea 
                value={data.details} 
                onChange={(e) => onChange({...data, details: e.target.value})} 
                className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-${themeColor}-500 outline-none text-sm font-bold h-24 placeholder:text-slate-300 text-slate-700 transition-all`} 
                placeholder="Notes about patients, case IDs, or special trip details..."
              ></textarea>
           </div>
        </div>
      </div>
    );
  };

  const isPersonalActive = type === TripType.PERSONAL;
  const editIsPersonal = editForm?.type === TripType.PERSONAL;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl shadow-sm border p-6 bg-white border-slate-100">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-500"><Navigation size={20} /></div>
              Capture New Log
            </h2>
        </div>
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {renderFormFields(
            { date, type, startKm, endKm, distance: formDistance, purpose, details },
            (upd) => {
              if (upd.date !== undefined) setDate(upd.date);
              if (upd.type !== undefined) setType(upd.type);
              if (upd.startKm !== undefined) setStartKm(upd.startKm);
              if (upd.endKm !== undefined) setEndKm(upd.endKm);
              if (upd.distance !== undefined) setFormDistance(upd.distance);
              if (upd.purpose !== undefined) setPurpose(upd.purpose);
              if (upd.details !== undefined) setDetails(upd.details);
            }
          )}
          <button 
            type="submit" 
            className={`w-full py-5 ${isPersonalActive ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'} text-white font-black rounded-3xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] text-xs uppercase tracking-widest`}
          >
             <PlusCircle size={18} /> Commit Log Entry
          </button>
        </form>
      </div>

      <AnimatePresence>
        {editingId && editForm && (
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xl border border-slate-100 relative">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${editIsPersonal ? 'bg-indigo-600' : 'bg-emerald-600'} text-white shadow-lg transition-colors`}><Pencil size={20} /></div>
                    Modify Movement
                  </h2>
                  <button onClick={cancelEdit} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
              </div>
              <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
                {renderFormFields(editForm, setEditForm)}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button type="button" onClick={cancelEdit} className="py-4 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-50 transition-all">Discard</button>
                  <button 
                    type="submit" 
                    className={`py-4 ${editIsPersonal ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'} text-white font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] text-xs uppercase tracking-widest`}
                  >
                    <Save size={18} /> Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-4 pt-4 px-2">
        <div className="sticky top-[108px] bg-slate-50/95 py-3 z-20 backdrop-blur-md px-2 border-b border-slate-200/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 flex items-center gap-2 px-2"><History size={14} className="text-emerald-500" /> Logged Movements</h3>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2">
                {['All', TripType.BUSINESS, TripType.PERSONAL].map(opt => (
                    <button key={opt} onClick={() => setActiveFilter(opt as any)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeFilter === opt ? (opt === TripType.PERSONAL ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100') : 'bg-white text-slate-500 border-slate-100'}`}>{opt === TripType.BUSINESS ? 'Clinical' : opt}</button>
                ))}
            </div>
        </div>
        <div className="space-y-3 mt-4">
          {filteredSortedTrips.length === 0 ? (
            <div className="text-center py-20 text-slate-300">
               <Navigation size={48} className="mx-auto mb-4 opacity-10" />
               <p className="text-xs font-black uppercase tracking-widest">No matching movements</p>
            </div>
          ) : (
            filteredSortedTrips.map((trip) => {
              const linkedFuelExpenses = expenses.filter(e => e.category === 'Fuel' && (e.tripId === trip.id || (e.tripIds || []).includes(trip.id)));
              const totalLinkedLiters = linkedFuelExpenses.reduce((acc, e) => acc + (e.liters || 0), 0);
              const consumptionRate = totalLinkedLiters > 0 
                ? (trip.distance / totalLinkedLiters).toFixed(2) 
                : null;
              const normalizedPurpose = (trip.purpose || '').trim().toLowerCase();
              const isSharedUsage = normalizedPurpose === 'garage' || normalizedPurpose === 'service';
              const badgeSize = isSharedUsage ? 'w-12 h-12' : 'min-w-[3.5rem] w-fit px-3 h-12';
              const badgeStyle = isSharedUsage
                ? 'bg-slate-200 text-slate-700 shadow-slate-100 rounded-md'
                : trip.type === TripType.BUSINESS
                  ? 'bg-emerald-600 text-white shadow-emerald-100 rounded-2xl'
                  : 'bg-indigo-600 text-white shadow-indigo-100 rounded-2xl';

              return (
                <motion.div layout key={trip.id} className="p-5 rounded-3xl border bg-white border-slate-100 hover:border-slate-200 shadow-sm relative group transition-all">
                  <div className="flex gap-5 items-start">
                      <div className={`flex-shrink-0 ${badgeSize} flex flex-col items-center justify-center shadow-lg transition-all ${badgeStyle}`}>
                        <span className="text-base font-black leading-none whitespace-nowrap">{formatOdo(trip.distance)}</span>
                        <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5 opacity-80">KM</span>
                      </div>

                      <div className="flex-grow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{trip.details ? trip.details : trip.purpose}</h3>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">SHARED USAGE</div>
                          </div>
                          
                          {linkedFuelExpenses.length > 0 && (
                            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-100 shadow-sm shrink-0">
                               <Droplet size={12} className="text-emerald-600" />
                               <div className="text-xs font-black text-emerald-900">
                                 {totalLinkedLiters ? formatLiters(totalLinkedLiters) : '0.00'} L
                                 {consumptionRate && <span className="text-[10px] text-emerald-500 ml-1.5 font-bold">({consumptionRate} km/L)</span>}
                               </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center flex-wrap gap-4 mb-4">
                          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100 w-fit">
                            <div className="space-y-0.5">
                              <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">START</div>
                              <div className="text-xs font-black text-slate-700">{formatOdo(trip.startKm)}</div>
                            </div>
                            <ArrowRight size={12} className="text-slate-300 mt-1" />
                            <div className="space-y-0.5">
                              <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">END</div>
                              <div className="text-xs font-black text-slate-700">{formatOdo(trip.endKm)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <div className="text-[9px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-slate-100">{trip.date}</div>
                          {trip.details && (
                            <div className="text-[9px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-slate-100 max-w-[150px] truncate">
                               {trip.purpose}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all absolute right-3 top-3">
                        <button onClick={() => handleEdit(trip)} className={`p-2.5 rounded-xl transition-all shadow-sm ${trip.type === TripType.PERSONAL ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}><Pencil size={14} /></button>
                        <button onClick={() => setDeleteId(trip.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={14} /></button>
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
               <h3 className="text-2xl font-black text-slate-900 mb-2">Discard Entry?</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4">
              <button onClick={() => { onDeleteTrip(deleteId); setDeleteId(null); }} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs">Confirm Deletion</button>
              <button onClick={() => setDeleteId(null)} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-xs">Keep Movement</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default TripLog;
