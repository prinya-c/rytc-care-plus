/**
 * Types for read-only legacy collections under the `out-of` Firestore
 * database. These collections must never be written to by this app —
 * another application owns them. Field names below are confirmed against
 * real data in the Firestore console (2026-07-02), not guessed.
 */

export interface Department {
  /** Firestore doc id — equals dep_id */
  id: string;
  dep_id: string;
  dep_name: string;
  created_at?: unknown;
  updated_at?: unknown;
  [key: string]: unknown;
}

export interface Teacher {
  /** Firestore doc id — equals tidcard */
  id: string;
  /** เลขบัตรประชาชน 13 หลัก */
  tidcard: string;
  /** ชื่อ-สกุล */
  tname: string;
  /** ตำแหน่ง */
  position?: string;
  dep_id?: string;
  dep_name?: string;
  created_at?: unknown;
  updated_at?: unknown;
  [key: string]: unknown;
}

export interface StdClass {
  /** Firestore doc id — equals class_code */
  id: string;
  class_code: string;
  /** ชื่อกลุ่มเรียนเต็ม เช่น "การตลาด 1/2" */
  class_name: string;
  /** ชื่อย่อ เช่น "กต.1/2" */
  short_name?: string;
  /** ชื่อครูที่ปรึกษา (เป็นข้อความ ไม่ใช่ id อ้างอิง) */
  advisor_name?: string;
  dep_id?: string;
  dep_name?: string;
  created_at?: unknown;
  updated_at?: unknown;
  [key: string]: unknown;
}

export interface Student {
  /** Firestore doc id — equals sid */
  id: string;
  sid: string;
  /** เลขบัตรประชาชน 13 หลัก */
  sidcard?: string;
  /** ชื่อ-สกุล */
  sname: string;
  class_code: string;
  class_name?: string;
  short_name?: string;
  dep_id?: string;
  dep_name?: string;
  created_at?: unknown;
  updated_at?: unknown;
  [key: string]: unknown;
}
