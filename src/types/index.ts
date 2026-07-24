export * from './legacy';

export type UserRole =
  | 'admin'
  | 'advisor_teacher'
  | 'advisor_staff'
  | 'guidance_staff'
  | 'scholarship_staff'
  | 'rehabilitation_staff';

export interface UserProfile {
  /** Doc ID in care-plus/users. For citizenId-based accounts this equals citizenId. */
  uid: string;
  /**
   * How this account authenticates. `'custom'` = temporary citizenId+password
   * scheme (see lib/customAuth.ts) while Firebase Authentication is
   * disabled. `'firebase'` = normal Firebase Auth account (lib/auth.ts).
   */
  authProvider: 'custom' | 'firebase';
  /** 13-digit Thai citizen ID — primary login identifier for `authProvider: 'custom'` accounts. */
  citizenId?: string;
  /** PBKDF2 hash + salt, only present for `authProvider: 'custom'` accounts. See lib/passwordHash.ts. */
  passwordHash?: string;
  passwordSalt?: string;
  email?: string;
  displayName: string;
  /** ตำแหน่ง, filled from out-of/teachers at registration time. */
  position?: string;
  role: UserRole;
  teacherId?: string;
  departmentId?: string;
  /** ชื่อแผนกวิชา, filled from out-of/teachers at registration time. */
  departmentName?: string;
  classIds: string[];
  isActive: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export type ResultGroup = 'trust' | 'concern' | 'close';

export const RESULT_GROUP_LABEL: Record<ResultGroup, string> = {
  trust: 'กลุ่มไว้ใจ',
  concern: 'กลุ่มห่วงใย',
  close: 'กลุ่มใกล้ชิด',
};

export type ScreeningCategoryKey =
  | 'learning'
  | 'social'
  | 'sexual'
  | 'drugs'
  | 'violence'
  | 'economy'
  | 'games'
  | 'gambling'
  | 'health';

export const SCREENING_CATEGORY_LABEL: Record<ScreeningCategoryKey, string> = {
  learning: 'ด้านการเรียน',
  social: 'ด้านสังคม',
  sexual: 'ด้านชู้สาว',
  drugs: 'ด้านยาเสพติด',
  violence: 'ด้านการทะเลาะวิวาท',
  economy: 'ด้านเศรษฐกิจ',
  games: 'ด้านติดเกมส์',
  gambling: 'ด้านการพนัน',
  health: 'ด้านสุขภาพ / กาย / จิต / อารมณ์',
};

export interface ScreeningCategory {
  group: ResultGroup;
  checkedItems: string[];
  /**
   * True when the teacher explicitly ticked "กลุ่มไว้ใจ" for this category
   * (matching the source form's own ไว้ใจ checkbox) with no concern/close
   * items checked. Distinguishes "reviewed, no issues found" from a
   * category that was simply never looked at — both would otherwise
   * compute to `group: 'trust'` with an empty `checkedItems`.
   */
  trustConfirmed?: boolean;
}

export type ScreeningCategories = Record<ScreeningCategoryKey, ScreeningCategory>;

export type DocStatus = 'draft' | 'submitted';

export interface Screening {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  departmentId: string;
  departmentName: string;
  level: string;
  advisorTeacherId: string;
  advisorTeacherName: string;
  academicYear: string;
  semester: string;
  screeningDate: string;

  resultGroup: ResultGroup;
  resultGroupLabel: string;

  categories: ScreeningCategories;
  /** หมายเหตุรวมของผู้เรียนคนนี้ (แทนที่หมายเหตุแยกรายด้านเดิม) */
  note: string;

  status: DocStatus;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface StudentInfo {
  citizenId: string;
  nickname: string;
  birthDate: string;
  age: string;
  phone: string;
  email: string;
  address: string;
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
}

export interface FamilyInfo {
  fatherName: string;
  fatherOccupation: string;
  fatherPhone: string;
  fatherEmail: string;
  fatherStatus: string;
  motherName: string;
  motherOccupation: string;
  motherPhone: string;
  motherEmail: string;
  motherStatus: string;
  siblingsTotal: string;
  maleSiblings: string;
  femaleSiblings: string;
  birthOrder: string;
  currentGuardian: string;
  guardianRelationship: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  fatherIncome: string;
  motherIncome: string;
  houseType: string;
}

export interface BehaviorInfo {
  chronicDisease: string;
  chronicDiseaseDetail: string;
  closeFriendName: string;
  closeFriendPhone: string;
  alcoholOrDrugUse: string;
  nightOut: string;
  oppositeSexFriend: string;
  smoking: string;
  gambling: string;
  familyResponsibility: string;
  familyRelationship: string;
}

export interface HomeVisit {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  departmentId: string;
  departmentName: string;
  level: string;
  advisorTeacherId: string;
  advisorTeacherName: string;
  academicYear: string;
  semester: string;
  visitDate: string;

