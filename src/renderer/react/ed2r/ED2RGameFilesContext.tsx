import React, { useMemo } from 'react';

export type GameFile =
  | TSVData // tsv
  | JSONData // json
  | string; // sprite as base64 data URI

export type GameFiles = { [fileName: string]: GameFile };

export type IGameFilesContext = {
  gameFiles: GameFiles;
  setGameFiles: React.Dispatch<React.SetStateAction<GameFiles>>;
};

const GameFilesContext = React.createContext<IGameFilesContext | null>(null);

export function GameFilesContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [gameFiles, setGameFiles] = React.useState<GameFiles>({});

  const context = useMemo(
    () => ({
      gameFiles,
      setGameFiles,
    }),
    [gameFiles, setGameFiles],
  );

  return (
    <GameFilesContext.Provider value={context}>
      {children}
    </GameFilesContext.Provider>
  );
}

export function useGameFiles(): IGameFilesContext {
  const context = React.useContext(GameFilesContext);
  if (context == null) {
    throw new Error('useGameFiles used outside of a GameFilesContextProvider');
  }
  return context;
}
