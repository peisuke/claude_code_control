import React, { useMemo } from 'react';
import { Box, Stack, CircularProgress, Fab } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import Convert from 'ansi-to-html';
import { TERMINAL, LABELS } from '../../constants/ui';

const convert = new Convert({ escapeXML: true });

// Memoize HTML conversion to prevent unnecessary DOM updates
const useConvertedHtml = (output: string): string => {
  return useMemo(() => {
    if (!output) return '';
    return convert.toHtml(output);
  }, [output]);
};

interface TerminalOutputProps {
  output: string;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
  outputRef?: React.RefObject<HTMLDivElement>;
  isLoadingHistory?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  hasPendingUpdates?: boolean;
}

const TerminalOutput: React.FC<TerminalOutputProps> = React.memo(({
  output,
  onScroll,
  outputRef,
  isLoadingHistory = false,
  onRefresh,
  isRefreshing = false,
  hasPendingUpdates = false
}) => {
  const convertedHtml = useConvertedHtml(output);

  return (
    <Stack sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
      {/* Refresh button - always shown, highlighted when pending updates */}
      {onRefresh && (
        <Fab
          size="small"
          onClick={onRefresh}
          disabled={isRefreshing}
          sx={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            zIndex: 10,
            backgroundColor: hasPendingUpdates ? 'primary.main' : 'background.paper',
            color: hasPendingUpdates ? 'primary.contrastText' : 'primary.main',
            '&:hover': {
              backgroundColor: hasPendingUpdates ? 'primary.dark' : 'grey.200',
            }
          }}
          title={hasPendingUpdates ? '新しい更新があります' : '手動更新'}
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
          overflowY: 'auto',
          overflowX: 'auto',
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
        {convertedHtml ? (
          <div
            dangerouslySetInnerHTML={{
              __html: convertedHtml
            }}
          />
        ) : (
          LABELS.PLACEHOLDERS.TMUX_OUTPUT
        )}
      </Box>
    </Stack>
  );
});

TerminalOutput.displayName = 'TerminalOutput';

export default TerminalOutput;