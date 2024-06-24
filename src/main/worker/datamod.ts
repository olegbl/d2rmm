// TODO: try to diff the .txt and .json files against vanilla counterparts
//       to calculate a diff file which could then be applied on top of the
//       current version of the file
export const datamod: string = `

D2RMM.copyFile(
  'data', // <mod folder>\\data
  '', // <diablo 2 folder>\\mods\\D2RMM\\D2RMM.mpq\\data
  true // overwrite any conflicts
);

`;
