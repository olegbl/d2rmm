import { MouseEvent, useCallback } from 'react';
import { Refresh, ToggleOff, ToggleOn } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  IconButton,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import type { Mod } from 'bridge/BridgeAPI';
import type {
  ModConfigField,
  ModConfigFieldOrSection,
  ModConfigSection,
} from 'bridge/ModConfig';
import { useSetModConfig } from '../context/ModsContext';
import ModSettingsField from './ModSettingsField';

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:before': {
    display: 'none',
  },
}));

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  '&:hover': {
    backgroundColor: theme.palette.action.focus,
  },
}));

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
}));

function getRecursiveFieldDescendants(
  node: ModConfigFieldOrSection,
): ModConfigField[] {
  if (node.type !== 'section') {
    return [node];
  }
  return (
    node.children?.reduce(
      (agg: ModConfigField[], field: ModConfigFieldOrSection) => [
        ...agg,
        ...getRecursiveFieldDescendants(field),
      ],
      [],
    ) ?? []
  );
}

type Props = {
  section: ModConfigSection;
  mod: Mod;
};

export default function ModSettingsSection({
  section,
  mod,
}: Props): JSX.Element | null {
  const setModConfig = useSetModConfig();

  const descendants = getRecursiveFieldDescendants(section);

  const areAnyDescendantsModified = descendants.some(
    (child) =>
      JSON.stringify(mod.config[child.id]) !==
      JSON.stringify(child.defaultValue),
  );

  const onReset = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setModConfig(mod.id, {
        ...mod.config,
        ...descendants.reduce(
          (agg, child) => ({
            ...agg,
            [child.id]: child.defaultValue,
          }),
          {},
        ),
      });
    },
    [descendants, mod.config, mod.id, setModConfig],
  );

  const areAllDescendantsCheckboxes =
    descendants.every((child) => child.type === 'checkbox') ?? false;

  const areAllDescendantsChecked =
    areAllDescendantsCheckboxes &&
    (descendants.every((child) => mod.config[child.id] === true) ?? false);

  const onToggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setModConfig(mod.id, {
        ...mod.config,
        ...descendants.reduce(
          (agg, child) => ({
            ...agg,
            [child.id]: !areAllDescendantsChecked,
          }),
          {},
        ),
      });
    },
    [setModConfig, mod.id, mod.config, descendants, areAllDescendantsChecked],
  );

  return (
    <StyledAccordion
      key={section.id ?? 'default'}
      defaultExpanded={section.defaultExpanded ?? true}
      disableGutters={true}
      elevation={0}
      square={true}
    >
      {section.name === '' ? null : (
        <StyledAccordionSummary
          aria-controls="general-content"
          expandIcon={<ExpandMoreIcon />}
          id="general-header"
        >
          <Typography>{section.name}</Typography>
          <Box
            sx={{
              flexDirection: 'row',
              position: 'absolute',
              right: 36,
              transform: 'translateY(-4px)',
            }}
          >
            {!areAllDescendantsCheckboxes ? null : (
              <Tooltip title="Toggle All Checkboxes">
                <IconButton onClick={onToggle} size="small">
                  {areAllDescendantsChecked ? <ToggleOff /> : <ToggleOn />}
                </IconButton>
              </Tooltip>
            )}
            {!areAnyDescendantsModified ? null : (
              <Tooltip title="Revert to Default">
                <IconButton onClick={onReset} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </StyledAccordionSummary>
      )}
      <StyledAccordionDetails
        id="general-content"
        sx={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {section.children?.reduce(
          (agg: JSX.Element[], field: ModConfigFieldOrSection) => {
            const addDivider =
              field.type === 'section' &&
              agg[agg.length - 1]?.type !== ModSettingsSection;
            return [
              ...agg,
              addDivider ? <Divider key={`divider:${field.id}`} /> : null,
              field.type === 'section' ? (
                <ModSettingsSection key={field.id} mod={mod} section={field} />
              ) : (
                <ModSettingsField key={field.id} field={field} mod={mod} />
              ),
            ].filter(Boolean) as JSX.Element[];
          },
          [],
        )}
      </StyledAccordionDetails>
    </StyledAccordion>
  );
}