import React, { useContext } from 'react';

export type IPathsContext = {
  gamePath: string;
  mergedPath: string;
  rawGamePath: string;
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
