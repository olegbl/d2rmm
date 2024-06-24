import {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactVirtualizedAutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material';
import type { ILogLevel } from 'bridge/ConsoleAPI';
import { useIsInstalling } from './InstallContext';
import { useLogLevels, useLogs } from './Logs';

function prettyPrintData(data: unknown): string {
  if (Array.isArray(data)) {
    return data.map(prettyPrintData).join(' ');
  }
  if (typeof data === 'object') {
    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }
  return String(data);
}

type Props = Record<string, never>;

export default function ModManagerSettings(_props: Props): JSX.Element {
  const logs = useLogs();
  const [isInstalling] = useIsInstalling();
  const [levels, setLevels] = useLogLevels();
  const [filter, setFilter] = useState('');
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1);
  const listRef = useRef<FixedSizeList | null>(null);
  const [exportAnchorEl, setExportAnchorEl] =
    useState<HTMLButtonElement | null>(null);

  const onOpenExportMenu = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void =>
      setExportAnchorEl(event.currentTarget),
    [],
  );

  const onCloseExportMenu = useCallback(
    (): void => setExportAnchorEl(null),
    [],
  );

  const onChangeLevels = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newValue: ILogLevel[]) => {
      setLevels(newValue);
    },
    [setLevels],
  );

  const onCopy = useCallback((): void => {
    navigator.clipboard
      .writeText(
        // always copy all logs, including the filtered ones
        // because people will forget to enable debug level
        logs
          .map((log) => [
            new Date(log.timestamp).toISOString(),
            log.level,
            ...log.data.map(prettyPrintData),
          ])
          .map((log) => log.join(','))
          .join('\n'),
      )
      .catch(console.error);
    onCloseExportMenu();
  }, [logs, onCloseExportMenu]);

  const filteredLogs = useMemo(
    () =>
      logs
        .filter((log) => levels.includes(log.level))
        .map((log) => ({
          ...log,
          text: log.data.map(prettyPrintData).join(' '),
        }))
        .filter(
          (log) =>
            filter === '' ||
            log.text.toLowerCase().includes(filter.toLowerCase()),
        ),
    [logs, levels, filter],
  );

  const renderRow = useCallback(
    ({ style, index }: ListChildComponentProps) => {
      const log = filteredLogs[index];
      return (
        <ListItemButton
          divider={index < filteredLogs.length - 1}
          key={log.id}
          onClick={() => setSelectedRowIndex(index)}
          style={style}
          sx={{ flex: 1, userSelect: 'none' }}
        >
          <ListItemIcon>
            {log.level === 'error' && <ErrorOutlineIcon color="error" />}
            {log.level === 'warn' && (
              <ReportProblemOutlinedIcon color="warning" />
            )}
            {log.level === 'log' && <InfoOutlinedIcon color="primary" />}
            {log.level === 'debug' && <PendingOutlinedIcon color="disabled" />}
          </ListItemIcon>
          <ListItemText
            primary={log.text.slice(0, 512)}
            primaryTypographyProps={{
              sx: {
                // clamp messages to a maximum number of lines to avoid some log messages
                // with a lot of data in them from taking up too much space
                display: '-webkit-box',
                overflow: 'hidden',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              },
            }}
            secondary={new Date(log.timestamp).toLocaleTimeString()}
          />
        </ListItemButton>
      );
    },
    [filteredLogs],
  );

  const getItemKey = useCallback(
    (index: number) => filteredLogs[index].id,
    [filteredLogs],
  );

  useEffect(() => {
    // while mods are installing, continuously scroll to the bottom
    if (isInstalling) {
      listRef.current?.scrollToItem(filteredLogs.length - 1, 'end');
    }
  }, [isInstalling, filteredLogs]);

  return (
    <>
      <Box sx={{ width: '100%', flex: 1, bgcolor: 'background.paper' }}>
        <ReactVirtualizedAutoSizer>
          {({ height, width }) => (
            <FixedSizeList
              ref={listRef}
              width={width}
              height={height}
              itemKey={getItemKey}
              itemCount={filteredLogs.length}
              overscanCount={5}
              itemSize={80}
            >
              {renderRow}
            </FixedSizeList>
          )}
        </ReactVirtualizedAutoSizer>
      </Box>
      <Divider />
      <Box
        sx={{
          flexGrow: 0,
          flexShrink: 0,
          display: 'flex',
          m: 1,
        }}
      >
        <TextField
          size="small"
          variant="outlined"
          hiddenLabel={true}
          placeholder="Search..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: '0 1 auto',
            display: 'flex',
            flexDirection: 'row',
            '& .MuiInputBase-root': {
              width: '150px',
              transition: 'width ease-in-out 0.35s 0s',
              '&.Mui-focused': {
                width: '400px',
              },
            },
          }}
        />
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          size="small"
          value={levels}
          onChange={onChangeLevels}
          aria-label="text alignment"
          sx={{ marginRight: 2 }}
        >
          <ToggleButton value="error" sx={{ paddingLeft: 1, paddingRight: 1 }}>
            <ErrorOutlineIcon color="error" sx={{ marginRight: 1 }} />
            Error
          </ToggleButton>
          <ToggleButton value="warn" sx={{ paddingLeft: 1, paddingRight: 1 }}>
            <ReportProblemOutlinedIcon
              color="warning"
              sx={{ marginRight: 1 }}
            />
            Warning
          </ToggleButton>
          <ToggleButton value="log" sx={{ paddingLeft: 1, paddingRight: 1 }}>
            <InfoOutlinedIcon color="primary" sx={{ marginRight: 1 }} />
            Info
          </ToggleButton>
          <ToggleButton value="debug" sx={{ paddingLeft: 1, paddingRight: 1 }}>
            <PendingOutlinedIcon color="disabled" sx={{ marginRight: 1 }} />
            Debug
          </ToggleButton>
        </ToggleButtonGroup>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onOpenExportMenu}
        >
          Export
        </Button>
        <Menu
          anchorEl={exportAnchorEl}
          open={exportAnchorEl != null}
          onClose={onCloseExportMenu}
        >
          <MenuItem onClick={onCopy}>Copy to clipboard</MenuItem>
        </Menu>
      </Box>
      <Drawer
        anchor="bottom"
        open={selectedRowIndex !== -1}
        onClose={() => setSelectedRowIndex(-1)}
      >
        {selectedRowIndex === -1 ? null : (
          <>
            <AppBar position="static">
              <Toolbar>
                <Typography variant="h6" component="div">
                  {filteredLogs[selectedRowIndex].level === 'error'
                    ? 'Error'
                    : filteredLogs[selectedRowIndex].level === 'warn'
                      ? 'Warning'
                      : filteredLogs[selectedRowIndex].level === 'log'
                        ? 'Info'
                        : filteredLogs[selectedRowIndex].level === 'debug'
                          ? 'Debug'
                          : ''}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <IconButton
                  size="large"
                  edge="start"
                  color="inherit"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      filteredLogs[selectedRowIndex].text,
                    )
                  }
                  sx={{ marginRight: 2 }}
                >
                  <ContentCopyOutlinedIcon />
                </IconButton>
                <IconButton
                  size="large"
                  edge="start"
                  color="inherit"
                  onClick={() => setSelectedRowIndex(-1)}
                >
                  <CloseIcon />
                </IconButton>
              </Toolbar>
            </AppBar>
            <Box
              sx={{
                padding: 2,
                flex: 1,
                overflow: 'auto',
                wordBreak: 'break-all',
                whiteSpace: 'pre-wrap',
              }}
            >
              {filteredLogs[selectedRowIndex].text}
            </Box>
          </>
        )}
      </Drawer>
    </>
  );
}
