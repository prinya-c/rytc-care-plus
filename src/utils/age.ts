/** Age in whole years as of today, from an ISO (yyyy-mm-dd) birth date. Empty string if unset/invalid. */
export function calculateAge(birthDateIso: string): string {
  if (!birthDateIso) return '';
  const birth = new Date(birthDateIso);
  if (Number.isNaN(birth.getTime())) return '';

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age -= 1;

  return age >= 0 ? String(age) : '';
}
