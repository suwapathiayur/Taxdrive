sed -i -e "s/import { Trip, Expense, Vehicle, AppSettings } from '..\/types';/import { Trip, Expense, Vehicle, AppSettings, MaintenanceRecord } from '..\/types';/" services/db.ts

sed -i -e '/settings: {/i \
  maintenance: {\
    key: string;\
    value: MaintenanceRecord;\
  };' services/db.ts

sed -i -e "s/const DB_VERSION = 2;/const DB_VERSION = 3;/" services/db.ts

sed -i -e "/if (!db.objectStoreNames.contains('vehicles')) {/a \
        if (!db.objectStoreNames.contains('maintenance')) {\n          db.createObjectStore('maintenance', { keyPath: 'id' });\n        }" services/db.ts

cat << 'EOF2' >> services/db.ts

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
EOF2
