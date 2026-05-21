import React, { useState } from 'react';
import { MaintenanceRecord, Vehicle } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Calendar, Gauge, Trash2, CheckCircle2, AlertTriangle, PlusCircle, X, Save, Pencil } from 'lucide-react';

interface MaintenanceProps {
  records: MaintenanceRecord[];
  vehicle: Vehicle;
  onAddRecord: (record: MaintenanceRecord) => void;
  onUpdateRecord: (record: MaintenanceRecord) => void;
  onDeleteRecord: (id: string) => void;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

export default function Maintenance({ records, vehicle, onAddRecord, onUpdateRecord, onDeleteRecord }: MaintenanceProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [datePerformed, setDatePerformed] = useState(new Date().toISOString().split('T')[0]);
  const [odometerPerformed, setOdometerPerformed] = useState<string>('');
  const [intervalKm, setIntervalKm] = useState<string>('');
  const [intervalMonths, setIntervalMonths] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const record: MaintenanceRecord = {
      id: editingId || generateId(),
      vehicleId: vehicle.id,
      title,
      datePerformed,
      odometerPerformed: odometerPerformed ? parseFloat(odometerPerformed) : undefined,
      intervalKm: intervalKm ? parseFloat(intervalKm) : undefined,
      intervalMonths: intervalMonths ? parseFloat(intervalMonths) : undefined,
      notes
    };

    if (editingId) {
      onUpdateRecord(record);
      setEditingId(null);
    } else {
      onAddRecord(record);
    }
    
    setShowForm(false);
    setTitle('');
    setOdometerPerformed('');
    setIntervalKm('');
    setIntervalMonths('');
    setNotes('');
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingId(record.id);
    setTitle(record.title);
    setDatePerformed(record.datePerformed);
    setOdometerPerformed(record.odometerPerformed ? record.odometerPerformed.toString() : '');
    setIntervalKm(record.intervalKm ? record.intervalKm.toString() : '');
    setIntervalMonths(record.intervalMonths ? record.intervalMonths.toString() : '');
    setNotes(record.notes || '');
    setShowForm(true);
  };

  const getStatus = (record: MaintenanceRecord) => {
    let kmDue = false;
    let monthsDue = false;
    let nextKm = 0;
    let nextDate: Date | null = null;

    if (record.odometerPerformed && record.intervalKm) {
      nextKm = record.odometerPerformed + record.intervalKm;
      if (vehicle.odometer >= nextKm) kmDue = true;
    }

    if (record.intervalMonths) {
      nextDate = new Date(record.datePerformed);
      nextDate.setMonth(nextDate.getMonth() + record.intervalMonths);
      if (new Date() >= nextDate) monthsDue = true;
    }

    const isDue = kmDue || monthsDue;
    const isWarning = !isDue && ((nextKm > 0 && vehicle.odometer >= nextKm - 500) || (nextDate && new Date().getTime() >= nextDate.getTime() - 14 * 24 * 60 * 60 * 1000));

    return { isDue, isWarning, nextKm, nextDate };
  };

  const sortedRecords = [...records].sort((a, b) => new Date(b.datePerformed).getTime() - new Date(a.datePerformed).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Wrench size={20} /></div>
          Maintenance Schedule
        </h2>
        <button onClick={() => { setShowForm(true); setEditingId(null); setTitle(''); setDatePerformed(new Date().toISOString().split('T')[0]); setOdometerPerformed(''); setIntervalKm(''); setIntervalMonths(''); setNotes(''); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-100 flex items-center gap-2 text-xs uppercase tracking-widest">
          <PlusCircle size={16} /> Add Task
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-black text-slate-800">{editingId ? 'Edit Maintenance Task' : 'New Maintenance Task'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-full"><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Task Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Engine Oil Change" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date Performed</label>
                  <input type="date" required value={datePerformed} onChange={(e) => setDatePerformed(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-700" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Odometer Performed</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={odometerPerformed} onChange={(e) => setOdometerPerformed(e.target.value)} placeholder="e.g. 45000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-700" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KM</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Interval (KM)</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={intervalKm} onChange={(e) => setIntervalKm(e.target.value)} placeholder="e.g. 5000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-700" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KM</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Interval (Months)</label>
                  <input type="number" step="1" value={intervalMonths} onChange={(e) => setIntervalMonths(e.target.value)} placeholder="e.g. 6" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-700" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2 text-xs uppercase tracking-widest mt-2">
                <Save size={16} /> Save Record
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {sortedRecords.length === 0 ? (
          <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">
             <Wrench size={48} className="mx-auto mb-4 opacity-20 text-blue-500" />
             <p className="text-xs font-black uppercase tracking-widest">No maintenance records</p>
          </div>
        ) : (
          sortedRecords.map(record => {
            const { isDue, isWarning, nextKm, nextDate } = getStatus(record);
            return (
              <motion.div layout key={record.id} className={`p-5 rounded-3xl border ${isDue ? 'border-red-200 bg-red-50/30' : isWarning ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 bg-white'} shadow-sm relative group overflow-hidden transition-all`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{record.title}</h3>
                    <div className="text-xs font-bold text-slate-500 mt-1">Last done: {record.datePerformed} {record.odometerPerformed ? `at ${record.odometerPerformed.toLocaleString()} KM` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDue && <div className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest"><AlertTriangle size={12}/> Due Now</div>}
                    {!isDue && isWarning && <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest"><AlertTriangle size={12}/> Due Soon</div>}
                    {!isDue && !isWarning && <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest"><CheckCircle2 size={12}/> Good</div>}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {nextKm > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                      <Gauge size={14} className="text-blue-500" />
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Due (KM)</div>
                        <div className="text-sm font-bold text-slate-700">{nextKm.toLocaleString()} KM</div>
                      </div>
                    </div>
                  )}
                  {nextDate && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                      <Calendar size={14} className="text-blue-500" />
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Due (Date)</div>
                        <div className="text-sm font-bold text-slate-700">{nextDate.toISOString().split('T')[0]}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => handleEdit(record)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm bg-white border border-slate-100"><Pencil size={14}/></button>
                  <button onClick={() => setDeleteId(record.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl shadow-sm bg-white border border-slate-100"><Trash2 size={14}/></button>
                </div>
              </motion.div>
            );
          })
        )}
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
              <button onClick={() => { onDeleteRecord(deleteId); setDeleteId(null); }} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs">Confirm Removal</button>
              <button onClick={() => setDeleteId(null)} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-xs">Retain Record</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