  studentInfo: StudentInfo;
  familyInfo: FamilyInfo;
  behaviorInfo: BehaviorInfo;

  parentOpinion: string;
  advisorOpinion: string;

  images: {
    homeVisitPhotos: string[];
    mapImage: string;
  };

  status: DocStatus;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export type TargetWork = 'guidance' | 'scholarship' | 'rehabilitation';

export const TARGET_WORK_LABEL: Record<TargetWork, string> = {
  guidance: 'งานแนะแนว',
  scholarship: 'งานทุนการศึกษา',
  rehabilitation: 'งานบำบัดผู้เรียน',
};

export type ReferralPriority = 'normal' | 'urgent' | 'critical';

export const REFERRAL_PRIORITY_LABEL: Record<ReferralPriority, string> = {
  normal: 'ปกติ',
  urgent: 'เร่งด่วน',
  critical: 'วิกฤต',
};

export type ReferralStatus = 'sent' | 'received' | 'in_progress' | 'completed' | 'closed';

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  sent: 'ส่งแล้ว',
  received: 'รับเรื่องแล้ว',
  in_progress: 'กำลังดำเนินการ',
  completed: 'ดำเนินการแล้ว',
  closed: 'ปิดเคสแล้ว',
};

export interface Referral {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  departmentId: string;
  departmentName: string;
  level: string;

  screeningId?: string;
  homeVisitId?: string;

  referredBy: string;
  referredByName: string;
  referredDate: string;

  targetWork: TargetWork;
  targetWorkLabel: string;

  reason: string;
  priority: ReferralPriority;

  status: ReferralStatus;

  receivedBy?: string;
  receivedAt?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

export type InterventionActionType =
  | 'counseling'
  | 'scholarship_grant'
  | 'parent_coordination'
  | 'medical_referral'
  | 'behavior_tracking'
  | 'repeat_visit'
  | 'other';

export const INTERVENTION_ACTION_TYPE_LABEL: Record<InterventionActionType, string> = {
  counseling: 'การให้คำปรึกษา',
  scholarship_grant: 'การมอบทุนการศึกษา',
  parent_coordination: 'การประสานผู้ปกครอง',
  medical_referral: 'การส่งตัวให้สถานพยาบาล',
  behavior_tracking: 'การติดตามพฤติกรรม',
  repeat_visit: 'การเยี่ยมซ้ำ',
  other: 'อื่น ๆ',
};

export type InterventionStatus = 'in_progress' | 'completed';

export interface Intervention {
  id: string;
  referralId: string;
  studentId: string;
  targetWork: TargetWork;
  officerId: string;
  officerName: string;

  actionDate: string;
  actionType: InterventionActionType;
  actionDetail: string;

  result: string;
  nextAction: string;
  nextAppointmentDate?: string;

  status: InterventionStatus;
  createdAt: unknown;
  updatedAt: unknown;
}

export type FinalResult = 'normal' | 'improved' | 'monitoring' | 'need_more_support';

export const FINAL_RESULT_LABEL: Record<FinalResult, string> = {
  normal: 'ดำเนินชีวิตได้ตามปกติ',
  improved: 'มีแนวโน้มดีขึ้น',
  monitoring: 'ยังต้องติดตามต่อ',
  need_more_support: 'ต้องได้รับการช่วยเหลือเพิ่มเติม',
};

export interface FollowUpResult {
  id: string;
  referralId: string;
  interventionId: string;
  studentId: string;
  targetWork: TargetWork;

  resultDate: string;
  finalResult: FinalResult;
  finalResultLabel: string;

  summary: string;
  recommendation: string;
  closedBy: string;
  closedAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface DashboardSummary {
  totalStudents: number;
  screenedCount: number;
  unscreenedCount: number;
  trustCount: number;
  concernCount: number;
  closeCount: number;
  visitedCount: number;
  unvisitedCount: number;
  referredCount: number;
}

export interface ReferralInboxSummary {
  sent: number;
  received: number;
  in_progress: number;
  completed: number;
  closed: number;
}
