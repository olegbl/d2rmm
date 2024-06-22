import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useConsoleListener } from './Console';

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
  const logsRef = useRef<ILogs>([]);
  const [logs, setLogs] = useState<ILogs>([]);
  const [levels, setLevels] = useState<ILogLevel[]>(['error', 'warn', 'log']);

  const clear = useCallback((): void => setLogs([]), []);

  const add = useCallback((level: ILogLevel, ...data: unknown[]): void => {
    const newLog: ILog = {
      id: LOG_ID++,
      level,
      timestamp: Date.now(),
      data,
    };
    // we don't necessarily want to re-render every time a log comes in
    // it could get laggy, and it could break if the log is from a React render error
    // so we put them all in a ref and update the state every second
    logsRef.current = [...logsRef.current, newLog];
  }, []);

  const error = useCallback((...d: unknown[]) => add('error', ...d), [add]);
  const warn = useCallback((...d: unknown[]) => add('warn', ...d), [add]);
  const log = useCallback((...d: unknown[]) => add('log', ...d), [add]);
  const debug = useCallback((...d: unknown[]) => add('debug', ...d), [add]);

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

  useEffect(() => {
    const intervalID = setInterval(() => {
      setLogs(logsRef.current);
    }, 1000);
    return () => clearInterval(intervalID);
  }, []);

  return (
    <WriterContext.Provider value={writerContext}>
      <ReaderContext.Provider value={readerContext}>
        {children}
      </ReaderContext.Provider>
    </WriterContext.Provider>
  );
}
