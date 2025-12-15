import type { ID2S, IStash } from 'bridge/third-party/d2s/d2/types';
import React, { useMemo } from 'react';

type BaseFile = Readonly<{
  fileName: string;
  edited: boolean;
  readTime: number;
  saveTime: null | number;
}>;

export type CharacterFile = BaseFile &
  Readonly<{
    type: 'character';
    character: ID2S;
  }>;

export type StashFile = BaseFile &
  Readonly<{
    type: 'stash';
    stash: IStash;
  }>;

export type SaveFile = CharacterFile | StashFile;

type SaveFiles = { [fileName: string]: SaveFile };
type ChangedSaveFiles = { [fileName: string]: SaveFile };

export type ISaveFilesContext = {
  isLoaded: boolean;
  saveFiles: SaveFiles;
  setSaveFiles: React.Dispatch<React.SetStateAction<null | SaveFiles>>;
  onChange: (file: SaveFile) => void;
  onCommit: (file: SaveFile) => void;
  onRevert: (file: SaveFile) => void;
  onReset: () => void;
};

const SaveFilesContext = React.createContext<ISaveFilesContext | null>(null);

export function SaveFilesContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [baseSaveFiles, setBaseSaveFiles] = React.useState<null | SaveFiles>(
    null,
  );
  const [changedSaveFiles, setChangedSaveFiles] =
    React.useState<ChangedSaveFiles>({});

  const isLoaded = baseSaveFiles != null;

  const saveFiles: SaveFiles = React.useMemo(
    () => ({
      ...baseSaveFiles,
      ...changedSaveFiles,
    }),
    [baseSaveFiles, changedSaveFiles],
  );

  const onCommit = React.useCallback((saveFile: SaveFile) => {
    setBaseSaveFiles((files) => ({
      ...files,
      [saveFile.fileName]: saveFile,
    }));
    setChangedSaveFiles(({ [saveFile.fileName]: _file, ...files }) => files);
  }, []);

  const onChange = React.useCallback(
    (saveFile: SaveFile) =>
      setChangedSaveFiles((files) => ({
        ...files,
        [saveFile.fileName]: saveFile,
      })),
    [],
  );

  const onRevert = React.useCallback((saveFile: SaveFile) => {
    setChangedSaveFiles(({ [saveFile.fileName]: _file, ...files }) => files);
  }, []);

  const onReset = React.useCallback(() => {
    setBaseSaveFiles(null);
    setChangedSaveFiles({});
  }, []);

  const context = useMemo(
    () => ({
      isLoaded,
      saveFiles,
      setSaveFiles: setBaseSaveFiles,
      onChange,
      onCommit,
      onRevert,
      onReset,
    }),
    [
      isLoaded,
      saveFiles,
      setBaseSaveFiles,
      onChange,
      onCommit,
      onRevert,
      onReset,
    ],
  );

  return (
    <SaveFilesContext.Provider value={context}>
      {children}
    </SaveFilesContext.Provider>
  );
}

export function useSaveFiles(): ISaveFilesContext {
  const context = React.useContext(SaveFilesContext);
  if (context == null) {
    throw new Error(
      'useSaveFilesState used outside of a SaveFilesContextProvider',
    );
  }
  return context;
}
