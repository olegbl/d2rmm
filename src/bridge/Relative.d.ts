export type Relative =
  /**
   * Absolute path.
   * This for D2RMM internals, not for mods.
   */
  | 'None'
  /**
   * Path is relative to D2RMM's directory.
   */
  | 'App'
  /**
   * Path is relative to the game's save file directory.
   * @example %UserProfile%\Saved Games\Diablo II Resurrected\mods\D2RMM\
   */
  | 'Saves'
  /**
   * Path is relative to the directory that the MPQ mod is being generated in.
   * @example C:\Games\Diablo II Resurrected\mods\D2RMM\D2RMM.mpq\data\
   * @example C:\Games\Diablo II Resurrected\data\
   */
  | 'Output'
  /**
   * Path is relative to the directory containing pre-extracted vanilla game files.
   * @example C:\Games\Diablo II Resurrected\data.extracted\
   */
  | 'PreExtractedData';
