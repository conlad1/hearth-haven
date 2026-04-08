export interface Partner {
  partnerId: number;
  partnerName: string;
  partnerType: string;
  roleType: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}
