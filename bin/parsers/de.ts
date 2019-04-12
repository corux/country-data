import Axios from "axios";
import * as cheerio from "cheerio";

// tslint:disable:object-literal-sort-keys
function distinct<T>(array: T[]): T[] {
  return Array.from(new Set(array.map((item: any) => item)));
}

function fixCountryName(name: string): string {
  const fixedNames = {
    "Korea, Süd": "Südkorea",
    "Korea, Nord": "Nordkorea",
    "Kongo, Demokratische Republik": "Demokratische Republik Kongo",
    "Kongo, Republik": "Republik Kongo",
    "Osttimor / Timor-Leste": "Osttimor",
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
    "Vereinigtes Königreich": ["England", "Großbritannien"],
    "Vereinigte Staaten": ["USA"],
    "Volksrepublik China": ["China"],
    "Republik China": ["Taiwan"],
    "Osttimor": ["Timor-Leste"],
    "Niederlande": ["Holland"],
    "Demokratische Republik Kongo": ["Kongo"],
    "Nordmazedonien": ["Mazedonien"],
    "Tschechien": ["Tschechei"],
    "Sudan": ["Nordsudan"],
  };
  const result = (altNames[name] || []).concat((altNamesI18n || {})[name])
    .filter((n) => !!n);
  return result.length ? result : undefined;
}

function fixCapitalName(name: string): string {
  if (name.toLowerCase() === "stadtstaat") {
    return undefined;
  }

  return name.match(/^([^(]*)/)[1].trim();
}

function fixAnthemName(name: string): string {
  if (["nationalhymne", "hymne"].indexOf(name.toLowerCase()) !== -1) {
    return;
  }

  return name;
}

export async function german(): Promise<any> {
  // parse wikipedia country data
  let $ = cheerio.load((await Axios.get("https://de.wikipedia.org/wiki/Liste_der_Staaten_der_Erde")).data);
  const data = {};
  $(".wikitable tbody tr:not([class])").map((i, elem) => {
    const get = (position) => {
      const text = $(elem).children().eq(position);
      text.find("br").replaceWith("\n");
      return text.text().split("\n")[0].replace(/\[.*\]/, "");
    };
    const getAdjectives = (iso3: string) => {
      const mapping = {
        GBR: ["englisch", "großbritannisch"],
        BIH: ["bosnisch", "herzegowinisch"],
        CHE: ["schweizer"],
        MKD: ["mazedonisch"],
        NLD: ["holländisch"],
      };
      return mapping[iso3] || undefined;
    };
    const iso = get(7);
    if (iso) {
      const name = fixCountryName(get(0));
      data[iso] = {
        name,
        longName: fixCountryName(get(1)),
        altNames: getAlternativeNames(name),
        capital: fixCapitalName(get(2)),
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
        .map((val) => val.trim())
        .filter((val) => val.length > 0 && val.match(/^[a-zäöüÄÖÜ]/i));
      if (adjectives.length) {
        data[isoCode].adjectives = distinct(adjectives);
      }
    }
  }

  // amend with anthem information
  $ = cheerio.load((await Axios.get("https://de.wikipedia.org/wiki/Liste_der_Nationalhymnen")).data);
  const anthemData = $(".wikitable").first().find("tbody tr:not(:first-child)").map((i, elem) => {
    const get = (position) => {
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
      anthemName: fixAnthemName(get(2) || get(1)),
      url: getAudio(),
    };
  }).get();

  anthemData.forEach((anthem) => {
    const country: any = Object.values(data)
      .find((n: any) => [n.name, n.longName].concat(n.altNames).indexOf(anthem.name) !== -1);
    if (country) {
      country.anthemName = anthem.anthemName;
      country.anthemUrl = anthem.url;
    }
  });

  return data;
}
