import { CountryData } from "../src/";

describe("Invalid Languages", () => {
  const countryData = new CountryData("zz");

  test("should return no regions", () => {
    expect(countryData.getRegions().length).toBe(0);
  });

  test("should return only generic info", () => {
    expect(countryData.getCountries().length).toBeGreaterThan(0);
    expect(countryData.getCountries().map((country) => country.name).filter((country) => country).length).toBe(0);
  });
});
