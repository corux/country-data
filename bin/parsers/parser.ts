import { english, french, generic, german, italian, portugese, spanish } from ".";

export class Parser {
  public async parse(): Promise<{ generic: any, locales: { [key: string]: any } }> {
    console.log("Start parsing generic data...");
    const genericData = await generic();
    const isoCodes = genericData.map((val) => val.iso3);

    const result = {
      generic: genericData,
      locales: {},
    };

    const localeMapping = {
      de: () => german(),
      en: () => english(isoCodes),
      es: () => spanish(isoCodes),
      fr: () => french(isoCodes),
      it: () => italian(isoCodes),
      pt: () => portugese(isoCodes),
    };

    await Promise.all(Object.getOwnPropertyNames(localeMapping).map(async (locale) => {
      console.log(`Start parsing ${locale} locale...`);
      try {
        result.locales[locale] = await localeMapping[locale]();
        console.log(`Finished parsing ${locale} locale`);
      } catch (error) {
        console.error(`Failed to parse ${locale} locale`);
      }
    }));

    // post-process locale data
    console.log("Post-processing locale data...");
    Object.keys(result.locales).sort().forEach((lang) => {
      const locale = result.locales[lang].countries;
      Object.keys(locale).forEach((iso) => {
        // move data from country specific to generic
        const genericCountry = genericData.find((val) => val.iso3 === iso);
        if (genericCountry && locale[iso].anthemUrl) {
          const url = locale[iso].anthemUrl;
          if (url.toLowerCase().indexOf("vocal") !== -1) {
            genericCountry.anthem.vocalUrl = url;
          } else {
            genericCountry.anthem.url = url;
          }

          if (locale[iso].anthemSubtitleUrls) {
            genericCountry.anthem.subtitles = locale[iso].anthemSubtitleUrls;
          }
        }

        delete locale[iso].anthemUrl;
        delete locale[iso].anthemSubtitleUrls;

        // cleanup duplicates
        locale[iso].adjectives = this.distinct(locale[iso].adjectives);
        locale[iso].altNames = this.distinct(locale[iso].altNames);
      });
    });

    // amend generic data with anthem URLs
    genericData.forEach((val) => {
      if (!val.anthem.url) {
        let id = val.iso2;
        if (val.iso3 === "SOS") {
          id = "oss";
        }
        if (id) {
          val.anthem.url = `http://www.nationalanthems.info/${id.toLowerCase()}.mp3`;
        }
      }
    });

    return result;
  }

  private distinct<T>(array: T[]): T[] {
    if (array && array.length) {
      return Array.from(new Set(array.map((item: any) => item))).sort((a, b) => a.localeCompare(b));
    }
    return undefined;
  }
}
