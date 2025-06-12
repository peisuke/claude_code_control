import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Layout from './components/Layout';
import CommandTab from './components/CommandTab';
import TmuxDisplayTab from './components/TmuxDisplayTab';
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
  const [selectedTarget, setSelectedTarget] = useState('default');

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
      <Layout>
        <CommandTab 
          isConnected={isConnected}
          onSettingsOpen={handleSettingsOpen}
          selectedTarget={selectedTarget}
          onTargetChange={handleTargetChange}
        />
        <TmuxDisplayTab 
          isConnected={isConnected}
          selectedTarget={selectedTarget}
        />
      </Layout>
      
      <SettingsModal
        isOpen={settingsOpen}
        onClose={handleSettingsClose}
      />
    </ThemeProvider>
  );
}

export default App;