import { Refresh } from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';
import { useMods } from './ModsContext';

type Props = Record<string, never>;

export default function RefreshModsButton(_props: Props): JSX.Element {
  const [, onRefreshMods] = useMods();

  return (
    <Tooltip title="Re-scan the /mods directory for any changes.">
      <Button startIcon={<Refresh />} onClick={onRefreshMods}>
        Refresh Mod List
      </Button>
    </Tooltip>
  );
}
