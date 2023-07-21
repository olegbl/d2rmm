import { Close } from '@mui/icons-material';
import { Box, Divider, FormGroup, IconButton, Typography } from '@mui/material';
import ModSettingsField from './ModSettingsField';

type Props = {
  mod: Mod;
  onClose: () => unknown;
};

export default function ModSettings({
  mod,
  onClose,
}: Props): JSX.Element | null {
  // this should never happen as there should be no settings
  // button available on mods without a config
  if (mod.info.config == null) {
    return null;
  }

  return (
    <FormGroup sx={{ minWidth: 360 }}>
      <Box
        sx={{
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 1,
          paddingBottom: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" color="text.secondary">
          {mod.info.name}
        </Typography>
        <Box sx={{ flexGrow: 1, flexShrink: 1 }} />
        <IconButton color="default" onClick={onClose}>
          <Close />
        </IconButton>
      </Box>
      <Divider />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 1,
          paddingBottom: 1,
        }}
      >
        {mod.info.config.map((field) => (
          <ModSettingsField key={field.id} field={field} mod={mod} />
        ))}
      </Box>
    </FormGroup>
  );
}
