import { useCallback, useEffect, useMemo, useState } from 'react';
import { MuiColorInput } from 'mui-color-input';
import { debounce } from '@mui/material';
import { ModConfigFieldColor } from './ModConfig';
import { ModConfigSingleValue } from './ModConfigValue';

type Props = {
  field: ModConfigFieldColor;
  mod: Mod;
  onChange: (fieldID: string, value: ModConfigSingleValue) => unknown;
};

export default function ModSettingsColorSelectorField({
  field,
  mod,
  onChange: onChangeFromProps,
}: Props): JSX.Element {
  const [r, g, b, a] = mod.config[field.id] as [number, number, number, number];
  const [value, setValue] = useState({ r, g, b, a });

  useEffect(() => {
    setValue((oldValue) => {
      if (
        oldValue.r === r &&
        oldValue.g === g &&
        oldValue.b === b &&
        oldValue.a === a
      ) {
        return oldValue;
      }
      return { r, g, b, a };
    });
  }, [r, g, b, a]);

  const onChangeFromPropsDebounced = useMemo(
    () => debounce(onChangeFromProps, 1000),
    [onChangeFromProps]
  );

  const onChange = useCallback(
    (_value, colors): void => {
      const match = colors.rgb.match(
        /rgba\((\d+), (\d+), (\d+), (\d+(\.\d+)?)\)/
      );
      if (match != null) {
        const r1 = parseInt(match[1], 10);
        const g1 = parseInt(match[2], 10);
        const b1 = parseInt(match[3], 10);
        const a1 = parseFloat(match[4]);
        setValue({ r: r1, g: g1, b: b1, a: a1 });
        onChangeFromPropsDebounced(field.id, [r1, g1, b1, a1]);
      }
    },
    [field, onChangeFromPropsDebounced]
  );

  // TODO: use hex8 format, and figure out why it keeps using rgb anyway
  return <MuiColorInput format="rgb" value={value} onChange={onChange} />;
}
