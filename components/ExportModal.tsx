import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Square, Download, FileText, TrendingUp, Receipt, ShieldCheck } from 'lucide-react';
import { Vehicle, TaxSummary, Trip, Expense } from '../types';
import { exportData } from '../services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  summary: TaxSummary;
  trips: Trip[];
  expenses: Expense[];
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, vehicle, summary, trips, expenses }) => {
  const [selections, setSelections] = useState({
    trips: true,
    expenses: true,
    compliance: true
  });

  // Scroll lock implementation for ExportModal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const toggleSelection = (key: keyof typeof selections) => {
    setSelections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    // Fix: Pass both 'trips' and 'expenses' to satisfy the Type signature of exportData
    if (selections.trips) exportData('trips', { trips, expenses });
    if (selections.expenses) exportData('expenses', { trips, expenses });
    if (selections.compliance) exportData('compliance', { vehicle, summary, trips, expenses });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-6 backdrop-blur-md">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-md border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Export FY Records</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
        </div>

        <div className="space-y-4 mb-8">
          <button onClick={() => toggleSelection('trips')} className={`w-full flex items-center gap-4 p-5 rounded-3xl border transition-all ${selections.trips ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`p-2 rounded-xl ${selections.trips ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              <TrendingUp size={20} />
            </div>
            <div className="text-left flex-grow">
              <div className={`text-sm font-black ${selections.trips ? 'text-emerald-900' : 'text-slate-600'}`}>Archived Movements</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{trips.length} Trip Logs</div>
            </div>
            {selections.trips ? <CheckSquare className="text-emerald-600" /> : <Square className="text-slate-300" />}
          </button>

          <button onClick={() => toggleSelection('expenses')} className={`w-full flex items-center gap-4 p-5 rounded-3xl border transition-all ${selections.expenses ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`p-2 rounded-xl ${selections.expenses ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              <Receipt size={20} />
            </div>
            <div className="text-left flex-grow">
              <div className={`text-sm font-black ${selections.expenses ? 'text-emerald-900' : 'text-slate-600'}`}>Transaction Journal</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{expenses.length} Expense Logs</div>
            </div>
            {selections.expenses ? <CheckSquare className="text-emerald-600" /> : <Square className="text-slate-300" />}
          </button>

          <button onClick={() => toggleSelection('compliance')} className={`w-full flex items-center gap-4 p-5 rounded-3xl border transition-all ${selections.compliance ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`p-2 rounded-xl ${selections.compliance ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              <ShieldCheck size={20} />
            </div>
            <div className="text-left flex-grow">
              <div className={`text-sm font-black ${selections.compliance ? 'text-emerald-900' : 'text-slate-600'}`}>FY Compliance Packet</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Consolidated Tax Report</div>
            </div>
            {selections.compliance ? <CheckSquare className="text-emerald-600" /> : <Square className="text-slate-300" />}
          </button>
        </div>

        <button 
          onClick={handleExport}
          disabled={!selections.trips && !selections.expenses && !selections.compliance}
          className="w-full py-5 bg-slate-900 hover:bg-black text-white font-black rounded-3xl transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={20} className="text-emerald-400" /> Generate Selected Files
        </button>
      </motion.div>
    </div>
  );
};

export default ExportModal;
