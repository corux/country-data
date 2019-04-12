import Axios from "axios";
import * as cheerio from "cheerio";
import { getFromCountryJs } from ".";

// tslint:disable:object-literal-sort-keys
function fixCountryName(name: string): string {
  const fixedNames = {
    Macédoine: "Macédoine du Nord",
  };
  return fixedNames[name] || name.replace(/[\u00AD]+/g, "").replace(/^–$/, "") || undefined;
}

export async function french(isoCodes: string[]): Promise<any> {
  let $ = cheerio.load((await Axios.get("https://fr.wikipedia.org/wiki/Liste_des_hymnes_nationaux")).data);
  const anthemData = $(".wikitable").find("tbody tr").map((i, elem) => {
    const get = (position) => {
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
        "États fédérés de Micronésie": "Micronésie",
        "Myanmar": "Birmanie",
      };
      return mapping[text] || text;
    };

    return {
      name: getName(),
      anthemName: get(2).trim() || get(1).trim(),
    };
  }).get();

  $ = cheerio.load((await Axios.get("https://fr.wikipedia.org/wiki/Liste_de_gentilés")).data);
  const adjectiveData = $("li>b:first-of-type>a, li>a:has(b)").map((i, elem) => {
    const name = $(elem).text().trim();
    const adjectives = $(elem).closest("li").find("i").first().text().split(" ou ")
      .map((m) => m.split(",").map((n) => n.trim().replace(/^-$/, "")).filter((o) => !!o));
    const mapping = {
      Libéria: "Liberia",
    };
    return {
      name: mapping[name] || name,
      adjectives: adjectives.map((n) => n[0]).filter((n) => !!n),
    };
  }).get();

  const data = {};
  getFromCountryJs(isoCodes)
    .forEach((val) => {
      const getAltNames = () => {
        const mapping = {
          GBR: ["Angleterre", "Grande Bretagne"],
          MMR: ["Myanmar"],
          MKD: ["Macédoine"],
        };
        return mapping[val.ISO.alpha3] || undefined;
      };
      const country: any = data[val.ISO.alpha3] = {
        name: fixCountryName(val.translations.fr),
        altNames: getAltNames(),
      };
      const anthem = anthemData.find((a) => a.name === country.name);
      if (anthem) {
        country.anthemName = anthem.anthemName;
        country.anthemUrl = anthem.url;
      }
      const getAdditionalAdjectives = (iso: string) => {
        const mapping = {
          GBR: ["anglaise"],
          MKD: ["macédonien"],
        };
        return mapping[iso] || [];
      };
      const countryMapping = {
        "République démocratique du Congo": "Congo",
      };
      const adjective = adjectiveData.find((a) => a.name === (countryMapping[country.name] || country.name));
      if (adjective && adjective.adjectives.length) {
        country.adjectives = adjective.adjectives.map((n) => n.toLowerCase())
          .concat(getAdditionalAdjectives(val.ISO.alpha3));
      }
    });

  return data;
}
