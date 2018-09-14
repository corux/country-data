import { data } from "./data";

export interface IRegion {
  code: string;
  name: string;
}

export function getRegionCodes(): string[] {
  const codes = Object.keys(data.i18n)
    .map((val) => Object.keys(data.i18n[val].regions))
    .reduce((acc, val) => acc.concat(val), []);
  return codes.filter((val, index) => codes.indexOf(val) === index);
}

export function getRegions(lang: string): IRegion[] {
  if (!data.i18n[lang]) {
    return [];
  }
  const regions = data.i18n[lang].regions;
  return Object.keys(regions)
    .map((val) => ({ code: val, name: regions[val] }));
}
