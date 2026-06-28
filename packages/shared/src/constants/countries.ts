export interface Country {
  name: string;
  code: string;
}

/** Countries relevant to overseas medical education + common destination countries */
export const COUNTRIES: Country[] = [
  { name: 'Italy', code: 'IT' },
  { name: 'Russia', code: 'RU' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'Georgia', code: 'GE' },
  { name: 'Kazakhstan', code: 'KZ' },
  { name: 'Philippines', code: 'PH' },
  { name: 'Bangladesh', code: 'BD' },
  { name: 'Belarus', code: 'BY' },
  { name: 'Ukraine', code: 'UA' },
  { name: 'China', code: 'CN' },
  { name: 'Nepal', code: 'NP' },
  { name: 'Germany', code: 'DE' },
  { name: 'Australia', code: 'AU' },
  { name: 'Canada', code: 'CA' },
  { name: 'United States', code: 'US' },
  { name: 'New Zealand', code: 'NZ' },
  { name: 'Ireland', code: 'IE' },
  { name: 'Malta', code: 'MT' },
  { name: 'Hungary', code: 'HU' },
  { name: 'Poland', code: 'PL' },
  { name: 'Czech Republic', code: 'CZ' },
  { name: 'Romania', code: 'RO' },
  { name: 'Bulgaria', code: 'BG' },
  { name: 'Kyrgyzstan', code: 'KG' },
  { name: 'India', code: 'IN' },
];

export const COUNTRY_NAMES = COUNTRIES.map((c) => c.name);
export const COUNTRY_CODE_MAP = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));
