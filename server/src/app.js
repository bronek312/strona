import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { ensureDefaultAdmin } from './services/adminService.js';
import { ensureDefaultWorkshops } from './services/workshopsService.js';
import { ensureDefaultSettings } from './services/settingsService.js';
import authRoutes from './routes/authRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import workshopsRoutes from './routes/workshopsRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import logsRoutes from './routes/logsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(config.uploadDir));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/workshops', workshopsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/logs', logsRoutes);

ensureDefaultAdmin().catch((err) => {
  console.error('Failed to ensure default admin', err);
});

try {
  ensureDefaultWorkshops();
} catch (err) {
  console.error('Failed to seed workshops', err);
}

try {
  ensureDefaultSettings();
} catch (err) {
  console.error('Failed to seed settings', err);
}

// Serve frontend if running in same host (optional convenience)
app.use(express.static(path.resolve(__dirname, '..', '..')));

app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(err.statusCode || 400).json({ message: 'Invalid JSON payload' });
  }

  const status = err?.statusCode || err?.status || 500;
  if (status >= 500) {
    console.error(err);
    return res.status(500).json({ message: 'Unexpected server error' });
  }

  res.status(status).json({ message: err.message || 'Request failed' });
});

export default app;
