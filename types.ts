export enum TripType {
  BUSINESS = 'Business',
  PERSONAL = 'Personal'
}

export interface Vehicle {
  id: string;
  name: string; // e.g. "Toyota Prius"
  registrationNumber?: string; // e.g. "CAB-1234"
  notes?: string; // Optional notes
  purchaseDate: string; // Date ownership was taken
  purchasePrice: number; // Sticker price / Capitalized Lease Value
  stampDuty: number; // Stamp Duty / Transfer Fees (Capitalized)
  registrationFees: number; // RMV / Initial Registration (Capitalized)
  documentationFees: number; // Documentation / Processing (Capitalized)
  otherFees: number; // Inspection, Plates, etc. (Capitalized)
  vehicleValue: number; // Total Depreciable Basis (Sum of above)
  depreciationRate: number; // Percentage
  odometer: number; // Current odometer reading
  isSelfOwned?: boolean;
  isLeased?: boolean; // Financial Lease toggle
  initialLeaseDeposit?: number; // Initial downpayment
  isApportionmentAvailable?: boolean; // If fuel/maint can be apportioned
  isCapitalClaimEnabled?: boolean; // New: Toggle for tax depreciation (Capital Allowance)
}

export interface Trip {
  id: string;
  vehicleId: string;
  date: string;
  startKm: number;
  endKm: number;
  distance: number;
  purpose: string;
  type: TripType;
  details?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  expenseId?: string;
  title: string;
  datePerformed: string;
  odometerPerformed?: number;
  intervalKm?: number;
  intervalMonths?: number;
  notes?: string;
}

export interface Expense {
  id: string;
  vehicleId: string;
  date: string;
  category: string;
  amount: number;
  liters?: number; // Fuel volume in liters
  pricePerLiter?: number; // Price per unit
  odometer?: number; // Odometer reading at service/repair
  isFullyDeductible: boolean; // True for clinic-related parking, false for general apportionable expenses
  merchant?: string; // Separate merchant field
  description?: string; // Additional descriptions
  tripId?: string; // Legacy single trip link
  tripIds?: string[]; // Multi trip links (fuel)
}

// App-level settings (non-vehicle specific)
export interface AppSettings {
  activeVehicleId?: string;
}

export const EXPENSE_CATEGORIES = [
  "Fuel",
  "Repairs & Servicing",
  "Spare Parts",
  "Oils, Coolant & Fluids",
  "Insurance",
  "Revenue License",
  "Lease Interest",
  "Tyres / Battery",
  "Parking (Clinic/Business)",
  "Other"
];

export interface TaxSummary {
  totalKm: number;
  businessKm: number;
  personalKm: number;
  businessPercentage: number;
  totalExpenses: number;
  totalFuelCost: number;
  totalLiters: number;
  fuelEfficiency: number; // km/L
  claimableExpenses: number;
  claimableDepreciation: number;
  totalClaimable: number;
}
