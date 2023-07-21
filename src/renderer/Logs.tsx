import React, { useCallback, useContext, useMemo, useState } from 'react';

export type ILogLevel = 'error' | 'warning' | 'info';

export type ILog = {
  id: number;
  level: ILogLevel;
  timestamp: number;
  message: string;
};

export type ILogs = ILog[];

type ILogReaderContext = {
  logs: ILogs;
};

type ILogWriterContext = {
  clear: () => void;
  add: (level: ILogLevel, message: string) => void;
  log: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

let LOG_ID: number = 0;

const ReaderContext = React.createContext<ILogReaderContext | null>(null);
const WriterContext = React.createContext<ILogWriterContext | null>(null);

export function useLogs(): ILogs {
  const context = useContext(ReaderContext);
  if (context == null) {
    throw new Error('No Logs context available.');
  }
  return context.logs;
}

export function useLogger(): ILogWriterContext {
  const context = useContext(WriterContext);
  if (context == null) {
    throw new Error('No Logs context available.');
  }
  return context;
}

type Props = {
  children: React.ReactNode;
};

export function LogsProvider({ children }: Props): JSX.Element {
  const [logs, setLogs] = useState<ILogs>([]);

  const clear = useCallback((): void => setLogs([]), []);

  const add = useCallback(
    (level: ILogLevel, message: string): void => {
      const newLog: ILog = {
        id: LOG_ID++,
        level,
        timestamp: Date.now(),
        message,
      };
      setLogs((oldLogs: ILogs) => [...oldLogs, newLog]);
    },
    [setLogs]
  );

  const error = useCallback((message: string) => add('error', message), [add]);
  const warn = useCallback((message: string) => add('warning', message), [add]);
  const log = useCallback((message: string) => add('info', message), [add]);

  const readerContext = useMemo(
    (): ILogReaderContext => ({
      logs,
    }),
    [logs]
  );

  const writerContext = useMemo(
    (): ILogWriterContext => ({
      clear,
      add,
      error,
      warn,
      log,
    }),
    [clear, add, error, warn, log]
  );

  return (
    <WriterContext.Provider value={writerContext}>
      <ReaderContext.Provider value={readerContext}>
        {children}
      </ReaderContext.Provider>
    </WriterContext.Provider>
  );
}
