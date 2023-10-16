import { CssBaseline, Theme, ThemeProvider, createTheme } from '@mui/material';
import React, { useContext, useMemo } from 'react';
import useSavedState from './useSavedState';

export type IExactThemeMode = 'light' | 'dark';
export type IThemeMode = IExactThemeMode | 'system';

const LIGHT_THEME = createTheme({
  palette: {
    mode: 'light',
  },
});

const DARK_THEME = createTheme({
  palette: {
    mode: 'dark',
  },
});

function getSystemThemeMode(): IExactThemeMode {
  if (
    window.matchMedia != null &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

function getExactTheme(mode: IExactThemeMode): Theme {
  switch (mode) {
    case 'light':
      return LIGHT_THEME;
    case 'dark':
      return DARK_THEME;
    default:
      throw new Error('Invalid theme selected.');
  }
}

function getTheme(mode: IThemeMode): Theme {
  return getExactTheme(mode === 'system' ? getSystemThemeMode() : mode);
}

type IThemeContext = {
  themeMode: IThemeMode;
  setThemeMode: React.Dispatch<React.SetStateAction<IThemeMode>>;
};

export const Context = React.createContext<IThemeContext | null>(null);

export default function ThemeContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [themeMode, setThemeMode] = useSavedState<IThemeMode>('theme', 'light');

  const theme = getTheme(themeMode);

  const context = useMemo(
    (): IThemeContext => ({
      themeMode,
      setThemeMode,
    }),
    [themeMode, setThemeMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Context.Provider value={context}>{children}</Context.Provider>
    </ThemeProvider>
  );
}

export function useThemeMode(): [
  IThemeMode,
  React.Dispatch<React.SetStateAction<IThemeMode>>
] {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('No preferences context available.');
  }
  return [context.themeMode, context.setThemeMode];
}
