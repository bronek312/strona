import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { listNews, createNews, deleteNews } from '../services/newsService.js';

const router = Router();
const newsSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(10)
});

router.get('/', (req, res) => {
  res.json(listNews());
});

router.post('/', requireAuth, (req, res) => {
  const parsed = newsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const news = createNews(parsed.data);
  res.status(201).json(news);
});

router.delete('/:id', requireAuth, (req, res) => {
  deleteNews(req.params.id);
  res.status(204).send();
});

export default router;
