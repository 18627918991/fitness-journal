const express = require('express');
const db = require('./db');
const router = express.Router();

function auth(roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: '未登录' });
    if (roles && !roles.includes(req.session.user.role)) return res.status(403).json({ error: '无权限' });
    next();
  };
}

// 获取约课列表（按角色过滤）
router.get('/', auth(), (req, res) => {
  const { role, id } = req.session.user;
  const { status, date } = req.query;
  let list = db.bookings.all();
  if (role === 'coach') list = list.filter(b => b.coach_id === id);
  if (role === 'student') list = list.filter(b => b.student_id === id);
  if (status) list = list.filter(b => b.status === status);
  if (date) list = list.filter(b => b.date === date);
  list.sort((a, b) => b.date.localeCompare(a.date) || b.time_slot.localeCompare(a.time_slot));
  res.json(list);
});

// 学员发起约课
router.post('/', auth(['student']), (req, res) => {
  const { coach_id, date, time_slot, note } = req.body;
  if (!coach_id || !date || !time_slot) return res.status(400).json({ error: '请填写完整约课信息' });
  const conflict = db.bookings.all({ coach_id: Number(coach_id), date, time_slot })
    .some(b => b.status !== 'cancelled');
  if (conflict) return res.status(400).json({ error: '该时间段已被预约' });
  const row = db.bookings.insert({ student_id: req.session.user.id, coach_id: Number(coach_id), date, time_slot, note: note || '' });
  res.json({ id: row.id });
});

// 教练/admin 更新状态
router.put('/:id/status', auth(['coach', 'admin']), (req, res) => {
  const { status } = req.body;
  if (!['confirmed', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: '状态无效' });
  db.bookings.update(Number(req.params.id), { status });
  res.json({ ok: true });
});

// 学员取消
router.put('/:id/cancel', auth(['student']), (req, res) => {
  const b = db.bookings.find(Number(req.params.id));
  if (!b || b.student_id !== req.session.user.id) return res.status(403).json({ error: '无权限' });
  if (b.status !== 'pending') return res.status(400).json({ error: '只能取消待确认的约课' });
  db.bookings.update(Number(req.params.id), { status: 'cancelled' });
  res.json({ ok: true });
});

module.exports = router;
