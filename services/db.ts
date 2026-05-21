import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Trip, Expense, Vehicle, AppSettings, MaintenanceRecord } from '../types';

interface TaxDriveDB extends DBSchema {
  trips: {
    key: string;
    value: Trip;
  };
  expenses: {
    key: string;
    value: Expense;
  };
  vehicles: {
    key: string;
    value: Vehicle;
  };
  maintenance: {
    key: string;
    value: MaintenanceRecord;
  };
  settings: {
    key: string;
    value: AppSettings | any; 
  };
}

const DB_NAME = 'taxdrive_db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<TaxDriveDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<TaxDriveDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('trips')) {
          db.createObjectStore('trips', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('expenses')) {
          db.createObjectStore('expenses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings'); 
        }
        if (!db.objectStoreNames.contains('vehicles')) {
          db.createObjectStore('vehicles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('maintenance')) {
          db.createObjectStore('maintenance', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const getLegacySettings = async () => {
  const db = await initDB();
  const data = await db.get('settings', 'user_settings');
  if (data && 'vehicleValue' in data) {
    return data;
  }
  return null;
};

export const assignLegacyDataToVehicle = async (vehicleId: string) => {
  const db = await initDB();
  const tx = db.transaction(['trips', 'expenses'], 'readwrite');
  
  let cursor = await tx.objectStore('trips').openCursor();
  while (cursor) {
    if (!cursor.value.vehicleId) {
      const update = { ...cursor.value, vehicleId };
      await cursor.update(update);
    }
    cursor = await cursor.continue();
  }
  
  let expCursor = await tx.objectStore('expenses').openCursor();
  while (expCursor) {
    if (!expCursor.value.vehicleId) {
      const update = { ...expCursor.value, vehicleId };
      await expCursor.update(update);
    }
    expCursor = await expCursor.continue();
  }
  
  await tx.done;
};

export const getVehicles = async (): Promise<Vehicle[]> => {
  const db = await initDB();
  return db.getAll('vehicles');
};

export const saveVehicle = async (vehicle: Vehicle) => {
  const db = await initDB();
  return db.put('vehicles', vehicle);
};

export const deleteVehicle = async (id: string) => {
  const db = await initDB();
  return db.delete('vehicles', id);
};

export const getTrips = async (): Promise<Trip[]> => {
  const db = await initDB();
  return db.getAll('trips');
};

export const saveTrip = async (trip: Trip) => {
  const db = await initDB();
  return db.put('trips', trip);
};

export const saveTrips = async (trips: Trip[]) => {
  const db = await initDB();
  const tx = db.transaction('trips', 'readwrite');
  const store = tx.objectStore('trips');
  await Promise.all(trips.map(t => store.put(t)));
  return tx.done;
};

export const deleteTrip = async (id: string) => {
  const db = await initDB();
  return db.delete('trips', id);
};

export const getExpenses = async (): Promise<Expense[]> => {
  const db = await initDB();
  return db.getAll('expenses');
};

export const saveExpense = async (expense: Expense) => {
  const db = await initDB();
  return db.put('expenses', expense);
};

export const deleteExpense = async (id: string) => {
  const db = await initDB();
  return db.delete('expenses', id);
};

export const getAppSettings = async (): Promise<AppSettings | undefined> => {
  const db = await initDB();
  const s = await db.get('settings', 'app_settings');
  return s as AppSettings;
};

export const saveAppSettings = async (settings: AppSettings) => {
  const db = await initDB();
  return db.put('settings', settings, 'app_settings');
};

export const getSuppressedPurposes = async (): Promise<string[]> => {
  const db = await initDB();
  return (await db.get('settings', 'suppressed_purposes')) || [];
};

export const saveSuppressedPurposes = async (purposes: string[]) => {
  const db = await initDB();
  return db.put('settings', purposes, 'suppressed_purposes');
};

export const getCustomPurposes = async (): Promise<string[]> => {
  const db = await initDB();
  return (await db.get('settings', 'custom_purposes')) || [];
};

export const saveCustomPurposes = async (purposes: string[]) => {
  const db = await initDB();
  return db.put('settings', purposes, 'custom_purposes');
};
export const getMaintenanceRecords = async (): Promise<MaintenanceRecord[]> => {
  const db = await initDB();
  return db.getAll('maintenance');
};

export const saveMaintenanceRecord = async (record: MaintenanceRecord) => {
  const db = await initDB();
  return db.put('maintenance', record);
};

export const deleteMaintenanceRecord = async (id: string) => {
  const db = await initDB();
  return db.delete('maintenance', id);
};
