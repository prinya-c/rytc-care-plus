import type { ResultGroup, ScreeningCategories, ScreeningCategoryKey } from '../../types';

/**
 * Checklist items transcribed from "แบบคัดกรองผู้เรียนเพื่อจำแนกกลุ่มไว้ใจ
 * กลุ่มห่วงใย กลุ่มใกล้ชิด" (the college's official screening form). Each
 * category lists its own concern-column items and close-column items
 * separately, matching the source form exactly — this is what makes group
 * classification fully automatic (no manual "select a group" step): ticking
 * any close-column item makes the category "ใกล้ชิด", ticking any
 * concern-column item (with no close item ticked) makes it "ห่วงใย",
 * ticking nothing leaves it "ไว้ใจ". Verify wording against the source PDF
 * if exact phrasing matters (this was transcribed from a scanned form).
 *
 * Known transcription gap (found twice already — social, drugs, gambling):
 * some categories repeat their *first* concern-column item verbatim as the
 * first close-column item too (the close column then adds worse items on
 * top of it). It's easy to mistake this repeat for a scan artifact and drop
 * it, which silently removes a valid close-column trigger. If a category's
 * "ใกล้ชิด" classification doesn't seem to fire on some item you expect it
 * to, check this first — the other categories (learning, sexual, violence,
 * economy, games, health) have not been re-checked against the source PDF
 * for this same pattern yet.
 */
export interface CategoryChecklist {
  concern: string[];
  close: string[];
}

export const SCREENING_CHECKLIST: Record<ScreeningCategoryKey, CategoryChecklist> = {
  learning: {
    concern: [
      'มาลงทะเบียนล่าช้าโดยไม่แจ้งเหตุผล',
      'ขาดเรียน 2 ครั้ง มากกว่า 3 รายวิชา',
      'มีผลการเรียน 0 หรือ ขร. 2-3 รายวิชา ใน 1 ภาคเรียน',
      'มีผลการเรียนเฉลี่ยต่ำกว่า 2.00 แต่ไม่ต่ำกว่าเกณฑ์ระเบียบวัดผล',
      'ติด มผ. ในรายวิชากิจกรรม',
    ],
    close: [
      'ไม่มาลงทะเบียน',
      'ขาดเรียนเกิน 2 ครั้ง มากกว่า 3 รายวิชา',
      'มีผลการเรียน 0 หรือ ขร เกือบทุกรายวิชา',
      'มีผลการเรียนเฉลี่ยต่ำกว่าเกณฑ์ระเบียบวัดผล',
      'ติด มผ. ในรายวิชากิจกรรม (หลายรายวิชา)',
    ],
  },
  social: {
    concern: [
      'แต่งกายไม่ถูกต้องตามระเบียบสถานศึกษา',
      'มีประวัติถูกตัดคะแนนความประพฤติ 5-15 คะแนน',
      'ใช้เครื่องมือสื่อสารในเวลาเรียนเป็นเวลานาน',
      'ไม่สามารถปรับตัวเข้ากับเพื่อนได้',
    ],
    close: [
      'แต่งกายไม่ถูกต้องตามระเบียบสถานศึกษา',
      'มีประวัติถูกตัดคะแนนความประพฤติตั้งแต่ 15 คะแนนขึ้นไป',
      'ใช้เครื่องมือสื่อสารในเวลาเรียนเป็นเวลานานและบ่อยครั้ง',
      'แยกตัวอยู่ตามลำพัง',
    ],
  },
  sexual: {
    concern: ['แยกกลุ่มอยู่กับเพื่อนต่างเพศตามลำพังบ่อยครั้ง', 'ออกเที่ยวกลางคืนกับเพื่อนต่างเพศตามลำพัง'],
    close: ['ออกเที่ยวกลางคืนกับเพื่อนต่างเพศตามลำพังและบ่อยครั้ง', 'ตั้งครรภ์'],
  },
  drugs: {
    concern: [
      'คบเพื่อนในกลุ่มใช้สารเสพติด',
      'เคยลองสูบบุหรี่ ดื่มสุรา',
      'สมาชิกในครอบครัวเคยมีประวัติเกี่ยวข้องกับยาเสพติด',
      'ที่พักอาศัยอยู่ใกล้แหล่งมั่วสุมหรือสถานเริงรมย์',
    ],
    close: [
      'คบเพื่อนในกลุ่มใช้สารเสพติด',
      'ติดบุหรี่ สุรา และสารเสพติด',
      'สมาชิกในครอบครัวเกี่ยวข้องกับยาเสพติด',
      'ที่พักอาศัยอยู่ในแหล่งมั่วสุมหรือสถานเริงรมย์',
    ],
  },
  violence: {
    concern: ['มีความประพฤติก้าวร้าว และใช้กำลังตัดสินปัญหา (บางครั้ง)', 'เคยมีประวัติทะเลาะวิวาทและทำร้ายร่างกายผู้อื่น (บางครั้ง)'],
    close: ['มีความประพฤติก้าวร้าว และใช้กำลังตัดสินปัญหาบ่อยครั้ง', 'เคยมีประวัติทะเลาะวิวาทและทำร้ายร่างกายผู้อื่นบ่อยครั้ง'],
  },
  economy: {
    concern: [
      'ครอบครัวมีรายได้ไม่เพียงพอต่อการใช้จ่ายในชีวิตประจำวัน',
      'บิดา มารดา หย่าร้างกัน',
      'บิดา มารดา ไม่มีอาชีพที่มั่นคง (กำลังตกงาน)',
    ],
    close: ['ครอบครัวไม่มีรายได้และมีภาระหนี้สิน', 'บิดา มารดา หย่าร้าง', 'บิดา มารดา ไม่ได้ประกอบอาชีพ'],
  },
  games: {
    concern: ['อยู่ในกลุ่มเพื่อนที่หมกมุ่นกับการเล่นเกมส์', 'เล่นเกมส์บ้างบางครั้ง แต่ไม่หนีเรียน'],
    close: ['หมกมุ่น จริงจังในการเล่นเกมส์', 'หนีเรียนไปเล่นเกมส์บ่อยครั้ง', 'มีพฤติกรรมลักขโมยเงินเพื่อไปเล่นเกมส์'],
  },
  gambling: {
    concern: [
      'สมาชิกในครอบครัวมีประวัติเกี่ยวข้องกับการพนัน',
      'อยู่ในกลุ่มเพื่อนที่มีประวัติเกี่ยวข้องกับการพนัน',
      'มีที่พักอาศัยอยู่ใกล้แหล่งมั่วสุมการพนัน',
    ],
    close: [
      'สมาชิกในครอบครัวมีประวัติเกี่ยวข้องกับการพนัน',
      'อยู่ในกลุ่มเพื่อนที่มีประวัติต้องโทษเกี่ยวกับการพนัน',
      'มีที่พักอาศัยอยู่ในแหล่งมั่วสุมการพนัน',
    ],
  },
  health: {
    concern: [
      'มีโรคประจำตัวหรือเจ็บป่วยบ่อย',
      'มีความบกพร่องทางสายตาต้องสวมแว่นหรือคอนแท็คเลนส์',
      'มีความบกพร่องทางการได้ยินต้องใช้อุปกรณ์เสริมช่วย',
      'หงุดหงิด ฉุนเฉียว อารมณ์รุนแรง',
    ],
    close: [
      'ป่วยเป็นโรคร้ายแรง/เรื้อรัง',
      'เก็บตัว แยกตัวจากกลุ่มเพื่อน',
      'มีความบกพร่องหรือพิการทางสายตา',
      'มีความบกพร่องหรือพิการทางการได้ยิน',
    ],
  },
};

