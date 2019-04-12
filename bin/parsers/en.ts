import Axios from "axios";
import * as cheerio from "cheerio";
import { getFromCountryJs } from ".";

// tslint:disable:object-literal-sort-keys
function fixCountryName(name: string): string {
  const fixedNames = {
    "Korea, Süd": "Südkorea",
    "Korea, Nord": "Nordkorea",
    "Kongo, Demokratische Republik": "Demokratische Republik Kongo",
    "Kongo, Republik": "Republik Kongo",
    "Osttimor / Timor-Leste": "Osttimor",
    "Federated States of Micronesia": "Micronesia",
    "Republic of Macedonia": "Macedonia",
    "Macedonia": "North Macedonia",
    "Macédoine": "Macédoine du Nord",
  };
  return fixedNames[name] || name.replace(/[\u00AD]+/g, "").replace(/^–$/, "") || undefined;
}

function getAlternativeNames(name: string): string {
  const altNames = {
    Myanmar: ["Burma"],
    Vatikanstadt: ["Vatikan"],
    Swaziland: ["Eswatini"],
  };
  const altNamesI18n = {
    "Sudan": ["North Sudan"],
    "North Macedonia": ["Macedonia"],
  };
  const result = (altNames[name] || []).concat((altNamesI18n)[name])
    .filter((n) => !!n);
  return result.length ? result : undefined;
}

function fixCapitalName(name: string): string {
  return name.match(/^([^(]*)/)[1].trim();
}

export async function english(isoCodes: string[]): Promise<any> {
  let $ = cheerio.load((await Axios.get("https://en.wikipedia.org/wiki/List_of_national_anthems")).data);
  const anthemData = $(".wikitable").find("tbody tr").map((i, elem) => {
    const get = (position) => {
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
      url: getAudio(),
    };
  }).get();

  $ = cheerio.load((await Axios
    .get("https://en.wikipedia.org/wiki/List_of_adjectival_and_demonymic_forms_for_countries_and_nations")).data);
  const adjectiveData = $(".wikitable").find("tbody tr:not(:first-child)").map((i, elem) => {
    const get = (position) => {
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
        "Republic of North Macedonia": "North Macedonia",
      };
      return mapping[text] || text;
    };
    const getAdjectives = () => {
      let sep = " or ";
      if (get(1).indexOf(sep) === -1) {
        sep = ",";
      }
      const foundAdjectives = get(1).split(sep).map((n) => n.trim()).filter((n) => !!n);
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
      .split("–").map((n) => n.trim());
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
      name,
      longName: longNameMapping[name] || nameRow[1],
    };
  }).get().filter((n) => !!n);

  const data = {};
  getFromCountryJs(isoCodes)
    .forEach((val) => {
      const mapping = {
        Macedonia: "North Macedonia",
      };
      const name = fixCountryName(val.name);
      const mappedName = mapping[name] || name;
      const country: any = data[val.ISO.alpha3] = {
        name: mappedName,
        capital: fixCapitalName(val.capital),
        altNames: getAlternativeNames(mappedName),
        longName: nameData.find((n) => n.name === mappedName).longName,
      };
      const anthem = anthemData.find((a) => a.name === mappedName);
      if (anthem) {
        country.anthemName = anthem.anthemName;
        country.anthemUrl = anthem.url;
      }
      country.adjectives = adjectiveData.find((n) => n.name === mappedName).adjectives;
    });

  return data;
}
