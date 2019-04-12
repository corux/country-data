import Axios from "axios";
import * as cheerio from "cheerio";

// tslint:disable:object-literal-sort-keys
export async function spanish(isoCodes: string[]): Promise<any> {
  let $ = cheerio.load((await Axios.get("https://es.wikipedia.org/wiki/ISO_3166-1")).data);
  const countryData = $(".wikitable.sortable tbody").first().find("tr").map((i, elem) => {
    const get = (position) => {
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
    const longNameMapping = {
      Swazilandia: "Suazilandia",
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
      text = text.trim();
      return longNameMapping[text] || text;
    })();

    return {
      iso: get(3),
      name: mapping[name] || name,
      longName: name !== longName ? longName : undefined,
    };
  }).get().filter((n) => isoCodes.indexOf(n.iso) !== -1);
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
        .replace(/\[[0-9]+\]/g, "\n").split("\n")
        .map((n) => n.split(",")[0].replace(/\[.*\]/, "").split(";"))
        .reduce((acc, val) => acc.concat(val), [])
        .map((m) => m.replace(/[^\x00-\xFF]+/g, "").trim().replace(/^o /, "").trim())
        .filter((n) => !!n);
    };
    const capital = $(elem).children().eq(2).find("a").first().text().trim();
    return {
      name: getName(),
      adjectives: getAdjectives(),
      capital,
    };
  }).get();

  const altNames = {
    "Macedonia del Norte": ["Macedonia"],
    "Suazilandia": ["Esuatini"],
  };

  const data = {};
  countryData.forEach((val) => {
    const adjectives = adjectiveData.find((n) => n.name === val.name || n.name === val.longName);
    data[val.iso] = {
      name: val.name,
      longName: val.longName,
      adjectives: adjectives.adjectives,
      capital: adjectives.capital,
      altNames: altNames[val.name],
    };
  });

  return data;
}
