import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '..', 'data', 'warsztat.db'),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '..', 'uploads'),
  adminEmail: process.env.ADMIN_EMAIL || 'admin@warsztat.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  media: {
    maxFiles: Number(process.env.MEDIA_MAX_FILES) || 5,
    maxFileSizeMb: Number(process.env.MEDIA_MAX_SIZE_MB) || 5
  }
};
