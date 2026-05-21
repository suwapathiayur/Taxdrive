const fs = require('fs');

let content = fs.readFileSync('components/ExpenseTracker.tsx', 'utf-8');

// 1. Update imports
content = content.replace("import { Expense, Trip, EXPENSE_CATEGORIES } from '../types';", 
"import { Expense, Trip, EXPENSE_CATEGORIES, MaintenanceRecord } from '../types';");

// 2. Update props
content = content.replace("onDeleteExpense: (id: string) => void;", 
"onDeleteExpense: (id: string) => void;\n  onAddMaintenanceRecord?: (record: MaintenanceRecord) => void;");

content = content.replace("onDeleteExpense, vehicleId }: ExpenseTrackerProps", 
"onDeleteExpense, vehicleId, onAddMaintenanceRecord }: ExpenseTrackerProps");

// 3. Add states
content = content.replace("const [tripIds, setTripIds] = useState<string[]>([]);", 
`const [tripIds, setTripIds] = useState<string[]>([]);
  const [addMaintenance, setAddMaintenance] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [intervalKm, setIntervalKm] = useState('');
  const [intervalMonths, setIntervalMonths] = useState('');`);

// 4. Update data in handleSubmit
content = content.replace(
  "const data = isEdit ? editForm : { amount, category, date, merchant, description, liters, pricePerLiter, odometer: odoAtService, skipOdo, tripIds };",
  "const data = isEdit ? editForm : { amount, category, date, merchant, description, liters, pricePerLiter, odometer: odoAtService, skipOdo, tripIds, addMaintenance, maintenanceTitle, intervalKm, intervalMonths };"
);

// 5. Update submit logic
const submitLogicOld = `
    if (isEdit) {
      onUpdateExpense(expenseData);
      cancelEdit();
    } else {
      onAddExpense(expenseData);
      setAmount('');
      setMerchant('');
      setDescription('');
      setLiters('');
      setPricePerLiter('');
      setOdoAtService('');
      setSkipOdo(false);
      setTripIds([]);
    }
`;

const submitLogicNew = `
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
`;

content = content.replace(submitLogicOld, submitLogicNew);

// 6. Update renderFormFields arguments
content = content.replace(
  "{ date, category, amount, liters, pricePerLiter, odometer: odoAtService, skipOdo, merchant, description, tripIds },",
  "{ date, category, amount, liters, pricePerLiter, odometer: odoAtService, skipOdo, merchant, description, tripIds, addMaintenance, maintenanceTitle, intervalKm, intervalMonths, isEdit: false },"
);

content = content.replace(
  "if (upd.tripIds !== undefined) setTripIds(upd.tripIds);",
  `if (upd.tripIds !== undefined) setTripIds(upd.tripIds);
              if (upd.addMaintenance !== undefined) setAddMaintenance(upd.addMaintenance);
              if (upd.maintenanceTitle !== undefined) setMaintenanceTitle(upd.maintenanceTitle);
              if (upd.intervalKm !== undefined) setIntervalKm(upd.intervalKm);
              if (upd.intervalMonths !== undefined) setIntervalMonths(upd.intervalMonths);`
);

content = content.replace(
  "renderFormFields(editForm, setEditForm)",
  "renderFormFields({ ...editForm, isEdit: true }, setEditForm)"
);

// 7. Add UI for maintenance reminder inside renderFormFields (in service category block)
const serviceBlockOld = `
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
`;

const serviceBlockNew = `
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
                    <div className={\`w-4 h-4 rounded border transition-colors flex items-center justify-center \${formData.addMaintenance ? 'bg-blue-600 border-blue-600' : 'bg-white border-blue-200'}\`}>
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
`;

content = content.replace(serviceBlockOld, serviceBlockNew);

fs.writeFileSync('components/ExpenseTracker.tsx', content);

