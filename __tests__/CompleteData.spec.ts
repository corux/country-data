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
      test(`Country contains all required data (${country.iso3})`, () => {
        expect(country.iso3).toBeTruthy();
        expect(country.flag.svgUrl).toBeTruthy();
        expect(country.flag.smallImageUrl).toBeTruthy();
        expect(country.flag.largeImageUrl).toBeTruthy();
        expect(country.anthem.url).toBeTruthy();
        expect(country.anthem.subtitles).toBeTruthy();
        expect(country.region).toBeTruthy();
        expect(country.area).toBeTruthy();
        expect(country.population).toBeTruthy();
        expect(country.populationPerSquareKm).toBeTruthy();
        expect(country.tld).toBeDefined();
        expect(country.currencies).toBeDefined();
        expect(country.borders).toBeDefined();

        expect(country.continent).toBeTruthy();
        expect(Object.values(ContinentCode).includes(country.continent.code)).toBeTruthy();
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
        test(`Country contains all required localized data (${country.iso3})`, () => {
          expect(country.name).toBeTruthy();
          expect(country.altNames).toBeDefined();
          expect(country.adjectives).toBeDefined();
        });
      });
    });
  });
});
