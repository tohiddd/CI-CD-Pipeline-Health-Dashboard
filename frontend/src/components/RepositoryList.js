import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Visibility as ViewLogsIcon
} from '@mui/icons-material';
import axios from 'axios';
import LogsViewer from './LogsViewer';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const RepositoryList = ({ repositories, metrics, loading, onRefresh, onDelete }) => {
  const [expandedRepo, setExpandedRepo] = useState(null);
  const [repoRuns, setRepoRuns] = useState({});
  const [loadingRuns, setLoadingRuns] = useState({});
  const [logsViewerOpen, setLogsViewerOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedRepoId, setSelectedRepoId] = useState(null);

  const handleExpandRepo = async (repoId) => {
    if (expandedRepo === repoId) {
      setExpandedRepo(null);
      return;
    }

    setExpandedRepo(repoId);
    
    if (!repoRuns[repoId]) {
      setLoadingRuns({ ...loadingRuns, [repoId]: true });
      try {
        const response = await axios.get(`${API_BASE_URL}/api/repositories/${repoId}/runs?limit=10`);
        setRepoRuns({ ...repoRuns, [repoId]: response.data });
      } catch (error) {
        console.error('Error fetching repository runs:', error);
      }
      setLoadingRuns({ ...loadingRuns, [repoId]: false });
    }
  };

  const handleDeleteRepo = async (repoId, repoName, event) => {
    // Stop the event from bubbling up to the ListItem
    event.stopPropagation();
    
    if (window.confirm(`Are you sure you want to stop monitoring "${repoName}"?\n\nThis will delete all stored pipeline data for this repository.`)) {
      try {
        await axios.delete(`${API_BASE_URL}/api/repositories/${repoId}`);
        if (onDelete) {
          onDelete(repoId);
        }
        onRefresh(); // Refresh the repository list
      } catch (error) {
        console.error('Error deleting repository:', error);
        alert('Failed to delete repository. Please try again.');
      }
    }
  };

  const handleViewLogs = (repoId, run) => {
    setSelectedRepoId(repoId);
    setSelectedRun(run);
    setLogsViewerOpen(true);
  };

  const getStatusIcon = (status, conclusion) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success':
          return <SuccessIcon color="success" />;
        case 'failure':
          return <ErrorIcon color="error" />;
        case 'cancelled':
          return <CancelIcon color="disabled" />;
        default:
          return <PendingIcon color="warning" />;
      }
    }
    return <PendingIcon color="info" />;
  };

  const getStatusColor = (status, conclusion) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success':
          return 'success';
        case 'failure':
          return 'error';
        case 'cancelled':
          return 'default';
        default:
          return 'warning';
      }
    }
    return 'info';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getLastRunStatus = (repoId) => {
    const recentRuns = metrics.recentRuns || [];
    const lastRun = recentRuns.find(run => run.repository_id === repoId);
    return lastRun || null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (repositories.length === 0) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Repositories
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Alert severity="info">
          No repositories monitored yet. Add your first repository using the + button.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Repositories ({repositories.length})
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={onRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <List sx={{ maxHeight: 300, overflow: 'auto' }}>
        {repositories.map((repo) => {
          const lastRun = getLastRunStatus(repo.id);
          const isExpanded = expandedRepo === repo.id;
          const runs = repoRuns[repo.id] || [];

          return (
            <Box key={repo.id}>
              <ListItem
                button
                onClick={() => handleExpandRepo(repo.id)}
                sx={{ 
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <GitHubIcon color="action" />
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="medium">
                      {repo.name}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      {lastRun && (
                        <>
                          <Chip
                            label={lastRun.status === 'completed' ? lastRun.conclusion : lastRun.status}
                            color={getStatusColor(lastRun.status, lastRun.conclusion)}
                            size="small"
                            variant="outlined"
                          />
                          {lastRun.duration_seconds && (
                            <Typography variant="caption" color="text.secondary">
                              {formatDuration(lastRun.duration_seconds)}
                            </Typography>
                          )}
                        </>
                      )}
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  <Tooltip title="Delete Repository">
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleDeleteRepo(repo.id, repo.full_name, e)}
                      sx={{ mr: 0.5 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={isExpanded ? "Collapse" : "Expand"}>
                    <IconButton edge="end" size="small">
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>

              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 4, pr: 2, pb: 1 }}>
                  {loadingRuns[repo.id] ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={20} />
                    </Box>
                  ) : runs.length > 0 ? (
                    <List dense>
                      {runs.slice(0, 5).map((run, index) => (
                        <ListItem key={`${run.repository_id}-${run.run_id}-${index}`} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            {getStatusIcon(run.status, run.conclusion)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="caption">
                                {run.commit_message ? 
                                  (run.commit_message.length > 40 ? 
                                    run.commit_message.substring(0, 40) + '...' : 
                                    run.commit_message) 
                                  : 'No message'}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {run.author} • {run.branch} • {formatDuration(run.duration_seconds)}
                              </Typography>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="View Logs & Details">
                              <IconButton 
                                size="small" 
                                onClick={() => handleViewLogs(repo.id, run)}
                                sx={{ ml: 1 }}
                              >
                                <ViewLogsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No recent runs found
                    </Typography>
                  )}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </List>

      <LogsViewer
        open={logsViewerOpen}
        onClose={() => setLogsViewerOpen(false)}
        repositoryId={selectedRepoId}
        runId={selectedRun?.run_id}
        runDetails={selectedRun}
      />
    </Box>
  );
};

export default RepositoryList;
