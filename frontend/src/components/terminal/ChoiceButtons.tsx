import React from 'react';
import { Stack, Button } from '@mui/material';
import { Choice } from '../../hooks/tmux/useChoiceDetection';

interface ChoiceButtonsProps {
  choices: Choice[];
  onSelect: (choice: Choice) => void;
  disabled?: boolean;
}

const ChoiceButtons: React.FC<ChoiceButtonsProps> = ({ choices, onSelect, disabled = false }) => {
  return (
    <Stack spacing={0.5}>
      {choices.map((choice) => (
        <Button
          key={choice.number}
          variant="outlined"
          size="small"
          fullWidth
          onClick={() => onSelect(choice)}
          disabled={disabled}
          sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
        >
          {choice.number}. {choice.text}
        </Button>
      ))}
    </Stack>
  );
};

export default ChoiceButtons;
