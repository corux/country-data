import { IContinent } from "./continents";
import { IRegion } from "./region";

/** Definition of a country in the world. */
export interface ICountry {
  name?: string;
  longName?: string;
  altNames: string[];
  capital?: string;
  /** The area in square km. */
  area: number;
  population: number;
  populationPerSquareKm: number;
  tld: string[];
  flag: {
    svgUrl: string,
    smallImageUrl: string,
    largeImageUrl: string,
  };
  iso3: string;
  iso2?: string;
  /** The geological continent, this country belongs to. */
  continent: IContinent;
  /** The region, as defined by the United Nations M49 methodology. */
  region: IRegion;
  languages: string[];
  currencies: string[];
  borders: string[];
  anthem: {
    /** Link to the anthem audio file (instrumental version). */
    url: string;
    /** Link to the anthem audio file (vocal version). */
    vocalUrl?: string;
    name?: string;
  };
  adjectives: string[];
}
