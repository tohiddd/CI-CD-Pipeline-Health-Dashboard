const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const redis = require('redis');
const { Octokit } = require('@octokit/rest');
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Database connections
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let redisClient;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(console.error);
}

// GitHub API client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Jenkins API configuration
let jenkinsConfig = null;
if (process.env.JENKINS_URL && process.env.JENKINS_USERNAME && process.env.JENKINS_API_TOKEN) {
  jenkinsConfig = {
    baseURL: process.env.JENKINS_URL,
    auth: {
      username: process.env.JENKINS_USERNAME,
      password: process.env.JENKINS_API_TOKEN
    },
    timeout: 10000
  };
  console.log('✅ Jenkins integration configured for:', process.env.JENKINS_URL);
} else {
  console.log('⚠️  Jenkins integration disabled - Configuration missing');
}

// Jenkins API functions
async function fetchJenkinsJobs() {
  if (!jenkinsConfig) return [];
  
  try {
    const response = await axios.get(`${jenkinsConfig.baseURL}/api/json?tree=jobs[name,url,color,lastBuild[number,url,result,timestamp,duration]]`, {
      auth: jenkinsConfig.auth,
      timeout: jenkinsConfig.timeout
    });
    
    return response.data.jobs || [];
  } catch (error) {
    console.error('Error fetching Jenkins jobs:', error.message);
    return [];
  }
}

async function fetchJenkinsJobBuilds(jobName, limit = 10) {
  if (!jenkinsConfig) return [];
  
  try {
    const response = await axios.get(`${jenkinsConfig.baseURL}/job/${jobName}/api/json?tree=builds[number,url,result,timestamp,duration,changeSet[items[msg,author[fullName]]]]`, {
      auth: jenkinsConfig.auth,
      timeout: jenkinsConfig.timeout
    });
    
    return response.data.builds?.slice(0, limit) || [];
  } catch (error) {
    console.error(`Error fetching Jenkins builds for ${jobName}:`, error.message);
    return [];
  }
}

async function processJenkinsData() {
  if (!jenkinsConfig) return;
  
  try {
    const jobs = await fetchJenkinsJobs();
    
    for (const job of jobs) {
      // Store/update Jenkins job in database
      const jobResult = await db.query(`
        INSERT INTO repositories (name, full_name, platform, url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (full_name) DO UPDATE SET
          name = EXCLUDED.name,
          url = EXCLUDED.url
        RETURNING id
      `, [job.name, job.name, 'jenkins', job.url]);
      
      const repositoryId = jobResult.rows[0].id;
      
      // Fetch recent builds for this job
      const builds = await fetchJenkinsJobBuilds(job.name, 20);
      
      for (const build of builds) {
        // Convert Jenkins result to our status format
        const conclusion = build.result ? build.result.toLowerCase() : 'unknown';
        const status = conclusion === 'success' || conclusion === 'failure' ? 'completed' : 'in_progress';
        
        // Get commit message from changeSet
        const commitMessage = build.changeSet?.items?.[0]?.msg || 'No commit message';
        const author = build.changeSet?.items?.[0]?.author?.fullName || 'Unknown';
        
        // Store build data
        await db.query(`
          INSERT INTO pipeline_runs 
          (repository_id, run_id, status, conclusion, started_at, completed_at, duration_seconds, commit_message, author)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (repository_id, run_id) 
          DO UPDATE SET 
            status = EXCLUDED.status,
            conclusion = EXCLUDED.conclusion,
            completed_at = EXCLUDED.completed_at,
            duration_seconds = EXCLUDED.duration_seconds
        `, [
          repositoryId,
          build.number.toString(),
          status,
          conclusion,
          new Date(build.timestamp),
          build.result ? new Date(build.timestamp + (build.duration || 0)) : null,
          Math.round((build.duration || 0) / 1000),
          commitMessage,
          author
        ]);

        // Check for failures and send alerts (similar to GitHub)
        if (status === 'completed' && conclusion === 'failure') {
          const existingAlert = await db.query(
            'SELECT id FROM alerts WHERE repository_id = $1 AND message LIKE $2',
            [repositoryId, `%${build.number}%`]
          );

          if (existingAlert.rows.length === 0) {
            const repository = { id: repositoryId, full_name: job.name, url: job.url };
            const pipelineRun = {
              run_id: build.number.toString(),
              status: status,
              conclusion: conclusion,
              commit_message: commitMessage,
              author: author,
              duration_seconds: Math.round((build.duration || 0) / 1000)
            };

            await sendFailureAlert(repository, pipelineRun);
            await sendSlackFailureAlert(repository, pipelineRun);
          }
        }
      }
    }
    
    console.log(`✅ Processed ${jobs.length} Jenkins jobs`);
  } catch (error) {
    console.error('Error processing Jenkins data:', error);
  }
}

