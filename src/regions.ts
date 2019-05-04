export enum Region {
  AFRICA = "AF",
  AMERICAS = "AM",
  ASIA = "AS",
  EUROPE = "EU",
  NORTH_AMERICA = "NA",
  OCEANIA = "OC",
  SOUTH_AMERICA = "SA",
}

/** Definition of a region in the world. */
export interface IRegion {
  /** The language independent region code. */
  code: Region;
  /** The localized region name. */
  name: string;
}
