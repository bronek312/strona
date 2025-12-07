import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import { listMedia, saveMedia, deleteMedia, getMediaById, resolveMediaPath } from '../services/mediaService.js';

const router = Router();
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, config.uploadDir),
  filename: (_, file, cb) => {
    const timestamp = Date.now();
    const uniqueName = `${timestamp}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.media.maxFileSizeMb * 1024 * 1024,
    files: config.media.maxFiles
  }
});

router.get('/', (req, res) => {
  res.json(listMedia());
});

router.get('/:id/download', (req, res) => {
  const media = getMediaById(req.params.id);
  if (!media) return res.status(404).json({ message: 'File not found' });
  res.download(media.file_path, media.file_name);
});

router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File is required' });
  const metadata = {
    fileName: req.file.originalname,
    filePath: req.file.path,
    mimeType: req.file.mimetype,
    size: req.file.size
  };
  const saved = saveMedia(metadata);
  res.status(201).json(saved);
});

router.delete('/:id', requireAuth, (req, res) => {
  deleteMedia(req.params.id);
  res.status(204).send();
});

router.get('/file/:fileName', (req, res) => {
  const filePath = resolveMediaPath(req.params.fileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
  res.sendFile(filePath);
});

export default router;
