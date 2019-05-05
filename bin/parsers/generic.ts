import Axios from "axios";
import * as cheerio from "cheerio";
import * as countryjs from "countryjs";

declare interface ICountryJsType {
  ISO: { alpha3: string };
  region: string;
  subregion: string;
}

export function getFromCountryJs(isoCodes: string[]): any[] {
  // Data missing in countryjs
  const additional = [
    {
      ISO: { alpha3: "ABC" }, borders: ["GEO", "RUS"], capital: "Sukhumi",
      name: "Abkhazia", region: "AS", subregion: "Eastern Europe", translations: { fr: "Abkhazie" },
    },
    {
      ISO: { alpha3: "AND" }, borders: ["ESP", "FRA"], capital: "Andorra la Vella",
      name: "Andorra", region: "EU", subregion: "Southern Europe", tld: [".ad"], translations: { fr: "Andorre" },
    },
    {
      ISO: { alpha3: "XXK" }, borders: ["MNE", "ALB", "MKD", "SRB"], capital: "Pristina",
      name: "Kosovo", region: "EU", subregion: "Southern Europe", translations: { fr: "Kosovo" },
    },
    {
      ISO: { alpha3: "MNE" }, borders: ["ALB", "XXK", "SRB", "BIH", "HRV"], capital: "Podgorica",
      name: "Montenegro", region: "EU", tld: [".me"], translations: { fr: "Monténégro" },
    },
    {
      ISO: { alpha3: "MMR" }, borders: ["THA", "LAO", "CHN", "BGD", "IND"], capital: "Nay Pyi Taw",
      name: "Myanmar", region: "AS", tld: [".mm"], translations: { fr: "Birmanie" },
    },
    {
      ISO: { alpha3: "PSE" }, borders: ["ISR", "JOR"], capital: "East Jerusalem",
      name: "Palestine", region: "AS", subregion: "Western Asia", tld: [".ps"], translations: { fr: "Palestine" },
    },
    {
      ISO: { alpha3: "SRB" }, borders: ["HRV", "XXK", "MNE", "BIH", "MKD", "BGR", "ROU", "HUN"], capital: "Belgrade",
      name: "Serbia", region: "EU", subregion: "Southern Europe", tld: [".rs"], translations: { fr: "Serbie" },
    },
    {
      ISO: { alpha3: "SOS" }, borders: ["GEO", "RUS"], capital: "Tskhinvali",
      name: "South Ossetia", region: "AS", subregion: "Central Asia", translations: { fr: "Ossétie du Sud" },
    },
    {
      ISO: { alpha3: "VAT" }, borders: ["ITA"], capital: "Vatican City",
      name: "Vatican City", region: "EU", subregion: "Southern Europe", tld: [".va"], translations: { fr: "Vatican" },
    },
  ];

  const data = [].concat(countryjs.all(), additional)
    .filter((val) => isoCodes.indexOf(val.ISO.alpha3) !== -1)
    .filter((val) => (!(val.ISO.alpha3 === "GBR" && val.name !== "United Kingdom")
      && !(val.ISO.alpha3 === "HUN" && !val.name)));
  additional.forEach((val) => {
    val.borders.forEach((border) => {
      const country = data.find((n) => n.ISO.alpha3 === border);
      if (country.borders.indexOf(val.ISO.alpha3) === -1) {
        country.borders.push(val.ISO.alpha3);
      }
    });
  });
  data.forEach((val) => {
    if (val.translations && val.translations.fr) {
      const mapping = {
        "Arabie Saoudite": "Arabie saoudite",
        "Cap Vert": "Cap-Vert",
        "Congo (Rép. dém.)": "République démocratique du Congo",
        "Guinée-Équatoriale": "Guinée équatoriale",
        "Guyane": "Guyana",
        "Nigéria": "Nigeria",
        "Saint-Lucie": "Sainte-Lucie",
        "Surinam": "Suriname",
        "Trinité et Tobago": "Trinité-et-Tobago",
        "Uganda": "Ouganda",
        "Île Maurice": "Maurice",
      };
      val.translations.fr = mapping[val.translations.fr] || val.translations.fr;
    }
  });
  return data;
}

function getRegionCode(countryJsData: ICountryJsType): string {
  const regions = {
    "Central Asia": "143",
    "Eastern Asia": "030",
    "Eastern Europe": "151",
    "Southern Europe": "039",
  };
  return regions[countryJsData.subregion];
}

function getContinentCode(countryJsData: ICountryJsType): string {
  switch (countryJsData.subregion) {
    case "South America":
      return "SA";
    case "Northern America":
    case "Caribbean":
    case "Central America":
      return "NA";
  }

  switch (countryJsData.region) {
    case "Americas":
      return "AM";
    case "Africa":
      return "AF";
    case "Europe":
      return "EU";
    case "Asia":
      return "AS";
    case "Oceania":
      return "OC";
  }

  return countryJsData.region;
}

export async function generic(): Promise<any> {
  // parse wikipedia table
  let $ = cheerio.load((await Axios.get("https://de.wikipedia.org/wiki/Liste_der_Staaten_der_Erde")).data);
  const data = $(".wikitable tbody tr:not([class])").map((i, elem) => {
    const get = (position) => {
      const text = $(elem).children().eq(position);
      text.find("br").replaceWith("\n");
      return text.text().split("\n")[0].replace(/\[.*\]/, "");
    };
    const toNumber = (value) => {
      value = value.replace(/\./g, "").replace(/\,/g, ".");
      return parseFloat(value);
    };
    const getFlag = (size) => "https:" + $(elem).children().eq(6)
      .find("img").attr("src").replace(/\/[0-9]*px-/, "/" + size + "px-");
    const getFlagSvg = () => "https:" + $(elem).children().eq(6)
      .find("img").attr("src").replace("/thumb/", "/").replace(/\/[^\/]*$/, "");
    const countryData = {
      anthem: {},
      area: toNumber(get(4)),
      flag: {
        largeImageUrl: getFlag(1200),
        smallImageUrl: getFlag(720),
        svgUrl: getFlagSvg(),
      },
      iso2: /^[a-zA-Z]{2}$/.test(get(8)) ? get(8) : undefined,
      iso3: /^[a-zA-Z]{3}$/.test(get(7)) ? get(7) : undefined,
      population: toNumber(get(3)),
      populationPerSquareKm: toNumber(get(5)),
    };
    return countryData;
  }).get();

  // Get region codes
  $ = cheerio.load((await Axios.get("https://unstats.un.org/unsd/methodology/m49/")).data);
  $("#GeoGroupsENG").find("tr[data-tt-id]").each((i, elem) => {
    const code = $(elem).data("tt-parent-id");
    const iso = $(elem).children().eq(2).text();
    const country = data.find((val) => val.iso3 === iso);
    if (iso && country) {
      country.region = `${code}`;
    }
  });

  // amend with information from countryjs
  const countryJsList = getFromCountryJs(data.map((n) => n.iso3));
  for (const country of data) {
    const countryJsData = countryJsList.find((n) => n.ISO.alpha3 === country.iso3) || {};
    country.continent = getContinentCode(countryJsData);
    country.region = country.region || getRegionCode(countryJsData);
    country.languages = countryJsData.languages || [];
    country.currencies = countryJsData.currencies || [];
    country.borders = (countryJsData.borders || [])
      .filter((border) => data.find((n) => n.iso3 === border)) || [];
    country.tld = countryJsData.tld || [];
  }

  return data.filter((val) => val.iso3);
}
