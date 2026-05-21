import React, { useMemo } from 'react';
import { TaxSummary, Trip, TripType, Expense, EXPENSE_CATEGORIES } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
// Added missing Receipt icon to imports
import { Car, Wallet, Percent, Activity, Droplet, TrendingUp, TrendingDown, Info, ShieldCheck, PieChart as PieIcon, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardProps {
  summary: TaxSummary;
  trips: Trip[];
  expenses: Expense[];
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-LK', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    }).format(val);
};

// Qualitative color palette for multi-category charts
const CHART_COLORS = [
  '#059669', // Emerald
  '#4f46e5', // Indigo
  '#d97706', // Amber
  '#e11d48', // Rose
  '#0891b2', // Cyan
  '#7c3aed', // Violet
  '#2563eb', // Blue
  '#475569', // Slate
];

const Dashboard: React.FC<DashboardProps> = ({ summary, trips, expenses }) => {
  const bizPersonalData = [
    { name: 'Business', value: summary.businessKm, color: '#059669' }, // Emerald 600
    { name: 'Personal', value: summary.personalKm, color: '#4f46e5' }, // Indigo 600
  ];

  // Logic for Expense Categories
  const expenseCategoryData = useMemo(() => {
    const data = EXPENSE_CATEGORIES.map(cat => {
      const total = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
      return { name: cat, value: total };
    }).filter(item => item.value > 0);
    return data.sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Logic for Trip Purposes
  const tripPurposeData = useMemo(() => {
    const purposeMap = new Map<string, number>();
    trips.forEach(t => {
      purposeMap.set(t.purpose, (purposeMap.get(t.purpose) || 0) + 1);
    });
    const data = Array.from(purposeMap.entries()).map(([name, value]) => ({ name, value }));
    return data.sort((a, b) => b.value - a.value).slice(0, 8); // Top 8 purposes
  }, [trips]);

  const efficiencyTrend = useMemo(() => {
    const fuelEntries = expenses
      .filter(e => e.category === 'Fuel' && e.liters && e.liters > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (fuelEntries.length < 2) return null;

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const getEfficiencyForExpenses = (exps: Expense[]) => {
      if (exps.length === 0) return 0;
      const totalLiters = exps.reduce((acc, e) => acc + (e.liters || 0), 0);
      const linkedTripIds = exps.flatMap(e => (e.tripIds && e.tripIds.length > 0 ? e.tripIds : (e.tripId ? [e.tripId] : [])));
      const uniqueLinkedTripIds = Array.from(new Set(linkedTripIds));
      const totalKm = trips.filter(t => uniqueLinkedTripIds.includes(t.id)).reduce((acc, t) => acc + t.distance, 0);
      return totalLiters > 0 ? totalKm / totalLiters : 0;
    };

    const eff1 = getEfficiencyForExpenses(fuelEntries.filter(e => new Date(e.date) >= thirtyDaysAgo));
    const eff2 = getEfficiencyForExpenses(fuelEntries.filter(e => new Date(e.date) >= sixtyDaysAgo && new Date(e.date) < thirtyDaysAgo));

    if (eff1 > 0 && eff2 > 0) return { diff: eff1 - eff2, improved: eff1 > eff2 };
    return null;
  }, [expenses, trips]);

  const lineData = useMemo(() => {
    const sharedPurposes = new Set(['garage', 'service']);
    const grouped = trips.reduce((acc, trip) => {
      if (!acc[trip.date]) acc[trip.date] = { date: trip.date, business: 0, personal: 0 };
      const normalizedPurpose = (trip.purpose || '').trim().toLowerCase();
      if (sharedPurposes.has(normalizedPurpose)) {
        const half = trip.distance / 2;
        acc[trip.date].business += half;
        acc[trip.date].personal += half;
        return acc;
      }
      if (trip.type === TripType.BUSINESS) acc[trip.date].business += trip.distance;
      else acc[trip.date].personal += trip.distance;
      return acc;
    }, {} as Record<string, { date: string, business: number, personal: number }>);

    // Added explicit type cast to resolve 'Property date does not exist on type unknown' error
    return (Object.values(grouped) as { date: string, business: number, personal: number }[]).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trips]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
            <Car className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Distance</div>
          <div className="text-xl font-black text-slate-900">{summary.totalKm.toLocaleString()} <span className="text-[10px] font-bold text-slate-300">KM</span></div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
            <Percent className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Business Utilization</div>
          <div className="text-xl font-black text-emerald-600">{summary.businessPercentage.toFixed(1)}%</div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <div className="bg-teal-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
            <Wallet className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Annual Expenses</div>
          <div className="text-lg font-black text-slate-900 leading-tight tracking-tight">LKR {formatCurrency(summary.totalExpenses)}</div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
          <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
            <Droplet className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Fuel Efficiency</div>
          <div className="flex items-end gap-2">
            <div className="text-xl font-black text-blue-600">
              {summary.fuelEfficiency > 0 ? summary.fuelEfficiency.toFixed(1) : '-'} <span className="text-[10px] font-bold">km/L</span>
            </div>
            {efficiencyTrend && (
               <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black mb-1 ${efficiencyTrend.improved ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {efficiencyTrend.improved ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(efficiencyTrend.diff).toFixed(1)}
               </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-80">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Mileage Proportion</h3>
             <Info size={14} className="text-slate-300" />
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={bizPersonalData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                {bizPersonalData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-80">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" /> Activity Log
              </h3>
           </div>
           <ResponsiveContainer width="100%" height="90%">
             <LineChart data={lineData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="date" tickFormatter={formatDate} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
               <YAxis tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
               <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} labelFormatter={formatDate} />
               <Line type="monotone" dataKey="business" name="Biz" stroke="#059669" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 3 }} />
               <Line type="monotone" dataKey="personal" name="Priv" stroke="#4f46e5" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 3 }} />
             </LineChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* New Small Analytical Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-80">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" /> Expense Distribution
             </h3>
             <PieIcon size={14} className="text-slate-300" />
          </div>
          {expenseCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={expenseCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                  {expenseCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => `LKR ${formatCurrency(val)}`}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} 
                />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
               <Receipt size={40} className="mb-2 opacity-10" />
               <p className="text-[10px] font-black uppercase tracking-widest">No spending recorded</p>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-80">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-600" /> Movement Frequency
              </h3>
           </div>
           {tripPurposeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={tripPurposeData} cx="50%" cy="50%" outerRadius={75} dataKey="value" stroke="none">
                  {tripPurposeData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => `${val} Trips`}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} 
                />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
           ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
               <Car size={40} className="mb-2 opacity-10" />
               <p className="text-[10px] font-black uppercase tracking-widest">No movements logged</p>
            </div>
           )}
        </motion.div>
      </div>

      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200 flex flex-col sm:flex-row gap-5 items-center justify-between border border-slate-800">
        <div className="flex items-center gap-4">
            <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/30">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-black text-lg tracking-tight">Compliance Readiness</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Tax Method: <span className="text-white">Actual Mileage Basis</span>
              </p>
            </div>
        </div>
        <div className="bg-slate-800 px-5 py-3 rounded-2xl border border-slate-700 text-center sm:text-left min-w-[140px]">
            <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Claimable Ratio</div>
            <div className="text-2xl font-black text-emerald-400">{summary.businessPercentage.toFixed(1)}%</div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
