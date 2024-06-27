import { useCallback, useState } from 'react';
import { Refresh } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Tooltip } from '@mui/material';
import { useMods } from './ModsContext';

type Props = Record<string, never>;

export default function RefreshModsButton(_props: Props): JSX.Element {
  const [, onRefreshMods] = useMods();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onClick = useCallback(async () => {
    setIsRefreshing(true);
    await onRefreshMods();
    setIsRefreshing(false);
  }, [onRefreshMods]);

  return (
    <Tooltip title="Re-scan the /mods directory for any changes.">
      <LoadingButton
        loading={isRefreshing}
        loadingPosition="start"
        onClick={onClick}
        startIcon={<Refresh />}
      >
        Refresh Mod List
      </LoadingButton>
    </Tooltip>
  );
}
