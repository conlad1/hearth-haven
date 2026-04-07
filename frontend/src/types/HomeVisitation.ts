export interface HomeVisitation {
  visitationId: number;
  residentId: number;
  visitDate: string;
  socialWorker: string;
  visitType: string;
  locationVisited: string | null;
  familyMembersPresent: string | null;
  purpose: string | null;
  observations: string | null;
  familyCooperationLevel: string;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes: string | null;
  visitOutcome: string;
}
