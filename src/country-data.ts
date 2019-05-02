import { getCountries, ICountry } from "./countries";
import { data } from "./data";
import { getRegions, IRegion } from "./regions";

export class CountryData {
  public static getSupportedLanguages(): string[] {
    return Object.keys(data.i18n);
  }

  public constructor(private readonly lang: string) {
    this.lang = lang.substring(0, 2);
  }

  public getCountries(): ICountry[] {
    return getCountries(this.lang);
  }

  public getRegions(): IRegion[] {
    return getRegions(this.lang);
  }
}
