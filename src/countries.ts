import { ContinentCode } from "./continents";

/** Definition of a country in the world. */
export interface ICountry {
  name?: string;
  longName?: string;
  altNames: string[];
  capital?: string;
  population?: number;
  tld: string[];
  flag: {
    svgUrl: string,
    smallImageUrl: string,
    largeImageUrl: string,
  };
  iso3: string;
  iso2?: string;
  /** The geological continent, this country belongs to. */
  continent: ContinentCode;
  languages: string[];
  currencies: string[];
  borders: string[];
  /** Link to the anthem audio file. */
  anthem?: string;
  anthemName?: string;
  adjectives: string[];
}
