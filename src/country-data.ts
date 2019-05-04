import { ContinentCode, IContinent } from "./continents";
import { ICountry } from "./countries";
import { data, IDataGeneric, IDataLocale, IDataLocaleCountry } from "./data";
import { IRegion, m49Hierarchy } from "./region";

/** Contains the interface to retrieve localized country and region data. */
export class CountryData {

  /** Gets a list of all supported languages. */
  public static getSupportedLanguages(): string[] {
    return Object.keys(data.i18n);
  }

  private continents: IContinent[] = [];
  private regions: IRegion[] = [];
  private readonly i18nData: IDataLocale;

  /**
   * Creates a new instance, initialized for a specific language.
   * @param lang The language to use when retrieving data, e.g. "en" or "en-US".
   */
  public constructor(private readonly lang: string) {
    this.lang = lang.substring(0, 2);
    this.i18nData = data.i18n[this.lang] || {
      continents: {},
      countries: {},
      regions: {},
    };

    this.initialize();
  }

  /** Gets a list of all countries. */
  public getCountries(): ICountry[] {
    return data.generic.map((val) => this.convertToICountry(val, this.i18nData.countries[val.iso3]));
  }

  /** Gets a list of all continents. */
  public getContinents(): IContinent[] {
    return this.continents;
  }

  /** Gets a list of all regions, as defined by UN M49. */
  public getRegions(): IRegion[] {
    return this.regions;
  }

  private distinct<T>(array: T[]): T[] {
    return Array.from(new Set(array.map((item: any) => item)));
  }

  private initialize(): void {
    // initialize continents
    const continents = this.i18nData.continents;
    this.continents = Object.values(ContinentCode)
      .map((val) => ({ code: val as ContinentCode, name: continents[val] }));

    // initialize regions
    const allParents = Object.keys(m49Hierarchy);
    const allChildren = allParents.map((code) => m49Hierarchy[code]).reduce((a, b) => a.concat(b), []);
    const allRegionCodes = this.distinct(allParents.concat(allChildren));
    this.regions = allRegionCodes.map((code) => this.convertToIRegion(code));
    this.regions.forEach((region) => {
      const parentCode = Object.keys(m49Hierarchy).find((val) => m49Hierarchy[val].includes(region.code));
      if (parentCode) {
        region.parent = this.regions.find((val) => val.code === parentCode);
      }
      if (m49Hierarchy[region.code]) {
        region.children = m49Hierarchy[region.code]
          .map((childCode) => this.regions.find((val) => val.code === childCode));
      }
    });
  }

  private convertToIRegion(code: string): IRegion {
    const i18n = this.i18nData.regions;

    return {
      children: [],
      code,
      name: i18n[code],
    };
  }

  private convertToICountry(generic: IDataGeneric, locale: IDataLocaleCountry): ICountry {
    const combined = Object.assign({}, generic, locale);
    return {
      adjectives: combined.adjectives,
      altNames: combined.altNames,
      anthem: {
        name: combined.anthemName,
        url: combined.anthem.url,
        vocalUrl: combined.anthem.vocalUrl,
      },
      borders: combined.borders,
      capital: combined.capital,
      continent: this.continents.find((continent) => continent.code === combined.continent),
      currencies: combined.currencies,
      flag: combined.flag,
      iso2: combined.iso2,
      iso3: combined.iso3,
      languages: combined.languages,
      longName: combined.longName,
      name: combined.name,
      population: combined.population,
      region: this.regions.find((region) => region.code === combined.region),
      tld: combined.tld,
    };
  }
}
