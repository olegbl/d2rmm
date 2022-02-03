import {
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tooltip,
} from '@mui/material';
import { useCallback, useState } from 'react';

const API = window.electron.API;

function setConfig(
  paths: D2RMMPaths,
  mod: Mod,
  field: string,
  value: ModConfigSingleValue
): void {
  mod.config[field] = value;
  API.writeModConfig(paths.modPath, mod.id, mod.config);
}

function ModSettingsField({
  field,
  mod,
  paths,
}: {
  field: ModConfigField;
  mod: Mod;
  paths: D2RMMPaths;
}): JSX.Element | null {
  const [, setCacheBreaker] = useState(0);
  const refresh = useCallback(() => setCacheBreaker((value) => value + 1), []);

  let control = null;

  if (field.type === 'checkbox') {
    control = (
      <Checkbox
        checked={Boolean(mod.config[field.id])}
        onChange={(event) => {
          setConfig(paths, mod, field.id, event.target.checked);
          refresh();
        }}
      />
    );
  }

  if (control != null) {
    let result = <FormControlLabel control={control} label={field.name} />;
    if (field.description != null) {
      result = <Tooltip title={field.description}>{result}</Tooltip>;
    }
    return result;
  }

  return null;
}

export default function ModSettings({
  mod,
  onClose,
  paths,
}: {
  mod: Mod;
  onClose: () => unknown;
  paths: D2RMMPaths;
}): JSX.Element | null {
  // this should never happen as there should be no settings
  // button available on mods without a config
  if (mod.info.config == null) {
    return null;
  }

  return (
    <>
      <FormGroup sx={{ padding: 1, minWidth: 240 }}>
        {mod.info.config.map((field) => (
          <ModSettingsField
            key={mod.id}
            field={field}
            mod={mod}
            paths={paths}
          />
        ))}
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </FormGroup>
    </>
  );
}
