import { Box, LinearProgress, Tab } from '@mui/material';
import {
  useInstallationProgress,
  useIsInstalling,
} from 'renderer/react/context/InstallContext';

export default function InstallationProgressBar() {
  const [isInstalling] = useIsInstalling();
  const [installationProgress] = useInstallationProgress();

  if (!isInstalling) {
    return null;
  }

  return (
    <>
      <Box sx={{ flex: 1 }}>
        <LinearProgress value={installationProgress} variant="determinate" />
      </Box>
      <Tab disabled={true} label={`${installationProgress.toFixed(0)}%`} />
    </>
  );
}
