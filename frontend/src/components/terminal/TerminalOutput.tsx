import React from 'react';
import { Box, Stack, CircularProgress, Typography, Fab } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import Convert from 'ansi-to-html';
import { TERMINAL, LABELS } from '../../constants/ui';

const convert = new Convert({ escapeXML: true });

interface TerminalOutputProps {
  output: string;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
  outputRef?: React.RefObject<HTMLDivElement>;
  isLoadingHistory?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({
  output,
  onScroll,
  outputRef,
  isLoadingHistory = false,
  onRefresh,
  isRefreshing = false
}) => {
  return (
    <Stack sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
      {/* Loading indicator for history */}
      {isLoadingHistory && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            backgroundColor: 'background.paper',
            borderRadius: 1,
            px: 2,
            py: 1,
            boxShadow: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <CircularProgress size={16} />
          <Typography variant="caption">履歴を読み込み中...</Typography>
        </Box>
      )}

      {/* Refresh button - positioned at bottom right of terminal area */}
      {/* TODO: Later enhance to show "new updates available" when updates arrive while scrolled up */}
      {onRefresh && (
        <Fab
          size="small"
          color="primary"
          onClick={onRefresh}
          disabled={isRefreshing}
          sx={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            zIndex: 10
          }}
          title="最新に更新"
        >
          {isRefreshing ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <Refresh />
          )}
        </Fab>
      )}

      {/* Terminal Output */}
      <Box
        ref={outputRef}
        onScroll={onScroll}
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