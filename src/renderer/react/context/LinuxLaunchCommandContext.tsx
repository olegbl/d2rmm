import useSavedState from 'renderer/react/hooks/useSavedState';
import React, { useContext, useMemo } from 'react';

type ILinuxLaunchCommand = string;
type ISetLinuxLaunchCommand = React.Dispatch<
  React.SetStateAction<ILinuxLaunchCommand>
>;

type ILinuxLaunchCommandContext = {
  command: ILinuxLaunchCommand;
  setCommand: ISetLinuxLaunchCommand;
};

export const Context = React.createContext<ILinuxLaunchCommandContext | null>(
  null,
);

export function useLinuxLaunchCommand(): [
  ILinuxLaunchCommand,
  ISetLinuxLaunchCommand,
] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error(
      'useLinuxLaunchCommand must be used within a LinuxLaunchCommandContextProvider',
    );
  }
  return [context.command, context.setCommand];
}

type Props = {
  children: React.ReactNode;
};

export function LinuxLaunchCommandContextProvider({
  children,
}: Props): JSX.Element {
  const [command, setCommand] = useSavedState<ILinuxLaunchCommand>(
    'linux-launch-command',
    '',
  );

  const context = useMemo(
    (): ILinuxLaunchCommandContext => ({
      command,
      setCommand,
    }),
    [command, setCommand],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
