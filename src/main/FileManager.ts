import { InstallationRuntime } from './InstallationRuntime';

export type FileOperationType = 'extract' | 'read' | 'write';

export type FileOperation = {
  type: FileOperationType;
  mod: string;
};

export type FileStatus = {
  exists: boolean;
  extracted: boolean;
  modified: boolean;
  operations: FileOperation[];
};

function falseIfError(value: boolean | Error): boolean {
  if (value instanceof Error) {
    return false;
  }
  return value;
}

export class FileManager {
  private files: Record<string, FileStatus> = {};
  constructor(private runtime: InstallationRuntime) {}

  private get(filePath: string): FileStatus {
    if (this.files[filePath] == undefined) {
      return (this.files[filePath] = {
        exists: false,
        extracted: false,
        modified: false,
        operations: [],
      });
    }
    return this.files[filePath];
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

  public extract(filePath: string, mod: string): void {
    const fileStatus = this.get(filePath);
    fileStatus.operations.push({ mod, type: 'extract' });
    fileStatus.exists = true;
    fileStatus.extracted = true;
  }

  public read(filePath: string, mod: string): void {
    const fileStatus = this.get(filePath);
    fileStatus.operations.push({ mod, type: 'read' });
  }

  public write(filePath: string, mod: string): void {
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
          `Mod "${mod}" is modifying file "${filePath}" without reading it first. This file was previously modified by ${joinListInEnglish(
            modsThatWroteThisFile.map((mod) => `"${mod}"`)
          )} and these changes will be lost. Consider moving "${mod}" higher in the load order.`
        );
      }
      // otherwise, this mod could be overwriting game updates
      else if (falseIfError(this.runtime.BridgeAPI.isGameFile(filePath))) {
        this.runtime.console.warn(
          `Mod "${mod}" is modifying file "${filePath}" without reading it first. No other mods have written to this file, but make sure to update this mod whenever Diablo II updates.`
        );
      }
    }

    fileStatus.operations.push({ mod, type: 'write' });
    fileStatus.exists = true;
    fileStatus.modified = true;
  }

  public getUnmodifiedExtractedFiles(): string[] {
    return Object.entries(this.files)
      .filter(([, fileStatus]) => fileStatus.extracted && !fileStatus.modified)
      .map(([filePath]) => filePath);
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
