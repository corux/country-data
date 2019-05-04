import { ContinentCode, CountryData } from "../src/";

describe("Complete Data", () => {

  describe("Language independant data", () => {
    const countryData = new CountryData("en");

    test("No country is linked to America continent", () => {
      const americas = countryData.getCountries()
        .map((country) => country.continent)
        .filter((continent) => continent.code === ContinentCode.AMERICAS);
      expect(americas.length).toBe(0);
    });

    test("No duplicate countries", () => {
      const countries = countryData.getCountries()
        .map((country) => country.iso3);
      const removedDuplicates = countries.filter((n, i) => countries.indexOf(n) === i);
      expect(countries).toEqual(removedDuplicates);
    });

    countryData.getCountries().forEach((country) => {
      test(`Country contains SVG flag (${country.iso3})`, () => {
        expect(country.flag.svgUrl).toBeTruthy();
      });

      test(`Country contains anthem url (${country.iso3})`, () => {
        expect(country.anthem.url).toBeTruthy();
      });

      test(`Country contains valid continent (${country.iso3})`, () => {
        expect(country.continent).toBeTruthy();
        expect(Object.values(ContinentCode).includes(country.continent.code)).toBeTruthy();
      });

      test(`Country contains valid region (${country.iso3})`, () => {
        expect(country.region).toBeTruthy();
      });
    });
  });

  CountryData.getSupportedLanguages().forEach((lang) => {

    describe(`Language: ${lang}`, () => {
      const countryData = new CountryData(lang);

      countryData.getContinents().forEach((continent) => {
        test(`Continent contains name (${continent.code})`, () => {
          expect(continent.name).toBeTruthy();
        });
      });

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
