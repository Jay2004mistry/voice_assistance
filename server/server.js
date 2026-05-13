// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const connectDB = require('./config/database');
// const mongoose = require('mongoose');

// // Load environment variables
// dotenv.config();

// // Connect to MongoDB
// connectDB();

// const app = express();

// // CORS configuration
// app.use(cors({
//   origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));

// // Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Request logging middleware
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });

// // Routes
// app.use('/api/chat', require('./routes/chat'));
// app.use('/api/sessions', require('./routes/sessions'));

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//   res.json({ 
//     status: 'OK', 
//     timestamp: new Date(),
//     mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
//   });
// });

// // Test endpoint
// app.get('/api/test', (req, res) => {
//   res.json({ message: 'Backend is working!' });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({ error: `Route ${req.url} not found` });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Server error:', err.stack);
//   res.status(500).json({ error: err.message || 'Something went wrong!' });
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`\n✅ Server running on port ${PORT}`);
//   console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
//   console.log(`📍 Test endpoint: http://localhost:${PORT}/api/test`);
//   console.log(`📍 Chat endpoint: http://localhost:${PORT}/api/chat/message\n`);
// });


const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Comprehensive CORS configuration for Mac
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:5000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/chat', require('./routes/chat'));
app.use('/api/sessions', require('./routes/sessions'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: process.env.PORT || 5000
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working on Mac!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.url} not found` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📍 Chat endpoint: http://localhost:${PORT}/api/chat/message`);
  console.log(`📍 CORS enabled for: localhost:3000, 127.0.0.1:3000\n`);
});