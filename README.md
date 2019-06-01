# Country Data

[![Travis (.org)](https://img.shields.io/travis/corux/country-data.svg)](https://travis-ci.org/corux/country-data)
[![npm](https://img.shields.io/npm/v/@corux/country-data.svg)](https://www.npmjs.com/package/@corux/country-data)
[![npm type definitions](https://img.shields.io/npm/types/@corux/country-data.svg)](https://www.npmjs.com/package/@corux/country-data)
[![Codacy grade](https://img.shields.io/codacy/grade/892113eb3dea4e71bfbf71073fc0ed58.svg)](https://www.codacy.com/app/corux/country-data)

A Node.js module with data about countries and regions.

## Install

```sh
npm install @corux/country-data
```

## Usage

The main object to interact with is `CountryData`.
Start using it by creating a new instance, initialized with a supported language.

To see all available country data, compare the interface `ICountry` ([countries.ts](src/countries.ts)).

```typescript
import { CountryData } from "@corux/country-data";

CountryData.getSupportedLanguages();
// [de, en, es, fr, it, pt]

const countryData = new CountryData("en");
countryData.getCountries();
```
