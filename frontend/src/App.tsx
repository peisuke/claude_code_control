import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import UnifiedView from './components/UnifiedView';
import SettingsModal from './components/SettingsModal';
import { ThemeProvider } from './contexts/ThemeContext';
import { tmuxAPI } from './services/api';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(() => {
    return localStorage.getItem('tmux-selected-target') || '';
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
    localStorage.setItem('tmux-selected-target', target);
  };

  return (
    <ThemeProvider>
      <Box sx={{ height: '100vh', bgcolor: 'background.default' }}>
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