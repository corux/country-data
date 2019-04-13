import { english, french, generic, german, italian, portugese, spanish } from ".";

export class Parser {
  public async parse(): Promise<{ generic: any, locales: { [key: string]: any } }> {
    const genericData = await generic();
    const isoCodes = genericData.map((val) => val.iso3);

    const result = {
      generic: genericData,
      locales: {
        de: await german(),
        en: await english(isoCodes),
        es: await spanish(isoCodes),
        fr: await french(isoCodes),
        it: await italian(isoCodes),
        pt: await portugese(isoCodes),
      },
    };

    // post-process locale data
    Object.keys(result.locales).sort().forEach((lang) => {
      const locale = result.locales[lang];
      Object.keys(locale).forEach((iso) => {
        // move data from country specific to generic
        const genericCountry = genericData.find((val) => val.iso3 === iso);
        if (genericCountry && locale[iso].anthemUrl) {
          genericCountry.anthem = locale[iso].anthemUrl;
        }

        delete locale[iso].anthemUrl;

        // cleanup duplicates
        locale[iso].adjectives = this.distinct(locale[iso].adjectives);
        locale[iso].altNames = this.distinct(locale[iso].altNames);
      });
    });

    // amend generic data with anthem URLs
    genericData.forEach((val) => {
      if (!val.anthem && val.iso2) {
        val.anthem = `http://www.nationalanthems.info/${val.iso2.toLowerCase()}.mp3`;
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
