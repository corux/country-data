import * as generic from "./data/generic.json";
import * as de from "./data/i18n/de.json";
import * as en from "./data/i18n/en.json";
import * as es from "./data/i18n/es.json";
import * as fr from "./data/i18n/fr.json";
import * as it from "./data/i18n/it.json";
import * as pt from "./data/i18n/pt.json";

export interface IData {
  generic: IDataGeneric[];
  i18n: {
    [lang: string]: IDataLocale;
  };
}

export interface IDataGeneric {
  population?: number;
  flag: {
    svgUrl: string,
    smallImageUrl: string,
    largeImageUrl: string,
  };
  iso3: string;
  iso2?: string;
  continent: string;
  region: string;
  languages: string[];
  currencies: string[];
  borders: string[];
  anthem: {
    url: string;
    vocalUrl?: string;
  };
  tld: string[];
}

export interface IDataLocaleCountry {
  name: string;
  longName?: string;
  altNames?: string[];
  capital?: string;
  adjectives?: string[];
  anthemName?: string;
}

export interface IDataLocale {
  countries: {
    [iso: string]: IDataLocaleCountry;
  };
  continents: {
    [code: string]: string;
  };
  regions: {
    [code: string]: string;
  };
}

const data: IData = {
  generic,
  i18n: { de, en, fr, es, it, pt },
};

export { data };
