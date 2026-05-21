import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trip, Expense, Vehicle, TaxSummary, TripType, MaintenanceRecord } from './types';
import TripLog from './components/TripLog';
import ExpenseTracker from './components/ExpenseTracker';
import Dashboard from './components/Dashboard';
import TaxReport from './components/TaxReport';
import Maintenance from './components/Maintenance';
import { LayoutDashboard, Car, Receipt, FileText, ChevronDown, Loader2, Plus, X, Pencil, Trash2, AlertTriangle, Calculator, Gavel, FileSignature, Settings2, UploadCloud, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as db from './services/db';

const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-LK', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(val);
};

const INITIAL_VEHICLE_STATE = {
  name: '', registrationNumber: '', notes: '', purchaseDate: new Date().toISOString().split('T')[0], 
  purchasePrice: '', stampDuty: '', registrationFees: '', documentationFees: '', otherFees: '',
  depreciationRate: '', odometer: '', isSelfOwned: true, isLeased: false, 
  initialLeaseDeposit: '', isApportionmentAvailable: true, isCapitalClaimEnabled: true
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trips' | 'expenses' | 'maintenance' | 'report'>('dashboard');
  const [direction, setDirection] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);

  // Tax Year State
  const [selectedTaxYear, setSelectedTaxYear] = useState<number>(() => {
    const today = new Date();
    return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  });
  
  // UI State
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  
  
  const [touchStart, setTouchStart] = useState<{x: number, y: number, time: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);
  
  const [modalVehicle, setModalVehicle] = useState<any>(INITIAL_VEHICLE_STATE);

  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const mobileVehicleDropdownRef = useRef<HTMLDivElement>(null);

  const TABS = ['dashboard', 'trips', 'expenses', 'maintenance', 'report'] as const;

  useEffect(() => {
    if (showVehicleModal || vehicleToDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showVehicleModal, vehicleToDelete]);

  const calculatedTotalBasis = useMemo(() => {
    return (parseFloat(modalVehicle.purchasePrice) || 0) + 
           (parseFloat(modalVehicle.stampDuty) || 0) + 
           (parseFloat(modalVehicle.registrationFees) || 0) + 
           (parseFloat(modalVehicle.documentationFees) || 0) +
           (parseFloat(modalVehicle.otherFees) || 0);
  }, [modalVehicle.purchasePrice, modalVehicle.stampDuty, modalVehicle.registrationFees, modalVehicle.documentationFees, modalVehicle.otherFees]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [loadedTrips, loadedExpenses, loadedVehicles, loadedMaintenance, appSettings] = await Promise.all([
        db.getTrips(),
        db.getExpenses(),
        db.getVehicles(),
        db.getMaintenanceRecords(),
        db.getAppSettings()
      ]);

      let currentVehicles = loadedVehicles || [];
      let defaultId = appSettings?.activeVehicleId || null;

      if (currentVehicles.length === 0) {
        const legacySettings = await db.getLegacySettings();
        const legacyValue = legacySettings?.vehicleValue || 5000000;
        const newVehicle: Vehicle = {
          id: generateId(),
          name: 'Primary Vehicle',
          purchaseDate: '2020-01-01', 
          purchasePrice: legacyValue,
          stampDuty: 0,
          registrationFees: 0,
          documentationFees: 0,
          otherFees: 0,
          vehicleValue: legacyValue,
          depreciationRate: legacySettings?.depreciationRate || 20,
          odometer: legacySettings?.odometer || 0,
          isSelfOwned: true,
          isLeased: false,
          initialLeaseDeposit: 0,
          isApportionmentAvailable: true,
          isCapitalClaimEnabled: true
        };
        await db.saveVehicle(newVehicle);
        await db.assignLegacyDataToVehicle(newVehicle.id);
        currentVehicles = [newVehicle];
        defaultId = newVehicle.id;
      }

      setTrips(loadedTrips || []);
      setExpenses(loadedExpenses || []);
      setMaintenanceRecords(loadedMaintenance || []);
      setVehicles(currentVehicles);
      if (defaultId && currentVehicles.find(v => v.id === defaultId)) {
          setActiveVehicleId(defaultId);
      } else if (currentVehicles.length > 0) {
          setActiveVehicleId(currentVehicles[0].id);
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
      if (activeVehicleId && !isLoading) {
          db.saveAppSettings({ activeVehicleId });
      }
  }, [activeVehicleId, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(target)) {
        setIsYearDropdownOpen(false);
      }
      if (mobileVehicleDropdownRef.current && !mobileVehicleDropdownRef.current.contains(target)) {
        setIsVehicleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  
  const activeVehicle = useMemo(() => 
    vehicles.find(v => v.id === activeVehicleId) || null
  , [vehicles, activeVehicleId]);

  const filteredMaintenance = useMemo(() => maintenanceRecords.filter(m => m.vehicleId === activeVehicleId), [maintenanceRecords, activeVehicleId]);

  const { filteredTrips, filteredExpenses } = useMemo(() => {
    if (!activeVehicleId) return { filteredTrips: [], filteredExpenses: [] };
    const startStr = `${selectedTaxYear}-04-01`;
    const endStr = `${selectedTaxYear + 1}-03-31`;
    return {
      filteredTrips: trips.filter(t => t.vehicleId === activeVehicleId && t.date >= startStr && t.date <= endStr),
      filteredExpenses: expenses.filter(e => e.vehicleId === activeVehicleId && e.date >= startStr && e.date <= endStr)
    };
  }, [trips, expenses, selectedTaxYear, activeVehicleId]);

  const summary: TaxSummary = useMemo(() => {
    if (!activeVehicle) return {
      totalKm: 0, businessKm: 0, personalKm: 0, businessPercentage: 0,
      totalExpenses: 0, totalFuelCost: 0, totalLiters: 0, fuelEfficiency: 0, 
      claimableExpenses: 0, claimableDepreciation: 0, totalClaimable: 0
    };

    const totalKm = filteredTrips.reduce((acc, t) => acc + t.distance, 0);
    const sharedPurposes = new Set(['garage', 'service']);
    const splitUsage = filteredTrips.reduce((acc, trip) => {
      const normalizedPurpose = (trip.purpose || '').trim().toLowerCase();
      if (sharedPurposes.has(normalizedPurpose)) {
        const half = trip.distance / 2;
        acc.businessKm += half;
        acc.personalKm += half;
        return acc;
      }
      if (trip.type === TripType.BUSINESS) {
        acc.businessKm += trip.distance;
      } else {
        acc.personalKm += trip.distance;
      }
      return acc;
    }, { businessKm: 0, personalKm: 0 });
    const businessKm = splitUsage.businessKm;
    const businessPercentage = totalKm > 0 ? (businessKm / totalKm) * 100 : 0;
    const factor = businessPercentage / 100;
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const fuelExpenses = filteredExpenses.filter(e => e.category === 'Fuel');
    const totalFuelCost = fuelExpenses.reduce((acc, e) => acc + e.amount, 0);
    const totalLiters = fuelExpenses.reduce((acc, e) => acc + (e.liters || 0), 0);
    
    const isApportionable = activeVehicle.isApportionmentAvailable !== false;
    
    const claimableExpenses = filteredExpenses.reduce((acc, e) => {
        if (e.isFullyDeductible) return acc + e.amount;
        return isApportionable ? acc + (e.amount * factor) : acc;
    }, 0);
    
    const pDate = new Date(activeVehicle.purchaseDate);
    const taxYearStart = new Date(`${selectedTaxYear}-04-01`);
    const yearsElapsed = (taxYearStart.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const isStillDepreciating = yearsElapsed < 5;
    
    const claimableDepreciation = (isStillDepreciating && activeVehicle.isCapitalClaimEnabled !== false)
        ? (activeVehicle.vehicleValue * (activeVehicle.depreciationRate / 100)) * factor
        : 0;

    return {
      totalKm, businessKm, personalKm: splitUsage.personalKm, businessPercentage,
      totalExpenses, totalFuelCost, totalLiters,
      fuelEfficiency: totalLiters > 0 ? totalKm / totalLiters : 0,
      claimableExpenses, claimableDepreciation, totalClaimable: claimableExpenses + claimableDepreciation
    };
  }, [filteredTrips, filteredExpenses, activeVehicle, selectedTaxYear]);

  const changeTab = (newTab: typeof activeTab) => {
    if (newTab === activeTab) return;
    const currentIndex = TABS.indexOf(activeTab);
    const newIndex = TABS.indexOf(newTab);
    setDirection(newIndex > currentIndex ? 1 : -1);
    setActiveTab(newTab);
  };

  const updateActiveVehicle = async (updatedVehicle: Vehicle) => {
      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
      await db.saveVehicle(updatedVehicle);
  };

  const addTrip = async (trip: Trip) => {
    if (!activeVehicle) return;
    setTrips(prev => [...prev, trip]);
    await db.saveTrip(trip);
    if (trip.endKm > activeVehicle.odometer) {
        await updateActiveVehicle({ ...activeVehicle, odometer: trip.endKm });
    }
  };

  const updateTrip = async (updatedTrip: Trip) => {
    if (!activeVehicle) return;
    const oldTrip = trips.find(t => t.id === updatedTrip.id);
    if (!oldTrip) return;
    let newTrips = trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
    const tripsToSave: Trip[] = [updatedTrip];
    if (updatedTrip.vehicleId === activeVehicle.id) {
        const endKmDiff = updatedTrip.endKm - oldTrip.endKm;
        if (endKmDiff !== 0) {
            const vehicleTrips = newTrips.filter(t => t.vehicleId === activeVehicle.id).sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());
            const index = vehicleTrips.findIndex(t => t.id === updatedTrip.id);
            for (let i = index + 1; i < vehicleTrips.length; i++) {
                const mod = { ...vehicleTrips[i], startKm: vehicleTrips[i].startKm + endKmDiff, endKm: vehicleTrips[i].endKm + endKmDiff };
                newTrips = newTrips.map(t => t.id === mod.id ? mod : t);
                tripsToSave.push(mod);
            }
        }
    }
    setTrips(newTrips);
    await db.saveTrips(tripsToSave);
  };

  const deleteTrip = async (id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));
    await db.deleteTrip(id);
  };

  const addExpense = async (expense: Expense) => {
    setExpenses(prev => [...prev, expense]);
    await db.saveExpense(expense);
  };

  const updateExpense = async (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
    await db.saveExpense(updatedExpense);
  };

  const addMaintenanceRecord = async (record: MaintenanceRecord) => {
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

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    await db.deleteExpense(id);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setModalVehicle({
        ...vehicle,
        purchasePrice: vehicle.purchasePrice.toFixed(2),
        stampDuty: vehicle.stampDuty.toFixed(2),
        registrationFees: vehicle.registrationFees.toFixed(2),
        documentationFees: vehicle.documentationFees.toFixed(2),
        otherFees: vehicle.otherFees.toFixed(2),
        depreciationRate: vehicle.depreciationRate.toString(),
        odometer: vehicle.odometer.toFixed(1),
        initialLeaseDeposit: (vehicle.initialLeaseDeposit || '').toString(),
        isApportionmentAvailable: vehicle.isApportionmentAvailable ?? true,
        isCapitalClaimEnabled: vehicle.isCapitalClaimEnabled ?? true
    });
    setShowVehicleModal(true);
    setIsVehicleDropdownOpen(false);
  };

  const handleDeleteVehicleRequest = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setIsVehicleDropdownOpen(false);
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    await db.deleteVehicle(vehicleToDelete.id);
    const updatedVehicles = vehicles.filter(v => v.id !== vehicleToDelete.id);
    setVehicles(updatedVehicles);
    if (activeVehicleId === vehicleToDelete.id) {
      setActiveVehicleId(updatedVehicles.length > 0 ? updatedVehicles[0].id : null);
    }
    setVehicleToDelete(null);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVehicle.name) return;

    const vehicleData: Vehicle = {
      id: modalVehicle.id || generateId(),
      name: modalVehicle.name,
      registrationNumber: modalVehicle.registrationNumber || '',
      notes: modalVehicle.notes || '',
      purchaseDate: modalVehicle.purchaseDate || new Date().toISOString().split('T')[0],
      purchasePrice: parseFloat(parseFloat(modalVehicle.purchasePrice).toFixed(2)) || 0,
      stampDuty: parseFloat(parseFloat(modalVehicle.stampDuty).toFixed(2)) || 0,
      registrationFees: parseFloat(parseFloat(modalVehicle.registrationFees).toFixed(2)) || 0,
      documentationFees: parseFloat(parseFloat(modalVehicle.documentationFees).toFixed(2)) || 0,
      otherFees: parseFloat(parseFloat(modalVehicle.otherFees).toFixed(2)) || 0,
      vehicleValue: parseFloat(calculatedTotalBasis.toFixed(2)),
      depreciationRate: parseFloat(modalVehicle.depreciationRate) || 20,
      odometer: parseFloat(parseFloat(modalVehicle.odometer).toFixed(1)) || 0,
      isSelfOwned: modalVehicle.isSelfOwned ?? true,
      isLeased: modalVehicle.isLeased ?? false,
      initialLeaseDeposit: parseFloat(modalVehicle.initialLeaseDeposit) || 0,
      isApportionmentAvailable: modalVehicle.isApportionmentAvailable ?? true,
      isCapitalClaimEnabled: modalVehicle.isCapitalClaimEnabled ?? true
    };

    await db.saveVehicle(vehicleData);
    
    setVehicles(prev => {
      const index = prev.findIndex(v => v.id === vehicleData.id);
      if (index > -1) {
        const next = [...prev];
        next[index] = vehicleData;
        return next;
      }
      return [...prev, vehicleData];
    });

    if (!activeVehicleId) {
      setActiveVehicleId(vehicleData.id);
    }

    setShowVehicleModal(false);
    setModalVehicle(INITIAL_VEHICLE_STATE);
  };
  
  const onTouchStart = (e: React.TouchEvent) => {
      setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY, time: Date.now() });
  };
  const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };
  const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      const distanceX = touchStart.x - touchEnd.x;
      const distanceY = touchStart.y - touchEnd.y;
      const duration = Date.now() - touchStart.time;
      const isStrictlyHorizontal = Math.abs(distanceX) > Math.abs(distanceY) * 3;
      const exceedsThreshold = Math.abs(distanceX) > 100; 
      const isDeliberateGesture = duration < 350;
      if (isStrictlyHorizontal && exceedsThreshold && isDeliberateGesture) {
          const isLeftSwipe = distanceX > 0;
          const currentIndex = TABS.indexOf(activeTab);
          if (isLeftSwipe && currentIndex < TABS.length - 1) changeTab(TABS[currentIndex + 1]);
          if (!isLeftSwipe && currentIndex > 0) changeTab(TABS[currentIndex - 1]);
      }
      setTouchStart(null);
      setTouchEnd(null);
  };

  const renderContent = () => {
    if (!activeVehicle) return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <Car className="w-16 h-16 mb-4 opacity-10 mx-auto" />
              <p className="text-sm font-medium">No active vehicle registry found.</p>
              <button onClick={() => setShowVehicleModal(true)} className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-full font-bold shadow-lg shadow-emerald-100">Add First Vehicle</button>
          </motion.div>
      </div>
    );
    switch (activeTab) {
      case 'dashboard': return <Dashboard summary={summary} trips={filteredTrips} expenses={filteredExpenses} />;
      case 'trips': return <TripLog trips={filteredTrips} expenses={filteredExpenses} onAddTrip={addTrip} onUpdateTrip={updateTrip} onDeleteTrip={deleteTrip} onUpdateExpense={updateExpense} vehicleId={activeVehicle.id} lastOdometer={activeVehicle.odometer} />;
      case 'expenses': return <ExpenseTracker expenses={filteredExpenses} trips={filteredTrips} onAddExpense={addExpense} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} onAddMaintenanceRecord={addMaintenanceRecord} vehicleId={activeVehicle.id} />;
      case 'maintenance': return <Maintenance records={filteredMaintenance} vehicle={activeVehicle} onAddRecord={addMaintenanceRecord} onUpdateRecord={updateMaintenanceRecord} onDeleteRecord={deleteMaintenanceRecord} />;
      case 'report': return <TaxReport vehicle={activeVehicle} onUpdateVehicle={updateActiveVehicle} summary={summary} trips={filteredTrips} expenses={filteredExpenses} />;
      default: return <Dashboard summary={summary} trips={filteredTrips} expenses={filteredExpenses} />;
    }
  };

  const optimizedVariants = {
    initial: (direction: number) => ({ x: direction > 0 ? 30 : -30, opacity: 0 }),
    animate: { x: 0, opacity: 1, transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } } },
    exit: (direction: number) => ({ x: direction < 0 ? 30 : -30, opacity: 0, transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.1 } } }),
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Data...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-8 md:pb-0 font-sans selection:bg-emerald-100">
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-3xl mx-auto px-4">
          <div className="py-3 flex flex-col gap-1.5">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                  <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-md shadow-emerald-100"><Car size={20} /></div>
                  <h1 className="text-lg font-black tracking-tighter text-slate-900">TAXDRIVE<span className="text-emerald-600">.LK</span></h1>
              </div>
              <div className="relative" ref={mobileVehicleDropdownRef}>
                  <button onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                    {activeVehicle ? activeVehicle.name : 'Select'} <ChevronDown size={14} className="text-emerald-600" />
                  </button>
                  {isVehicleDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 overflow-hidden">
                          {vehicles.map(v => (
                              <div key={v.id} className={`group flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0 ${activeVehicleId === v.id ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                                <button onClick={() => { setActiveVehicleId(v.id); setIsVehicleDropdownOpen(false); }} className={`text-left text-sm flex-grow font-bold ${activeVehicleId === v.id ? 'text-emerald-700' : 'text-slate-700'}`}>{v.name}</button>
                                <div className="flex items-center gap-1"><button onClick={() => handleEditVehicle(v)} className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white"><Pencil size={14} /></button><button onClick={() => handleDeleteVehicleRequest(v)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white"><Trash2 size={14} /></button></div>
                              </div>
                          ))}
                          <button onClick={() => { setShowVehicleModal(true); setIsVehicleDropdownOpen(false); }} className="w-full text-left px-4 py-4 text-xs text-emerald-600 font-black flex items-center gap-2 bg-emerald-50/30 uppercase tracking-widest"><Plus size={16} /> Add Vehicle Registry</button>
                      </div>
                  )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="relative" ref={yearDropdownRef}>
                  <button onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)} className="flex items-center gap-2 text-[10px] font-black text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50">
                    <span className="text-emerald-600">FY {selectedTaxYear}/{String(selectedTaxYear + 1).slice(2)}</span> <ChevronDown size={12} className="text-slate-300" />
                  </button>
                  {isYearDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                      {[2025, 2024, 2023, 2022].map(year => (
                      <button key={year} onClick={() => { setSelectedTaxYear(year); setIsYearDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-xs font-bold transition-all ${selectedTaxYear === year ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>FY {year}/{String(year + 1).slice(2)}</button>
                      ))}
                  </div>
                  )}
              </div>

              <div className="flex items-center gap-1 bg-slate-50/50 p-1 rounded-xl border border-slate-100">
                  <button onClick={() => changeTab('dashboard')} className={`p-2 transition-all duration-300 rounded-lg ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'text-slate-400 hover:text-emerald-600'}`}>
                      <LayoutDashboard size={18} />
                  </button>
                  <button onClick={() => changeTab('trips')} className={`p-2 transition-all duration-300 rounded-lg ${activeTab === 'trips' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'text-slate-400 hover:text-emerald-600'}`}>
                      <Car size={18} />
                  </button>
                  <button onClick={() => changeTab('expenses')} className={`p-2 transition-all duration-300 rounded-lg ${activeTab === 'expenses' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'text-slate-400 hover:text-emerald-600'}`}>
                      <Receipt size={18} />
                  </button>
                  <button onClick={() => changeTab('report')} className={`p-2 transition-all duration-300 rounded-lg ${activeTab === 'report' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'text-slate-400 hover:text-emerald-600'}`}>
                      <FileText size={18} />
                  </button>
                  <button onClick={() => changeTab('maintenance')} className={`p-2 transition-all duration-300 rounded-lg ${activeTab === 'maintenance' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'text-slate-400 hover:text-emerald-600'}`}>
                      <Wrench size={18} />
                  </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 min-h-[calc(100vh-140px)] overflow-x-hidden touch-pan-y" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div key={activeTab} custom={direction} variants={optimizedVariants} initial="initial" animate="animate" exit="exit" className="w-full">{renderContent()}</motion.div>
        </AnimatePresence>
      </main>

      {/* Vehicle Registry Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-2xl p-6 w-full max-md border border-slate-100 overflow-hidden relative max-h-[90vh] overflow-y-auto">
             <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600"></div>
             <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pt-2 pb-4 z-10 border-b border-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{modalVehicle.id ? 'Update Vehicle Registry' : 'New Vehicle Registry'}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Define depreciable basis & parameters</p>
                </div>
                <button onClick={() => { setShowVehicleModal(false); setModalVehicle(INITIAL_VEHICLE_STATE); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
             </div>
             
             <form onSubmit={(e) => handleAddVehicle(e)} className="space-y-6">
                 <div className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Vehicle Name / ID</label>
                        <input type="text" required placeholder="e.g. Personal BMW" value={modalVehicle.name || ''} onChange={(e) => setModalVehicle({...modalVehicle, name: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 placeholder:text-slate-300"/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Registration</label>
                            <input type="text" placeholder="CAB-XXXX" value={modalVehicle.registrationNumber || ''} onChange={(e) => setModalVehicle({...modalVehicle, registrationNumber: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black uppercase text-slate-700 placeholder:text-slate-300"/>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Acquisition Date</label>
                            <input type="date" required value={modalVehicle.purchaseDate || ''} onChange={(e) => setModalVehicle({...modalVehicle, purchaseDate: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"/>
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-emerald-600 p-1 rounded-lg text-white"><Calculator size={14} /></div>
                            <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Initial Capital Investment</span>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[9px] font-black text-emerald-500 mb-1.5 ml-1 uppercase">
                                    {modalVehicle.isLeased ? 'Capitalized Lease Value (Full Car Price)' : 'Main Purchase Price (Net)'}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 text-[10px] font-black">LKR</span>
                                    <input type="text" inputMode="decimal" step="0.01" required placeholder="5,000,000.00" value={modalVehicle.purchasePrice} onChange={(e) => setModalVehicle({...modalVehicle, purchasePrice: e.target.value})} className="w-full pl-12 p-3 bg-white border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-lg text-slate-800 placeholder:text-emerald-200/50"/>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[8px] font-black text-emerald-400 ml-1 uppercase flex items-center gap-1"><Gavel size={10}/> Stamp Duty</label>
                                    <input type="text" inputMode="decimal" step="0.01" placeholder="10500.00" value={modalVehicle.stampDuty} onChange={(e) => setModalVehicle({...modalVehicle, stampDuty: e.target.value})} className="w-full p-2.5 bg-white border border-emerald-100 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-emerald-200/40"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[8px] font-black text-emerald-400 ml-1 uppercase flex items-center gap-1"><FileText size={10}/> RMV Fees</label>
                                    <input type="text" inputMode="decimal" step="0.01" placeholder="2500.00" value={modalVehicle.registrationFees} onChange={(e) => setModalVehicle({...modalVehicle, registrationFees: e.target.value})} className="w-full p-2.5 bg-white border border-emerald-100 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-emerald-200/40"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[8px] font-black text-emerald-400 ml-1 uppercase flex items-center gap-1"><FileSignature size={10}/> Doc Fees</label>
                                    <input type="text" inputMode="decimal" step="0.01" placeholder="1500.00" value={modalVehicle.documentationFees} onChange={(e) => setModalVehicle({...modalVehicle, documentationFees: e.target.value})} className="w-full p-2.5 bg-white border border-emerald-100 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-emerald-200/40"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[8px] font-black text-emerald-400 ml-1 uppercase flex items-center gap-1"><Settings2 size={10}/> Other Startup</label>
                                    <input type="text" inputMode="decimal" step="0.01" placeholder="5000.00" value={modalVehicle.otherFees} onChange={(e) => setModalVehicle({...modalVehicle, otherFees: e.target.value})} className="w-full p-2.5 bg-white border border-emerald-100 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-emerald-200/40"/>
                                </div>
                            </div>

                            <div className="bg-emerald-600 p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-emerald-100/50">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-emerald-200 uppercase tracking-widest">Total Basis</span>
                                    <span className="text-xl font-black text-white">LKR {formatCurrency(calculatedTotalBasis)}</span>
                                </div>
                                <Calculator size={18} className="text-emerald-300 opacity-50" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Allowance Rate (%)</label>
                            <input type="text" inputMode="decimal" required placeholder="20.00" value={modalVehicle.depreciationRate} onChange={(e) => setModalVehicle({...modalVehicle, depreciationRate: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-700 placeholder:text-slate-200"/>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Starting Odo (Optional)</label>
                            <div className="relative">
                                <input type="text" inputMode="decimal" step="0.1" placeholder="10500.0" value={modalVehicle.odometer} onChange={(e) => setModalVehicle({...modalVehicle, odometer: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-700 pr-12 placeholder:text-slate-200"/>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KM</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <label className="flex items-center gap-4 cursor-pointer group bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                            <input type="checkbox" checked={modalVehicle.isLeased} onChange={(e) => setModalVehicle({...modalVehicle, isLeased: e.target.checked, isSelfOwned: !e.target.checked})} className="peer h-6 w-6 appearance-none rounded-xl border-2 border-slate-200 bg-white checked:bg-emerald-600 checked:border-emerald-600 transition-all cursor-pointer"/>
                            <div className="flex-grow">
                                <span className="text-sm font-black text-slate-800">Financial Lease Facility</span>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Capitalize lease value for tax depreciation</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-4 cursor-pointer group bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                            <input type="checkbox" checked={modalVehicle.isCapitalClaimEnabled !== false} onChange={(e) => setModalVehicle({...modalVehicle, isCapitalClaimEnabled: e.target.checked})} className="peer h-6 w-6 appearance-none rounded-xl border-2 border-slate-200 bg-white checked:bg-emerald-600 checked:border-emerald-600 transition-all cursor-pointer"/>
                            <div className="flex-grow">
                                <span className="text-sm font-black text-slate-800">Claim Capital Allowance</span>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Verify ownership to claim tax depreciation on the asset</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-4 cursor-pointer group bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                            <input type="checkbox" checked={modalVehicle.isApportionmentAvailable !== false} onChange={(e) => setModalVehicle({...modalVehicle, isApportionmentAvailable: e.target.checked})} className="peer h-6 w-6 appearance-none rounded-xl border-2 border-slate-200 bg-white checked:bg-emerald-600 checked:border-emerald-600 transition-all cursor-pointer"/>
                            <div className="flex-grow">
                                <span className="text-sm font-black text-slate-800">Apportioned Expenses (Fuel/Maint)</span>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Allow running costs to be shared based on business/personal ratio</p>
                            </div>
                        </label>
                    </div>
                 </div>

                 <div className="pt-2 sticky bottom-0 bg-white py-4 border-t border-slate-50">
                    <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-[0.98]">
                        {modalVehicle.id ? 'Save Registry Changes' : <><Plus size={20} /> Register Vehicle</>}
                    </button>
                 </div>
             </form>
          </motion.div>
        </div>
      )}

      {/* Vehicle Deletion Confirmation Modal */}
      {vehicleToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-6 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-sm">
            <div className="flex flex-col items-center text-center">
               <div className="bg-red-50 p-5 rounded-full mb-5"><AlertTriangle className="w-12 h-12 text-red-500" /></div>
               <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Registry?</h3>
               <p className="text-slate-500 mb-8 text-sm font-bold uppercase tracking-tight">Removing <span className="text-red-500">{vehicleToDelete.name}</span> will hide it from the tracker.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={confirmDeleteVehicle} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-100 uppercase tracking-widest text-xs">Confirm Deletion</button>
              <button onClick={() => setVehicleToDelete(null)} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-xs">Keep Registry</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
