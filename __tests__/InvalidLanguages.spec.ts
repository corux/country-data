import { CountryData } from "../src/";

describe("Invalid Languages", () => {
  const countryData = new CountryData("zz");

  test("should return continents without localized data", () => {
    expect(countryData.getContinents().length).toBeGreaterThan(0);
    expect(countryData.getContinents().map((continent) => continent.name).filter((name) => !!name).length).toBe(0);
  });

  test("should return regions without localized data", () => {
    expect(countryData.getRegions().length).toBeGreaterThan(0);
    expect(countryData.getRegions().map((region) => region.name).filter((name) => !!name).length).toBe(0);
  });

  test("should return only generic info", () => {
    expect(countryData.getCountries().length).toBeGreaterThan(0);
    expect(countryData.getCountries().map((country) => country.name).filter((name) => !!name).length).toBe(0);
  });
});
