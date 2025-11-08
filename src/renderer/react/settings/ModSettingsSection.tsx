import type { Mod } from 'bridge/BridgeAPI';
import type {
  ModConfigField,
  ModConfigFieldOrSection,
  ModConfigSection,
} from 'bridge/ModConfig';
import { parseBinding } from 'renderer/react/BindingsParser';
import { useSetModConfig } from 'renderer/react/context/ModsContext';
import { useModSettingsContext } from 'renderer/react/settings/ModSettingsContext';
import ModSettingsField from 'renderer/react/settings/ModSettingsField';
import { MouseEvent, useCallback } from 'react';
import {
  CheckBox,
  CheckBoxOutlineBlank,
  Help,
  IndeterminateCheckBox,
  Refresh,
} from '@mui/icons-material';
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
  const { expandedSections, setExpandedSections } = useModSettingsContext();
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

  const isShown = parseBinding<boolean>(
    section.visible ?? true,
    mod.config,
    expandedSections,
  );

  const isExpanded = expandedSections[section.id] ?? false;

  const setIsExpanded = useCallback(
    (isExpanded: boolean) =>
      setExpandedSections((value) => ({ ...value, [section.id]: isExpanded })),
    [section.id, setExpandedSections],
  );

  const allowToggleAll = parseBinding<boolean>(
    section.allowToggleAll ?? true,
    mod.config,
    expandedSections,
  );

  const areAllDescendantsCheckboxes =
    descendants.length > 0 &&
    (descendants.every((child) => child.type === 'checkbox') ?? false);

  const areAllDescendantsChecked =
    areAllDescendantsCheckboxes &&
    (descendants.every((child) => mod.config[child.id] === true) ?? false);

  const areSomeDsescendantsChecked =
    areAllDescendantsCheckboxes &&
    (descendants.some((child) => mod.config[child.id] === true) ?? false);

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

  if (!isShown) {
    return null;
  }

  return (
    <StyledAccordion
      key={section.id ?? 'default'}
      defaultExpanded={section.defaultExpanded ?? true}
      disableGutters={true}
      elevation={0}
      expanded={isExpanded}
      onChange={(_event, isExpanded) => setIsExpanded(isExpanded)}
      square={true}
    >
      {section.name === '' ? null : (
        <StyledAccordionSummary
          aria-controls="general-content"
          expandIcon={<ExpandMoreIcon />}
          id="general-header"
        >
          <Typography>{section.name}</Typography>
          <Box sx={{ flex: 1 }} />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'row',
              flex: 0,
              height: 24,
            }}
          >
            {!areAnyDescendantsModified ? null : (
              <Tooltip title="Revert to Default">
                <IconButton onClick={onReset} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
            {!allowToggleAll || !areAllDescendantsCheckboxes ? null : (
              <Tooltip
                title={areAllDescendantsChecked ? 'Disable All' : 'Enable All'}
              >
                <IconButton onClick={onToggle} size="small">
                  {areAllDescendantsChecked ? (
                    <CheckBox />
                  ) : areSomeDsescendantsChecked ? (
                    <IndeterminateCheckBox />
                  ) : (
                    <CheckBoxOutlineBlank />
                  )}
                </IconButton>
              </Tooltip>
            )}
            {section.description == null ? null : (
              <Tooltip title={section.description}>
                <Help color="action" fontSize="small" />
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
