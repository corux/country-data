import * as program from "commander";
import * as fs from "fs";
import * as stableStringify from "json-stable-stringify";
import * as path from "path";
import * as process from "process";
import { Parser } from "./parsers";

program
  .option("--destination <path>", "Destination folder for generated files.")
  .parse(process.argv);

if (!fs.existsSync(program.destination)) {
  console.log("Destination does not exist: " + program.destination);
  process.exit(1);
}

const stringify = (obj: any) => stableStringify(obj, { space: 2 });

new Parser().parse().then((data) => {
  const isoCodes = data.generic.map((val) => val.iso3);
  fs.writeFile(path.join(process.cwd(), program.destination, "generic.json"),
    stringify(data.generic), "utf8", () => { /* */ });
  Object.keys(data.locales).forEach((key) => {
    const val = data.locales[key];
    const file = path.join(process.cwd(), program.destination, `i18n/${key}.json`);
    const fileContent = JSON.parse(fs.readFileSync(file).toString());
    fileContent.countries = {};
    isoCodes.forEach((iso) => {
      if (val[iso]) {
        fileContent.countries[iso] = val[iso];
      }
    });
    fs.writeFile(file, stringify(fileContent), "utf8", () => { /* */ });
  });
});
