export interface Room{
    id: number;
    roomNumber: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
    monthlyRent: number;
    maxOccupancy: number;
    description?: string;
    images: string | string[];
    currentTenant?: Tenant | null;
}

export interface Tenant{
    id: number;
    fullName: string;
    phone: string;
    roomId: string;
    moveInDate: string;
    moveOutDate?: string | null;
    billingDate: string;
    status: 'ACTIVE' | 'INACTIVE';
    room: Room;
}

export interface Billing {
  id: number;
  tenant: Tenant;
  room: Room;
  rentAmount: number;
  
  // Electricity Matrix
  electricityReadingImg: string;
  previousElectricityReading: number;
  currentElectricityReading: number;
  electricityRatePerKwh: number;
  electricityBill: number;

  waterBill: number;

  // Summary Ledger
  totalAmount: number;
  billingDate: string;
  dueDate: string;
  status: 'UNPAID' | 'PAID' | 'OVERDUE';
  datePaid?: string | null;
}