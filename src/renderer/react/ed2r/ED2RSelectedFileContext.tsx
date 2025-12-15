import {
  SaveFile,
  useSaveFiles,
} from 'renderer/react/ed2r/ED2RSaveFilesContext';
import React, { useCallback, useMemo } from 'react';

export type ISelectedFileContext = {
  selectedFileName: string | null;
  setSelectedFileName: React.Dispatch<React.SetStateAction<string | null>>;
  selectedFile: SaveFile | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<SaveFile | null>>;
};

const SelectedFileContext = React.createContext<ISelectedFileContext | null>(
  null,
);

export function SelectedFileContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const { saveFiles } = useSaveFiles();

  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(
    null,
  );

  const selectedFile =
    selectedFileName == null ? null : saveFiles[selectedFileName];

  const setSelectedFile = useCallback(
    (action: React.SetStateAction<SaveFile | null>) => {
      setSelectedFileName((previousFileName) => {
        const file =
          typeof action === 'function'
            ? action(
                previousFileName == null ? null : saveFiles[previousFileName],
              )
            : action;
        return file == null ? null : file.fileName;
      });
    },
    [saveFiles],
  );

  const context = useMemo(
    () => ({
      selectedFileName,
      setSelectedFileName,
      selectedFile,
      setSelectedFile,
    }),
    [selectedFileName, setSelectedFileName, selectedFile, setSelectedFile],
  );

  return (
    <SelectedFileContext.Provider value={context}>
      {children}
    </SelectedFileContext.Provider>
  );
}

export function useSelectedFileContext(): ISelectedFileContext {
  const context = React.useContext(SelectedFileContext);
  if (context == null) {
    throw new Error(
      'useSelectedFile used outside of a SelectedFileContextProvider',
    );
  }
  return context;
}
