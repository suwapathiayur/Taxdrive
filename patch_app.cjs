const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf-8');

// 1. imports
content = content.replace(
  "import { Trip, Expense, Vehicle, TaxSummary, TripType } from './types';",
  "import { Trip, Expense, Vehicle, TaxSummary, TripType, MaintenanceRecord } from './types';"
);

content = content.replace(
  "import TaxReport from './components/TaxReport';",
  "import TaxReport from './components/TaxReport';\nimport Maintenance from './components/Maintenance';"
);

content = content.replace(
  "LayoutDashboard, Car, Receipt, FileText, ChevronDown, Loader2, Plus, X, Pencil, Trash2, AlertTriangle, Calculator, Gavel, FileSignature, Settings2, UploadCloud",
  "LayoutDashboard, Car, Receipt, FileText, ChevronDown, Loader2, Plus, X, Pencil, Trash2, AlertTriangle, Calculator, Gavel, FileSignature, Settings2, UploadCloud, Wrench"
);

// 2. TABS & states
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'dashboard' | 'trips' | 'expenses' | 'report'>('dashboard');",
  "const [activeTab, setActiveTab] = useState<'dashboard' | 'trips' | 'expenses' | 'maintenance' | 'report'>('dashboard');"
);

content = content.replace(
  "const TABS = ['dashboard', 'trips', 'expenses', 'report'] as const;",
  "const TABS = ['dashboard', 'trips', 'expenses', 'maintenance', 'report'] as const;"
);

content = content.replace(
  "const [expenses, setExpenses] = useState<Expense[]>([]);",
  "const [expenses, setExpenses] = useState<Expense[]>([]);\n  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);"
);

// 3. loading
content = content.replace(
  "db.getVehicles(),",
  "db.getVehicles(),\n        db.getMaintenanceRecords(),"
);

content = content.replace(
  "const [loadedTrips, loadedExpenses, loadedVehicles, appSettings] = await Promise.all([",
  "const [loadedTrips, loadedExpenses, loadedVehicles, loadedMaintenance, appSettings] = await Promise.all(["
);

content = content.replace(
  "setExpenses(loadedExpenses || []);",
  "setExpenses(loadedExpenses || []);\n      setMaintenanceRecords(loadedMaintenance || []);"
);

// 4. filtered maintenance
content = content.replace(
  "const { filteredTrips, filteredExpenses } = useMemo(() => {",
  "const filteredMaintenance = useMemo(() => maintenanceRecords.filter(m => m.vehicleId === activeVehicleId), [maintenanceRecords, activeVehicleId]);\n\n  const { filteredTrips, filteredExpenses } = useMemo(() => {"
);

// 5. DB functions
content = content.replace(
  "const deleteExpense = async (id: string) => {",
  `const addMaintenanceRecord = async (record: MaintenanceRecord) => {
    setMaintenanceRecords(prev => [...prev, record]);
    await db.saveMaintenanceRecord(record);
  };

  const updateMaintenanceRecord = async (updatedRecord: MaintenanceRecord) => {
    setMaintenanceRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    await db.saveMaintenanceRecord(updatedRecord);
  };

  const deleteMaintenanceRecord = async (id: string) => {
    setMaintenanceRecords(prev => prev.filter(r => r.id !== id));
    await db.deleteMaintenanceRecord(id);
  };

  const deleteExpense = async (id: string) => {`
);

// 6. renderContent
const renderContentOld = `switch (activeTab) {
      case 'dashboard': return <Dashboard summary={summary} trips={filteredTrips} expenses={filteredExpenses} />;
      case 'trips': return <TripLog trips={filteredTrips} expenses={filteredExpenses} onAddTrip={addTrip} onUpdateTrip={updateTrip} onDeleteTrip={deleteTrip} onUpdateExpense={updateExpense} vehicleId={activeVehicle.id} lastOdometer={activeVehicle.odometer} />;
      case 'expenses': return <ExpenseTracker expenses={filteredExpenses} trips={filteredTrips} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} vehicleId={activeVehicle.id} />;
      case 'report': return <TaxReport vehicle={activeVehicle} onUpdateVehicle={updateActiveVehicle} summary={summary} trips={filteredTrips} expenses={filteredExpenses} />;
      default: return <Dashboard summary={summary} trips={filteredTrips} expenses={filteredExpenses} />;
    }`;

const renderContentNew = `switch (activeTab) {
      case 'dashboard': return <Dashboard summary={summary} trips={filteredTrips} expenses={filteredExpenses} />;
      case 'trips': return <TripLog trips={filteredTrips} expenses={filteredExpenses} onAddTrip={addTrip} onUpdateTrip={updateTrip} onDeleteTrip={deleteTrip} onUpdateExpense={updateExpense} vehicleId={activeVehicle.id} lastOdometer={activeVehicle.odometer} />;
      case 'expenses': return <ExpenseTracker expenses={filteredExpenses} trips={filteredTrips} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} onAddMaintenanceRecord={addMaintenanceRecord} vehicleId={activeVehicle.id} />;
      case 'maintenance': return <Maintenance records={filteredMaintenance} vehicle={activeVehicle} onAddRecord={addMaintenanceRecord} onUpdateRecord={updateMaintenanceRecord} onDeleteRecord={deleteMaintenanceRecord} />;
      case 'report': return <TaxReport vehicle={activeVehicle} onUpdateVehicle={updateActiveVehicle} summary={summary} trips={filteredTrips} expenses={filteredExpenses} />;
      default: return <Dashboard summary={summary} trips={filteredTrips} expenses={filteredExpenses} />;
    }`;
content = content.replace(renderContentOld, renderContentNew);

// 7. Navbar buttons
const navOld = `<button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg transition-all" title="Import Data">
                      <UploadCloud size={18} />
                  </button>`;

const navNew = `<button onClick={() => changeTab('maintenance')} className={\`p-2 transition-all duration-300 rounded-lg \${activeTab === 'maintenance' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'text-slate-400 hover:text-emerald-600'}\`}>
                      <Wrench size={18} />
                  </button>`;
content = content.replace(navOld, navNew);

fs.writeFileSync('App.tsx', content);
