import { MuiColorInput, MuiColorInputColors } from 'mui-color-input';
import { useCallback, useMemo, useState, useTransition } from 'react';
import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigFieldColor } from 'bridge/ModConfig';
import type { ModConfigSingleValue } from 'bridge/ModConfigValue';
import debounce from './debounce';

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
  const [_isTransitioning, startTransition] = useTransition();

  const [value, setValue] = useState(() => {
    const [r, g, b, a] = mod.config[field.id] as [
      number,
      number,
      number,
      number,
    ];
    return { r, g, b, a };
  });

  const onChangeFromPropsDebounced = useMemo(
    () => debounce(onChangeFromProps, 1000),
    [onChangeFromProps],
  );

  const onChange = useCallback(
    (_value: string, colors: MuiColorInputColors): void => {
      const match = colors.rgb.match(
        /rgba?\((\d+), (\d+), (\d+)(?:, (\d+(?:\.\d+)?))?\)/,
      );
      if (match != null) {
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        const a = parseFloat(match[4] ?? '1.0');
        setValue({ r, g, b, a });
        startTransition(() => {
          onChangeFromPropsDebounced(field.id, [r, g, b, a]);
        });
      }
    },
    [field, onChangeFromPropsDebounced],
  );

  const hexR = value.r.toString(16).padStart(2, '0');
  const hexG = value.g.toString(16).padStart(2, '0');
  const hexB = value.b.toString(16).padStart(2, '0');
  const hexA = Math.round(value.a * 255)
    .toString(16)
    .padStart(2, '0');

  return (
    <MuiColorInput
      format={field.isAlphaHidden ? 'hex' : 'hex8'}
      isAlphaHidden={field.isAlphaHidden ?? false}
      onChange={onChange}
      value={
        field.isAlphaHidden
          ? `#${hexR}${hexG}${hexB}`
          : `#${hexR}${hexG}${hexB}${hexA}`
      }
    />
  );
}
