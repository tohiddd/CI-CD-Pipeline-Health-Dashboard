import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tab,
  Tabs,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Dashboard = ({ repositories, loading }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [chartData, setChartData] = useState({});
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (repositories.length > 0) {
      generateChartData();
    }
  }, [repositories]);

  const generateChartData = async () => {
    setChartLoading(true);
    try {
      // For now, we'll generate sample data
      // In a real implementation, you'd fetch historical data from the API
      
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      // Success rate trend (sample data)
      const successTrend = {
        labels: last7Days,
        datasets: [
          {
            label: 'Success Rate %',
            data: [95, 88, 92, 96, 89, 94, 91],
            borderColor: 'rgb(46, 125, 50)',
            backgroundColor: 'rgba(46, 125, 50, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      };

      // Build time trend (sample data)
      const buildTimeTrend = {
        labels: last7Days,
        datasets: [
          {
            label: 'Avg Build Time (minutes)',
            data: [8.5, 9.2, 7.8, 8.1, 9.5, 8.3, 7.9],
            backgroundColor: 'rgba(25, 118, 210, 0.8)',
            borderColor: 'rgb(25, 118, 210)',
            borderWidth: 1
          }
        ]
      };

      // Pipeline status distribution
      const statusDistribution = {
        labels: ['Success', 'Failed', 'Running', 'Cancelled'],
        datasets: [
          {
            data: [75, 15, 8, 2],
            backgroundColor: [
              'rgba(46, 125, 50, 0.8)',
              'rgba(211, 47, 47, 0.8)',
              'rgba(237, 108, 2, 0.8)',
              'rgba(97, 97, 97, 0.8)'
            ],
            borderColor: [
              'rgb(46, 125, 50)',
              'rgb(211, 47, 47)',
              'rgb(237, 108, 2)',
              'rgb(97, 97, 97)'
            ],
            borderWidth: 2
          }
        ]
      };

      setChartData({
        successTrend,
        buildTimeTrend,
        statusDistribution
      });
    } catch (error) {
      console.error('Error generating chart data:', error);
    }
    setChartLoading(false);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  if (loading || chartLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (repositories.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Alert severity="info">
          No repositories added yet. Click the + button to add your first repository!
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Pipeline Analytics
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Success Trend" />
          <Tab label="Build Times" />
          <Tab label="Status Distribution" />
        </Tabs>
      </Box>

      <Box sx={{ height: 'calc(100% - 100px)' }}>
        {activeTab === 0 && chartData.successTrend && (
          <Line data={chartData.successTrend} options={chartOptions} />
        )}
        
        {activeTab === 1 && chartData.buildTimeTrend && (
          <Bar data={chartData.buildTimeTrend} options={chartOptions} />
        )}
        
        {activeTab === 2 && chartData.statusDistribution && (
          <Doughnut data={chartData.statusDistribution} options={doughnutOptions} />
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;
