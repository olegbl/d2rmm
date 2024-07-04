import { useMemo } from 'react';
import { Chip, Tooltip } from '@mui/material';

type Props = {
  color?: React.ComponentProps<typeof Chip>['color'];
  icon: React.ComponentProps<typeof Chip>['icon'];
  label?: React.ComponentProps<typeof Chip>['label'];
  onClick?: React.ComponentProps<typeof Chip>['onClick'];
  tooltip?: string;
};

export default function ModListItemChip({
  color,
  icon,
  label,
  onClick,
  tooltip,
}: Props) {
  const onClickWithoutPropagation = useMemo(() => {
    if (onClick == null) {
      return undefined;
    }
    return (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      event.stopPropagation();
      onClick(event);
    };
  }, [onClick]);

  const onMouseDownWithoutPropagation = useMemo(() => {
    if (onClick == null || tooltip != null) {
      return undefined;
    }
    return (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      event.stopPropagation();
    };
  }, [onClick, tooltip]);

  const chip = (
    <Chip
      clickable={onClick != null}
      color={color}
      icon={icon}
      label={label}
      onClick={onClickWithoutPropagation}
      onMouseDown={onMouseDownWithoutPropagation}
      size="small"
      sx={{ ml: 1, cursor: 'pointer' }}
    />
  );

  if (tooltip != null) {
    return <Tooltip title={tooltip}>{chip}</Tooltip>;
  }

  return chip;
}
