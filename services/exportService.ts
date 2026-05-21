import { Trip, Expense, Vehicle, TaxSummary } from '../types';

const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const convertTripsToCSV = (trips: Trip[]) => {
  const headers = ['Date', 'Type', 'Purpose', 'Start KM', 'End KM', 'Distance', 'Details'];
  const rows = trips.map(t => [
    t.date,
    t.type,
    `"${t.purpose.replace(/"/g, '""')}"`,
    t.startKm,
    t.endKm,
    t.distance,
    `"${(t.details || '').replace(/"/g, '""')}"`
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export const convertExpensesToCSV = (expenses: Expense[]) => {
  const headers = ['Date', 'Category', 'Amount (LKR)', 'Liters', 'Price/L', 'Deductible', 'Description'];
  const rows = expenses.map(e => [
    e.date,
    e.category,
    e.amount,
    e.liters || '',
    e.pricePerLiter || '',
    e.isFullyDeductible ? '100%' : 'Apportioned',
    `"${(e.description || '').replace(/"/g, '""')}"`
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

export const convertCompliancePacketToCSV = (vehicle: Vehicle, summary: TaxSummary, trips: Trip[], expenses: Expense[]) => {
  let csv = `TAX COMPLIANCE PACKET - FY ${new Date().getFullYear()}\n`;
  csv += `Vehicle,${vehicle.name} (${vehicle.registrationNumber})\n`;
  csv += `Basis,${vehicle.vehicleValue}\n`;
  csv += `Biz %,${summary.businessPercentage.toFixed(2)}%\n`;
  csv += `Total Claimable,${summary.totalClaimable.toFixed(2)}\n\n`;

  csv += `SUMMARY\n`;
  csv += `Total Distance,${summary.totalKm} KM\n`;
  csv += `Business Distance,${summary.businessKm} KM\n`;
  csv += `Claimable Expenses,${summary.claimableExpenses.toFixed(2)}\n`;
  csv += `Claimable Depreciation,${summary.claimableDepreciation.toFixed(2)}\n\n`;

  csv += `DETAILED MOVEMENTS\n`;
  csv += convertTripsToCSV(trips) + '\n\n';

  csv += `DETAILED EXPENSES\n`;
  csv += convertExpensesToCSV(expenses);

  return csv;
};

export const exportData = (type: 'trips' | 'expenses' | 'compliance', data: { vehicle?: Vehicle, summary?: TaxSummary, trips: Trip[], expenses: Expense[] }) => {
  const timestamp = new Date().toISOString().split('T')[0];
  if (type === 'trips') {
    const csv = convertTripsToCSV(data.trips);
    downloadFile(csv, `movements_${timestamp}.csv`, 'text/csv');
  } else if (type === 'expenses') {
    const csv = convertExpensesToCSV(data.expenses);
    downloadFile(csv, `journal_${timestamp}.csv`, 'text/csv');
  } else if (type === 'compliance' && data.vehicle && data.summary) {
    const csv = convertCompliancePacketToCSV(data.vehicle, data.summary, data.trips, data.expenses);
    downloadFile(csv, `compliance_packet_${timestamp}.csv`, 'text/csv');
  }
};

export const exportFullBackup = (vehicles: Vehicle[], trips: Trip[], expenses: Expense[]) => {
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    vehicles,
    trips,
    expenses
  };
  downloadFile(JSON.stringify(backup, null, 2), `taxdrive_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
};