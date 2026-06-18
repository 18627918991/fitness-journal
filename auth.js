const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const router = express.Router();

router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: '请填写账号和密码' });
  const user = db.users.findByPhone(phone);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: '账号或密码错误' });
  req.session.user = { id: user.id, name: user.name, role: user.role };
  res.json({ id: user.id, name: user.name, role: user.role });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  res.json(req.session.user);
});

module.exports = router;