// Slack webhook configuration
let slackWebhookUrl = null;
if (process.env.SLACK_WEBHOOK_URL) {
  slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  console.log('✅ Slack webhook notifications configured');
} else {
  console.log('⚠️  Slack webhook disabled - SLACK_WEBHOOK_URL not configured');
}

// Slack notification functions
async function sendSlackFailureAlert(repository, pipelineRun) {
  if (!slackWebhookUrl) {
    console.log('Slack webhook not configured - skipping alert');
    return;
  }

  const statusEmoji = pipelineRun.conclusion === 'failure' ? '🔴' : '🟠';
  const durationText = pipelineRun.duration_seconds 
    ? `${Math.round(pipelineRun.duration_seconds / 60)}m ${pipelineRun.duration_seconds % 60}s`
    : 'Unknown';

  const slackMessage = {
    text: `${statusEmoji} CI/CD Pipeline Failure Alert`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚨 Pipeline Failed: ${repository.full_name}`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Repository:*\n<${repository.url}|${repository.full_name}>`
          },
          {
            type: "mrkdwn",
            text: `*Status:*\n${statusEmoji} ${pipelineRun.conclusion || pipelineRun.status}`
          },
          {
            type: "mrkdwn",
            text: `*Branch:*\n\`${pipelineRun.branch || 'Unknown'}\``
          },
          {
            type: "mrkdwn",
            text: `*Duration:*\n${durationText}`
          },
          {
            type: "mrkdwn",
            text: `*Author:*\n${pipelineRun.author || 'Unknown'}`
          },
          {
            type: "mrkdwn",
            text: `*Commit:*\n\`${pipelineRun.commit_sha?.substring(0, 7) || 'Unknown'}\``
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Commit Message:*\n_${pipelineRun.commit_message || 'No commit message'}_`
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "🔗 View GitHub Actions",
              emoji: true
            },
            url: `${repository.url}/actions`,
            style: "primary"
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📊 Open Dashboard",
              emoji: true
            },
            url: "http://localhost:3000"
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `⏰ ${new Date().toLocaleString()} | CI/CD Pipeline Health Dashboard`
          }
        ]
      }
    ]
  };

  try {
    const response = await axios.post(slackWebhookUrl, slackMessage, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ Slack alert sent for ${repository.full_name}`);
    
    // Save alert to database
    await db.query(
      'INSERT INTO alerts (repository_id, type, message, recipients) VALUES ($1, $2, $3, $4)',
      [repository.id, 'slack_failure', `Pipeline failed (Run ID: ${pipelineRun.run_id}): ${pipelineRun.conclusion}`, ['slack']]
    );
  } catch (error) {
    console.error('❌ Failed to send Slack alert:', error.response?.data || error.message);
  }
}

// Email transporter configuration
let emailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify email configuration
  emailTransporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email configuration error:', error.message);
    } else {
      console.log('✅ Email server ready for sending alerts');
    }
  });
} else {
  console.log('⚠️  Email alerts disabled - SMTP configuration missing');
}

