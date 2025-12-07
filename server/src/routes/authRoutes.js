import { Router } from 'express';
import { z } from 'zod';
import { login } from '../services/authService.js';

const router = Router();
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid credentials payload' });
  }

  const result = await login(parsed.data.email, parsed.data.password);
  if (!result) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  res.json(result);
});

export default router;
