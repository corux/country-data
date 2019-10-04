import * as url from "url";

export function getAudio($elem: Cheerio): string {
  const src = $elem.find("audio source:not([data-transcodekey])").attr("src");
  return src ? `https:${src}` : undefined;
}

export function getSubtitles($elem: Cheerio, base: string): { [key: string]: string } {
  const supportedLanguages = ["de", "en", "es", "fr", "it", "pt"];
  const list = $elem.find("audio track[kind='subtitles'][srclang]").map((n, track) => ({
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
