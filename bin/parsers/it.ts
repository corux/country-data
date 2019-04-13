import Axios from "axios";
import * as cheerio from "cheerio";

// tslint:disable:object-literal-sort-keys
export async function italian(isoCodes: string[]): Promise<any> {
  let $ = cheerio.load((await Axios.get("https://it.wikipedia.org/wiki/ISO_3166-1")).data);
  const countryData = $(".wikitable.sortable tbody").first().find("tr").map((i, elem) => {
    const get = (position) => {
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
  }).get().filter((n) => isoCodes.indexOf(n.iso) !== -1);

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
      name,
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
        .split(",").map((n) => n.split("/")[0].trim())
        .filter((n) => !!n);
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
      capital,
    };
  }).get();

  const data = {};
  countryData.forEach((val) => {
    const adjectives = adjectiveData.find((n) => n.name === val.name);
    const anthem = anthemData.find((n) => n.name === val.name);
    const capital = capitalData.find((n) => n.name === val.name);

    const altNames = {
      MKD: ["Macedonia"],
    };
    const mapping = {
      "RD del Congo": "Repubblica Democratica del Congo",
    };
    data[val.iso] = {
      name: mapping[val.name] || val.name,
      longName: val.longName,
      anthemName: anthem ? anthem.anthemName : undefined,
      adjectives: adjectives.adjectives,
      altNames: altNames[val.iso],
      capital: capital ? capital.capital : undefined,
    };
  });

  return data;
}