// tslint:disable
import Axios from "axios";
import * as cheerio from "cheerio";
import * as program from "commander";
import * as countryjs from "countryjs";
import * as fs from "fs";
import * as stableStringify from "json-stable-stringify";
import * as path from "path";
import * as process from "process";

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
      "Osttimor / Timor-Leste": "Osttimor",
      "Federated States of Micronesia": "Micronesia",
      "Republic of Macedonia": "Macedonia",
    };
    return fixedNames[name] || name.replace(/[\u00AD]+/g, "").replace(/^–$/, "") || undefined;
  }

  export function getAlternativeNames(name: string): string {
    const altNames = {
      "Vereinigtes Königreich": ["England", "Großbritannien"],
      "Vereinigte Staaten": ["USA"],
      "Volksrepublik China": ["China"],
      "Republik China": ["Taiwan"],
      "Osttimor": ["Timor-Leste"],
      "Myanmar": ["Burma"],
      "Niederlande": ["Holland"],
      "Demokratische Republik Kongo": ["Kongo"],
      "Vatikanstadt": ["Vatikan"],
      "Eswatini": ["Swaziland"],
    };
    return altNames[name];
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
}

namespace Parsers {
  function getFromCountryJs(isoCodes: string[]): any[] {
    // Data missing in countryjs
    const additional = [
      { ISO: { alpha3: "ABC" }, name: "Abkhazia", capital: "Sukhumi", translations: { fr: "Abkhazie" }, borders: ["GEO", "RUS"] },
      { ISO: { alpha3: "AND" }, name: "Andorra", capital: "Andorra la Vella", translations: { fr: "Andorre" }, borders: ["ESP", "FRA"] },
      { ISO: { alpha3: "XXK" }, name: "Kosovo", capital: "Pristina", translations: { fr: "Kosovo" }, borders: ["MNE", "ALB", "MKD", "SRB"] },
      { ISO: { alpha3: "MNE" }, name: "Montenegro", capital: "Podgorica", translations: { fr: "Monténégro" }, borders: ["ALB", "XXK", "SRB", "BIH", "HRV"] },
      { ISO: { alpha3: "MMR" }, name: "Myanmar", capital: "Nay Pyi Taw", translations: { fr: "Birmanie" }, borders: ["THA", "LAO", "CHN", "BGD", "IND"] },
      { ISO: { alpha3: "PSE" }, name: "Palestine", capital: "East Jerusalem", translations: { fr: "Palestine" }, borders: ["ISR", "JOR"] },
      { ISO: { alpha3: "SRB" }, name: "Serbia", capital: "Belgrade", translations: { fr: "Serbie" }, borders: ["HRV", "XXK", "MNE", "BIH", "MKD", "BGR", "ROU", "HUN"] },
      { ISO: { alpha3: "SOS" }, name: "South Ossetia", capital: "Tskhinvali", translations: { fr: "Ossétie du Sud" }, borders: ["GEO", "RUS"] },
      { ISO: { alpha3: "VAT" }, name: "Vatican City", capital: "Vatican City", translations: { fr: "Vatican" }, borders: ["ITA"] },
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
    const countryJsList = getFromCountryJs(data.map((n) => n.iso3));
    for (const country of data) {
      const countryJsData = countryJsList.find((n) => n.ISO.alpha3 === country.iso3);
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
      const getAdjectives = (iso: string) => {
        const mapping = {
          "GBR": ["englisch"],
          "BIH": ["bosnisch", "herzegowinisch"]
        };
        return mapping[iso] || undefined;
      };
      const iso = get(7);
      if (iso) {
        const name = Helpers.fixCountryName(get(0));
        data[iso] = {
          name: name,
          longName: Helpers.fixCountryName(get(1)),
          altNames: Helpers.getAlternativeNames(name),
          capital: Helpers.fixCapitalName(get(2)),
          adjectives: getAdjectives(iso),
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
          .filter(val => val.length > 0 && val.match(/^[a-zäöüÄÖÜ]/i));
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
          "Republic of China": "Taiwan",
          "People's Republic of China": "China",
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
          "Federated States of Micronesia": "Micronesia",
          "Republic of Macedonia": "Macedonia",
          "Vatican City State": "Vatican City",
          "Eswatini (Swaziland)": "Swaziland",
        };
        return mapping[text] || text;
      };
      const getAdjectives = () => {
        let sep = " or ";
        if (get(1).indexOf(sep) === -1) {
          sep = ",";
        }
        const foundAdjectives = get(1).split(sep).map(n => n.trim()).filter(n => !!n);
        const mapping = {
          "Republic of the Congo": ["Congolese"],
        };
        return (mapping[getName()] || []).concat(foundAdjectives || []);
      };
      return {
        name: getName(),
        adjectives: getAdjectives(),
      };
    }).get();

    $ = cheerio.load((await Axios.get("https://en.wikipedia.org/wiki/List_of_sovereign_states")).data);
    const nameData = $(".wikitable").find("tbody tr:not(:first-child):not(style)").map((i, elem) => {
      if ($(elem).children().eq(0).text().indexOf("→") !== -1) {
        // Row contains link to another row -> skip
        return null;
      }
      const nameRow = $(elem).children().eq(0).text().replace(/\[[0-9a-z]*\]/, "")
        .split("–").map(n => n.trim());
      let name = $(elem).children().eq(0).find("a").first().text()
        .split(",").reverse().join(" ").trim();
      const mapping = {
        "Sahrawi Arab Democratic Republic": "Western Sahara",
        "Eswatini": "Swaziland",
      };
      const longNameMapping = {
        "Western Sahara": "Sahrawi Arab Democratic Republic",
      };
      name = mapping[name] || name;
      return {
        name: name,
        longName: longNameMapping[name] || nameRow[1],
      };
    }).get().filter(n => !!n);

    const data = {};
    getFromCountryJs(isoCodes)
      .forEach((val) => {
        const mapping = {
          "Swaziland": "Eswatini",
        };
        const name = Helpers.fixCountryName(val.name);
        const mappedName = mapping[name] || name;
        const country: any = data[val.ISO.alpha3] = {
          name: mappedName,
          capital: Helpers.fixCapitalName(val.capital),
          altNames: Helpers.getAlternativeNames(mappedName),
          longName: nameData.find(n => n.name === name).longName,
        };
        const anthem = anthemData.find((a) => a.name === name);
        if (anthem) {
          country.anthemName = anthem.anthemName;
          if (anthem.url) {
            anthemUrls[val.ISO.alpha3] = anthem.url;
          }
        }
        country.adjectives = adjectiveData.find(n => n.name === name).adjectives;
      });

    return data;
  }

