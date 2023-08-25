import React, { useCallback, useContext, useMemo, useState } from 'react';

export type ILogLevel = 'error' | 'warning' | 'info' | 'debug';

export type ILog = {
  id: number;
  level: ILogLevel;
  timestamp: number;
  data: unknown[];
};

export type ILogs = ILog[];

type ILogReaderContext = {
  logs: ILogs;
  levels: ILogLevel[];
  setLevels: (levels: ILogLevel[]) => void;
};

type ILogWriterContext = {
  clear: () => void;
  add: (level: ILogLevel, ...data: unknown[]) => void;
  error: (...data: unknown[]) => void;
  warn: (...data: unknown[]) => void;
  log: (...data: unknown[]) => void;
  debug: (...data: unknown[]) => void;
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

export function useLogLevels(): [ILogLevel[], (levels: ILogLevel[]) => void] {
  const context = useContext(ReaderContext);
  if (context == null) {
    throw new Error('No Logs context available.');
  }
  return [context.levels, context.setLevels];
}

export type ILogger = ILogWriterContext;

export function useLogger(): ILogger {
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
  const [levels, setLevels] = useState<ILogLevel[]>([
    'error',
    'warning',
    'info',
  ]);

  const clear = useCallback((): void => setLogs([]), []);

  const add = useCallback(
    (level: ILogLevel, ...data: unknown[]): void => {
      const newLog: ILog = {
        id: LOG_ID++,
        level,
        timestamp: Date.now(),
        data,
      };
      switch (level) {
        case 'error':
          console.error(...data);
          break;
        case 'warning':
          console.warn(...data);
          break;
        case 'info':
          console.info(...data);
          break;
        case 'debug':
          console.debug(...data);
          break;
        default:
          console.log(...data);
          break;
      }
      setLogs((oldLogs: ILogs) => [...oldLogs, newLog]);
    },
    [setLogs]
  );

  const error = useCallback((...d: unknown[]) => add('error', ...d), [add]);
  const warn = useCallback((...d: unknown[]) => add('warning', ...d), [add]);
  const log = useCallback((...d: unknown[]) => add('info', ...d), [add]);
  const debug = useCallback((...d: unknown[]) => add('debug', ...d), [add]);

  const readerContext = useMemo(
    (): ILogReaderContext => ({
      logs,
      levels,
      setLevels,
    }),
    [logs, levels, setLevels]
  );

  const writerContext = useMemo(
    (): ILogWriterContext => ({
      clear,
      add,
      error,
      warn,
      log,
      debug,
    }),
    [clear, add, error, warn, log, debug]
  );

  return (
    <WriterContext.Provider value={writerContext}>
      <ReaderContext.Provider value={readerContext}>
        {children}
      </ReaderContext.Provider>
    </WriterContext.Provider>
  );
}
