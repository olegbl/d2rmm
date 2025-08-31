import type { IBridgeAPI, IInstallModsOptions, Mod } from 'bridge/BridgeAPI';
import type { ConsoleAPI } from 'bridge/ConsoleAPI';
import path from 'path';
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

  public getPreExtractedSourceFilePath(filePath: string): string {
    return path.resolve(this.options.preExtractedDataPath, filePath);
  }

  public async getModSourceFilePath(filePath: string): Promise<string> {
    const appPath = await this.BridgeAPI.getAppPath();
    return path.join(appPath, 'mods', this.mod.id, filePath);
  }

  public getDestinationFilePath(filePath: string): string {
    if (this.options.isDirectMode) {
      return path.join(this.options.dataPath, filePath);
    }
    return path.join(this.options.mergedPath, filePath);
  }

  public getRelativeFilePathFromDestinationFilePath(filePath: string): string {
    if (this.options.isDirectMode) {
      return filePath.substring(this.options.dataPath.length + 1);
    }
    return filePath.substring(this.options.mergedPath.length + 1);
  }
}
