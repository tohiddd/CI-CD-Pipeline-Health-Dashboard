import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Box,
  Fab,
  Alert,
  Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Dashboard from './components/Dashboard';
import RepositoryList from './components/RepositoryList';
import AddRepositoryDialog from './components/AddRepositoryDialog';
import MetricsCards from './components/MetricsCards';
import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [repositories, setRepositories] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(API_BASE_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      showNotification('Connected to dashboard server', 'success');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      showNotification('Disconnected from server', 'warning');
    });

    newSocket.on('pipeline_update', (data) => {
      console.log('Pipeline update received:', data);
      // Refresh data when we get updates
      fetchRepositories();
      fetchMetrics();
      showNotification(`Pipeline updated for ${data.repository}`, 'info');
    });

    return () => newSocket.close();
  }, []);

  // Fetch repositories
  const fetchRepositories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/repositories`);
      setRepositories(response.data);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      showNotification('Failed to fetch repositories', 'error');
    }
  };

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/metrics/summary`);
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      showNotification('Failed to fetch metrics', 'error');
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRepositories(), fetchMetrics()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRepositories();
      fetchMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleAddRepository = async (repositoryData) => {
    try {
      await axios.post(`${API_BASE_URL}/api/repositories`, repositoryData);
      showNotification('Repository added successfully', 'success');
      fetchRepositories();
      setAddDialogOpen(false);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to add repository';
      showNotification(message, 'error');
    }
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🚀 CI/CD Pipeline Health Dashboard
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {repositories.length} repositories monitored
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Metrics Cards */}
          <Grid item xs={12}>
            <MetricsCards metrics={metrics} loading={loading} />
          </Grid>

          {/* Dashboard Charts */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Dashboard repositories={repositories} loading={loading} />
            </Paper>
          </Grid>

          {/* Repository List */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2, height: 400 }}>
              <RepositoryList 
                repositories={repositories} 
                metrics={metrics}
                loading={loading}
                onRefresh={fetchRepositories}
                onDelete={() => {
                  // Refresh data when repository is deleted
                  fetchRepositories();
                  fetchMetrics();
                }}
              />
            </Paper>
          </Grid>

          {/* Recent Pipeline Runs */}
          {metrics.recentRuns && metrics.recentRuns.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Pipeline Runs
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {metrics.recentRuns.map((run, index) => (
                    <Box
                      key={`${run.repository_id}-${run.run_id}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        borderBottom: index < metrics.recentRuns.length - 1 ? 1 : 0,
                        borderColor: 'divider'
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {run.repository_name || run.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {run.commit_message ? run.commit_message.substring(0, 60) + '...' : 'No message'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: run.conclusion === 'success' ? 'success.main' : 
                                   run.conclusion === 'failure' ? 'error.main' : 'warning.main',
                            fontWeight: 'medium'
                          }}
                        >
                          {run.status === 'completed' ? run.conclusion : run.status}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {run.duration_seconds ? `${Math.round(run.duration_seconds / 60)}m` : 'Running'}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add repository"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setAddDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Add Repository Dialog */}
      <AddRepositoryDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddRepository}
      />

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
