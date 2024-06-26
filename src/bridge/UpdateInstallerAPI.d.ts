export type IUpdateInstallerAPI = {
  /**
   * Quits the app and runs the provided script.
   */
  quitAndRun: (script: string) => void;
};
