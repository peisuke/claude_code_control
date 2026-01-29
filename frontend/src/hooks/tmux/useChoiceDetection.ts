import { useMemo } from 'react';

export interface Choice {
  number: number;
  text: string;
}

const ANSI_ESCAPE = /\x1b\[[0-9;]*[a-zA-Z]/g;
const CHOICE_PATTERN = /(\d+)\.\s+(.+)$/;
const TAIL_LINES = 20;

const YES_NO_WORDS = new Set(['Yes', 'No']);

function isYesNoChoice(choices: Choice[]): boolean {
  return choices.every(c => YES_NO_WORDS.has(c.text.trim()));
}

export function useChoiceDetection(output: string): Choice[] {
  return useMemo(() => {
    if (!output) return [];

    const lines = output.trimEnd().split('\n');
    const tail = lines.slice(-TAIL_LINES);

    const matchedLines: { index: number; number: number; text: string }[] = [];
    for (let i = 0; i < tail.length; i++) {
      const trimmed = tail[i].replace(ANSI_ESCAPE, '').trim();
      const match = trimmed.match(CHOICE_PATTERN);
      if (match) {
        matchedLines.push({
          index: i,
          number: parseInt(match[1], 10),
          text: match[2]
        });
      }
    }

    if (matchedLines.length < 2) return [];

    const result: Choice[] = [matchedLines[matchedLines.length - 1]];
    for (let i = matchedLines.length - 2; i >= 0; i--) {
      const current = matchedLines[i];
      const next = result[0];
      if (current.number === next.number - 1) {
        result.unshift(current);
      }
    }

    if (result.length < 2 || result[0].number !== 1) return [];

    const choices = result.map(({ number, text }) => ({ number, text }));

    // Only show buttons for yes/no style choices
    if (!isYesNoChoice(choices)) return [];

    return choices;
  }, [output]);
}
