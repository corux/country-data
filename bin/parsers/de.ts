import Axios from "axios";
import * as cheerio from "cheerio";

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
      anthemName: get(2) || get(1),
      name: getName(),
      url: getAudio(),
    };
  }).get().concat($(".wikitable").eq(2).find("tbody tr:not(:first-child)").map((i, elem) => {
    const get = (position) => {
      let text = $(elem).children().eq(position).text();
      text = text.split("\n")[0];
      text = text.replace(/\[.*\]/, "");
      return text;
    };
    const getName = () => {
      const text = $(elem).children().eq(1).children("a").text().replace(/\s/, " ");
      return text;
    };
    const getAudio = () => {
      const src = $(elem).find("audio source:not([data-transcodekey])").attr("src");
      return src ? `https:${src}` : undefined;
    };
    return {
      anthemName: get(3) || get(2),
      name: getName(),
      url: getAudio(),
    };
  }).get());

  anthemData.forEach((anthem) => {
    const country: any = Object.values(data)
      .find((n: any) => [n.name, n.longName].concat(n.altNames).includes(anthem.name));
    if (country) {
      country.anthemName = anthem.anthemName;
      country.anthemUrl = anthem.url;
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
