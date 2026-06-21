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

// 学员发起约课；教练可手动帮学员约课
router.post('/', auth(['student', 'coach']), (req, res) => {
  const me = req.session.user;
  const { coach_id, student_id, date, time_slot, note } = req.body;
  const targetCoachId = me.role === 'coach' ? me.id : Number(coach_id);
  const targetStudentId = me.role === 'coach' ? Number(student_id) : me.id;
  if (!targetCoachId || !targetStudentId || !date || !time_slot) return res.status(400).json({ error: '请填写完整约课信息' });
  const student = db.users.find(targetStudentId);
  if (!student || student.role !== 'student') return res.status(400).json({ error: '学员不存在' });
  const conflict = db.bookings.all({ coach_id: targetCoachId, date, time_slot })
    .some(b => b.status !== 'cancelled');
  if (conflict) return res.status(400).json({ error: '该时间段已被预约' });
  const row = db.bookings.insert({
    student_id: targetStudentId,
    coach_id: targetCoachId,
    date,
    time_slot,
    note: note || (me.role === 'coach' ? '教练代约' : ''),
    status: me.role === 'coach' ? 'confirmed' : 'pending'
  });
  res.json({ id: row.id });
});

// 教练/admin 更新状态
router.put('/:id/status', auth(['coach', 'admin']), (req, res) => {
  const { status } = req.body;
  if (!['confirmed', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ error: '状态无效' });
  const booking = db.bookings.find(Number(req.params.id));
  if (!booking) return res.status(404).json({ error: '约课不存在' });
  if (req.session.user.role === 'coach' && booking.coach_id !== req.session.user.id) return res.status(403).json({ error: '无权限' });
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
