import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import Convert from 'ansi-to-html';
import { TERMINAL, LABELS } from '../../constants/ui';
import { ScrollUtils } from '../../utils/scroll';

const convert = new Convert();

interface TerminalOutputProps {
  output: string;
  isConnected: boolean;
  autoScroll?: boolean;
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({
  output,
  isConnected,
  autoScroll = true
}) => {
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when output changes
  useEffect(() => {
    if (output && autoScroll) {
      ScrollUtils.scrollToBottom(outputRef.current);
    }
  }, [output, autoScroll]);

  return (
    <Box
      ref={outputRef}
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        fontFamily: TERMINAL.FONT_FAMILY,
        fontSize: { 
          xs: TERMINAL.FONT_SIZES.xs, 
          sm: TERMINAL.FONT_SIZES.sm, 
          md: TERMINAL.FONT_SIZES.md 
        },
        backgroundColor: TERMINAL.BACKGROUND_COLOR,
        color: TERMINAL.TEXT_COLOR,
        p: 2,
        m: 2,
        mt: 1,
        borderRadius: 1,
        whiteSpace: 'pre',
        WebkitOverflowScrolling: 'touch',
        '& code': {
          fontFamily: 'inherit',
          fontSize: 'inherit',
          backgroundColor: 'transparent'
        }
      }}
    >
      {output ? (
        <div 
          dangerouslySetInnerHTML={{ 
            __html: convert.toHtml(output) 
          }} 
        />
      ) : (
        LABELS.PLACEHOLDERS.TMUX_OUTPUT
      )}
    </Box>
  );
};

export default TerminalOutput;