  export async function french(isoCodes: string[], anthemUrls: { [iso: string]: string }): Promise<any> {
    let $ = cheerio.load((await Axios.get("https://fr.wikipedia.org/wiki/Liste_des_hymnes_nationaux")).data);
    const anthemData = $(".wikitable").find("tbody tr").map((i, elem) => {
      const get = position => {
        let text = $(elem).children().eq(position).text();
        text = text.split("\n")[0];
        text = text.replace(/\[.*\]/, "");
        return text;
      };
      const getName = () => {
        const text = $(elem).children().eq(0).find("a").text().replace(/\[.*\]/, "");
        const mapping = {
          "Salomon": "Îles Salomon",
          "République du Congo": "Congo",
          "République de Macédoine": "Macédoine",
          "États fédérés de Micronésie": "Micronésie",
          "Myanmar": "Birmanie",
        };
        return mapping[text] || text;
      };

      return {
        name: getName(),
        anthemName: get(2).trim() || get(1).trim()
      };
    }).get();

    $ = cheerio.load((await Axios.get("https://fr.wikipedia.org/wiki/Liste_de_gentilés")).data);
    const adjectiveData = $("li>b:first-of-type>a, li>a:has(b)").map((i, elem) => {
      const name = $(elem).text().trim();
      const adjectives = $(elem).closest("li").find("i").first().text().split(" ou ")
        .map(n => n.split(",").map(m => m.trim().replace(/^-$/, "")).filter(n => !!n));
      const mapping = {
        "Libéria": "Liberia",
      };
      return {
        name: mapping[name] || name,
        adjectives: adjectives.map(n => n[0]).filter(n => !!n),
      };
    }).get();

    const data = {};
    getFromCountryJs(isoCodes)
      .forEach((val) => {
        const getAltNames = () => {
          const mapping = {
            "GBR": ["Angleterre", "Grande Bretagne"],
            "MMR": ["Myanmar"],
          };
          return mapping[val.ISO.alpha3] || undefined;
        };
        const country: any = data[val.ISO.alpha3] = {
          name: Helpers.fixCountryName(val.translations.fr),
          altNames: getAltNames(),
        };
        const anthem = anthemData.find((a) => a.name === country.name);
        if (anthem) {
          country.anthemName = anthem.anthemName;
          if (anthem.url) {
            anthemUrls[val.ISO.alpha3] = anthem.url;
          }
        }
        const getAdditionalAdjectives = (iso: string) => {
          const mapping = {
            "GBR": ["anglaise"]
          }
          return mapping[iso] || [];
        };
        const mapping = {
          "République démocratique du Congo": "Congo",
        };
        const adjective = adjectiveData.find((a) => a.name === (mapping[country.name] || country.name));
        if (adjective && adjective.adjectives.length) {
          country.adjectives = adjective.adjectives.map(n => n.toLowerCase()).concat(getAdditionalAdjectives(val.ISO.alpha3));
        }
      });

    return data;
  }

