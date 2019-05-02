import { CountryData, Region } from "../src/";

describe("Complete Data", () => {

  describe("Language independant data", () => {
    const countryData = new CountryData("en");

    countryData.getCountries().forEach((country) => {
      test(`Country contains SVG flag (${country.iso3})`, () => {
        expect(country.flag.svgUrl).toBeTruthy();
      });

      test(`Country contains valid region (${country.iso3})`, () => {
        expect(country.region).toBeTruthy();
        expect(Object.values(Region).includes(country.region)).toBeTruthy();
      });
    });
  });

  CountryData.getSupportedLanguages().forEach((lang) => {

    describe(`Language: ${lang}`, () => {
      const countryData = new CountryData(lang);

      countryData.getRegions().forEach((region) => {
        test(`Region contains name (${region.code})`, () => {
          expect(region.name).toBeTruthy();
        });
      });

      countryData.getCountries().forEach((country) => {
        test(`Country contains name (${country.iso3})`, () => {
          expect(country.name).toBeTruthy();
        });
      });
    });
  });
});
