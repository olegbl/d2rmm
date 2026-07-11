import type { LutrisGame } from 'bridge/BridgeAPI';
import React, { useContext, useMemo, useState } from 'react';

type ILutrisGames = LutrisGame[] | null;
type ISetLutrisGames = React.Dispatch<React.SetStateAction<ILutrisGames>>;

type ILutrisGamesContext = {
  games: ILutrisGames;
  setGames: ISetLutrisGames;
};

export const Context = React.createContext<ILutrisGamesContext | null>(null);

export function useLutrisGames(): [ILutrisGames, ISetLutrisGames] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useLutrisGames must be used within a LutrisGamesContextProvider',
    );
  }
  return [context.games, context.setGames];
}

type Props = {
  children: React.ReactNode;
};

export function LutrisGamesContextProvider({ children }: Props): JSX.Element {
  // In-memory only: survives tab switches (settings tab unmounts), resets on restart.
  const [games, setGames] = useState<ILutrisGames>(null);

  const context = useMemo(
    (): ILutrisGamesContext => ({ games, setGames }),
    [games, setGames],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
