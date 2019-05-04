/** The language independent continent code. */
export enum ContinentCode {
  AFRICA = "AF",
  /**
   * Included only for reference, no countries are linked to this continent.
   * Use NORTH_AMERICA and SOUTH_AMERICA instead.
   */
  AMERICAS = "AM",
  ANTARCTICA = "AN",
  ASIA = "AS",
  EUROPE = "EU",
  NORTH_AMERICA = "NA",
  OCEANIA = "OC",
  SOUTH_AMERICA = "SA",
}

/** Definition of a geological continent. */
export interface IContinent {
  /** The language independent continent code. */
  code: ContinentCode;
  /** The localized continent name. */
  name: string;
}
