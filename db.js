const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const SEED_PATH = path.join(__dirname, 'data.json');
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'fitness-studio-data.json')
  : SEED_PATH;

if (process.env.VERCEL && !fs.existsSync(DB_PATH) && fs.existsSync(SEED_PATH)) {
  fs.copyFileSync(SEED_PATH, DB_PATH);
}

function load() {
  if (!fs.existsSync(DB_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return null; }
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

// Initialize store
let store = load() || { users: [], bookings: [], logs: [], exercises: [], student_defaults: [], _seq: { users: 0, bookings: 0, logs: 0, exercises: 0, student_defaults: 0 } };
// 兼容旧数据：补齐新增字段
if (!store.exercises) store.exercises = [];
if (!store.student_defaults) store.student_defaults = [];
if (!store._seq) store._seq = {};
['users', 'bookings', 'logs', 'exercises', 'student_defaults'].forEach(k => {
  if (store._seq[k] == null) store._seq[k] = (store[k] || []).reduce((m, r) => Math.max(m, r.id || 0), 0);
});

// Seed default accounts
if (store.users.length === 0) {
  const seed = [
    { name: '老板', phone: '10000000000', password: bcrypt.hashSync('admin123', 10), role: 'admin' },
    { name: '张教练', phone: '13800000001', password: bcrypt.hashSync('coach123', 10), role: 'coach' },
    { name: '李教练', phone: '13800000002', password: bcrypt.hashSync('coach456', 10), role: 'coach' },
    { name: '小明', phone: '13900000001', password: bcrypt.hashSync('stu123', 10), role: 'student' },
    { name: '小红', phone: '13900000002', password: bcrypt.hashSync('stu456', 10), role: 'student' },
  ];
  seed.forEach(u => {
    store._seq.users++;
    store.users.push({ id: store._seq.users, created_at: now(), ...u });
  });
  save(store);
  console.log('✅ 默认账号已创建');
}

// Seed 动作池示例
if (store.exercises.length === 0) {
  const poolSeed = [
    { name: '悍马机臀冲', category: 'lower_body', muscles: '臀大肌', weight: 40, reps: 10, sets: 4, multiplier: 1 },
    { name: '坐姿髋外展', category: 'lower_body', muscles: '臀中肌、臀小肌', weight: 60, reps: 16, sets: 4, multiplier: 1 },
    { name: '罗马尼亚硬拉', category: 'lower_body', muscles: '腘绳肌、臀大肌、竖脊肌', weight: 10, reps: 12, sets: 4, multiplier: 2 },
    { name: '深蹲', category: 'lower_body', muscles: '股四头肌、臀大肌', weight: 15, reps: 10, sets: 4, multiplier: 1 },
    { name: '高位下拉', category: 'back', muscles: '背阔肌', weight: 30, reps: 12, sets: 4, multiplier: 1 },
    { name: '坐姿划船', category: 'back', muscles: '背阔肌、菱形肌', weight: 30, reps: 12, sets: 4, multiplier: 1 },
    { name: '哑铃推肩', category: 'shoulder', muscles: '三角肌前束、肱三头肌', weight: 5, reps: 12, sets: 4, multiplier: 2 },
    { name: '侧平举', category: 'shoulder', muscles: '三角肌中束', weight: 2.5, reps: 14, sets: 4, multiplier: 2 },
    { name: '坐姿推胸', category: 'chest_arms', muscles: '胸大肌、肱三头肌', weight: 20, reps: 12, sets: 4, multiplier: 1 },
    { name: '卷腹', category: 'core', muscles: '腹直肌', weight: 0, reps: 15, sets: 3, multiplier: 1 },
    { name: '平躺抬腿', category: 'core', muscles: '下腹部、髂腰肌', weight: 0, reps: 12, sets: 4, multiplier: 1 },
  ];
  const firstCoach = store.users.find(u => u.role === 'coach');
  poolSeed.forEach(e => {
    store._seq.exercises++;
    store.exercises.push({ id: store._seq.exercises, created_by: firstCoach ? firstCoach.id : null, created_at: now(), ...e });
  });
  save(store);
  console.log('✅ 动作池示例已创建');
}

// ── Generic table helpers ──
const db = {
  // users
  users: {
    all(filter = {}) {
      return store.users.filter(r => Object.entries(filter).every(([k, v]) => r[k] === v));
    },
    find(id) { return store.users.find(r => r.id === id) || null; },
    findByPhone(phone) { return store.users.find(r => r.phone === phone) || null; },
    insert(fields) {
      if (store.users.some(u => u.phone === fields.phone)) throw new Error('手机号已存在');
      store._seq.users++;
      const row = { id: store._seq.users, created_at: now(), ...fields };
      store.users.push(row);
      save(store);
      return row;
    },
    update(id, fields) {
      const idx = store.users.findIndex(r => r.id === id);
      if (idx === -1) return false;
      store.users[idx] = { ...store.users[idx], ...fields };
      save(store);
      return store.users[idx];
    },
    delete(id) {
      store.users = store.users.filter(r => r.id !== id);
      save(store);
    },
  },

  // bookings
  bookings: {
    all(filter = {}) {
      return store.bookings
        .filter(r => Object.entries(filter).every(([k, v]) => r[k] === v))
        .map(b => this._join(b));
    },
    find(id) {
      const b = store.bookings.find(r => r.id === id);
      return b ? this._join(b) : null;
    },
    _join(b) {
      const s = store.users.find(u => u.id === b.student_id) || {};
      const c = store.users.find(u => u.id === b.coach_id) || {};
      return { ...b, student_name: s.name, student_phone: s.phone, coach_name: c.name };
    },
    insert(fields) {
      store._seq.bookings++;
      const row = { id: store._seq.bookings, status: 'pending', created_at: now(), note: '', ...fields };
      store.bookings.push(row);
      save(store);
      return row;
    },
    update(id, fields) {
      const idx = store.bookings.findIndex(r => r.id === id);
      if (idx === -1) return false;
      store.bookings[idx] = { ...store.bookings[idx], ...fields };
      save(store);
      return store.bookings[idx];
    },
  },

  // logs
  logs: {
    all(filter = {}) {
      return store.logs
        .filter(r => Object.entries(filter).every(([k, v]) => r[k] === v))
        .map(l => this._join(l));
    },
    find(id) {
      const l = store.logs.find(r => r.id === id);
      return l ? this._join(l) : null;
    },
    _join(l) {
      const s = store.users.find(u => u.id === l.student_id) || {};
      const c = store.users.find(u => u.id === l.coach_id) || {};
      return { ...l, student_name: s.name, coach_name: c.name };
    },
    insert(fields) {
      store._seq.logs++;
      const row = { id: store._seq.logs, created_at: now(), exercises: [], summary: '', ...fields };
      store.logs.push(row);
      save(store);
      return row;
    },
    update(id, fields) {
      const idx = store.logs.findIndex(r => r.id === id);
      if (idx === -1) return false;
      store.logs[idx] = { ...store.logs[idx], ...fields };
      save(store);
      return store.logs[idx];
    },
    delete(id) {
      store.logs = store.logs.filter(r => r.id !== id);
      save(store);
    },
  },

  // exercises（动作池，全教练共享）
  exercises: {
    all() {
      const coachName = id => (store.users.find(u => u.id === id) || {}).name;
      return store.exercises
        .map(e => ({ ...e, created_by_name: coachName(e.created_by) }))
        .sort((a, b) => a.category.localeCompare(b.category) || a.id - b.id);
    },
    find(id) { return store.exercises.find(r => r.id === id) || null; },
    insert(fields) {
      store._seq.exercises++;
      const row = { id: store._seq.exercises, created_at: now(), multiplier: 1, ...fields };
      store.exercises.push(row);
      save(store);
      return row;
    },
    update(id, fields) {
      const idx = store.exercises.findIndex(r => r.id === id);
      if (idx === -1) return false;
      store.exercises[idx] = { ...store.exercises[idx], ...fields };
      save(store);
      return store.exercises[idx];
    },
    delete(id) {
      store.exercises = store.exercises.filter(r => r.id !== id);
      save(store);
    },
  },

  // student_defaults（按学员保存的动作默认值，按动作名称记忆）
  studentDefaults: {
    forStudent(studentId) {
      return store.student_defaults.filter(r => r.student_id === studentId);
    },
    // 回写：每次保存训练记录时，把这次用过的动作更新为该学员的最新默认值
    upsert(studentId, name, fields) {
      const idx = store.student_defaults.findIndex(r => r.student_id === studentId && r.name === name);
      if (idx === -1) {
        store._seq.student_defaults++;
        store.student_defaults.push({ id: store._seq.student_defaults, student_id: studentId, name, updated_at: now(), ...fields });
      } else {
        store.student_defaults[idx] = { ...store.student_defaults[idx], ...fields, updated_at: now() };
      }
      // 注意：调用方负责在批量结束后 save
    },
    save() { save(store); },
  },
};

module.exports = db;
