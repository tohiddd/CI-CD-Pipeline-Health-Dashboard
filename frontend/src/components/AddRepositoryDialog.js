import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { GitHub as GitHubIcon } from '@mui/icons-material';

const AddRepositoryDialog = ({ open, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    platform: 'github'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim()) {
      setError('Repository name is required');
      return;
    }

    if (!formData.fullName.includes('/')) {
      setError('Repository name must be in format: owner/repository');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAdd(formData);
      // Reset form on success
      setFormData({ fullName: '', platform: 'github' });
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add repository');
    }
    
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ fullName: '', platform: 'github' });
      setError('');
      onClose();
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GitHubIcon sx={{ mr: 1, color: 'primary.main' }} />
          Add Repository to Monitor
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add a GitHub repository to monitor its CI/CD pipeline health and get real-time updates.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            autoFocus
            fullWidth
            label="Repository"
            placeholder="e.g., facebook/react"
            value={formData.fullName}
            onChange={handleChange('fullName')}
            onKeyPress={handleKeyPress}
            disabled={loading}
            helperText="Enter the repository in format: owner/repository"
            sx={{ mb: 3 }}
          />

          <FormControl fullWidth disabled={loading}>
            <InputLabel>Platform</InputLabel>
            <Select
              value={formData.platform}
              label="Platform"
              onChange={handleChange('platform')}
            >
              <MenuItem value="github">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GitHubIcon sx={{ mr: 1, fontSize: 20 }} />
                  GitHub
                </Box>
              </MenuItem>
              {/* Future platforms can be added here */}
              <MenuItem value="jenkins" disabled>
                Jenkins (Coming Soon)
              </MenuItem>
              <MenuItem value="gitlab" disabled>
                GitLab (Coming Soon)
              </MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Note:</strong> Make sure you have a valid GitHub token configured in your environment 
              that has access to the repository you want to monitor.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          color="inherit"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={loading || !formData.fullName.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Adding...' : 'Add Repository'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddRepositoryDialog;
