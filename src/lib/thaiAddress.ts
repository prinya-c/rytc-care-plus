/**
 * Thai province/district/sub-district lookup, trimmed from
 * github.com/kongvut/thai-province-data (api/latest/*.json, MIT license).
 * Only the fields the address dropdowns need are kept — see
 * src/data/thaiAddress/*.json. This module is dynamically imported (see
 * ThaiAddressFields.tsx) so the ~90KB gzipped dataset only loads when a
 * home-visit form's address section is actually rendered.
 */

import provincesData from '../data/thaiAddress/provinces.json';
import districtsData from '../data/thaiAddress/districts.json';
import subDistrictsData from '../data/thaiAddress/sub_districts.json';

interface Province {
  id: number;
  name_th: string;
}

interface District {
  id: number;
  name_th: string;
  province_id: number;
}

export interface SubDistrict {
  id: number;
  zip_code: number;
  name_th: string;
  district_id: number;
}

const provinces = provincesData as Province[];
const districts = districtsData as District[];
const subDistricts = subDistrictsData as SubDistrict[];

const provinceById = new Map(provinces.map((p) => [p.id, p]));
const districtById = new Map(districts.map((d) => [d.id, d]));

export function findSubDistrictsByZip(zipCode: string): SubDistrict[] {
  const zip = Number(zipCode);
  if (!Number.isInteger(zip)) return [];
  return subDistricts.filter((s) => s.zip_code === zip);
}

export function districtNameOf(subDistrict: SubDistrict): string {
  return districtById.get(subDistrict.district_id)?.name_th ?? '';
}

export interface ResolvedAddress {
  subDistrictName: string;
  districtName: string;
  provinceName: string;
}

export function resolveAddress(subDistrictId: number): ResolvedAddress | null {
  const sub = subDistricts.find((s) => s.id === subDistrictId);
  if (!sub) return null;
  const district = districtById.get(sub.district_id);
  if (!district) return null;
  const province = provinceById.get(district.province_id);
  if (!province) return null;
  return {
    subDistrictName: sub.name_th,
    districtName: district.name_th,
    provinceName: province.name_th,
  };
}
