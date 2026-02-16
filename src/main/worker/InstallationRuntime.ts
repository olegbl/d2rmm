import type { IBridgeAPI, IInstallModsOptions, Mod } from 'bridge/BridgeAPI';
import type { ConsoleAPI } from 'bridge/ConsoleAPI';
import { FileManager } from './FileManager';

export class InstallationRuntime {
  private mod_: Mod | null = null;

  public fileManager: FileManager;
  public modsInstalled: string[] = [];

  constructor(
    public BridgeAPI: IBridgeAPI,
    public console: ConsoleAPI,
    public options: IInstallModsOptions,
    public modsToInstall: Mod[],
  ) {
    this.fileManager = new FileManager(this);
  }

  isModInstalling(): boolean {
    return this.mod_ != null;
  }

  public set mod(mod: Mod | null) {
    this.mod_ = mod;
  }

  public get mod(): Mod {
    if (!this.mod_) {
      throw new Error('No mod is currently being installed.');
    }
    return this.mod_;
  }
}
