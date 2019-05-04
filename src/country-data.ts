import { ICountry } from "./countries";
import { data } from "./data";
import { IRegion, Region } from "./regions";

/** Contains the interface to retrieve localized country and region data. */
export class CountryData {
  /** Gets a list of all supported languages. */
  public static getSupportedLanguages(): string[] {
    return Object.keys(data.i18n);
  }

  /**
   * Creates a new instance, initialized for a specific language.
   * @param lang The language to use when retrieving data, e.g. "en" or "en-US".
   */
  public constructor(private readonly lang: string) {
    this.lang = lang.substring(0, 2);
  }

  /** Gets a list of all countries. */
  public getCountries(): ICountry[] {
    const i18Data = data.i18n[this.lang] && data.i18n[this.lang].countries || [];
    return data.generic.map((val) => Object.assign({}, val, i18Data[val.iso3]) as ICountry);
  }

  /** Gets a list of all regions. */
  public getRegions(): IRegion[] {
    if (!data.i18n[this.lang]) {
      return [];
    }
    const regions = data.i18n[this.lang].regions;
    return Object.keys(regions)
      .map((val) => ({ code: val as Region, name: regions[val] }));
  }
}
