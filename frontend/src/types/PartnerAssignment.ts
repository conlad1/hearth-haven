import { Partner } from './Partner';
import { Safehouse } from './Safehouse';

export interface PartnerAssignment {
  assignmentId: number;
  partnerId: number;
  safehouseId: number | null;
  programArea: string;
  assignmentStart: string;
  assignmentEnd: string | null;
  responsibilityNotes: string | null;
  isPrimary: boolean;
  status: string;
  partner?: Partner;
  safehouse?: Safehouse;
}
