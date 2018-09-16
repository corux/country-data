#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import * as program from "commander";
import * as process from "process";
import * as cheerio from "cheerio";
import * as countryjs from "countryjs";
import * as stableStringify from "json-stable-stringify";
import Axios from "axios";

program
  .option("--destination <path>", "Destination folder for generated files.")
  .parse(process.argv);

if (!fs.existsSync(program.destination)) {
  console.log("Destination does not exist: " + program.destination);
  process.exit(1);
}

const stringify = (obj: any) => stableStringify(obj, { space: 2 });

namespace Helpers {
  export function fixCountryName(name: string): string {
    const fixedNames = {
      "Korea, Süd": "Südkorea",
      "Korea, Nord": "Nordkorea",
      "Kongo, Demokratische Republik": "Demokratische Republik Kongo",
      "Kongo, Republik": "Republik Kongo",
      "Taiwan": "Republic of China",
      "China": "People's Republic of China",
      "Osttimor / Timor-Leste": "Osttimor",
    };
    return fixedNames[name] || name.replace(/[\u00AD]+/g, "");
  }

  export function getAlternativeNames(name: string): string {
    const altNames = {
      "Vereinigtes Königreich": ["England", "Großbritannien"],
      "Vereinigte Staaten": ["USA"],
      "Volksrepublik China": ["China"],
      "Republik China": ["Taiwan"],
      "People's Republic of China": ["China"],
      "Republic of China": ["Taiwan"],
      "Osttimor": ["Timor-Leste"]
    };
    return altNames[name] || [];
  }

  export function fixCapitalName(name: string): string {
    if (name.toLowerCase() === "stadtstaat") {
      return undefined;
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
        country.borders = (countryJsData.borders || [])
          .filter(border => data.find(n => n.iso3 === border));
      }
    }

    return data.filter((val) => val.iso3);
  }

  export async function german(anthemUrls: { [iso: string]: string }): Promise<any> {
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
          longName: Helpers.fixCountryName(get(1)),
          altNames: Helpers.getAlternativeNames(name),
          capital: Helpers.fixCapitalName(get(2)),
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
        let adjectives = data[isoCode].adjectives || [];
        const adjective = td.last().text().trim()
          .replace(/\((.*)\)/, ",$1,")
          .replace(/\[(.*)\]/, ",$1,")
          .replace(" oder ", ",")
          .replace(/bis [0-9]*:/i, "");
        adjectives = adjectives
          .concat(adjective.split(","))
          .map(val => val.trim())
          .filter(val => val.length > 0 && val.match(/^[a-z]/i));
        if (adjectives.length) {
          data[isoCode].adjectives = adjectives;
        }
      }
    }

    // amend with anthem information
    $ = cheerio.load((await Axios.get("https://de.wikipedia.org/wiki/Liste_der_Nationalhymnen")).data);
    const anthemData = $(".wikitable").first().find("tbody tr:not(:first-child)").map((i, elem) => {
      const get = position => {
        let text = $(elem).children().eq(position).text();
        text = text.split("\n")[0];
        text = text.replace(/\[.*\]/, "");
        return text;
      };
      const getName = () => {
        const text = $(elem).children().eq(0).children("a").text().replace(/\s/, " ");
        return text;
      };
      const getAudio = () => {
        const src = $(elem).find("audio source:not([data-transcodekey])").attr("src");
        return src ? `https:${src}` : undefined;
      };
      return {
        name: getName(),
        anthemName: Helpers.fixAnthemName(get(2) || get(1)),
        url: getAudio()
      };
    }).get();

    anthemData.forEach((anthem) => {
      const country: any = Object.values(data)
        .find((n: any) => [n.name, n.longName].concat(n.altNames).indexOf(anthem.name) !== -1);
      if (country) {
        country.anthemName = anthem.anthemName;
        if (anthem.url) {
          anthemUrls[country.iso3] = anthem.url;
        }
      }
    });

    return data;
  }

  export async function english(isoCodes: string[], anthemUrls: { [iso: string]: string }): Promise<any> {
    let $ = cheerio.load((await Axios.get("https://en.wikipedia.org/wiki/List_of_national_anthems")).data);
    const anthemData = $(".wikitable").find("tbody tr").map((i, elem) => {
      const get = position => {
        let text = $(elem).children().eq(position).text();
        text = text.split("\n")[0];
        text = text.replace(/\[.*\]/, "");
        return text;
      };
      const getName = () => {
        const text = $(elem).children().eq(0).children("a").first().text();
        const mapping = {
          "Bahamas": "The Bahamas",
          "Macedonia": "Republic of Macedonia",
          "Micronesia": "Federated States of Micronesia",
        };
        return mapping[text] || text;
      };
      const getAudio = () => {
        const src = $(elem).find("audio source:not([data-transcodekey])").attr("src");
        return src ? `https:${src}` : undefined;
      };
      const getAnthemName = () => {
        const match = get(1).match(/"([^\"]*)"(?:.*\("([^\"]*)"\))?/);
        if (!match) {
          return undefined;
        }

        return match[2] || match[1];
      };
      return {
        name: getName(),
        anthemName: getAnthemName(),
        url: getAudio()
      };
    }).get();

    $ = cheerio.load((await Axios.get("https://en.wikipedia.org/wiki/List_of_adjectival_and_demonymic_forms_for_countries_and_nations")).data);
    const adjectiveData = $(".wikitable").find("tbody tr:not(:first-child)").map((i, elem) => {
      const get = position => {
        let text = $(elem).children().eq(position).text();
        text = text.split("\n")[0];
        text = text.replace(/\[.*\]/, "");
        return text;
      };
      const getName = () => {
        let text = $(elem).children().eq(0).find("a").first().text();
        text = text.split(",").reverse().join(" ").trim();
        const mapping = {
          "United States of America": "United States",
          "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
          "Cabo Verde": "Cape Verde",
          "China": "People's Republic of China",
          "Taiwan": "Republic of China",
        };
        return mapping[text] || text;
      };
      const getAdjectives = () => {
        let sep = " or ";
        if (get(1).indexOf(sep) === -1) {
          sep = ",";
        }
        return get(1).split(sep).map(n => n.trim()).filter(n => !!n);
      };
      return {
        name: getName(),
        adjectives: getName() === "Republic of the Congo" ? ["Congolese"] : getAdjectives(),
      };
    }).get();

    const data = {};
    countryjs.all().filter((val) => isoCodes.indexOf(val.ISO.alpha3) !== -1)
      .forEach((val) => {
        if ((val.ISO.alpha3 === "GBR" && val.name !== "United Kingdom")
          || (val.ISO.alpha3 === "HUN" && !val.name)) {
          // skip duplicate iso codes from countryjs
          return;
        }
        const name = Helpers.fixCountryName(val.name);
        const country: any = data[val.ISO.alpha3] = {
          name: name,
          capital: Helpers.fixCapitalName(val.capital),
          // altNames: Helpers.getAlternativeNames(name)
        };
        const anthem = anthemData.find((a) => a.name === country.name);
        if (anthem) {
          country.anthemName = anthem.anthemName;
          if (anthem.url) {
            anthemUrls[val.ISO.alpha3] = anthem.url;
          }
        }
        const adjective = adjectiveData.find(n => n.name === country.name);
        if (adjective) {
          country.adjectives = adjective.adjectives;
        }
      });

    return data;
  }

  export async function french(isoCodes: string[], anthemUrls: { [iso: string]: string }): Promise<any> {
    let $ = cheerio.load((await Axios.get("https://fr.wikipedia.org/wiki/Liste_des_hymnes_nationaux")).data);
    var anthemData = $(".wikitable").find("tbody tr").map((i, elem) => {
      const get = position => {
        let text = $(elem).children().eq(position).text();
        text = text.split("\n")[0];
        text = text.replace(/\[.*\]/, "");
        return text;
      };
      const getName = () => {
        const text = $(elem).children().eq(0).children("a").first().text();
        const mapping = {
          "Bahamas": "The Bahamas",
          "Macedonia": "Republic of Macedonia",
          "Micronesia": "Federated States of Micronesia",
        };
        return mapping[text] || text;
      };
      const getAudio = () => {
        const src = $(elem).find("audio source:not([data-transcodekey])").attr("src");
        return src ? `https:${src}` : undefined;
      };
      const getAnthemName = () => {
        const match = get(1).match(/"([^\"]*)"(?:.*\("([^\"]*)"\))?/);
        if (!match) {
          return undefined;
        }

        return match[2] || match[1];
      };
      return {
        name: getName(),
        anthemName: getAnthemName(),
        url: getAudio()
      };
    }).get();

    const data = {};
    countryjs.all().filter((val) => isoCodes.indexOf(val.ISO.alpha3) !== -1)
      .forEach((val) => {
        if ((val.ISO.alpha3 === "GBR" && val.name !== "United Kingdom")
          || (val.ISO.alpha3 === "HUN" && !val.name)) {
          // skip duplicate iso codes from countryjs
          return;
        }
        const country: any = data[val.ISO.alpha3] = {
          name: Helpers.fixCountryName(val.translations.fr),
          capital: Helpers.fixCapitalName(val.capital),
          adjectives: ("").split(",")
            .map((val) => val.trim())
            .filter((val) => !!val),
        };
        const anthem = anthemData.find((a) => a.name === country.name);
        if (anthem) {
          country.anthemName = anthem.anthemName;
          if (anthem.url) {
            anthemUrls[val.ISO.alpha3] = anthem.url;
          }
        }
      });

    return data;
  }
}

Parsers.generic().then((generic) => {
  const isoCodes = generic.map((val) => val.iso3);
  const anthemUrls = {};
  const locales = [
    { promise: Parsers.german(anthemUrls), lang: "de" },
    { promise: Parsers.english(isoCodes, anthemUrls), lang: "en" },
    { promise: Parsers.french(isoCodes, anthemUrls), lang: "fr" },
  ];
  locales.forEach((def) => {
    def.promise.then((val) => {
      const file = path.join(process.cwd(), program.destination, `i18n/${def.lang}.json`);
      const data = JSON.parse(fs.readFileSync(file).toString());
      data.countries = {};
      isoCodes.forEach((iso) => {
        if (val[iso]) {
          data.countries[iso] = val[iso];
        }
      })
      fs.writeFile(file, stringify(data), "utf8", () => { });
    });
  });

  // amend generic data with anthem URLs
  Promise.all(locales.map((val) => val.promise)).then(() => {
    generic.forEach((val) => {
      val.anthem = anthemUrls[val.iso3];
      if (!val.anthem && val.iso2) {
        val.anthem = `http://www.nationalanthems.info/${val.iso2.toLowerCase()}.mp3`;
      }
    });

    fs.writeFile(path.join(process.cwd(), program.destination, "generic.json"),
      stringify(generic), "utf8", () => { });
  });
});
