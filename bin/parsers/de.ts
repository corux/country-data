import Axios from "axios";
import * as cheerio from "cheerio";
import { getAudio, getSubtitles } from "./helpers";

function fixCountryName(name: string): string {
  const mapping = {
    "Kongo, Demokratische Republik": "Demokratische Republik Kongo",
    "Kongo, Republik": "Republik Kongo",
    "Korea, Nord": "Nordkorea",
    "Korea, Süd": "Südkorea",
    "Osttimor / Timor-Leste": "Osttimor",
  };
  return mapping[name] || name.replace(/[\u00AD]+/g, "").replace(/^–$/, "");
}

function getAlternativeNames(name: string): string {
  const altNames = {
    "Demokratische Republik Kongo": ["Kongo"],
    "Myanmar": ["Burma"],
    "Niederlande": ["Holland"],
    "Nordmazedonien": ["Mazedonien"],
    "Osttimor": ["Timor-Leste"],
    "Republik China": ["Taiwan"],
    "Sudan": ["Nordsudan"],
    "Swaziland": ["Eswatini"],
    "Tschechien": ["Tschechei"],
    "Vatikanstadt": ["Vatikan"],
    "Vereinigte Staaten": ["USA"],
    "Vereinigtes Königreich": ["England", "Großbritannien"],
    "Volksrepublik China": ["China"],
  };
  return altNames[name];
}

function fixCapitalName(name: string): string {
  if (name.toLowerCase() === "stadtstaat") {
    return undefined;
  }

  return name.match(/^([^(]*)/)[1].trim();
}

async function countries(): Promise<any> {
  // parse wikipedia country data
  let $ = cheerio.load((await Axios.get("https://de.wikipedia.org/wiki/Liste_der_Staaten_der_Erde")).data);
  const data = {};
  $(".wikitable tbody tr:not([class])").each((i, elem) => {
    const get = (position) => {
      const text = $(elem).children().eq(position);
      text.find("br").replaceWith("\n");
      return text.text().split("\n")[0].replace(/\[.*\]/, "");
    };
    const iso = get(7);
    if (iso) {
      const name = fixCountryName(get(0));
      data[iso] = {
        altNames: getAlternativeNames(name),
        capital: fixCapitalName(get(2)),
        longName: fixCountryName(get(1)),
        name,
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

    const mapping = {
      BIH: ["bosnisch", "herzegowinisch"],
      CHE: ["schweizer"],
      CPV: ["kapverdisch"],
      GBR: ["großbritannisch", "englisch"],
      MKD: ["mazedonisch"],
      NLD: ["holländisch"],
      SWZ: ["swasiländisch", "swatinisch"],
      TLS: ["osttimoresisch"],
      TWN: ["taiwanisch"],
      USA: ["US-amerikanisch"],
    };
    if (isoCode && data[isoCode]) {
      const adjectives = td.last().text().trim()
        .replace(/\((.*)\)/, ",$1,")
        .replace(/\[(.*)\]/, ",$1,")
        .replace(" oder ", ",")
        .replace(/bis [0-9]*:/i, "")
        .split(",")
        .map((val) => val.trim())
        .filter((val) => val.match(/^[a-zöäü][a-z\x7f-\xff\-]+$/));
      data[isoCode].adjectives = adjectives
        .concat(mapping[isoCode] || [])
        .concat(data[isoCode].adjectives || []);
    }
  }

  // amend with anthem information
  const wikiAnthemsUrl = "https://de.wikipedia.org/wiki/Liste_der_Nationalhymnen";
  $ = cheerio.load((await Axios.get(wikiAnthemsUrl)).data);
  const anthemData = $(".wikitable tbody tr").map((i, elem) => {
    let columnHeader = $(elem).closest("table").find("th").map((n, m) => $(m).text().trim()).get();
    columnHeader = columnHeader.slice(columnHeader.length - $(elem).children().length);
    const titleColumn = columnHeader.indexOf("Hymne");
    const germanTitleColumn = columnHeader.indexOf("Titel auf Deutsch");
    const countryColumn = titleColumn - 1;

    const get = (position) => {
      let text = $(elem).children().eq(position).text();
      text = text.split("\n")[0];
      text = text.replace(/\[.*\]/, "");
      return text;
    };
    const getName = () => {
      const text = $(elem).children().eq(countryColumn).children("a").text().replace(/\s/, " ");
      const mapping = {
        "Kokosinseln": "Cookinseln",
        "Palästinensische Autonomiegebiete": "Palästina",
      };
      return mapping[text] || text;
    };

    return {
      anthemName: get(germanTitleColumn) || get(titleColumn),
      name: getName(),
      subtitleUrls: getSubtitles($(elem), wikiAnthemsUrl),
      url: getAudio($(elem)),
    };
  }).get();

  anthemData.forEach((anthem) => {
    const country: any = Object.values(data)
      .find((n: any) => [n.name, n.longName].concat(n.altNames).includes(anthem.name));
    if (country) {
      country.anthemName = anthem.anthemName;
      country.anthemUrl = anthem.url;
      country.anthemSubtitleUrls = anthem.subtitleUrls;
    }
  });
  return data;
}

async function regions(): Promise<any> {
  const $ = cheerio.load((await Axios
    .get("https://de.wikipedia.org/wiki/Liste_der_geographischen_Regionen_nach_den_Vereinten_Nationen")).data);
  const data = {
    202: "Subsahara-Afrika",
    830: "Kanalinseln",
  };
  $(".mw-parser-output").find("p, li").each((i, elem) => {
    const match = $(elem).text().split("\n")[0].trim().match(/([0-9]{3}) (.*)/);
    if (match) {
      data[match[1]] = match[2];
    }
  });

  return data;
}

export async function german(): Promise<any> {
  return {
    countries: await countries(),
    regions: await regions(),
  };
}
