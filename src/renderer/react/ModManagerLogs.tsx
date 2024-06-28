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
import { useIsInstalling } from './context/InstallContext';
import { useLogLevels, useLogs } from './context/LogContext';

const ROW_HEIGHT = 80;

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
          key={log.id}
          divider={index < filteredLogs.length - 1}
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

  const isScrolledToEndRef = useRef(false);
  useEffect(() => {
    // while mods are installing, continuously scroll to the bottom
    if (isInstalling && isScrolledToEndRef.current) {
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
              height={height}
              itemCount={filteredLogs.length}
              itemKey={getItemKey}
              itemSize={ROW_HEIGHT}
              onScroll={(event) => {
                const maxScroll = filteredLogs.length * ROW_HEIGHT - height;
                const graceAmount = ROW_HEIGHT / 2;
                isScrolledToEndRef.current =
                  event.scrollOffset >= maxScroll - graceAmount;
              }}
              overscanCount={5}
              width={width}
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
          hiddenLabel={true}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search..."
          size="small"
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
          value={filter}
          variant="outlined"
        />
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          aria-label="text alignment"
          onChange={onChangeLevels}
          size="small"
          sx={{ marginRight: 2 }}
          value={levels}
        >
          <ToggleButton sx={{ paddingLeft: 1, paddingRight: 1 }} value="error">
            <ErrorOutlineIcon color="error" sx={{ marginRight: 1 }} />
            Error
          </ToggleButton>
          <ToggleButton sx={{ paddingLeft: 1, paddingRight: 1 }} value="warn">
            <ReportProblemOutlinedIcon
              color="warning"
              sx={{ marginRight: 1 }}
            />
            Warning
          </ToggleButton>
          <ToggleButton sx={{ paddingLeft: 1, paddingRight: 1 }} value="log">
            <InfoOutlinedIcon color="primary" sx={{ marginRight: 1 }} />
            Info
          </ToggleButton>
          <ToggleButton sx={{ paddingLeft: 1, paddingRight: 1 }} value="debug">
            <PendingOutlinedIcon color="disabled" sx={{ marginRight: 1 }} />
            Debug
          </ToggleButton>
        </ToggleButtonGroup>
        <Button
          onClick={onOpenExportMenu}
          startIcon={<DownloadIcon />}
          variant="outlined"
        >
          Export
        </Button>
        <Menu
          anchorEl={exportAnchorEl}
          onClose={onCloseExportMenu}
          open={exportAnchorEl != null}
        >
          <MenuItem onClick={onCopy}>Copy to clipboard</MenuItem>
        </Menu>
      </Box>
      <Drawer
        anchor="bottom"
        onClose={() => setSelectedRowIndex(-1)}
        open={selectedRowIndex !== -1}
      >
        {selectedRowIndex === -1 ? null : (
          <>
            <AppBar position="static">
              <Toolbar>
                <Typography component="div" variant="h6">
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
                  color="inherit"
                  edge="start"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      filteredLogs[selectedRowIndex].text,
                    )
                  }
                  size="large"
                  sx={{ marginRight: 2 }}
                >
                  <ContentCopyOutlinedIcon />
                </IconButton>
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={() => setSelectedRowIndex(-1)}
                  size="large"
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
