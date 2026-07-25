import { useEffect, useState } from 'react';
import { Field, Input, Select } from '../../components/ui/Form';

type ThaiAddressModule = typeof import('../../lib/thaiAddress');

export interface AddressValue {
  postalCode: string;
  province: string;
  district: string;
  subdistrict: string;
}

interface Props {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
}

/**
 * Postal code drives the rest: type a 5-digit zip, pick the matching
 * ตำบล (a zip usually covers several), and อำเภอ/จังหวัด fill in on their
 * own. No manual fallback — the province/district/subdistrict fields only
 * ever hold values that come from the dataset, per product decision.
 */
export function ThaiAddressFields({ value, onChange }: Props) {
  const [thaiAddress, setThaiAddress] = useState<ThaiAddressModule | null>(null);
  const [subDistrictId, setSubDistrictId] = useState('');

  useEffect(() => {
    import('../../lib/thaiAddress').then(setThaiAddress);
  }, []);

  const zipValid = /^\d{5}$/.test(value.postalCode);
  const matches = thaiAddress && zipValid ? thaiAddress.findSubDistrictsByZip(value.postalCode) : [];
  const notFound = thaiAddress !== null && zipValid && matches.length === 0;

  // Recover the selected ตำบล id for a record loaded with data already
  // saved (edit mode), so the dropdown reflects it instead of starting blank.
  useEffect(() => {
    if (!thaiAddress || subDistrictId || !zipValid || !value.subdistrict) return;
    const match = thaiAddress.findSubDistrictsByZip(value.postalCode).find((s) => s.name_th === value.subdistrict);
    if (match) setSubDistrictId(String(match.id));
  }, [thaiAddress, value.postalCode, value.subdistrict, subDistrictId, zipValid]);

  function selectSubDistrict(idText: string) {
    if (!thaiAddress || !idText) {
      setSubDistrictId('');
      onChange({ ...value, province: '', district: '', subdistrict: '' });
      return;
    }
    const resolved = thaiAddress.resolveAddress(Number(idText));
    if (!resolved) return;
    setSubDistrictId(idText);
    onChange({
      postalCode: value.postalCode,
      subdistrict: resolved.subDistrictName,
      district: resolved.districtName,
      province: resolved.provinceName,
    });
  }

  // A zip that resolves to exactly one ตำบล doesn't need the teacher/student to pick.
  useEffect(() => {
    if (matches.length === 1 && subDistrictId !== String(matches[0].id)) {
      selectSubDistrict(String(matches[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.length, value.postalCode]);

  function handleZipChange(raw: string) {
    const postalCode = raw.replace(/\D/g, '').slice(0, 5);
    setSubDistrictId('');
    onChange({ postalCode, province: '', district: '', subdistrict: '' });
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Field label="รหัสไปรษณีย์" hint={!thaiAddress ? 'กำลังโหลดข้อมูล...' : undefined}>
        <Input inputMode="numeric" maxLength={5} value={value.postalCode} onChange={(e) => handleZipChange(e.target.value)} placeholder="21000" />
      </Field>
      <Field label="ตำบล">
        <Select value={subDistrictId} disabled={!thaiAddress || matches.length === 0} onChange={(e) => selectSubDistrict(e.target.value)}>
          <option value="">{!zipValid ? 'กรอกรหัสไปรษณีย์ก่อน' : notFound ? 'ไม่พบรหัสไปรษณีย์นี้' : 'เลือกตำบล'}</option>
          {matches.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name_th}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="อำเภอ">
        <Input value={value.district} disabled className="bg-gray-50 text-gray-500" />
      </Field>
      <Field label="จังหวัด">
        <Input value={value.province} disabled className="bg-gray-50 text-gray-500" />
      </Field>
      {notFound && (
        <p className="col-span-2 text-xs text-close-700 sm:col-span-4">ไม่พบรหัสไปรษณีย์นี้ในฐานข้อมูล กรุณาตรวจสอบอีกครั้ง</p>
      )}
    </div>
  );
}
