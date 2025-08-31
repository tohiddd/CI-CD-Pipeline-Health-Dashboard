import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  PlayArrow as RunsIcon
} from '@mui/icons-material';

const MetricsCards = ({ metrics, loading }) => {
  const cards = [
    {
      title: 'Success Rate',
      value: loading ? '...' : `${metrics.successRate || 0}%`,
      icon: <SuccessIcon />,
      color: 'success',
      description: 'Last 30 days'
    },
    {
      title: 'Avg Build Time',
      value: loading ? '...' : `${Math.round((metrics.avgBuildTime || 0) / 60)}m`,
      icon: <TimerIcon />,
      color: 'primary',
      description: 'Average duration'
    },
    {
      title: 'Runs Today',
      value: loading ? '...' : metrics.totalRunsToday || 0,
      icon: <RunsIcon />,
      color: 'info',
      description: 'Pipeline executions'
    },
    {
      title: 'Health Score',
      value: loading ? '...' : calculateHealthScore(metrics),
      icon: <TrendingUpIcon />,
      color: getHealthScoreColor(calculateHealthScore(metrics)),
      description: 'Overall health'
    }
  ];

  return (
    <Grid container spacing={3}>
      {cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card 
            elevation={2} 
            sx={{ 
              height: '100%',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box
                  sx={{
                    color: `${card.color}.main`,
                    mr: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  {card.title}
                </Typography>
              </Box>
              
              <Typography variant="h4" component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
                {loading ? (
                  <CircularProgress size={24} />
                ) : (
                  card.value
                )}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                {card.description}
              </Typography>

              {/* Health Score Badge */}
              {card.title === 'Health Score' && !loading && (
                <Box sx={{ mt: 1 }}>
                  <Chip
                    label={getHealthLabel(calculateHealthScore(metrics))}
                    color={card.color}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Calculate health score based on success rate and other metrics
function calculateHealthScore(metrics) {
  if (!metrics || typeof metrics.successRate !== 'number') return 'N/A';
  
  const successRate = metrics.successRate;
  const avgBuildTime = metrics.avgBuildTime || 0;
  const runsToday = metrics.totalRunsToday || 0;
  
  // Base score from success rate (0-80 points)
  let score = successRate * 0.8;
  
  // Bonus points for reasonable build times (0-10 points)
  if (avgBuildTime > 0) {
    if (avgBuildTime < 300) score += 10; // < 5 minutes
    else if (avgBuildTime < 600) score += 5; // < 10 minutes
  }
  
  // Bonus points for activity (0-10 points)
  if (runsToday > 0) {
    score += Math.min(runsToday * 2, 10);
  }
  
  return Math.min(Math.round(score), 100);
}

function getHealthScoreColor(score) {
  if (score === 'N/A') return 'default';
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
}

function getHealthLabel(score) {
  if (score === 'N/A') return 'No Data';
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

export default MetricsCards;
