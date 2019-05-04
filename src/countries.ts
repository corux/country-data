import { Region } from "./regions";

/** Definition of a country in the world. */
export interface ICountry {
  name?: string;
  longName?: string;
  altNames: string[];
  capital?: string;
  population?: number;
  flag: {
    svgUrl: string,
    smallImageUrl: string,
    largeImageUrl: string,
  };
  iso3: string;
  iso2?: string;
  region: Region;
  languages: string[];
  currencies: string[];
  borders: string[];
  anthem?: string;
  anthemName?: string;
  adjectives: string[];
}
