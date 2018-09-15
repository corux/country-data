#!/usr/bin/env ts-node

import * as fs from "fs";
import * as request from "request";
import * as path from "path";
import * as program from "commander";
import * as process from "process";
import * as cheerio from "cheerio";
import * as countryjs from "countryjs";
import Axios from "axios";

program
  .option("--destination <path>", "Destination folder for generated files.")
  .parse(process.argv);

if (!fs.existsSync(program.destination)) {
  console.log("Destination does not exist: " + program.destination);
  process.exit(1);
}

namespace Helpers {
  export function fixCountryName(name: string): string {
    const fixedNames = {
      "Korea, Süd": "Südkorea",
      "Korea, Nord": "Nordkorea",
      "Kongo, Demokratische Republik": "Demokratische Republik Kongo",
      "Kongo, Republik": "Republik Kongo"
    };
    return fixedNames[name] || name;
  }

  export function getAlternativeNames(name: string): string {
    const altNames = {
      "Vereinigtes Königreich": ["England", "Großbritannien"],
      "Vereinigte Staaten": ["USA"],
      "Volksrepublik China": ["China"],
      "Republik China": ["Taiwan"]
    };
    return altNames[name] || [];
  }

  export function fixCapitalName(name: string): string {
    if (name.toLowerCase() === "stadtstaat") {
      return null;
    }

    return name;
  }

  export function fixAnthemName(name: string): string {
    if (["nationalhymne", "hymne"].indexOf(name.toLowerCase()) !== -1) {
      return;
    }

    return name;
  }

  export function getRegionCode(countryJsData: { region: string, subregion: string }): string {
    switch (countryJsData.subregion) {
      case "South America":
        return "SA";
      case "North America":
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
}

namespace Parsers {
  export async function generic(): Promise<any> {
    // parse wikipedia table
    let $ = cheerio.load((await Axios.get("https://de.wikipedia.org/wiki/Liste_der_Staaten_der_Erde")).data);
    const data = $(".wikitable tbody tr:not([class])").map((i, elem) => {
      const get = position => {
        const text = $(elem).children().eq(position);
        text.find("br").replaceWith("\n");
        return text.text().split("\n")[0].replace(/\[.*\]/, "");
      };
      const toNumber = value => {
        value = value.replace(/\./g, "");
        return parseInt(value, 10);
      };
      const getFlag = size => "https:" + $(elem).children().eq(6).find("img").attr("src").replace(/\/[0-9]*px-/, "/" + size + "px-");
      const getFlagSvg = () => "https:" + $(elem).children().eq(6).find("img").attr("src").replace("/thumb/", "/").replace(/\/[^\/]*$/, "");
      const data = {
        iso3: /^[a-zA-Z]{3}$/.test(get(7)) ? get(7) : undefined,
        iso2: /^[a-zA-Z]{2}$/.test(get(8)) ? get(8) : undefined,
        population: toNumber(get(3)),
        // area: toNumber(get(4)),
        // populationPerSquareKm: toNumber(get(5)),
        flag: {
          svgUrl: getFlagSvg(),
          smallImageUrl: getFlag(720),
          largeImageUrl: getFlag(1200),
        },
      };
      return data;
    }).get() as any;

    // amend with information from countryjs
    for (const country of data) {
      const countryJsData = (countryjs as any).info(country.iso3, "ISO3");
      if (countryJsData) {
        country.region = Helpers.getRegionCode(countryJsData);
        country.languages = countryJsData.languages;
        country.currencies = countryJsData.currencies;
        country.borders = countryJsData.borders;
      }
    }

    return data.filter((val) => val.iso3);
  }

  export async function german(): Promise<any> {
    // parse wikipedia country data
    let $ = cheerio.load((await Axios.get("https://de.wikipedia.org/wiki/Liste_der_Staaten_der_Erde")).data);
    const data = {};
    $(".wikitable tbody tr:not([class])").map((i, elem) => {
      const get = position => {
        const text = $(elem).children().eq(position);
        text.find("br").replaceWith("\n");
        return text.text().split("\n")[0].replace(/\[.*\]/, "");
      };
      const iso = get(7);
      if (iso) {
        const name = Helpers.fixCountryName(get(0));
        data[iso] = {
          name: name,
          longName: get(1),
          altNames: Helpers.getAlternativeNames(name),
          capital: Helpers.fixCapitalName(get(2)),
          adjectives: [],
        };
      }
    });

    // amend with adjective information
    $ = cheerio.load((await Axios.get("https://de.wikipedia.org/wiki/Wikipedia:Namenskonventionen/Staaten")).data);
    const adjectiveRows = $(".wikitable tbody").find("tr:not(.hintergrundfarbe6)").get();
    let isoCode;
    for (const row of adjectiveRows) {
      const td = $(row).find("td");
      const match = td.first().text().trim().match(/^[A-Z]{2}.*([A-Z]{3})/i);
      if (match && match[1]) {
        isoCode = match[1];
      }
      if (isoCode && td.length >= 4 && data[isoCode]) {
        let adjectives = data[isoCode].adjectives;
        const adjective = td.last().text().trim()
          .replace(/\((.*)\)/, ",$1,")
          .replace(/\[(.*)\]/, ",$1,")
          .replace(" oder ", ",")
          .replace(/bis [0-9]*:/i, "");
        adjectives = adjectives.concat(adjective.split(","));

        data[isoCode].adjectives = adjectives
          .map(val => val.trim())
          .filter(val => val.length > 0 && val.match(/^[a-z]/i));
      }
    }

    return data;
  }

  export async function english(isoCodes: string[]): Promise<any> {
    const data = {};
    countryjs.all().filter((val) => isoCodes.indexOf(val.ISO.alpha3) !== -1)
      .forEach((val) => {
        if ((val.ISO.alpha3 === "GBR" && val.name !== "United Kingdom")
          || (val.ISO.alpha3 === "HUN" && !val.name)) {
          // skip duplicate iso codes from countryjs
          return;
        }
        data[val.ISO.alpha3] = {
          name: val.name,
          capital: val.capital,
          adjectives: (val.demonym || "").split(",")
            .map((val) => val.trim())
            .filter((val) => !!val),
        };
      });
    return data;
  }
}

Parsers.generic().then((generic) => {
  fs.writeFile(path.join(process.cwd(), program.destination, "generic.json"),
    JSON.stringify(generic, null, 2), "utf8", () => { });
  const isoCodes = generic.map((val) => val.iso3);

  [
    { promise: Parsers.german(), lang: "de" },
    { promise: Parsers.english(isoCodes), lang: "en" },
  ].forEach((def) => {
    def.promise.then((val) => {
      const file = path.join(process.cwd(), program.destination, `i18n/${def.lang}.json`);
      const data = JSON.parse(fs.readFileSync(file).toString());
      data.countries = val;
      fs.writeFile(file, JSON.stringify(data, null, 2), "utf8", () => { });
    });
  });
});
