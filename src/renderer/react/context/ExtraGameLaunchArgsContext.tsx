import useSavedState from 'renderer/react/hooks/useSavedState';
import React, { useContext, useMemo } from 'react';

type IExtraGameLaunchArgs = string[];
type ISetExtraGameLaunchArgs = React.Dispatch<
  React.SetStateAction<IExtraGameLaunchArgs>
>;

type IExtraGameLaunchArgsContext = {
  args: IExtraGameLaunchArgs;
  setArgs: ISetExtraGameLaunchArgs;
};

export const Context = React.createContext<IExtraGameLaunchArgsContext | null>(
  null,
);

export function useExtraGameLaunchArgs(): [
  IExtraGameLaunchArgs,
  ISetExtraGameLaunchArgs,
] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useExtraGameLaunchArgs must be used within a ExtraGameLaunchArgsContextProvider',
    );
  }
  return [context.args, context.setArgs];
}

type Props = {
  children: React.ReactNode;
};

export function ExtraGameLaunchArgsContextProvider({
  children,
}: Props): JSX.Element {
  const [args, setArgs] = useSavedState<IExtraGameLaunchArgs>(
    'extra-args',
    [] as string[],
    (strarr) => strarr.join(' '),
    (str) => str.split(' '),
  );

  const context = useMemo(
    (): IExtraGameLaunchArgsContext => ({
      args,
      setArgs,
    }),
    [args, setArgs],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
