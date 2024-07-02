import type { ConsoleArg, ILogLevel } from 'bridge/ConsoleAPI';
import useConsoleListener from 'renderer/react/hooks/useConsoleListener';
import React, {
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from 'react';

export type ILog = {
  id: number;
  level: ILogLevel;
  timestamp: number;
  data: ConsoleArg[];
};

export type ILogs = ILog[];

type ILogReaderContext = {
  logs: ILogs;
  levels: ILogLevel[];
  setLevels: (levels: ILogLevel[]) => void;
};

type ILogWriterContext = {
  clear: () => void;
  add: (level: ILogLevel, args: ConsoleArg[]) => void;
  error: (...data: ConsoleArg[]) => void;
  warn: (...data: ConsoleArg[]) => void;
  log: (...data: ConsoleArg[]) => void;
  debug: (...data: ConsoleArg[]) => void;
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
  const [, startTransition] = useTransition();
  const [logs, setLogs] = useState<ILogs>([]);
  const [levels, setLevels] = useState<ILogLevel[]>(['error', 'warn', 'log']);

  const clear = useCallback((): void => setLogs([]), []);

  const add = useCallback((level: ILogLevel, args: ConsoleArg[]): void => {
    const newLog: ILog = {
      id: LOG_ID++,
      level,
      timestamp: Date.now(),
      data: args,
    };
    startTransition(() => {
      setLogs((logs) => [...logs, newLog]);
    });
  }, []);

  const error = useCallback(
    (...args: ConsoleArg[]) => add('error', args),
    [add],
  );
  const warn = useCallback((...args: ConsoleArg[]) => add('warn', args), [add]);
  const log = useCallback((...args: ConsoleArg[]) => add('log', args), [add]);
  const debug = useCallback(
    (...args: ConsoleArg[]) => add('debug', args),
    [add],
  );

  const readerContext = useMemo(
    (): ILogReaderContext => ({
      logs,
      levels,
      setLevels,
    }),
    [logs, levels, setLevels],
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
    [clear, add, error, warn, log, debug],
  );

  useConsoleListener(add);

  return (
    <WriterContext.Provider value={writerContext}>
      <ReaderContext.Provider value={readerContext}>
        {children}
      </ReaderContext.Provider>
    </WriterContext.Provider>
  );
}
