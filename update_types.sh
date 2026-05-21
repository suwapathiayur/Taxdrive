sed -i -e '/export interface Expense {/i \
export interface MaintenanceRecord {\
  id: string;\
  vehicleId: string;\
  expenseId?: string;\
  title: string;\
  datePerformed: string;\
  odometerPerformed?: number;\
  intervalKm?: number;\
  intervalMonths?: number;\
  notes?: string;\
}\
' types.ts