export const SCREENING_CATEGORY_ORDER: ScreeningCategoryKey[] = [
  'learning',
  'social',
  'sexual',
  'drugs',
  'violence',
  'economy',
  'games',
  'gambling',
  'health',
];

export function emptyScreeningCategories(): ScreeningCategories {
  const result = {} as ScreeningCategories;
  for (const key of SCREENING_CATEGORY_ORDER) {
    result[key] = { group: 'trust', checkedItems: [], trustConfirmed: false };
  }
  return result;
}

/**
 * A category counts as reviewed once the teacher has either ticked a
 * concern/close item, or explicitly confirmed "กลุ่มไว้ใจ". A category
 * that's still `{ checkedItems: [], trustConfirmed: false }` has simply
 * never been looked at — the UI should show that as distinct from a real
 * "ไว้ใจ" outcome, even though both compute to `group: 'trust'`.
 */
export function isCategoryReviewed(category: { checkedItems: string[]; trustConfirmed?: boolean }): boolean {
  return category.checkedItems.length > 0 || category.trustConfirmed === true;
}

/** ผลของแต่ละด้าน: ติ๊กข้อในคอลัมน์ใกล้ชิด → ใกล้ชิด, ไม่งั้นติ๊กคอลัมน์ห่วงใย → ห่วงใย, ไม่ติ๊กเลย → ไว้ใจ */
export function computeCategoryGroup(checkedItems: string[], key: ScreeningCategoryKey): ResultGroup {
  const checklist = SCREENING_CHECKLIST[key];
  const checked = new Set(checkedItems);
  if (checklist.close.some((item) => checked.has(item))) return 'close';
  if (checklist.concern.some((item) => checked.has(item))) return 'concern';
  return 'trust';
}

/** ผลรวมใช้ระดับความเสี่ยงสูงสุดของทุกด้าน: close > concern > trust */
export function computeOverallGroup(categories: ScreeningCategories) {
  const groups = Object.values(categories).map((c) => c.group);
  if (groups.includes('close')) return 'close' as const;
  if (groups.includes('concern')) return 'concern' as const;
  return 'trust' as const;
}