// Email alert functions
async function sendFailureAlert(repository, pipelineRun, recipients = []) {
  if (!emailTransporter) {
    console.log('Email alerts not configured - skipping alert');
    return;
  }

  const defaultRecipients = [
    'tohid.shaikh111@gmail.com'      // ✅ Your actual email address
  ];
  const allRecipients = [...new Set([...recipients, ...defaultRecipients])];

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: allRecipients.join(', '),
    subject: `🚨 Pipeline Failure Alert - ${repository.full_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">🚨 CI/CD Pipeline Failure Alert</h2>
        
        <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #d32f2f; margin: 0 0 15px 0;">Pipeline Failed</h3>
          <p><strong>Repository:</strong> <a href="${repository.url}">${repository.full_name}</a></p>
          <p><strong>Status:</strong> ${pipelineRun.conclusion || pipelineRun.status}</p>
          <p><strong>Branch:</strong> ${pipelineRun.branch || 'Unknown'}</p>
          <p><strong>Commit:</strong> ${pipelineRun.commit_sha?.substring(0, 7) || 'Unknown'}</p>
          <p><strong>Author:</strong> ${pipelineRun.author || 'Unknown'}</p>
          <p><strong>Duration:</strong> ${pipelineRun.duration_seconds ? Math.round(pipelineRun.duration_seconds / 60) + ' minutes' : 'Unknown'}</p>
        </div>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0;">Commit Message:</h4>
          <p style="margin: 0; font-style: italic;">${pipelineRun.commit_message || 'No commit message'}</p>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
          <p style="margin: 0;"><strong>🔗 Actions:</strong></p>
          <p style="margin: 5px 0 0 0;">
            • <a href="${repository.url}/actions">View GitHub Actions</a><br>
            • <a href="http://localhost:3000">Open CI/CD Dashboard</a>
          </p>
        </div>

        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This alert was sent by your CI/CD Pipeline Health Dashboard at ${new Date().toLocaleString()}
        </p>
      </div>
    `,
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Failure alert sent for ${repository.full_name} to:`, allRecipients.join(', '));
    
    // Save alert to database
    await db.query(
      'INSERT INTO alerts (repository_id, type, message, recipients) VALUES ($1, $2, $3, $4)',
      [repository.id, 'failure', `Pipeline failed (Run ID: ${pipelineRun.run_id}): ${pipelineRun.conclusion}`, allRecipients]
    );
  } catch (error) {
    console.error('❌ Failed to send email alert:', error.message);
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting (relaxed for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs (increased for dev)
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'connected',
      redis: redisClient ? 'connected' : 'disabled',
      github: process.env.GITHUB_TOKEN ? 'configured' : 'not configured',
      jenkins: jenkinsConfig ? 'configured' : 'not configured',
      email: emailTransporter ? 'configured' : 'not configured',
      slack: slackWebhookUrl ? 'configured' : 'not configured'
    }
  });
});

// Jenkins connection test endpoint
app.get('/api/jenkins/test', async (req, res) => {
  if (!jenkinsConfig) {
    return res.status(400).json({ 
      error: 'Jenkins not configured',
      message: 'Please set JENKINS_URL, JENKINS_USERNAME, and JENKINS_API_TOKEN environment variables'
    });
  }

  try {
    const response = await axios.get(`${jenkinsConfig.baseURL}/api/json`, {
      auth: jenkinsConfig.auth,
      timeout: 5000
    });

    res.json({
      status: 'success',
      jenkins_version: response.data.version || 'Unknown',
      jenkins_url: jenkinsConfig.baseURL,
      jobs_count: response.data.jobs ? response.data.jobs.length : 0,
      message: 'Jenkins connection successful'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      jenkins_url: jenkinsConfig.baseURL,
      message: 'Failed to connect to Jenkins. Check your credentials and URL.'
    });
  }
});

// Slack webhook test endpoint
app.get('/api/slack/test', async (req, res) => {
  if (!slackWebhookUrl) {
    return res.status(400).json({ 
      error: 'Slack webhook not configured',
      message: 'Please set SLACK_WEBHOOK_URL environment variable'
    });
  }

  const testMessage = {
    text: `🧪 Test Message from CI/CD Dashboard`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🧪 Slack Integration Test",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ Your Slack webhook is working correctly!\n\n*Dashboard URL:* http://localhost:3000\n*Test Time:* ${new Date().toLocaleString()}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎯 *Next Steps:*\n• Monitor your repositories for real-time failure alerts\n• Rich formatted notifications with direct action buttons\n• Team-wide visibility in your Slack channel`
        }
      }
    ]
  };

  try {
    await axios.post(slackWebhookUrl, testMessage, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.json({
      status: 'success',
      message: 'Test message sent to Slack successfully!',
      webhook_url: slackWebhookUrl.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.response?.data || error.message,
      message: 'Failed to send test message to Slack. Check your webhook URL.'
    });
  }
});

// API Routes

// Get all monitored repositories
app.get('/api/repositories', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM repositories ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Add a new repository to monitor
app.post('/api/repositories', async (req, res) => {
  const { fullName, platform = 'github' } = req.body;
  
  if (!fullName) {
    return res.status(400).json({ error: 'Repository full name is required' });
  }

  try {
    // Verify repository exists on GitHub
    if (platform === 'github') {
      const [owner, repo] = fullName.split('/');
      await octokit.rest.repos.get({ owner, repo });
    }

    const result = await db.query(
      'INSERT INTO repositories (name, full_name, platform, url) VALUES ($1, $2, $3, $4) RETURNING *',
      [fullName.split('/')[1], fullName, platform, `https://github.com/${fullName}`]
    );

    // Start monitoring this repository
    await fetchRepositoryRuns(fullName);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.status === 404) {
      res.status(404).json({ error: 'Repository not found' });
    } else if (error.constraint === 'repositories_full_name_key') {
      res.status(409).json({ error: 'Repository is already being monitored' });
    } else {
      console.error('Error adding repository:', error);
      res.status(500).json({ error: 'Failed to add repository' });
    }
  }
});

