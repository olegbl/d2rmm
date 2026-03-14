import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

/**
 * Shared black tooltip with arrow used throughout the item editor.
 * Suppresses the default max-width so item descriptions never get truncated.
 */
export const ItemTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} arrow={true} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.common.black,
  },
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.common.black,
    maxWidth: 'none',
  },
}));
