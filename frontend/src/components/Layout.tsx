import React, { useState } from 'react';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
  Paper
} from '@mui/material';
import { Terminal, Visibility } from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

interface LayoutProps {
  children: [React.ReactNode, React.ReactNode]; // [CommandTab, TmuxDisplayTab]
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" disableGutters>
      {/* Tabs */}
      <Paper square elevation={1}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab
            icon={<Terminal />}
            label="送信"
            {...a11yProps(0)}
          />
          <Tab
            icon={<Visibility />}
            label="表示"
            {...a11yProps(1)}
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ px: { xs: 1, sm: 2 } }}>
        <TabPanel value={activeTab} index={0}>
          {children[0]}
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          {children[1]}
        </TabPanel>
      </Box>
    </Container>
  );
};

export default Layout;