// Delete a repository
app.delete('/api/repositories/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // First, delete all pipeline runs for this repository
    await db.query('DELETE FROM pipeline_runs WHERE repository_id = $1', [id]);
    
    // Delete all alerts for this repository  
    await db.query('DELETE FROM alerts WHERE repository_id = $1', [id]);
    
    // Finally, delete the repository itself
    const result = await db.query('DELETE FROM repositories WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    console.log(`Deleted repository: ${result.rows[0].full_name}`);
    res.json({ message: 'Repository deleted successfully', repository: result.rows[0] });
  } catch (error) {
    console.error('Error deleting repository:', error);
    res.status(500).json({ error: 'Failed to delete repository' });
  }
});

// Get pipeline runs for a repository
app.get('/api/repositories/:id/runs', async (req, res) => {
  const { id } = req.params;
  const { limit = 50 } = req.query;

  try {
    const result = await db.query(
      'SELECT * FROM pipeline_runs WHERE repository_id = $1 ORDER BY started_at DESC LIMIT $2',
      [id, limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pipeline runs:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline runs' });
  }
});

// Get detailed logs for a specific pipeline run
app.get('/api/repositories/:id/runs/:runId/logs', async (req, res) => {
  const { id, runId } = req.params;

  try {
    // Get repository details
    const repoResult = await db.query('SELECT full_name FROM repositories WHERE id = $1', [id]);
    if (repoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const [owner, repo] = repoResult.rows[0].full_name.split('/');

    // Get workflow run details from GitHub
    const runResponse = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });

    // Get jobs for this workflow run
    const jobsResponse = await octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });

    // Get logs for each job
    const jobsWithLogs = await Promise.all(
      jobsResponse.data.jobs.map(async (job) => {
        try {
          const logResponse = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: job.id,
          });
          
          return {
            ...job,
            logs: logResponse.data || 'Logs not available',
            log_url: logResponse.url
          };
        } catch (error) {
          return {
            ...job,
            logs: 'Logs not accessible or expired',
            log_error: error.message
          };
        }
      })
    );

    res.json({
      workflow_run: runResponse.data,
      jobs: jobsWithLogs,
      summary: {
        total_jobs: jobsWithLogs.length,
        successful_jobs: jobsWithLogs.filter(job => job.conclusion === 'success').length,
        failed_jobs: jobsWithLogs.filter(job => job.conclusion === 'failure').length,
        cancelled_jobs: jobsWithLogs.filter(job => job.conclusion === 'cancelled').length,
      }
    });
  } catch (error) {
    console.error('Error fetching pipeline logs:', error);
    if (error.status === 404) {
      res.status(404).json({ error: 'Pipeline run not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch pipeline logs' });
    }
  }
});

