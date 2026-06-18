const express = require('express');
const db = require('../db');
const router = express.Router();

function auth(roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: '未登录' });
    if (roles && !roles.includes(req.session.user.role)) return res.status(403).json({ error: '无权限' });
    next();
  };
}

// 保存训练记录后，把这次用过的动作回写为该学员的最新默认值（按动作名称记忆）
function rememberDefaults(studentId, exercises) {
  if (!studentId || !Array.isArray(exercises) || !exercises.length) return;
  let touched = false;
  exercises.forEach(ex => {
    if (!ex || !ex.name) return;
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    if (!sets.length) return;
    // 取重量最大的一组作为代表（工作重量）
    let rep = sets[0];
    sets.forEach(s => { if ((Number(s.weight) || 0) > (Number(rep.weight) || 0)) rep = s; });
    db.studentDefaults.upsert(studentId, ex.name, {
      category: ex.category || 'other',
      muscles: ex.muscles || '',
      weight: Number(rep.weight) || 0,
      reps: Number(rep.reps) || 0,
      sets: sets.length,
      multiplier: Number(ex.multiplier) || 1,
    });
    touched = true;
  });
  if (touched) db.studentDefaults.save();
}

// 获取训练记录
router.get('/', auth(), (req, res) => {
  const { role, id } = req.session.user;
  const { student_id, month } = req.query;
  let list = db.logs.all();
  if (role === 'coach') list = list.filter(l => l.coach_id === id);
  if (role === 'student') list = list.filter(l => l.student_id === id);
  if (student_id && role !== 'student') list = list.filter(l => l.student_id === Number(student_id));
  if (month) list = list.filter(l => l.date && l.date.startsWith(month));
  list.sort((a, b) => b.date.localeCompare(a.date));
  res.json(list);
});

// 计算单条记录的训练容量（总量 + 各部位）
function logVolume(log) {
  let total = 0;
  const cat = { lower_body: 0, back: 0, shoulder: 0, chest_arms: 0, core: 0, other: 0 };
  (log.exercises || []).forEach(ex => {
    const mult = Number(ex.multiplier) || 1;
    let v = 0, reps = 0;
    (ex.sets || []).forEach(s => {
      v += (Number(s.weight) || 0) * (Number(s.reps) || 0) * mult;
      reps += Number(s.reps) || 0;
    });
    if (ex.category === 'core' && v === 0) cat.core += reps;
    else cat[ex.category || 'other'] = (cat[ex.category || 'other'] || 0) + v;
    total += v;
  });
  return { total: Math.round(total), cat };
}

// 学员成长时间线：升序返回该学员全部记录 + 每次容量（教练间不隔离；学员只能看自己）
router.get('/progress/:studentId', auth(), (req, res) => {
  const sid = Number(req.params.studentId);
  const me = req.session.user;
  if (me.role === 'student' && me.id !== sid) return res.status(403).json({ error: '无权限' });
  const list = db.logs.all().filter(l => l.student_id === sid);
  list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  res.json(list.map(l => {
    const { total, cat } = logVolume(l);
    return {
      id: l.id, date: l.date, weekday: l.weekday, title: l.title,
      coach_name: l.coach_name,
      duration: l.duration, calories: l.calories,
      body_weight: l.body_weight, body_fat: l.body_fat, body_muscle: l.body_muscle,
      volume: total, categories: cat,
      exercise_count: (l.exercises || []).length,
    };
  }));
});

// 获取单条记录
router.get('/:id', auth(), (req, res) => {
  const row = db.logs.find(Number(req.params.id));
  if (!row) return res.status(404).json({ error: '记录不存在' });
  res.json(row);
});

// 教练创建记录
router.post('/', auth(['coach', 'admin']), (req, res) => {
  const { student_id, booking_id, date, weekday, title, duration, calories,
    body_weight, body_fat, body_muscle, exercises, summary } = req.body;
  if (!student_id || !date) return res.status(400).json({ error: '学员和日期为必填项' });
  const row = db.logs.insert({
    student_id: Number(student_id), coach_id: req.session.user.id,
    booking_id: booking_id ? Number(booking_id) : null,
    date, weekday: weekday || '', title: title || '',
    duration: duration ? Number(duration) : null,
    calories: calories ? Number(calories) : null,
    body_weight: body_weight ? Number(body_weight) : null,
    body_fat: body_fat ? Number(body_fat) : null,
    body_muscle: body_muscle ? Number(body_muscle) : null,
    exercises: exercises || [], summary: summary || '',
  });
  rememberDefaults(Number(student_id), exercises);
  res.json({ id: row.id });
});

// 教练更新记录
router.put('/:id', auth(['coach', 'admin']), (req, res) => {
  const { date, weekday, title, duration, calories,
    body_weight, body_fat, body_muscle, exercises, summary } = req.body;
  const existing = db.logs.find(Number(req.params.id));
  db.logs.update(Number(req.params.id), {
    date, weekday: weekday || '', title: title || '',
    duration: duration ? Number(duration) : null,
    calories: calories ? Number(calories) : null,
    body_weight: body_weight ? Number(body_weight) : null,
    body_fat: body_fat ? Number(body_fat) : null,
    body_muscle: body_muscle ? Number(body_muscle) : null,
    exercises: exercises || [], summary: summary || '',
  });
  if (existing) rememberDefaults(existing.student_id, exercises);
  res.json({ ok: true });
});

// 删除记录
router.delete('/:id', auth(['coach', 'admin']), (req, res) => {
  db.logs.delete(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
