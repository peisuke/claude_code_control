import { useMemo } from 'react';

export interface Choice {
  number: number;
  text: string;
}

const CHOICE_PATTERN = /^(\d+)\.\s+(.+)$/;
const TAIL_LINES = 20;

export function useChoiceDetection(output: string): Choice[] {
  return useMemo(() => {
    if (!output) return [];

    const lines = output.trimEnd().split('\n');
    const tail = lines.slice(-TAIL_LINES);

    const choices: Choice[] = [];
    let expectedNumber = 1;

    // Scan from the end to find the contiguous block of choices
    // First, find all matching lines in the tail
    const matchedLines: { index: number; number: number; text: string }[] = [];
    for (let i = 0; i < tail.length; i++) {
      const trimmed = tail[i].trim();
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

    // Find the longest contiguous sequential group ending at the last match
    // Work backwards from the last matched line
    const result: Choice[] = [matchedLines[matchedLines.length - 1]];
    for (let i = matchedLines.length - 2; i >= 0; i--) {
      const current = matchedLines[i];
      const next = result[0];
      if (current.number === next.number - 1) {
        result.unshift(current);
      }
    }

    // Must start at 1 and have at least 2 choices
    if (result.length < 2 || result[0].number !== 1) return [];

    return result.map(({ number, text }) => ({ number, text }));
  }, [output]);
}
