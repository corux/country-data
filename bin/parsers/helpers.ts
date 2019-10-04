import Axios from "axios";
import * as url from "url";

export function getAudio($elem: Cheerio): string {
  const src = $elem.find("audio source:not([data-transcodekey])").attr("src");
  return src ? `https:${src}` : undefined;
}

export function getSubtitles($elem: Cheerio, base: string): { [key: string]: string } {
  const supportedLanguages = ["de", "en", "es", "fr", "it", "pt"];
  const list: Array<{ lang: string, url: string }> = $elem.find("audio track[kind='subtitles'][srclang]")
    .map((n, track) => ({
      lang: track.attribs.srclang,
      url: url.resolve(base, track.attribs.src),
    })).get().filter((item) => supportedLanguages.find((lang) => item.lang.indexOf(lang) === 0));

  if (list.length) {
    return list.reduce((obj, item) => {
      obj[item.lang] = item.url;
      return obj;
    }, {});
  }
}

export async function cleanupSubtitles(subtitles: { [lang: string]: string }): Promise<void> {
  const localeSpecifics = Object.keys(subtitles).filter((lang) => lang.indexOf("-") > 0);
  if (localeSpecifics.length) {
    await Promise.all(localeSpecifics.map(async (specificLang) => {
      const lang = specificLang.substr(0, specificLang.indexOf("-"));
      const genericUrl = subtitles[lang];
      if (genericUrl) {
        const specificContent = (await Axios.get(subtitles[specificLang])).data;
        const genericContent = (await Axios.get(genericUrl)).data;

        if (specificContent === genericContent) {
          console.log(`Removing duplicate subtitle for ${specificLang}`);
          delete subtitles[specificLang];
        } else {
          console.log(`Subtitles differ for ${specificLang} and ${lang}`);
        }
      } else {
        console.log(`Moving subtitle for ${specificLang} to ${lang}`);
        subtitles[lang] = subtitles[specificLang];
        delete subtitles[specificLang];
      }
    }));
  }
}
