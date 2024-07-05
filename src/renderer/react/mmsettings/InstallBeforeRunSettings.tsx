import { useInstallBeforeRun } from 'renderer/react/context/InstallBeforeRunContext';
import { Divider, Switch, Typography } from '@mui/material';

export default function InstallBeforeRunSettings(): JSX.Element {
  const [isEnabled, setIsEnabled] = useInstallBeforeRun();

  return (
    <>
      <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
      <Typography color="text.secondary" variant="subtitle2">
        Automatically install mods before running the game (when using "Run D2R"
        button).
      </Typography>
      <Switch
        checked={isEnabled}
        onChange={(_event, checked) => setIsEnabled(checked)}
      />
    </>
  );
}
