import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Cancel as CancelIcon,
  Code as LogsIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const LogsViewer = ({ open, onClose, repositoryId, runId, runDetails }) => {
  const [logsData, setLogsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (open && repositoryId && runId) {
      fetchLogs();
    }
  }, [open, repositoryId, runId]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/repositories/${repositoryId}/runs/${runId}/logs`);
      setLogsData(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error.response?.data?.error || 'Failed to fetch logs');
    }
    setLoading(false);
  };

  const getStatusIcon = (conclusion) => {
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
  };

  const getStatusColor = (conclusion) => {
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
  };

  const formatDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return 'N/A';
    const duration = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleClose = () => {
    setLogsData(null);
    setError('');
    setActiveTab(0);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LogsIcon sx={{ mr: 1, color: 'primary.main' }} />
          Pipeline Logs & Details
        </Box>
        {runDetails && (
          <Typography variant="body2" color="text.secondary">
            {runDetails.commit_message || 'No commit message'} • {runDetails.branch}
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading pipeline logs...</Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {logsData && (
          <Box>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label="Overview" />
              <Tab label="Jobs & Logs" />
            </Tabs>

            {activeTab === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Workflow Run Overview
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Chip
                    icon={getStatusIcon(logsData.workflow_run.conclusion)}
                    label={`${logsData.workflow_run.status} - ${logsData.workflow_run.conclusion}`}
                    color={getStatusColor(logsData.workflow_run.conclusion)}
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`Duration: ${formatDuration(logsData.workflow_run.created_at, logsData.workflow_run.updated_at)}`}
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`Jobs: ${logsData.summary.total_jobs}`}
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                  <Box sx={{ p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="h4" color="success.contrastText">
                      {logsData.summary.successful_jobs}
                    </Typography>
                    <Typography variant="body2" color="success.contrastText">
                      Successful Jobs
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, backgroundColor: 'error.light', borderRadius: 1 }}>
                    <Typography variant="h4" color="error.contrastText">
                      {logsData.summary.failed_jobs}
                    </Typography>
                    <Typography variant="body2" color="error.contrastText">
                      Failed Jobs
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, backgroundColor: 'grey.300', borderRadius: 1 }}>
                    <Typography variant="h4">
                      {logsData.summary.cancelled_jobs}
                    </Typography>
                    <Typography variant="body2">
                      Cancelled Jobs
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary">
                  <strong>Branch:</strong> {logsData.workflow_run.head_branch}<br />
                  <strong>Commit:</strong> {logsData.workflow_run.head_sha?.substring(0, 7)}<br />
                  <strong>Author:</strong> {logsData.workflow_run.head_commit?.author?.name || 'Unknown'}<br />
                  <strong>Started:</strong> {new Date(logsData.workflow_run.created_at).toLocaleString()}<br />
                  <strong>Completed:</strong> {logsData.workflow_run.updated_at ? new Date(logsData.workflow_run.updated_at).toLocaleString() : 'Not completed'}
                </Typography>
              </Box>
            )}

            {activeTab === 1 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Jobs and Logs
                </Typography>
                
                {logsData.jobs.map((job, index) => (
                  <Accordion key={job.id} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        {getStatusIcon(job.conclusion)}
                        <Typography sx={{ ml: 1, flexGrow: 1 }}>
                          {job.name}
                        </Typography>
                        <Chip
                          label={job.conclusion || job.status}
                          color={getStatusColor(job.conclusion)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDuration(job.started_at, job.completed_at)}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Started:</strong> {job.started_at ? new Date(job.started_at).toLocaleString() : 'Not started'}<br />
                          <strong>Completed:</strong> {job.completed_at ? new Date(job.completed_at).toLocaleString() : 'Not completed'}<br />
                          {job.runner_name && <><strong>Runner:</strong> {job.runner_name}<br /></>}
                        </Typography>
                      </Box>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Job Logs:
                      </Typography>
                      <Box sx={{ 
                        backgroundColor: 'grey.100', 
                        p: 2, 
                        borderRadius: 1, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                      }}>
                        {job.logs ? (
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {typeof job.logs === 'string' ? job.logs : JSON.stringify(job.logs, null, 2)}
                          </pre>
                        ) : (
                          <Typography color="text.secondary" fontStyle="italic">
                            {job.log_error || 'Logs not available for this job'}
                          </Typography>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        {logsData?.workflow_run?.html_url && (
          <Button 
            href={logsData.workflow_run.html_url} 
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </Button>
        )}
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogsViewer;
