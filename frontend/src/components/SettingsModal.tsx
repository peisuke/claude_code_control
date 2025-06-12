import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Typography,
  Divider
} from '@mui/material';
import { Save, Cancel, CheckCircle } from '@mui/icons-material';
import { TmuxSettings } from '../types';
import { useSettings } from '../hooks/useSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, testConnection, isLoading, error } = useSettings();
  const [formData, setFormData] = useState<TmuxSettings>(settings);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Update form data when settings change
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      onClose();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleCancel = () => {
    setFormData(settings); // Reset form data
    setTestResult(null);
    onClose();
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    
    try {
      const success = await testConnection();
      setTestResult({
        success,
        message: success ? 'tmuxに正常に接続できました' : '接続に失敗しました'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: '接続テストでエラーが発生しました'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleInputChange = (field: keyof TmuxSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>設定</DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* Session Settings */}
          <Typography variant="subtitle1" fontWeight="bold">
            セッション設定
          </Typography>
          
          <TextField
            fullWidth
            label="セッション名"
            value={formData.session_name}
            onChange={handleInputChange('session_name')}
            helperText="tmuxセッションの名前を指定します"
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.auto_create_session}
                onChange={handleInputChange('auto_create_session')}
              />
            }
            label="セッション自動作成"
          />
          
          <Typography variant="caption" color="text.secondary">
            有効にすると、存在しないセッションに対してコマンドを送信する際に自動でセッションを作成します
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={formData.capture_history}
                onChange={handleInputChange('capture_history')}
              />
            }
            label="履歴キャプチャ"
          />
          
          <Typography variant="caption" color="text.secondary">
            有効にすると、tmuxセッションの履歴も含めて出力を取得します
          </Typography>

          <Divider />

          {/* Connection Test */}
          <Typography variant="subtitle1" fontWeight="bold">
            接続テスト
          </Typography>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={testLoading ? <CircularProgress size={16} /> : <CheckCircle />}
              onClick={handleTestConnection}
              disabled={testLoading}
            >
              接続テスト
            </Button>
            
            {testResult && (
              <Alert 
                severity={testResult.success ? 'success' : 'error'}
                sx={{ flex: 1 }}
              >
                {testResult.message}
              </Alert>
            )}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleCancel}
          startIcon={<Cancel />}
          disabled={isLoading}
        >
          キャンセル
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={16} /> : <Save />}
          disabled={isLoading}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsModal;