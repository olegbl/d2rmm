import { Close } from '@mui/icons-material';
import { Box, Divider, FormGroup, IconButton, Typography } from '@mui/material';
import { ModConfigFieldOrSection, ModConfigSection } from 'bridge/ModConfig';
import ModSettingsSection from './ModSettingsSection';

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
      {mod.info.config[0]?.type === 'section' ? <Divider /> : null}
      {
        // convert legacy "flat" sections into modern nested sections
        mod.info.config
          .reduce((agg: ModConfigSection[], field: ModConfigFieldOrSection) => {
            // handle top level fields outside and above of any section
            // by appending them to a generic default section
            if (agg.length === 0 && field.type !== 'section') {
              return [
                {
                  id: 'default-section',
                  type: 'section',
                  name: '',
                  children: [field],
                } as ModConfigSection,
              ];
            }
            // handle top level fields outside of any section
            // by appending them to the preceding section
            if (field.type !== 'section') {
              return [
                ...agg.slice(0, -1),
                {
                  ...agg[agg.length - 1],
                  children: [...(agg[agg.length - 1].children ?? []), field],
                },
              ];
            }
            // the rest should be sections
            return [...agg, field];
          }, [])
          .map((section) => (
            <ModSettingsSection key={section.id} section={section} mod={mod} />
          ))
      }
    </FormGroup>
  );
}
