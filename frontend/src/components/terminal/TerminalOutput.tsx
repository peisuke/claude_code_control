import React, { useRef, useEffect } from 'react';
import { Box, Stack, Button } from '@mui/material';
import { History } from '@mui/icons-material';
import Convert from 'ansi-to-html';
import { TERMINAL, LABELS } from '../../constants/ui';
import { ScrollUtils } from '../../utils/scroll';

const convert = new Convert();

interface TerminalOutputProps {
  output: string;
  isConnected: boolean;
  autoScroll?: boolean;
  onShowHistory?: () => Promise<void>;
  isLoading?: boolean;
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({
  output,
  isConnected,
  autoScroll = true,
  onShowHistory,
  isLoading = false
}) => {
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when output changes
  useEffect(() => {
    if (output && autoScroll) {
      ScrollUtils.scrollToBottom(outputRef.current);
    }
  }, [output, autoScroll]);

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }}>
      {/* Header with History button */}
      {onShowHistory && (
        <Stack direction="row" justifyContent="flex-start" sx={{ p: 1, pb: 0 }}>
          <Button
            variant="outlined"
            onClick={onShowHistory}
            disabled={!isConnected || isLoading}
            sx={{ minWidth: 'auto', px: 1 }}
            size="small"
            title="履歴を表示"
          >
            <History />
          </Button>
        </Stack>
      )}
      
      {/* Terminal Output */}
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
          mt: onShowHistory ? 1 : 1,
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
    </Stack>
  );
};

export default TerminalOutput;