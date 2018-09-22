import { data } from "./data";
import { Region } from "./regions";

export interface ICountry {
  name: string;
  longName: string;
  altNames: string[];
  capital: string;
  population: number;
  flag: {
    svgUrl: string,
    smallImageUrl: string,
    largeImageUrl: string,
  };
  iso3: string;
  iso2: string;
  region: Region;
  languages: string[];
  currencies: string[];
  borders: string[];
  anthem: string;
  anthemName: string;
  adjectives: string[];
}

export function getCountries(lang: string): ICountry[] {
  return data.generic.map((val) => Object.assign({}, val, data.i18n[lang].countries[val.iso3]));
}
