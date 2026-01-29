import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import ChoiceButtons from '../ChoiceButtons';
import { Choice } from '../../../hooks/tmux/useChoiceDetection';

const choices: Choice[] = [
  { number: 1, text: 'Yes' },
  { number: 2, text: 'No' },
  { number: 3, text: 'Maybe' }
];

describe('ChoiceButtons', () => {
  it('renders all choices as buttons', () => {
    const onSelect = jest.fn();
    render(<ChoiceButtons choices={choices} onSelect={onSelect} />);
    expect(screen.getByText('1. Yes')).toBeInTheDocument();
    expect(screen.getByText('2. No')).toBeInTheDocument();
    expect(screen.getByText('3. Maybe')).toBeInTheDocument();
  });

  it('calls onSelect with the clicked choice', () => {
    const onSelect = jest.fn();
    render(<ChoiceButtons choices={choices} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('2. No'));
    expect(onSelect).toHaveBeenCalledWith({ number: 2, text: 'No' });
  });

  it('disables buttons when disabled prop is true', () => {
    const onSelect = jest.fn();
    render(<ChoiceButtons choices={choices} onSelect={onSelect} disabled />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => expect(btn).toBeDisabled());
  });
});
