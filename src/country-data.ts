import { getCountries, ICountry } from "./countries";
import { getRegions, IRegion } from "./regions";

export class CountryData {
  public constructor(private readonly lang: string) { }

  public getCountries(): ICountry[] {
    return getCountries(this.lang);
  }

  public getRegions(): IRegion[] {
    return getRegions(this.lang);
  }
}
