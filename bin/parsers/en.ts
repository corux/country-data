import Axios from "axios";
import * as cheerio from "cheerio";
import { getFromCountryJs } from ".";

async function countries(isoCodes: string[]): Promise<any> {
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
        "People's Republic of China": "China",
        "Republic of China": "Taiwan",
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
      anthemName: getAnthemName(),
      name: getName(),
      url: getAudio(),
    };
  }).get().concat([{
    anthemName: "God is Truth",
    name: "Cook Islands",
  }, {
    anthemName: "The Lord in Heaven",
    name: "Niue",
  }]);

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
        "Cabo Verde": "Cape Verde",
        "Eswatini (Swaziland)": "Swaziland",
        "Federated States of Micronesia": "Micronesia",
        "Republic of Macedonia": "Macedonia",
        "Republic of North Macedonia": "North Macedonia",
        "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
        "United States of America": "United States",
        "Vatican City State": "Vatican City",
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
        "United Kingdom": ["English"],
      };
      return (mapping[getName()] || []).concat(foundAdjectives || []);
    };
    return {
      adjectives: getAdjectives(),
      name: getName(),
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
      "Eswatini": "Swaziland",
      "Federated States of Micronesia": "Micronesia",
      "Sahrawi Arab Democratic Republic": "Western Sahara",
    };
    const longNameMapping = {
      "Micronesia": "Federated States of Micronesia",
      "Western Sahara": "Sahrawi Arab Democratic Republic",
    };
    name = mapping[name] || name;
    return {
      longName: longNameMapping[name] || nameRow[1],
      name,
    };
  }).get().filter((n) => !!n);

  const data = {};
  getFromCountryJs(isoCodes)
    .forEach((val) => {
      const mapping = {
        "Federated States of Micronesia": "Micronesia",
        "Republic of Macedonia": "North Macedonia",
      };
      const altNames = {
        "Myanmar": ["Burma"],
        "North Macedonia": ["Macedonia"],
        "Sudan": ["North Sudan"],
        "Swaziland": ["Eswatini"],
        "United Kingdom": ["Britain", "Great Britain", "England"],
      };
      const mappedName = mapping[val.name] || val.name;
      const country: any = data[val.ISO.alpha3] = {
        altNames: altNames[mappedName],
        capital: val.capital,
        longName: nameData.find((n) => n.name === mappedName).longName,
        name: mappedName,
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

async function regions(): Promise<any> {
  const $ = cheerio.load((await Axios.get("https://unstats.un.org/unsd/methodology/m49/")).data);
  const data = {};
  $("#GeoGroupsENG").find("tr[data-tt-id]").each((i, elem) => {
    const name = $(elem).children().eq(0).text();
    const code = $(elem).children().eq(1).text();
    const iso = $(elem).children().eq(2).text();
    if (!iso) {
      data[code] = name;
    }
  });

  return data;
}

export async function english(isoCodes: string[]): Promise<any> {
  return {
    countries: await countries(isoCodes),
    regions: await regions(),
  };
}
