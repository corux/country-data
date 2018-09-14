import * as generic from "./data/generic.json";
import * as de from "./data/i18n/de.json";
import * as en from "./data/i18n/en.json";
import { Region } from "./regions";

interface IData {
  generic: IDataGeneric[];
  i18n: {
    [lang: string]: IDataLocale;
  }
}

interface IDataGeneric {
  population: number;
  flag: {
    svgUrl: string,
    smallImageUrl: string,
    largeImageUrl: string
  };
  iso3: string;
  iso2: string;
  region: Region;
  languages: [string];
  currencies: [string];
  borders: [string];
  anthem: string;
}

interface IDataLocale {
  countries: {
    [iso: string]: {
      name: string;
      longName: string;
      altNames: string[];
      capital: string;
      adjectives: string[];
      anthemName: string;
    }
  }
  regions: {
    [code: string]: string;
  }
}

const data: IData = {
  generic,
  i18n: { de, en },
};

export { data };
