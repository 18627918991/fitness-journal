const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

function auth(roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: '未登录' });
    if (roles && !roles.includes(req.session.user.role)) return res.status(403).json({ error: '无权限' });
    next();
  };
}

// 获取用户列表
router.get('/', auth(['admin', 'coach']), (req, res) => {
  const { role } = req.query;
  const me = req.session.user;
  if (me.role === 'admin') {
    const list = role ? db.users.all({ role }) : db.users.all();
    return res.json(list.map(({ password, ...u }) => u));
  }
  // coach：只返回有约课关联的学员
  const bookings = db.bookings.all({ coach_id: me.id });
  const studentIds = [...new Set(bookings.map(b => b.student_id))];
  const students = studentIds.map(id => db.users.find(id)).filter(Boolean).map(({ password, ...u }) => u);
  res.json(students);
});

// 获取所有教练（学员约课用）
router.get('/coaches', auth(['admin', 'student']), (req, res) => {
  const list = db.users.all({ role: 'coach' }).map(({ password, ...u }) => u);
  res.json(list);
});

// 新增用户（admin）
router.post('/', auth(['admin']), (req, res) => {
  const { name, phone, password, role } = req.body;
  if (!name || !phone || !password || !role) return res.status(400).json({ error: '字段不完整' });
  if (!['coach', 'student', 'admin'].includes(role)) return res.status(400).json({ error: '角色无效' });
  try {
    const user = db.users.insert({ name, phone, password: bcrypt.hashSync(password, 10), role });
    const { password: _, ...safe } = user;
    res.json(safe);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 重置密码（admin）
router.put('/:id/password', auth(['admin']), (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: '请填写新密码' });
  db.users.update(Number(req.params.id), { password: bcrypt.hashSync(password, 10) });
  res.json({ ok: true });
});

// 删除用户（admin）
router.delete('/:id', auth(['admin']), (req, res) => {
  db.users.delete(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
