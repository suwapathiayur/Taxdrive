import React, { useState, useMemo } from 'react';
import { Vehicle, TaxSummary, Trip, Expense } from '../types';
import { Calculator, Download, Sparkles, Calendar, Info, ShieldCheck, Wallet, Car, ChevronRight, CheckCircle2, Handshake, AlertCircle } from 'lucide-react';
import { analyzeTaxEfficiency } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import ExportModal from './ExportModal';

interface TaxReportProps {
  vehicle: Vehicle;
  onUpdateVehicle: (v: Vehicle) => void;
  summary: TaxSummary;
  trips: Trip[];
  expenses: Expense[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(amount);
};

const TaxReport: React.FC<TaxReportProps> = ({ vehicle, onUpdateVehicle, summary, trips, expenses }) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    const insight = await analyzeTaxEfficiency(summary, trips, expenses);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  const depreciationBreakdown = useMemo(() => {
    const totalBasis = vehicle.vehicleValue;
    const rate = vehicle.depreciationRate / 100;
    const totalAnnualDepreciation = totalBasis * rate;
    const businessFactor = summary.businessPercentage / 100;
    const pDate = new Date(vehicle.purchaseDate);
    const today = new Date();
    const yearsElapsed = (today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const isActive = yearsElapsed < 5 && vehicle.isCapitalClaimEnabled !== false;

    return { 
      totalBasis, 
      totalAnnualDepreciation, 
      businessPortion: isActive ? totalAnnualDepreciation * businessFactor : 0, 
      isActive,
      isCapitalClaimDisabled: vehicle.isCapitalClaimEnabled === false
    };
  }, [vehicle, summary.businessPercentage]);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-5">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-100"><Car size={18} /></div>
                {vehicle.name} <span className="text-slate-300 font-bold text-xs">/ {vehicle.registrationNumber}</span>
                {vehicle.isLeased && <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-1 rounded-lg uppercase tracking-widest font-black ml-1 flex items-center gap-1"><Handshake size={10} /> Leased</span>}
            </h2>
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                <Calendar size={14} className="text-emerald-600" /> {vehicle.isLeased ? 'Leased From' : 'Registered'} {vehicle.purchaseDate}
            </div>
        </div>

        {depreciationBreakdown.isCapitalClaimDisabled && (
          <div className="mb-6 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Capital Claims Disabled</p>
              <p className="text-[10px] text-amber-700 font-bold mt-0.5 leading-relaxed">
                Depreciation is currently not being claimed for this vehicle registry. Only running expenses will be apportioned for tax deductions.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                    {vehicle.isLeased ? 'Capitalized Lease Basis' : 'Depreciable Basis'}
                </label>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1 bg-emerald-600 opacity-20"></div>
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500">Total Investment Value</span>
                        <span className="text-base font-black text-slate-900 tracking-tighter">LKR {formatCurrency(depreciationBreakdown.totalBasis)}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 flex items-center gap-1.5 font-bold">
                        <Info size={12} className="text-emerald-400" /> 
                        {vehicle.isLeased ? 'Includes capitalized lease + startup fees.' : 'Includes Purchase + all RMV/Stamp fees.'}
                    </p>
                </div>
            </div>
          </div>
          <div className="space-y-5">
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Annual Allowance Rate</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <input type="number" value={vehicle.depreciationRate} onChange={(e) => onUpdateVehicle({ ...vehicle, depreciationRate: Number(e.target.value) })} className="w-24 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-lg text-slate-800 text-center shadow-sm" />
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">% Per Annum</span>
                        <span className="text-[9px] text-slate-400 font-bold italic">Eligible for {vehicle.isLeased ? 'Finance Lessee' : 'Owner'}</span>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2rem] shadow-2xl p-8 text-white relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-[50px]"></div>
        
        <div className="flex justify-between items-center mb-10 relative">
            <h2 className="text-xl font-black flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              FY Tax Apportionment
            </h2>
            <div className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
                Certified Summary
            </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mb-10 relative">
          <div className="space-y-2">
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">Biz Usage Percentage</div>
            <div className="text-5xl font-black text-emerald-400 tracking-tighter">{summary.businessPercentage.toFixed(1)}<span className="text-xl font-bold ml-1 opacity-50">%</span></div>
            <div className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tight">{summary.businessKm.toLocaleString()} / {summary.totalKm.toLocaleString()} Verified KM</div>
          </div>
          <div className="text-right space-y-2">
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">Net Claimable Deduction</div>
            <div className="text-3xl font-black text-white leading-none tracking-tighter">LKR {formatCurrency(summary.totalClaimable)}</div>
            <div className="text-[10px] text-emerald-400 mt-2 font-bold uppercase tracking-widest">IRD Eligible Basis</div>
          </div>
        </div>

        <div className="space-y-6 border-t border-white/5 pt-8 relative">
          <div className="flex justify-between items-start">
            <div>
                <div className="text-sm font-black text-slate-200 uppercase tracking-tight">Apportioned Run Costs</div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">Fuel + Maintenance + Insurance + {vehicle.isLeased ? 'Lease Interest' : 'Tax'}</div>
            </div>
            <div className="text-right">
                <div className="text-base font-black text-white">LKR {formatCurrency(summary.claimableExpenses)}</div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                    {summary.businessPercentage.toFixed(1)}% of LKR {formatCurrency(summary.totalExpenses)}
                </div>
            </div>
          </div>

          <div className="bg-white/5 p-5 rounded-3xl border border-white/10 space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    {vehicle.isLeased ? 'Lease Capital Allowance' : 'Capital Allowance (Vehicle)'}
                </span>
                {!depreciationBreakdown.isActive ? (
                    <span className="text-amber-400 text-[8px] font-black bg-amber-400/10 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-400/20">
                      {depreciationBreakdown.isCapitalClaimDisabled ? 'Claims Disabled' : '5-Yr Cap Reached'}
                    </span>
                ) : <CheckCircle2 size={16} className="text-emerald-500 opacity-50" />}
             </div>
             
             <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-500 uppercase tracking-tighter">Gross Annual Depreciation</span>
                    <span className="text-slate-300">LKR {formatCurrency(depreciationBreakdown.totalAnnualDepreciation)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/20 p-2 rounded-xl"><Wallet size={16} className="text-emerald-400" /></div>
                        <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Business Portion</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-400 tracking-tighter">LKR {formatCurrency(depreciationBreakdown.businessPortion)}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex justify-between items-center mb-5">
            <h3 className="font-black text-emerald-900 text-sm flex items-center gap-3">
                <div className="bg-emerald-600 p-1.5 rounded-lg text-white shadow-md shadow-emerald-100"><Sparkles size={16} /></div>
                AI Tax Strategy Advisor
            </h3>
            {!aiInsight && !loadingAi && (
                <button onClick={handleGenerateInsight} className="text-[10px] font-black bg-emerald-600 text-white px-5 py-2 rounded-full hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 uppercase tracking-widest flex items-center gap-2">
                    Analyze Data <ChevronRight size={14} />
                </button>
            )}
        </div>
        
        <AnimatePresence mode="wait">
        {loadingAi ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 text-emerald-600 text-[11px] font-black py-6 uppercase tracking-widest">
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                Processing FY {new Date().getFullYear()} Dataset...
            </motion.div>
        ) : aiInsight ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-emerald-900 text-xs font-medium leading-relaxed whitespace-pre-line bg-white/60 p-5 rounded-2xl border border-emerald-100/50 backdrop-blur-sm">
                {aiInsight}
            </motion.div>
        ) : (
            <div className="space-y-2">
                <p className="text-emerald-400 text-[11px] font-bold leading-relaxed max-w-md">
                    Unlock actionable insights tailored to your healthcare professional practice. Our AI evaluates your current logbook to find legitimate deduction opportunities.
                </p>
                {vehicle.isLeased && <p className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter">* AI Note: Lease Interest can be claimed separately from Capital Allowance.</p>}
            </div>
        )}
        </AnimatePresence>
      </div>

      <div className="pt-2">
         <button onClick={() => setIsExportModalOpen(true)} className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] uppercase tracking-[0.2em] text-[10px]">
            <Download size={20} className="text-emerald-400" /> Export FY Compliance Packet
         </button>
      </div>

      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        vehicle={vehicle} 
        summary={summary} 
        trips={trips} 
        expenses={expenses} 
      />
    </div>
  );
};

export default TaxReport;