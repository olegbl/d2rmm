import { InstallationRuntime } from './InstallationRuntime';

export type FileOperationType = 'extract' | 'read' | 'write';

export type FileOperation = {
  type: FileOperationType;
  mod: string;
};

export type FileStatus = {
  data: Buffer | null;
  exists: boolean;
  extracted: boolean;
  filePath: string;
  gameFile: boolean | null;
  modified: boolean;
  operations: FileOperation[];
};

export class FileManager {
  private files: Record<string, FileStatus> = {};
  constructor(private runtime: InstallationRuntime) {}

  private get(filePath: string): FileStatus {
    const normalizedFilePath = filePath.replace(/\\/g, '/').toLowerCase();
    if (this.files[normalizedFilePath] == undefined) {
      return (this.files[normalizedFilePath] = {
        data: null,
        exists: false,
        extracted: false,
        filePath: normalizedFilePath,
        gameFile: null,
        modified: false,
        operations: [],
      });
    }
    return this.files[normalizedFilePath];
  }

  public extracted(filePath: string): boolean {
    return this.get(filePath).extracted;
  }

  public exists(filePath: string): boolean {
    return this.get(filePath).exists;
  }

  public modified(filePath: string): boolean {
    return this.get(filePath).modified;
  }

  public async gameFile(filePath: string): Promise<boolean> {
    const fileStatus = this.get(filePath);
    if (fileStatus.gameFile != null) {
      return fileStatus.gameFile;
    }
    try {
      return await this.runtime.BridgeAPI.isGameFile(fileStatus.filePath);
    } catch {
      return false;
    }
  }

  public async extract(filePath: string, mod: string): Promise<void> {
    const fileStatus = this.get(filePath);
    fileStatus.operations.push({ mod, type: 'extract' });
    fileStatus.exists = true;
    fileStatus.extracted = true;
  }

  public async read(filePath: string, mod: string): Promise<void> {
    const fileStatus = this.get(filePath);
    fileStatus.operations.push({ mod, type: 'read' });
  }

  public async write(filePath: string, mod: string): Promise<void> {
    const fileStatus = this.get(filePath);

    if (
      // if the mod is writing a file that it has never read or written
      !fileStatus.operations
        .filter((op) => op.mod === mod)
        .some((op) => op.type === 'read' || op.type === 'write')
    ) {
      const modsThatWroteThisFile = fileStatus.operations
        .filter((op) => op.mod !== mod && op.type === 'write')
        .map((op) => op.mod);
      // if some other mod wrote to this file first
      // then this mod could be overwriting changes
      if (modsThatWroteThisFile.length > 0) {
        this.runtime.console.warn(
          `Mod "${mod}" is modifying file "${
            fileStatus.filePath
          }" without reading it first. This file was previously modified by ${joinListInEnglish(
            modsThatWroteThisFile.map((mod) => `"${mod}"`),
          )} and these changes will be lost. Consider moving "${mod}" higher in the load order.`,
        );
      }
      // otherwise, this mod could be overwriting game updates
      else if (
        // if the file is a text file
        (fileStatus.filePath.endsWith('.txt') ||
          fileStatus.filePath.endsWith('.json')) &&
        // and it's part of the game
        (await this.gameFile(filePath))
      ) {
        this.runtime.console.warn(
          `Mod "${mod}" is modifying file "${fileStatus.filePath}" without reading it first. No other mods have written to this file, but make sure to update this mod whenever Diablo II updates.`,
        );
      }
    }

    fileStatus.operations.push({ mod, type: 'write' });
    fileStatus.exists = true;
    fileStatus.modified = true;
  }

  public setData(filePath: string, data: Buffer): void {
    const fileStatus = this.get(filePath);
    fileStatus.data = data;
    fileStatus.exists = true;
  }

  public getData(filePath: string): Buffer | null {
    return this.get(filePath).data;
  }

  public getModifiedFiles(): Array<{ filePath: string; data: Buffer }> {
    return Object.entries(this.files)
      .filter(
        (entry): entry is [string, FileStatus & { data: Buffer }] =>
          entry[1].modified && entry[1].data != null,
      )
      .map(([filePath, fileStatus]) => ({
        filePath,
        data: fileStatus.data,
      }));
  }
}

function joinListInEnglish(list: string[]): string {
  if (list.length === 0) {
    return '';
  }
  if (list.length === 1) {
    return list[0];
  }
  return `${list.slice(0, -1).join(', ')}, and ${list.slice(-1)[0]}`;
}
