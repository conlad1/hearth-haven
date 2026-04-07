export interface EducationRecord {
  educationRecordId: number;
  residentId: number;
  recordDate: string;
  educationLevel: string;
  schoolName: string | null;
  enrollmentStatus: string;
  attendanceRate: number;
  progressPercent: number;
  completionStatus: string;
  notes: string | null;
}
