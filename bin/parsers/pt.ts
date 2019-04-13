import Axios from "axios";
import * as cheerio from "cheerio";

export async function portugese(isoCodes: string[]): Promise<any> {
  let $ = cheerio.load((await Axios.get("https://pt.wikipedia.org/wiki/ISO_3166-1")).data);
  const countryData = $(".wikitable.sortable tbody").first().find("tr").map((i, elem) => {
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
      const match = get(1).match(/\"?(?:[^\(]*)\"?(?:\(\"([^\"]*)\"?\))?/);
      if (!match) {
        return undefined;
      }

      return match[2] || match[1];
    };
    const getAudio = () => {
      const src = $(elem).find("audio source:not([data-transcodekey])").attr("src");
      return src ? `https:${src}` : undefined;
    };

    return {
      anthemName: getAnthemName(),
      name: getName(),
      url: getAudio(),
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
      longName: val.longName,
      name: val.name,
    };
  });

  return data;
}
