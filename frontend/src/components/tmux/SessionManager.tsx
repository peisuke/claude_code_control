import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  IconButton,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Typography
} from '@mui/material';
import { Refresh, ExpandMore } from '@mui/icons-material';
import { TmuxHierarchy } from '../../types';
import { tmuxAPI } from '../../services/api';

interface SessionManagerProps {
  onHierarchyLoad: (hierarchy: TmuxHierarchy) => void;
  showDebug?: boolean;
}

export interface SessionManagerRef {
  refresh: () => void;
}

const SessionManager = forwardRef<SessionManagerRef, SessionManagerProps>(({
  onHierarchyLoad,
  showDebug = false
}, ref) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawHierarchy, setRawHierarchy] = useState<any>(null);
  const [hierarchy, setHierarchy] = useState<TmuxHierarchy | null>(null);

  const loadHierarchy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tmuxAPI.getHierarchy();
      setRawHierarchy(response.data);

      const hierarchyData = response.data;
      if (hierarchyData && typeof hierarchyData === 'object') {
        const formattedHierarchy: TmuxHierarchy = {
          sessions: hierarchyData
        };
        setHierarchy(formattedHierarchy);
        onHierarchyLoad(formattedHierarchy);
      } else {
        throw new Error('Invalid hierarchy data format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '階層の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [onHierarchyLoad]);

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: loadHierarchy
  }), [loadHierarchy]);

  useEffect(() => {
    loadHierarchy();
  }, [loadHierarchy]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Stack spacing={2}>
        {/* Refresh Button */}
        <Box>
          <IconButton
            onClick={loadHierarchy}
            disabled={loading}
            title="階層を更新"
            size="small"
          >
            {loading ? <CircularProgress size={16} /> : <Refresh />}
          </IconButton>
        </Box>

        {/* Debug Information */}
        {showDebug && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">デバッグ情報</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" fontWeight="bold">生の階層データ:</Typography>
                  <Box 
                    component="pre" 
                    sx={{ 
                      fontSize: '11px', 
                      backgroundColor: 'grey.100', 
                      p: 1, 
                      borderRadius: 1,
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}
                  >
                    {JSON.stringify(rawHierarchy, null, 2)}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight="bold">フォーマット済み階層:</Typography>
                  <Box 
                    component="pre" 
                    sx={{ 
                      fontSize: '11px', 
                      backgroundColor: 'grey.100', 
                      p: 1, 
                      borderRadius: 1,
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}
                  >
                    {JSON.stringify(hierarchy, null, 2)}
                  </Box>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}
      </Stack>
    </Box>
  );
});

SessionManager.displayName = 'SessionManager';

export default SessionManager;