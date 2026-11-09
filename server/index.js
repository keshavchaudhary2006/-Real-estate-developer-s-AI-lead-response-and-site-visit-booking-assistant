
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('../db');
const leadsRouter = require('./routes/leads');
const factSheetRouter = require('./routes/factSheet');
const slotsRouter = require('./routes/slots');
const inboxRouter = require('./routes/inbox');
const analyticsRouter = require('./routes/analytics');
const chatService = require('./services/chatService');
const reminderCron = require('./jobs/reminderCron');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/leads', leadsRouter);
app.use('/api/factsheet', factSheetRouter);
app.use('/api/slots', slotsRouter);
app.use('/api/inbox', inboxRouter);
app.use('/api/analytics', analyticsRouter);

// Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, state, lang, hasConsented } = req.body;

    const response = await chatService.processChatMessage({
      message,
      state: state || {},
      lang: lang || 'en',
      hasConsented: Boolean(hasConsented),
    });

    res.json({ success: true, ...response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Reminder Cron Job Endpoints
app.post('/api/reminders/run', async (req, res) => {
  try {
    const result = await reminderCron.checkAndDispatchReminders(
      req.body.mockNow || null
    );

    res.json(result);
  } catch (error) {
    console.error('Reminder cron error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get('/api/reminders/logs', (req, res) => {
  res.json({
    success: true,
    data: reminderCron.getLogs(),
  });
});

// System Health & Database Status
app.get('/api/health', (req, res) => {
  const dbMode = db.getMode();
  const isDatabaseConnected = dbMode === 'postgresql';

  res.status(isDatabaseConnected ? 200 : 503).json({
    status: isDatabaseConnected ? 'online' : 'database_disconnected',
    appName: 'Keshav',
    dbMode,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Keshav API Server',
    description:
      'Real Estate Leads, Fact Sheet & Visit Slots Management Backend',
    endpoints: {
      health: 'GET /api/health',
      leads: 'GET, POST, PUT, DELETE /api/leads',
      leadsMerge: 'POST /api/leads/merge',
      factSheet: 'GET, POST, PUT, DELETE /api/factsheet',
      slots: 'GET, POST, PUT, DELETE /api/slots',
      inboxLeads: 'GET /api/inbox/leads',
      inboxTranscript: 'GET /api/inbox/leads/:id/transcript',
      inboxTakeover: 'POST /api/inbox/leads/:id/takeover',
      inboxMessage: 'POST /api/inbox/leads/:id/message',
    },
    dbMode: db.getMode(),
  });
});

// Start Server
async function startServer() {
  try {
    const dbStatus = await db.initDb();

    console.log(
      `[DB] Engine running in ${dbStatus.mode.toUpperCase()} mode.`
    );

    const server = app.listen(PORT, () => {
      console.log('=================================================');
      console.log('🚀 Keshav Node.js Backend Server Running!');
      console.log(`📍 Port: ${PORT}`);
      console.log(`🗄️ Database Mode: ${dbStatus.mode}`);
      console.log('⏰ Reminder Cron: Background interval started');
      console.log('=================================================');
    });

    reminderCron.startCron(60000);

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
