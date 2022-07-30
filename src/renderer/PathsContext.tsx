import React, { useContext } from 'react';

export type IPathsContext = {
  gamePath: string;
  isDirectData: boolean;
  mergedPath: string;
  rawGamePath: string;
  setIsDirectData: (value: boolean) => void;
  setRawGamePath: (value: string) => void;
};

const PathsContext = React.createContext<IPathsContext | null>(null);

export default PathsContext;

export function usePathsContext(): IPathsContext {
  const context = useContext(PathsContext);
  if (context == null) {
    throw new Error('No PathsContext available.');
  }
  return context;
}
