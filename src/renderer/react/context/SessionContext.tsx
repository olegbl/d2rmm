import React, { useMemo } from 'react';

type Session = Readonly<{
  [key: string]: unknown;
}>;
type SetSession = React.Dispatch<React.SetStateAction<Session>>;

type ISessionContext = Readonly<{
  session: Session;
  setSession: SetSession;
}>;

const SessionContext = React.createContext<ISessionContext | null>(null);

export function SessionContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [session, setSession] = React.useState<Session>({});

  const context = useMemo(
    () => ({
      session,
      setSession,
    }),
    [session, setSession],
  );

  return (
    <SessionContext.Provider value={context}>
      {children}
    </SessionContext.Provider>
  );
}

function useSessionContext(): ISessionContext {
  const context = React.useContext(SessionContext);
  if (context == null) {
    throw new Error(
      'useSessionContext used outside of a SessionContextProvider',
    );
  }
  return context;
}

function getSessionValue<T>(session: Session, key: string, initialValue: T): T {
  return Object.prototype.hasOwnProperty.call(session, key)
    ? (session[key] as T)
    : initialValue;
}

type SetSessionStateArg<T> = T extends (...args: never) => unknown
  ? never // don't allow functions as T
  : React.SetStateAction<T>;

export default function useSessionState<
  T,
  TSetValueArg extends SetSessionStateArg<T> = SetSessionStateArg<T>,
>(key: string, initialValue: T): [T, React.Dispatch<TSetValueArg>] {
  const { session, setSession } = useSessionContext();

  const value = getSessionValue(session, key, initialValue);

  const setValue = React.useCallback(
    (action: TSetValueArg) => {
      setSession((oldSession) => {
        if (typeof action === 'function') {
          const oldValue = getSessionValue(oldSession, key, initialValue);
          const newValue = action(oldValue);
          return { ...oldSession, [key]: newValue };
        } else {
          const newValue = action;
          return { ...oldSession, [key]: newValue };
        }
      });
    },
    [setSession, key, initialValue],
  );

  return [value, setValue];
}
