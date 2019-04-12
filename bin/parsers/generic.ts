import Axios from "axios";
import * as cheerio from "cheerio";
import * as countryjs from "countryjs";

// tslint:disable:object-literal-sort-keys
export function getFromCountryJs(isoCodes: string[]): any[] {
  // Data missing in countryjs
  const additional = [
    {
      ISO: { alpha3: "ABC" }, name: "Abkhazia", capital: "Sukhumi",
      translations: { fr: "Abkhazie" }, borders: ["GEO", "RUS"],
    },
    {
      ISO: { alpha3: "AND" }, name: "Andorra", capital: "Andorra la Vella",
      translations: { fr: "Andorre" }, borders: ["ESP", "FRA"],
    },
    {
      ISO: { alpha3: "XXK" }, name: "Kosovo", capital: "Pristina",
      translations: { fr: "Kosovo" }, borders: ["MNE", "ALB", "MKD", "SRB"],
    },
    {
      ISO: { alpha3: "MNE" }, name: "Montenegro", capital: "Podgorica",
      translations: { fr: "Monténégro" }, borders: ["ALB", "XXK", "SRB", "BIH", "HRV"],
    },
    {
      ISO: { alpha3: "MMR" }, name: "Myanmar", capital: "Nay Pyi Taw",
      translations: { fr: "Birmanie" }, borders: ["THA", "LAO", "CHN", "BGD", "IND"],
    },
    {
      ISO: { alpha3: "PSE" }, name: "Palestine", capital: "East Jerusalem",
      translations: { fr: "Palestine" }, borders: ["ISR", "JOR"],
    },
    {
      ISO: { alpha3: "SRB" }, name: "Serbia", capital: "Belgrade",
      translations: { fr: "Serbie" }, borders: ["HRV", "XXK", "MNE", "BIH", "MKD", "BGR", "ROU", "HUN"],
    },
    {
      ISO: { alpha3: "SOS" }, name: "South Ossetia", capital: "Tskhinvali",
      translations: { fr: "Ossétie du Sud" }, borders: ["GEO", "RUS"],
    },
    {
      ISO: { alpha3: "VAT" }, name: "Vatican City", capital: "Vatican City",
      translations: { fr: "Vatican" }, borders: ["ITA"],
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
        "Uganda": "Ouganda",
        "Trinité et Tobago": "Trinité-et-Tobago",
        "Surinam": "Suriname",
        "Cap Vert": "Cap-Vert",
        "Congo (Rép. dém.)": "République démocratique du Congo",
        "Guinée-Équatoriale": "Guinée équatoriale",
        "Guyane": "Guyana",
        "Île Maurice": "Maurice",
        "Nigéria": "Nigeria",
        "Saint-Lucie": "Sainte-Lucie",
        "Arabie Saoudite": "Arabie saoudite",
      };
      val.translations.fr = mapping[val.translations.fr] || val.translations.fr;
    }
  });
  return data;
}

export function getRegionCode(countryJsData: { region: string, subregion: string }): string {
  switch (countryJsData.subregion) {
    case "South America":
      return "SA";
    case "Northern America":
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
}

export async function generic(): Promise<any> {
  // parse wikipedia table
  const $ = cheerio.load((await Axios.get("https://de.wikipedia.org/wiki/Liste_der_Staaten_der_Erde")).data);
  const data = $(".wikitable tbody tr:not([class])").map((i, elem) => {
    const get = (position) => {
      const text = $(elem).children().eq(position);
      text.find("br").replaceWith("\n");
      return text.text().split("\n")[0].replace(/\[.*\]/, "");
    };
    const toNumber = (value) => {
      value = value.replace(/\./g, "");
      return parseInt(value, 10);
    };
    const getFlag = (size) => "https:" + $(elem).children().eq(6)
      .find("img").attr("src").replace(/\/[0-9]*px-/, "/" + size + "px-");
    const getFlagSvg = () => "https:" + $(elem).children().eq(6)
      .find("img").attr("src").replace("/thumb/", "/").replace(/\/[^\/]*$/, "");
    const countryData = {
      flag: {
        largeImageUrl: getFlag(1200),
        smallImageUrl: getFlag(720),
        svgUrl: getFlagSvg(),
      },
      iso2: /^[a-zA-Z]{2}$/.test(get(8)) ? get(8) : undefined,
      iso3: /^[a-zA-Z]{3}$/.test(get(7)) ? get(7) : undefined,
      population: toNumber(get(3)),
      // area: toNumber(get(4)),
      // populationPerSquareKm: toNumber(get(5)),
    };
    return countryData;
  }).get() as any;

  // amend with information from countryjs
  const countryJsList = getFromCountryJs(data.map((n) => n.iso3));
  for (const country of data) {
    const countryJsData = countryJsList.find((n) => n.ISO.alpha3 === country.iso3);
    if (countryJsData) {
      country.region = getRegionCode(countryJsData);
      country.languages = countryJsData.languages;
      country.currencies = countryJsData.currencies;
      country.borders = (countryJsData.borders || [])
        .filter((border) => data.find((n) => n.iso3 === border));
    }
  }

  return data.filter((val) => val.iso3);
}
