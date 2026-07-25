export interface Age {
  years: string;
  months: string;
}

const emptyAge: Age = { years: '', months: '' };

/** Age as of today, in whole years + remaining months, from an ISO (yyyy-mm-dd) birth date. */
export function calculateAge(birthDateIso: string): Age {
  if (!birthDateIso) return emptyAge;
  const birth = new Date(birthDateIso);
  if (Number.isNaN(birth.getTime())) return emptyAge;

  const now = new Date();
  let totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) totalMonths -= 1;
  if (totalMonths < 0) return emptyAge;

  return { years: String(Math.floor(totalMonths / 12)), months: String(totalMonths % 12) };
}
