import Axios from "axios";
import * as cheerio from "cheerio";
import { getFromCountryJs } from ".";

async function countries(isoCodes: string[]): Promise<any> {
  let $ = cheerio.load((await Axios.get("https://fr.wikipedia.org/wiki/Liste_des_hymnes_nationaux")).data);
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
        "Myanmar": "Birmanie",
        "Salomon": "Îles Salomon",
        "États fédérés de Micronésie": "Micronésie",
      };
      return mapping[text] || text;
    };

    return {
      anthemName: get(2) || get(1),
      name: getName(),
    };
  }).get();

  $ = cheerio.load((await Axios.get("https://fr.wikipedia.org/wiki/Liste_des_capitales_du_monde")).data);
  const capitalData = $(".wikitable.sortable tbody tr").map((i, elem) => {
    const get = (position) => {
      return $(elem).children().eq(position).text()
        .replace(/\[.*\]/, "")
        .replace(/\(.*\)/, "")
        .trim();
    };
    return {
      capital: get(0),
      name: get(1),
    };
  }).get();

  $ = cheerio.load((await Axios.get("https://fr.wikipedia.org/wiki/Liste_de_gentiles")).data);
  const adjectiveData = $("li>b:first-of-type>a, li>a:has(b)").map((i, elem) => {
    const additional = {
      "Macédoine du Nord": ["macédonien"],
      "Royaume-Uni": ["anglaise"],
    };

    const name = $(elem).attr("title").replace(/\(.*\)/, "").trim();
    const adjectives = [].concat(
      additional[name],
      $(elem).closest("li").find("i").first().text().split(/ ou |,/)
        .map((n) => n.trim().replace(/^-$/, ""))
        .filter((o) => !!o)[0])
      .filter((n) => !!n)
      .map((n) => n.toLowerCase());
    const mapping = {
      Libéria: "Liberia",
    };

    return {
      adjectives,
      name: mapping[name] || name,
    };
  }).get();

  const data = {};
  getFromCountryJs(isoCodes)
    .forEach((val) => {
      const getAltNames = () => {
        const mapping = {
          COD: ["Congo-Kinshasa"],
          COG: ["Congo", "Congo-Brazzaville"],
          GBR: ["Angleterre", "Grande Bretagne"],
          MKD: ["Macédoine"],
          MMR: ["Myanmar"],
          SLB: ["Salomon"],
          SWZ: ["Swaziland"],
        };
        return mapping[val.ISO.alpha3];
      };
      const getName = () => {
        const mapping = {
          Congo: "République du Congo",
          Macédoine: "Macédoine du Nord",
          Swaziland: "Eswatini",
        };
        const name = val.translations.fr;
        return mapping[name] || name.replace(/[\u00AD]+/g, "").replace(/^–$/, "");
      };
      const getLongName = () => {
        const mapping = {
          CHN: "République populaire de Chine",
          CYP: "Île de Chypre",
          FSM: "États fédérés de Micronésie",
          MDA: "République de Moldavie",
        };
        return mapping[val.ISO.alpha3];
      };

      const country: any = data[val.ISO.alpha3] = {
        altNames: getAltNames(),
        longName: getLongName(),
        name: getName(),
      };

      const allNames = [].concat(country.altNames, country.name, country.longName);
      const capital = capitalData.find((a) => allNames.indexOf(a.name) !== -1);
      country.capital = capital && capital.capital;

      const anthem = anthemData.find((a) => allNames.indexOf(a.name) !== -1);
      country.anthemName = anthem && anthem.anthemName;
      country.anthemUrl = anthem && anthem.url;

      const adjective = adjectiveData.find((a) => allNames.indexOf(a.name) !== -1);
      country.adjectives = adjective && adjective.adjectives;
    });

  return data;
}

async function regions(): Promise<any> {
  const $ = cheerio.load((await Axios.get("https://unstats.un.org/unsd/methodology/m49/")).data);
  const data = {};
  $("#GeoGroupsFRA").find("tr[data-tt-id]").each((i, elem) => {
    const name = $(elem).children().eq(0).text();
    const code = $(elem).children().eq(1).text();
    const iso = $(elem).children().eq(2).text();
    if (!iso) {
      data[code] = name;
    }
  });

  return data;
}

export async function french(isoCodes: string[]): Promise<any> {
  return {
    countries: await countries(isoCodes),
    regions: await regions(),
  };
}
