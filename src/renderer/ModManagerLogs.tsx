import {
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { useLogs } from './Logs';

type Props = Record<string, never>;

export default function ModManagerSettings(_props: Props): JSX.Element {
  const logs = useLogs();

  return (
    <List
      sx={{ width: '100%', flex: 1, overflow: 'auto' }}
      disablePadding={true}
      dense={true}
    >
      {logs
        .map((log) => (
          <ListItem key={log.id}>
            <ListItemIcon>
              {log.level === 'error' && <ErrorIcon color="error" />}
              {log.level === 'warning' && <WarningIcon color="warning" />}
              {log.level === 'info' && <InfoIcon color="primary" />}
            </ListItemIcon>
            <ListItemText
              primary={log.message}
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
  );
}