  export async function spanish(isoCodes: string[]): Promise<any> {
    let $ = cheerio.load((await Axios.get("https://es.wikipedia.org/wiki/ISO_3166-1")).data);
    const countryData = $(".wikitable.sortable tbody").first().find("tr").map((i, elem) => {
      const get = position => {
        let text = $(elem).children().eq(position).text();
        text = text.split("\n")[0];
        text = text.replace(/\[.*\]/, "");
        return text;
      };
      const name = $(elem).children().eq(0).find("a").text().replace(/\[.*\]/, "")
        .split(",").reverse().join(" ").trim();
      const mapping = {
        "Taiwán (República de China)": "Taiwán",
      };
      const longName = (() => {
        let text = get(1).split(",").reverse().join(" ").trim();
        const match = text.match(/(.*)\((.*)\)(.*)/);
        if (match && match[2]) {
          text = `${match[2]} ${match[1]} ${match[3]}`.trim();
        }
        while (text.indexOf("  ") !== -1) {
          text = text.replace("  ", " ");
        }
        return text.trim();
      })();

      return {
        iso: get(3),
        name: mapping[name] || name,
        longName: name !== longName ? longName : undefined,
      };
    }).get().filter(n => isoCodes.indexOf(n.iso) !== -1);
    countryData.push({ iso: "ABC", name: "Abjasia", longName: "Abjasio y Ruso" });
    countryData.push({ iso: "XXK", name: "Kosovo", longName: "República de Kosovo" });
    countryData.push({ iso: "SOS", name: "Osetia del Sur", longName: "República de Osetia del Sur" });

    $ = cheerio.load((await Axios.get("https://es.wikipedia.org/wiki/Anexo:Gentilicios")).data);
    const adjectiveData = $(".wikitable").find("tbody tr:not(:first-child)").map((i, elem) => {
      const getName = () => {
        const text = $(elem).children().eq(0).find("a").first().text();
        const mapping = {
          "República de Macedonia": "Macedonia",
          "Estados Federados de Micronesia": "Micronesia",
          "Birmania": "Myanmar",
          "República de China": "Taiwán",
          "Países Bajos": "Países Bajos",
        };
        return mapping[text] || text;
      };
      const getAdjectives = () => {
        return $(elem).children().eq(1).text()
          .split("\n").map(n => n.split(",")[0].replace(/\[.*\]/, "").split(";").map(m => m.trim()))
          .reduce((acc, val) => acc.concat(val), [])
          .filter(n => !!n);
      };
      const capital = $(elem).children().eq(2).find("a").first().text().trim();
      return {
        name: getName(),
        adjectives: getAdjectives(),
        capital: capital,
      };
    }).get();

    const data = {};
    countryData.forEach((val) => {
      const adjectives = adjectiveData.find(n => n.name === val.name || n.name === val.longName);
      data[val.iso] = {
        name: val.name,
        longName: val.longName,
        adjectives: adjectives.adjectives,
        capital: adjectives.capital,
      };
    });

    return data;
  }

