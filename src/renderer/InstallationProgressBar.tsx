import { Box, LinearProgress, Tab } from '@mui/material';
import { useInstallationProgress, useIsInstalling } from './InstallContext';

export default function InstallationProgressBar() {
  const [isInstalling] = useIsInstalling();
  const [installationProgress] = useInstallationProgress();

  if (!isInstalling) {
    return null;
  }

  return (
    <>
      <Box sx={{ flex: 1 }}>
        <LinearProgress variant="determinate" value={installationProgress} />
      </Box>
      <Tab label={`${installationProgress.toFixed(0)}%`} disabled={true} />
    </>
  );
}
