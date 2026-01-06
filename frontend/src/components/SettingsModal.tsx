import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Close, DarkMode } from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { darkMode, setDarkMode } = useThemeContext();

  const handleDarkModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDarkMode(event.target.checked);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        設定
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 1 }}>
          <List>
            <ListItem>
              <ListItemIcon>
                <DarkMode />
              </ListItemIcon>
              <ListItemText
                primary="ダークモード"
                secondary="画面の配色をダークテーマに切り替えます"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={handleDarkModeChange}
                    color="primary"
                  />
                }
                label=""
              />
            </ListItem>
          </List>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          startIcon={<Close />}
        >
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsModal;