  export async function italian(isoCodes: string[]): Promise<any> {
    let $ = cheerio.load((await Axios.get("https://it.wikipedia.org/wiki/ISO_3166-1")).data);
    const countryData = $(".wikitable.sortable tbody").first().find("tr").map((i, elem) => {
      const get = position => {
        let text = $(elem).children().eq(position).text();
        text = text.split("\n")[0];
        text = text.replace(/\[.*\]/, "");
        return text;
      };
      const name = $(elem).children().eq(1).find("a").text()
        .trim().replace("Rep.", "Repubblica");
      const mapping = {};

      return {
        iso: get(3),
        name: mapping[name] || name,
      };
    }).get().filter(n => isoCodes.indexOf(n.iso) !== -1);

    $ = cheerio.load((await Axios.get("https://it.wikipedia.org/wiki/Inno_nazionale")).data);
    const anthemData = $(".wikitable").find("tbody tr").map((i, elem) => {
      const get = position => {
        let text = $(elem).children().eq(position).text();
        text = text.split("\n")[0];
        text = text.replace(/\[.*\]/, "");
        return text;
      };
      const name = $(elem).children().eq(0).find("a").text()
        .trim().replace("Rep.", "Repubblica");
      const getAnthemName = () => {
        const match = get(1).match(/([^\(]*)(?:\(\"([^\"]*)\"?\))?/);
        if (!match) {
          return undefined;
        }

        return match[2] || match[1];
      };
      return {
        name: name,
        anthemName: getAnthemName(),
      };
    }).get();

    $ = cheerio.load((await Axios.get("https://it.wikipedia.org/wiki/Lista_di_etnici_nazionali")).data);
    const adjectiveData = $("ul li").map((i, elem) => {
      const nameText = $(elem).find("a:not([class='image'])").first().text().replace(/\[.*\]/, "");
      const name = nameText.trim().replace("Rep.", "Repubblica");
      const mapping = {
        "Regno Unito di Gran Bretagna e Irlanda del Nord": "Regno Unito",
      };
      const getAdjectives = () => {
        return $(elem).text().replace(nameText, "").replace(/\[[^\]]*\]/g, "").replace(/\(.*\)/, "")
          .split(",").map(n => n.split("/")[0].trim())
          .filter(n => !!n);
      };
      return {
        name: mapping[name] || name,
        adjectives: getAdjectives(),
      };
    }).get();

    $ = cheerio.load((await Axios.get("https://it.wikipedia.org/wiki/Capitali_degli_Stati_del_mondo")).data);
    const capitalData = $(".wikitable").find("tbody tr:not(:first-child)").map((i, elem) => {
      const name = $(elem).children().eq(0).find("a:first-of-type").text().trim()
        .replace("Rep.", "Repubblica");
      const mapping = {
        "Regno dei Paesi Bassi": "Paesi Bassi",
      };
      const capital = $(elem).children().eq(1).find("a:first-of-type").text().trim();
      return {
        name: mapping[name] || name,
        capital: capital,
      };
    }).get();

    const data = {};
    countryData.forEach((val) => {
      const adjectives = adjectiveData.find(n => n.name === val.name);
      const anthem = anthemData.find(n => n.name === val.name);
      const capital = capitalData.find(n => n.name === val.name);

      const mapping = {
        "RD del Congo": "Repubblica Democratica del Congo",
      };
      data[val.iso] = {
        name: mapping[val.name] || val.name,
        longName: val.longName,
        anthemName: anthem ? anthem.anthemName : undefined,
        adjectives: adjectives.adjectives,
        capital: capital ? capital.capital : undefined,
      };
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
    { promise: Parsers.spanish(isoCodes), lang: "es" },
    { promise: Parsers.italian(isoCodes), lang: "it" },
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
      });
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
