import { generic } from ".";
import { german } from "./de";
import { english } from "./en";
import { spanish } from "./es";
import { french } from "./fr";
import { italian } from "./it";

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
      },
    };

    // move data from country specific to generic
    Object.keys(result.locales).sort().forEach((lang) => {
      const locale = result.locales[lang];
      Object.keys(locale).forEach((iso) => {
        const genericCountry = genericData.find((val) => val.iso3 === iso);
        if (genericCountry && locale[iso].anthemUrl) {
          genericCountry.anthem = locale[iso].anthemUrl;
        }

        delete locale[iso].anthemUrl;
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
}