// Get dashboard metrics
app.get('/api/metrics/summary', async (req, res) => {
  try {
    const [successRateResult, avgBuildTimeResult, totalRunsResult, recentRunsResult] = await Promise.all([
      // Success rate (last 30 days)
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed' AND conclusion = 'success') as successful
        FROM pipeline_runs 
        WHERE started_at > NOW() - INTERVAL '30 days'
      `),
      
      // Average build time (last 30 days)
      db.query(`
        SELECT AVG(duration_seconds) as avg_duration
        FROM pipeline_runs 
        WHERE started_at > NOW() - INTERVAL '30 days' 
        AND duration_seconds IS NOT NULL
      `),

      // Total runs today
      db.query(`
        SELECT COUNT(*) as total
        FROM pipeline_runs 
        WHERE DATE(started_at) = CURRENT_DATE
      `),

      // Recent runs (last 10)
      db.query(`
        SELECT pr.*, r.name as repository_name, r.full_name
        FROM pipeline_runs pr
        JOIN repositories r ON pr.repository_id = r.id
        ORDER BY pr.started_at DESC
        LIMIT 10
      `)
    ]);

    const successRate = successRateResult.rows[0];
    const successPercentage = successRate.total > 0 
      ? Math.round((successRate.successful / successRate.total) * 100) 
      : 0;

    const avgBuildTime = avgBuildTimeResult.rows[0].avg_duration || 0;
    const totalRuns = totalRunsResult.rows[0].total;
    const recentRuns = recentRunsResult.rows;

    res.json({
      successRate: successPercentage,
      avgBuildTime: Math.round(avgBuildTime),
      totalRunsToday: parseInt(totalRuns),
      recentRuns
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Background job to fetch GitHub Actions data
async function fetchRepositoryRuns(fullName) {
  try {
    const [owner, repo] = fullName.split('/');
    
    // Get repository from database
    const repoResult = await db.query('SELECT id FROM repositories WHERE full_name = $1', [fullName]);
    if (repoResult.rows.length === 0) return;
    
    const repositoryId = repoResult.rows[0].id;

    // Fetch workflow runs from GitHub
    const { data: runs } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 50
    });

    for (const run of runs.workflow_runs) {
      const duration = run.created_at && run.updated_at 
        ? Math.round((new Date(run.updated_at) - new Date(run.created_at)) / 1000)
        : null;

      // Insert or update run data
      await db.query(`
        INSERT INTO pipeline_runs 
        (repository_id, run_id, status, conclusion, started_at, completed_at, duration_seconds, commit_sha, commit_message, branch, author)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (repository_id, run_id) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          conclusion = EXCLUDED.conclusion,
          completed_at = EXCLUDED.completed_at,
          duration_seconds = EXCLUDED.duration_seconds
      `, [
        repositoryId,
        run.id.toString(),
        run.status,
        run.conclusion,
        run.created_at,
        run.updated_at,
        duration,
        run.head_sha,
        run.head_commit?.message || '',
        run.head_branch,
        run.head_commit?.author?.name || run.actor?.login || ''
      ]);

      // Check for pipeline failures and send alerts
      if (run.status === 'completed' && run.conclusion === 'failure') {
        // Check if we've already sent an alert for this specific run
        const existingAlert = await db.query(
          'SELECT id FROM alerts WHERE repository_id = $1 AND message LIKE $2',
          [repositoryId, `%${run.id}%`]
        );

        if (existingAlert.rows.length === 0) {
          // Get repository details for the alert
          const repoDetails = await db.query(
            'SELECT id, full_name, url FROM repositories WHERE id = $1',
            [repositoryId]
          );

          if (repoDetails.rows.length > 0) {
            const repository = repoDetails.rows[0];
            const pipelineRun = {
              run_id: run.id.toString(),
              status: run.status,
              conclusion: run.conclusion,
              branch: run.head_branch,
              commit_sha: run.head_sha,
              commit_message: run.head_commit?.message || '',
              author: run.head_commit?.author?.name || run.actor?.login || '',
              duration_seconds: duration
            };

            // Send failure alerts (both email and Slack)
            await sendFailureAlert(repository, pipelineRun);
            await sendSlackFailureAlert(repository, pipelineRun);
          }
        }
      }
    }

    // Emit real-time update
    io.emit('pipeline_update', { repository: fullName, runs: runs.workflow_runs.slice(0, 5) });
    
    console.log(`Updated ${runs.workflow_runs.length} runs for ${fullName}`);
  } catch (error) {
    console.error(`Error fetching runs for ${fullName}:`, error.message);
  }
}

// Periodic data fetching
async function startDataFetching() {
  console.log('Starting periodic data fetching...');
  
  // Function to fetch data
  const fetchData = async () => {
    try {
      const repos = await db.query('SELECT full_name FROM repositories WHERE platform = $1', ['github']);
      
      for (const repo of repos.rows) {
        await fetchRepositoryRuns(repo.full_name);
        // Wait 1 second between repositories to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Process Jenkins data if configured
      if (jenkinsConfig) {
        console.log('🔄 Processing Jenkins data...');
        await processJenkinsData();
      }
    } catch (error) {
      console.error('Error in periodic data fetching:', error);
    }
  };

  // Fetch immediately on startup
  console.log('🔄 Running initial data fetch...');
  await fetchData();
  
  // Then set up periodic fetching every 60 seconds
  setInterval(fetchData, 60 * 1000); // Every 60 seconds
}

// Initialize database tables
async function initializeDatabase() {
  try {
    // Add unique constraint to pipeline_runs if it doesn't exist
    await db.query(`
      ALTER TABLE pipeline_runs 
      ADD CONSTRAINT unique_repo_run 
      UNIQUE (repository_id, run_id)
    `).catch(() => {}); // Ignore if constraint already exists
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 CI/CD Dashboard Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  
  await initializeDatabase();
  
  // Start data fetching after a short delay
  setTimeout(startDataFetching, 10000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await db.end();
  if (redisClient) await redisClient.quit();
  process.exit(0);
});
