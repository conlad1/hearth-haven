export interface Safehouse {
  safehouseId: number;
  safehouseCode: string;
  name: string;
  region: string;
  city: string;
  province: string;
  country: string;
  openDate: string;
  status: string;
  capacityGirls: number;
  capacityStaff: number;
  currentOccupancy: number;
  notes: string | null;
}
