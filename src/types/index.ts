export * from './legacy';

export type UserRole =
  | 'admin'
  | 'advisor_teacher'
  | 'advisor_staff'
  | 'guidance_staff'
  | 'scholarship_staff'
  | 'discipline_staff'
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
  /** ปีการศึกษาที่เข้าเรียน — not tracked in the legacy roster, so it's always manually entered here. */
  enrollmentYear: string;
  birthDate: string;
  /** Derived from birthDate — see utils/age.ts. Not user-editable. */
  age: string;
  ageMonths: string;
  phone: string;
  email: string;
  houseNumber: string;
  moo: string;
  soi: string;
  road: string;
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
  /** Set whenever studentInfo/familyInfo/behaviorInfo is saved (by the student or the teacher) — drives the "อัพเดทแล้ว" status on the ข้อมูลผู้เรียน page. */
  studentInfoUpdatedAt: unknown | null;

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

export interface HomeVisitMemo {
  id: string;
  advisorTeacherId: string;
  advisorTeacherName: string;
  departmentName: string;
  /** เลขที่คำสั่งแต่งตั้งคณะกรรมการ */
  orderNumber: string;
  /** ออกเยี่ยมบ้านเป็นครั้งที่ */
  roundNumber: string;
  level: string;
  memoDate: string;
  /** Which period's ผู้ลงนาม (SignatorySettings) to auto-fill from — memos before this field existed default to blank. */
  academicYear: string;
  semester: string;
  /** จำนวนนักเรียนในความดูแล ณ ตอนที่บันทึก (สแนปช็อต ไม่คำนวณใหม่) */
  totalStudents: number;
  /** จำนวนที่เยี่ยมบ้านแล้ว ณ ตอนที่บันทึก (สแนปช็อต ไม่คำนวณใหม่) */
  visitedCount: number;
  deptHeadName: string;
  advisorHeadName: string;
  deputyDirectorName: string;
  status: DocStatus;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AbsentStudentEntry {
  studentId: string;
  studentName: string;
}

export interface HomeroomLog {
  id: string;
  classId: string;
  className: string;
  departmentId: string;
  departmentName: string;
  advisorTeacherId: string;
  advisorTeacherName: string;
  academicYear: string;
  semester: string;
  sessionNumber: string;
  sessionDate: string;
  /** เลขที่หนังสือ — often left blank until the registrar assigns one. */
  docNumber: string;
  totalStudents: number;
  absentStudents: AbsentStudentEntry[];
  /** เรื่องที่ปรึกษา / คำแนะนำ / ปัญหาที่พบและการแก้ไข การแต่งกาย การมาเรียน */
  detail: string;
  images: string[];
  deptHeadName: string;
  advisorHeadName: string;
  deputyDirectorName: string;
  status: DocStatus;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ContactChannels {
  phone: boolean;
  line: boolean;
  homeVisit: boolean;
  other: boolean;
  otherDetail: string;
}

export interface DropoutFollowUp {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  departmentId: string;
  departmentName: string;
  advisorTeacherId: string;
  advisorTeacherName: string;
  recordDate: string;
  /** จำนวนวันที่ผู้เรียนขาดเรียนทั้งสิ้น */
  absentDays: string;
  absentReason: string;
  studentContactChannels: ContactChannels;
  /** รูปภาพหลักฐานการติดตามผู้เรียน */
  studentContactEvidence: string[];
  parentContactChannels: ContactChannels;
  /** รูปภาพหลักฐานการติดต่อผู้ปกครอง */
  parentContactEvidence: string[];
  /** สรุปผลการติดตามผู้เรียน */
  followUpSummary: string;
  /** ผลการติดตาม — "ติดตามผู้เรียนสำเร็จ" | "ติดตามผู้เรียนไม่สำเร็จ" */
  followUpResult: string;
  status: DocStatus;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export type TargetWork = 'guidance' | 'scholarship' | 'discipline' | 'rehabilitation';

export const TARGET_WORK_LABEL: Record<TargetWork, string> = {
  guidance: 'งานแนะแนว',
  scholarship: 'งานทุนการศึกษา',
  discipline: 'งานปกครอง',
  rehabilitation: 'งานส่งต่อไปยังสถานพยาบาล',
};

/** ต่อท้าย TARGET_WORK_LABEL ในตัวเลือกส่งต่อ เช่น "งานแนะแนว เพื่อให้ครูแนะแนวให้คำปรึกษา" */
export const TARGET_WORK_PURPOSE: Record<TargetWork, string> = {
  guidance: 'เพื่อให้ครูแนะแนวให้คำปรึกษา',
  scholarship: 'เพื่อเสนอขอทุนสนับสนุน',
  discipline: 'เพื่อเข้ารับการปรับเปลี่ยนพฤติกรรม',
  rehabilitation: 'เพื่อเข้ารับการบำบัดฟื้นฟู/รักษาพยาบาล',
};

export type ReferralStatus = 'sent' | 'received' | 'in_progress' | 'completed' | 'closed';

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  sent: 'ส่งแล้ว',
  received: 'รับเรื่องแล้ว',
  in_progress: 'กำลังดำเนินการ',
  completed: 'ดำเนินการแล้ว',
  closed: 'ปิดเคสแล้ว',
};

/** ปัญหาที่เกิดขึ้นกับผู้เรียน — เลือกได้หลายข้อ, ใช้ในฟอร์มส่งต่อผู้เรียน */
export interface StudentProblems {
  financialHardship: boolean;
  frequentAbsence: boolean;
  notAttending: boolean;
  familyProblem: boolean;
  nightOuting: boolean;
  fighting: boolean;
  stealing: boolean;
  gambling: boolean;
  smoking: boolean;
  alcohol: boolean;
  drugs: boolean;
  affair: boolean;
  other: boolean;
  otherDetail: string;
}

export const PROBLEM_LABEL: Record<Exclude<keyof StudentProblems, 'other' | 'otherDetail'>, string> = {
  financialHardship: 'ขาดทุนทรัพย์',
  frequentAbsence: 'ขาดเรียนบ่อย',
  notAttending: 'ไม่เข้าเรียน',
  familyProblem: 'ปัญหาครอบครัว',
  nightOuting: 'เที่ยวกลางคืน',
  fighting: 'ทะเลาะวิวาท',
  stealing: 'ลักขโมย',
  gambling: 'เล่นการพนัน',
  smoking: 'บุหรี่/บุหรี่ไฟฟ้า',
  alcohol: 'เครื่องดื่มแอลกอฮอล์',
  drugs: 'ยาเสพติด',
  affair: 'ชู้สาว',
};

export const PROBLEM_ORDER = Object.keys(PROBLEM_LABEL) as (keyof typeof PROBLEM_LABEL)[];

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

  problems: StudentProblems;
  /** สรุปปัญหาพอสังเขป */
  problemSummary: string;

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

/**
 * Per-period names for the two signatories that appear on every printed
 * บันทึกข้อความ (คัดกรอง / เยี่ยมบ้าน / โฮมรูม): หัวหน้างานครูที่ปรึกษาและการแนะแนว
 * and รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา. Both roles change hands often,
 * so the name is versioned by academicYear+semester rather than stored once —
 * old printed memos keep referencing whoever held the role at that time.
 */
export interface SignatorySettings {
  id: string;
  academicYear: string;
  semester: string;
  advisorHeadName: string;
  deputyDirectorName: string;
  updatedBy: string;
  updatedAt: unknown;
}
