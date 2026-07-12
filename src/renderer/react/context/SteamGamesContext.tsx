import type { SteamD2RDetection } from 'bridge/BridgeAPI';
import React, { useContext, useMemo, useState } from 'react';

type ISteamGames = SteamD2RDetection | null;
type ISetSteamGames = React.Dispatch<React.SetStateAction<ISteamGames>>;

type ISteamGamesContext = {
  games: ISteamGames;
  setGames: ISetSteamGames;
};

export const Context = React.createContext<ISteamGamesContext | null>(null);

export function useSteamGames(): [ISteamGames, ISetSteamGames] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useSteamGames must be used within a SteamGamesContextProvider',
    );
  }
  return [context.games, context.setGames];
}

type Props = {
  children: React.ReactNode;
};

export function SteamGamesContextProvider({ children }: Props): JSX.Element {
  const [games, setGames] = useState<ISteamGames>(null);

  const context = useMemo(
    (): ISteamGamesContext => ({ games, setGames }),
    [games, setGames],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
