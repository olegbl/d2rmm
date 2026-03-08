import { useInstallBeforeRun } from 'renderer/react/context/InstallBeforeRunContext';
import { useTranslation } from 'react-i18next';
import { Divider, Switch, Typography } from '@mui/material';

export default function InstallBeforeRunSettings(): JSX.Element {
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useInstallBeforeRun();

  return (
    <>
      <Divider sx={{ marginTop: 2, marginBottom: 1 }} />
      <Typography color="text.secondary" variant="subtitle2">
        {t('settings.general.installBeforeRun.description')}
      </Typography>
      <Switch
        checked={isEnabled}
        onChange={(_event, checked) => setIsEnabled(checked)}
      />
    </>
  );
}
