import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import PendingIcon from '@mui/icons-material/Pending';
import DownloadIcon from '@mui/icons-material/Download';
import { useCallback, useState } from 'react';
import { useLogLevels, useLogs } from './Logs';

function prettyPrintData(data: unknown): string {
  if (Array.isArray(data)) {
    return data.map(prettyPrintData).join(',');
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
  const [levels, setLevels] = useLogLevels();
  const [exportAnchorEl, setExportAnchorEl] = useState(null);

  const onOpenExportMenu = useCallback(
    (event): void => setExportAnchorEl(event.currentTarget),
    []
  );

  const onCloseExportMenu = useCallback(
    (): void => setExportAnchorEl(null),
    []
  );

  const onChangeLevels = useCallback(
    (event) => {
      setLevels(
        typeof event.target.value === 'string'
          ? event.target.value.split(',')
          : event.target.value
      );
    },
    [setLevels]
  );

  const onCopy = useCallback((): void => {
    navigator.clipboard.writeText(
      // always copy all logs, including the filtered ones
      // because people will forget to enable debug level
      logs
        .map((log) => [
          new Date(log.timestamp).toISOString(),
          log.level,
          ...log.data.map(prettyPrintData),
        ])
        .map((log) => log.join(','))
        .join('\n')
    );
    onCloseExportMenu();
  }, [logs, onCloseExportMenu]);

  return (
    <>
      <List
        sx={{ width: '100%', flex: 1, overflow: 'auto' }}
        disablePadding={true}
        dense={true}
      >
        {logs
          .filter((log) => levels.includes(log.level))
          .map((log) => (
            <ListItem key={log.id}>
              <ListItemIcon>
                {log.level === 'error' && <ErrorIcon color="error" />}
                {log.level === 'warning' && <WarningIcon color="warning" />}
                {log.level === 'info' && <InfoIcon color="primary" />}
                {log.level === 'debug' && <PendingIcon color="disabled" />}
              </ListItemIcon>
              <ListItemText
                primary={log.data.map(prettyPrintData).join(' ').slice(0, 256)}
                primaryTypographyProps={{ noWrap: true }}
                secondary={new Date(log.timestamp).toLocaleTimeString()}
              />
            </ListItem>
          ))
          .reduce(
            (items: JSX.Element[], item: JSX.Element) => [
              ...items,
              <Divider />,
              item,
            ],
            []
          )}
      </List>
      <Divider />
      <Box
        sx={{
          flexGrow: 0,
          flexShrink: 0,
          display: 'flex',
          m: 1,
        }}
      >
        <FormControl variant="filled">
          <InputLabel id="log-levels-label">Log Levels</InputLabel>
          <Select
            labelId="log-levels-label"
            multiple={true}
            value={levels}
            onChange={onChangeLevels}
          >
            <MenuItem value="error">Error</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="debug">Debug</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
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
    </>
  );
}
