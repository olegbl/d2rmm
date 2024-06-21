export type IReadOnlyPreferences = {
  dataPath: string;
  extraArgs: string[];
  gamePath: string;
  isDirectMode: boolean;
  isPreExtractedData: boolean;
  mergedPath: string;
  outputModName: string;
  preExtractedDataPath: string;
  rawGamePath: string;
};

export type IPreferences = IReadOnlyPreferences & {
  setExtraArgs: (value: string[]) => void;
  setIsDirectMode: (value: boolean) => void;
  setIsPreExtractedData: (value: boolean) => void;
  setOutputModName: (value: string) => void;
  setPreExtractedDataPath: (value: string) => void;
  setRawGamePath: (value: string) => void;
};
