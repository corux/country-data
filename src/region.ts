export const m49Hierarchy = {
  // World
  "001": ["002", "019", "142", "150", "009"],
  // Africa
  "002": ["015", "202"],
  // Oceania
  "009": ["053", "054", "057", "061"],
  // Americas
  "019": ["419", "021"],
  // Latin America and the Caribbean
  "021": ["029", "013", "005"],
  // Asia
  "142": ["143", "030", "035", "034", "145"],
  // Europe
  "150": ["151", "154", "039", "155"],
  // Northern Europe
  "154": ["830"],
  // Sub-Saharan Africa
  "202": ["014", "017", "018", "011"],
};

/** The region as defined by UN M49, see https://unstats.un.org/unsd/methodology/m49/ */
export interface IRegion {
  /** The M49 region code. */
  code: string;
  /** The localized region name. */
  name: string;
  parent?: IRegion;
  children: IRegion[];
}
