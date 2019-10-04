import Axios from "axios";
import * as cheerio from "cheerio";
import { getAudio } from "./helpers";

function getArticle(name: string): string {
  if (name.endsWith("ema")) {
    return "o";
  }

  if (name.endsWith("a")
  || name.endsWith("ã")
  || name.endsWith("ação")
  || name.endsWith("dade")
  || name.endsWith("agem")) {
    return "a";
  }

  if (name.endsWith("ante")
  || name.endsWith("ente")
  || name.endsWith("ista")) {
    return "";
  }

  return "o";
}

export async function portugese(isoCodes: string[]): Promise<any> {
  let $ = cheerio.load((await Axios.get("https://pt.wikipedia.org/wiki/ISO_3166-1")).data);
  let countryData = $(".wikitable.sortable tbody").first().find("tr").map((i, elem) => {
    const get = (position) => {
      let text = $(elem).children().eq(position).text();
      text = text.split("\n")[0];
      text = text.replace(/\[.*\]/, "");
      return text;
    };
    const name = $(elem).children().eq(4).find("a").text().trim();
    const mapping = {
      "Emirados Árabes": "Emirados Árabes Unidos",
      "Eslovênia": "Eslovénia",
      "Iêmen": "Iémen",
      "Letônia": "Letónia",
      "Macedônia do Norte": "Macedónia do Norte",
      "Quênia": "Quénia",
      "Trinidad e Tobago": "Trindade e Tobago",
      "Vietnã": "Vietname",
    };
    const longNameMapping = {
    };
    const longName = longNameMapping[name];

    return {
      iso: get(1),
      longName: name !== longName ? longName : undefined,
      name: mapping[name] || name,
    };
  }).get().filter((n) => isoCodes.indexOf(n.iso) !== -1);
  countryData = countryData.concat([
    {
      iso: "ABC",
      longName: "República da Abecásia",
      name: "Abecásia",
    },
    {
      iso: "SOS",
      longName: "República da Ossétia do Sul",
      name: "Ossétia do Sul",
    },
    {
      altNames: [
        "Cossovo",
        "Cosovo",
        "Kossovo",
      ],
      iso: "XXK",
      longName: "República do Kosovo",
      name: "Kosovo",
    },
  ]);

  $ = cheerio.load((await Axios.get("https://pt.wikipedia.org/wiki/Lista_de_hinos_nacionais_e_regionais")).data);
  const anthemData = $(".wikitable").find("tbody tr").map((i, elem) => {
    const get = (position) => {
      const text = $(elem).children().eq(position).text()
        .split("\n")[0]
        .replace(/\[.*\]/, "")
        .trim();
      return text;
    };
    const getName = () => {
      const text = $(elem).children().eq(0).find("a").text().replace(/\[.*\]/, "");
      const mapping = {
      };
      return mapping[text] || text;
    };
    const getAnthemName = () => {
      const match = get(1).match(/"?([^\(^"]*)"?\("([^"]*)"?\)?/);
      if (!match) {
        return undefined;
      }

      return match[2] || match[1];
    };

    return {
      anthemName: getAnthemName(),
      name: getName(),
      url: getAudio($(elem)),
    };
  }).get();

  $ = cheerio.load((await Axios.get("https://pt.wikipedia.org/wiki/Lista_de_gent%C3%ADlicos")).data);
  const adjectiveData = $("li>b:first-of-type>a, li>a:has(b), li b>span[lang='pt-pt']").map((i, elem) => {
    $(elem).closest("li").find("ul").remove();
    const name = $(elem).text().split(",").reverse().join(" ").trim();
    const split = $(elem).closest("li").text().split("–");
    if (split.length < 2) {
      return;
    }
    const adjectives = split[1].split(/ ou | e |,/)
      .map((m) => m
        .replace(/\[.*\]/, "")
        .replace(/\(.*\)/, "")
        .replace(/^-$/, "")
        .trim())
      .filter((o) => !!o);
    const mapping = {
      "Burkina Fasso": "Burkina Faso",
      "Macedónia": "Macedónia do Norte",
      "Malaui": "Malawi",
      "Papua Nova Guiné": "Papua-Nova Guiné",
      "Quiribáti": "Kiribati",
      "Tadjiquistão": "Tajiquistão",
    };
    return {
      adjectives,
      name: mapping[name] || name,
    };
  }).get().filter((n) => !!n);

  const altNames = {
    "Botswana": ["Botsuana"],
    "República Democrática do Congo": ["Congo-Kinshasa"],
    "República do Congo": ["Congo-Brazzaville"],
    "Turquemenistão": ["Turcomenistão"],
    "Vietname": ["Vietnã"],
    "Zimbabwe": ["Zimbábue"],
  };

  const data = {};
  countryData.forEach((val) => {
    const allNames = [val.name, val.longName].concat(altNames[val.name] || []);
    const adjectives = adjectiveData.find((n) => allNames.indexOf(n.name) !== -1);
    const anthem = anthemData.find((n) => allNames.indexOf(n.name) !== -1);
    data[val.iso] = {
      adjectives: adjectives && adjectives.adjectives,
      altNames: altNames[val.name],
      anthemName: anthem && anthem.anthemName,
      anthemUrl: anthem && anthem.url,
      article: getArticle(val.name),
      longName: val.longName,
      name: val.name,
    };
  });

  return {
    countries: data,
    regions: {
      "001": "Mundo",
      "002": "África",
      "005": "América do Sul",
      "009": "Oceania",
      "011": "África Ocidental",
      "013": "América Central",
      "014": "África Oriental",
      "015": "Norte de África",
      "017": "África Central",
      "018": "África Austral",
      "019": "América",
      "021": "América do Norte",
      "029": "Caraíbas",
      "030": "Ásia Oriental",
      "034": "Ásia Meridional",
      "035": "Sudeste Asiático",
      "039": "Europa Meridional",
      "053": "Austrália e Nova Zelândia",
      "054": "Melanésia",
      "057": "Micronésia",
      "061": "Polinésia",
      "142": "Ásia",
      "143": "Ásia Central",
      "145": "Ásia Ocidental",
      "150": "Europa",
      "151": "Europa Oriental",
      "154": "Europa Setentrional",
      "155": "Europa Ocidental",
      "202": "África Subsaariana",
      "419": "América Latina e Caribe",
      "830": "Ilhas do Canal",
    },
  };
}
