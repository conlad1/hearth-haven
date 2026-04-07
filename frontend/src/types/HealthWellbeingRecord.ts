export interface HealthWellbeingRecord {
  healthRecordId: number;
  residentId: number;
  recordDate: string;
  generalHealthScore: number | null;
  nutritionScore: number | null;
  sleepQualityScore: number | null;
  energyLevelScore: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  medicalCheckupDone: boolean;
  dentalCheckupDone: boolean;
  psychologicalCheckupDone: boolean;
  notes: string | null;
}
