import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import UnifiedView from './components/UnifiedView';
import SettingsModal from './components/SettingsModal';
import { tmuxAPI } from './services/api';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
});

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Initialize with saved target or default
  const [selectedTarget, setSelectedTarget] = useState(() => {
    return localStorage.getItem('tmux-selected-target') || 'default';
  });

  // Check connection status on app load
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await tmuxAPI.testConnection();
        setIsConnected(response.success);
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
    
    // Check connection periodically
    const interval = setInterval(checkConnection, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleTargetChange = (target: string) => {
    setSelectedTarget(target);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', bgcolor: 'grey.100' }}>
        <UnifiedView 
          isConnected={isConnected}
          onSettingsOpen={handleSettingsOpen}
          selectedTarget={selectedTarget}
          onTargetChange={handleTargetChange}
        />
      </Box>
      
      <SettingsModal
        isOpen={settingsOpen}
        onClose={handleSettingsClose}
      />
    </ThemeProvider>
  );
}

export default App;