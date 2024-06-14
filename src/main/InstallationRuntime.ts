import { ConsoleAPI } from 'renderer/ConsoleAPI';
import { FileManager } from './FileManager';

export class InstallationRuntime {
  public fileManager: FileManager;
  private mod_: Mod | null = null;

  constructor(
    public BridgeAPI: BridgeAPIImplementation,
    public console: ConsoleAPI,
    public options: IInstallModsOptions
  ) {
    this.fileManager = new FileManager(this);
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

  public getPreExtractedSourceFilePath(filePath: string): string {
    return `${this.options.preExtractedDataPath}\\${filePath}`;
  }

  public getModSourceFilePath(filePath: string): string {
    const appPath = this.BridgeAPI.getAppPath();
    return `${appPath}\\mods\\${this.mod.id}\\${filePath}`;
  }

  public getDestinationFilePath(filePath: string): string {
    if (this.options.isDirectMode) {
      return `${this.options.dataPath}\\${filePath}`;
    }
    return `${this.options.mergedPath}\\${filePath}`;
  }

  public getRelativeFilePathFromDestinationFilePath(filePath: string): string {
    if (this.options.isDirectMode) {
      return filePath.substring(this.options.dataPath.length + 1);
    }
    return filePath.substring(this.options.mergedPath.length + 1);
  }
}
