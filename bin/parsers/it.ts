import Axios from "axios";
import * as cheerio from "cheerio";

export async function italian(isoCodes: string[]): Promise<any> {
  let $ = cheerio.load((await Axios.get("https://it.wikipedia.org/wiki/ISO_3166-1")).data);
  let countryData = $(".wikitable.sortable tbody").first().find("tr").map((i, elem) => {
    const get = (position) => {
      const text = $(elem).children().eq(position).text()
        .split("\n")[0]
        .replace(/\[.*\]/, "")
        .trim();
      return text;
    };
    const name = $(elem).children().eq(1).find("a").text()
      .trim().replace("Rep.", "Repubblica");
    const mapping = {};

    return {
      iso: get(3),
      name: mapping[name] || name,
    };
  }).get().filter((n) => isoCodes.indexOf(n.iso) !== -1);
  countryData = countryData.concat([
    {
      iso: "ABC",
      longName: "Repubblica di Abcasia",
      name: "Abcasia",
    },
    {
      iso: "SOS",
      longName: "Repubblica dell'Ossezia del Sud",
      name: "Ossezia del Sud",
    },
    {
      iso: "XXK",
      longName: "Repubblica del Kosovo",
      name: "Kosovo",
    },
  ]);

  $ = cheerio.load((await Axios.get("https://it.wikipedia.org/wiki/Inno_nazionale")).data);
  const anthemData = $(".wikitable").find("tbody tr").map((i, elem) => {
    const get = (position) => {
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
      anthemName: getAnthemName(),
      name,
    };
  }).get().concat([ {
    anthemName: "Dio onnipotente",
    name: "Isole Cook",
  }, {
    anthemName: "Il Signore del Cielo",
    name: "Niue",
  }]);

  $ = cheerio.load((await Axios.get("https://it.wikipedia.org/wiki/Lista_di_etnici_nazionali")).data);
  const adjectiveData = $("ul li").map((i, elem) => {
    const nameText = $(elem).find("a:not([class='image'])").first().text().replace(/\[.*\]/, "");
    const name = nameText.trim().replace("Rep.", "Repubblica");
    const mapping = {
      "Regno Unito di Gran Bretagna e Irlanda del Nord": "Regno Unito",
    };
    const getAdjectives = () => {
      return $(elem).text().replace(nameText, "").replace(/\[[^\]]*\]/g, "").replace(/\(.*\)/, "")
        .split(",").map((n) => n.split("/")[0].trim())
        .filter((n) => !!n);
    };
    return {
      adjectives: getAdjectives(),
      name: mapping[name] || name,
    };
  }).get();

  $ = cheerio.load((await Axios.get("https://it.wikipedia.org/wiki/Capitali_degli_Stati_del_mondo")).data);
  const capitalData = $(".wikitable").find("tbody tr:not(:first-child)").map((i, elem) => {
    const name = $(elem).children().eq(0).find("a:first-of-type").text().trim()
      .replace("Rep.", "Repubblica");
    const mapping = {
      "Regno dei Paesi Bassi": "Paesi Bassi",
    };
    const capital = $(elem).children().eq(1).find("a:first-of-type").first().text().trim();
    return {
      capital,
      name: mapping[name] || name,
    };
  }).get();

  const data = {};
  countryData.forEach((val) => {
    const adjectives = adjectiveData.find((n) => n.name === val.name) || {};
    const anthem = anthemData.find((n) => n.name === val.name);
    const capital = capitalData.find((n) => n.name === val.name);

    const altNames = {
      MKD: ["Macedonia"],
    };
    const mapping = {
      "RD del Congo": "Repubblica Democratica del Congo",
    };
    data[val.iso] = {
      adjectives: adjectives.adjectives,
      altNames: altNames[val.iso],
      anthemName: anthem ? anthem.anthemName : undefined,
      capital: capital ? capital.capital : undefined,
      longName: val.longName,
      name: mapping[val.name] || val.name,
    };
  });

  return {
    countries: data,
    regions: {
      "001": "Mondo",
      "002": "Africa",
      "005": "America del sud",
      "009": "Oceania",
      "011": "Africa occidentale",
      "013": "America centrale",
      "014": "Africa orientale",
      "015": "Africa settentrionale",
      "017": "Africa centrale",
      "018": "Africa meridionale",
      "019": "Americhe",
      "021": "America settentrionale",
      "029": "Caraibi",
      "030": "Asia orientale",
      "034": "Asia meridionale",
      "035": "Asia sud-orientale",
      "039": "Europa meridionale",
      "053": "Australia e Nuova Zelanda",
      "054": "Melanesia",
      "057": "Micronesia",
      "061": "Polinesia",
      "142": "Asia",
      "143": "Asia centrale",
      "145": "Asia occidentale",
      "150": "Europa",
      "151": "Europa orientale",
      "154": "Europa settentrionale",
      "155": "Europa occidentale",
      "202": "Africa subsahariana",
      "419": "America Latina e Caraibi",
      "830": "Isole del Canale",
    },
  };
}
