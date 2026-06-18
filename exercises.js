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

// 获取整个动作池（教练/管理）
router.get('/', auth(['coach', 'admin']), (req, res) => {
  res.json(db.exercises.all());
});

// 新增动作到池（任何教练都能加）
router.post('/', auth(['coach', 'admin']), (req, res) => {
  const { name, category, muscles, weight, reps, sets, multiplier } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '请填写动作名称' });
  const row = db.exercises.insert({
    name: name.trim(),
    category: category || 'other',
    muscles: muscles || '',
    weight: Number(weight) || 0,
    reps: Number(reps) || 0,
    sets: Math.max(1, Number(sets) || 1),
    multiplier: Math.max(0, Number(multiplier) || 1),
    created_by: req.session.user.id,
  });
  res.json(row);
});

// 编辑动作
router.put('/:id', auth(['coach', 'admin']), (req, res) => {
  const { name, category, muscles, weight, reps, sets, multiplier } = req.body;
  const fields = {};
  if (name != null) fields.name = name.trim();
  if (category != null) fields.category = category;
  if (muscles != null) fields.muscles = muscles;
  if (weight != null) fields.weight = Number(weight) || 0;
  if (reps != null) fields.reps = Number(reps) || 0;
  if (sets != null) fields.sets = Math.max(1, Number(sets) || 1);
  if (multiplier != null) fields.multiplier = Math.max(0, Number(multiplier) || 1);
  const ok = db.exercises.update(Number(req.params.id), fields);
  if (!ok) return res.status(404).json({ error: '动作不存在' });
  res.json(ok);
});

// 删除动作
router.delete('/:id', auth(['coach', 'admin']), (req, res) => {
  db.exercises.delete(Number(req.params.id));
  res.json({ ok: true });
});

// 获取某学员的所有动作默认值（按名称记忆）
router.get('/defaults/:studentId', auth(['coach', 'admin']), (req, res) => {
  res.json(db.studentDefaults.forStudent(Number(req.params.studentId)));
});

module.exports = router;
