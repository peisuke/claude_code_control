import React from 'react';
import { Stack, Button } from '@mui/material';
import { Choice } from '../../hooks/tmux/useChoiceDetection';

interface ChoiceButtonsProps {
  choices: Choice[];
  onSelect: (choice: Choice) => void;
  disabled?: boolean;
  totalHeight?: number;
}

const ChoiceButtons: React.FC<ChoiceButtonsProps> = ({ choices, onSelect, disabled = false, totalHeight }) => {
  return (
    <Stack spacing={1} sx={totalHeight ? { height: totalHeight } : {}}>
      {choices.map((choice) => (
        <Button
          key={choice.number}
          variant="outlined"
          fullWidth
          onClick={() => onSelect(choice)}
          disabled={disabled}
          sx={{
            flex: totalHeight ? 1 : undefined,
            minHeight: totalHeight ? 0 : 44,
            justifyContent: 'flex-start',
            textTransform: 'none',
          }}
        >
          {choice.number}. {choice.text}
        </Button>
      ))}
    </Stack>
  );
};

export default ChoiceButtons;
