import type { Mod } from 'bridge/BridgeAPI';
import type { ModConfigFieldColor } from 'bridge/ModConfig';
import type { ModConfigSingleValue } from 'bridge/ModConfigValue';
import { parseBinding } from 'renderer/react/BindingsParser';
import debounce from 'renderer/utils/debounce';
import { MuiColorInput, MuiColorInputColors } from 'mui-color-input';
import { useCallback, useMemo, useState, useTransition } from 'react';

type ColorArray = [number, number, number, number];
type ColorObject = {
  r: number;
  g: number;
  b: number;
  a: number;
};
type ColorHex = [string, string, string, string];

function colorArrayToObject(color: ColorArray): ColorObject {
  return {
    r: color[0],
    g: color[1],
    b: color[2],
    a: color[3],
  };
}

function colorObjectToHex(color: ColorObject): ColorHex {
  const hexR = color.r.toString(16).padStart(2, '0');
  const hexG = color.g.toString(16).padStart(2, '0');
  const hexB = color.b.toString(16).padStart(2, '0');
  const hexA = Math.round(color.a * 255)
    .toString(16)
    .padStart(2, '0');
  return [hexR, hexG, hexB, hexA];
}

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

  const overrideValue =
    field.overrideValue == null
      ? null
      : parseBinding<[number, number, number, number] | null>(
          field.overrideValue,
          mod.config,
        ) ?? null;

  const [value, setValue] = useState(() =>
    colorArrayToObject(
      mod.config[field.id] as [number, number, number, number],
    ),
  );

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

  const [hexR, hexG, hexB, hexA] = colorObjectToHex(
    overrideValue != null ? colorArrayToObject(overrideValue) : value,
  );

  return (
    <MuiColorInput
      disabled={overrideValue != null}
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
