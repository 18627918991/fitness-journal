const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = Boolean(process.env.VERCEL);

// 取本机局域网 IPv4 地址（供同 WiFi 下的手机/平板访问）
function lanIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

app.use(express.json());
app.use(themedPage);
app.use(express.static(path.join(__dirname, 'public')));
app.get('/theme.css', (req, res, next) => {
  const candidates = [
    path.join(__dirname, 'public', 'theme.css'),
    path.join(__dirname, 'theme.css')
  ];
  const file = candidates.find(fs.existsSync);
  if (!file) return next();
  res.type('css').sendFile(file);
});

function themedPage(req, res, next) {
  const pageClasses = {
    '/': 'login-page',
    '/login.html': 'login-page',
    '/admin.html': 'app-page admin-page',
    '/coach.html': 'app-page coach-page',
    '/student.html': 'app-page student-page'
  };
  const pagePath = req.path === '/' ? '/login.html' : req.path;
  const bodyClass = pageClasses[req.path] || pageClasses[pagePath];
  if (!bodyClass) return next();

  const candidates = [
    path.join(__dirname, pagePath.slice(1)),
    path.join(__dirname, 'public', pagePath.slice(1))
  ];
  const file = candidates.find(fs.existsSync);
  if (!file) return next();

  fs.readFile(file, 'utf8', (error, html) => {
    if (error) return next();
    let output = html;
    if (!output.includes('/theme.css')) {
      output = output.replace('</style>', '</style>\n  <link rel="stylesheet" href="/theme.css"/>');
    }
    output = output.replace('<body>', `<body class="${bodyClass}">`);
    res.type('html').send(output);
  });
}

function loadRoute(name) {
  try {
    return require(`./routes/${name}`);
  } catch (error) {
    const missingNestedRoute = error.code === 'MODULE_NOT_FOUND' && error.message.includes(`./routes/${name}`);
    if (!missingNestedRoute) throw error;
    return require(`./${name}`);
  }
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return cookies;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function encodeUser(user) {
  return Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
}

function decodeUser(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function statelessSession(req, res, next) {
  const cookies = parseCookies(req.headers.cookie || '');
  let destroyed = false;
  req.session = {
    user: cookies.fitness_user ? decodeUser(cookies.fitness_user) : null,
    destroy() {
      destroyed = true;
      req.session.user = null;
    }
  };

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (destroyed) {
      res.setHeader('Set-Cookie', 'fitness_user=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure');
    } else if (req.session.user) {
      res.setHeader('Set-Cookie', `fitness_user=${encodeURIComponent(encodeUser(req.session.user))}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax; Secure`);
    }
    return originalJson(body);
  };
  next();
}

if (isVercel) {
  app.use(statelessSession);
} else {
  app.use(session({
    secret: 'fitness-studio-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  }));
}

app.use('/api/auth', loadRoute('auth'));
app.use('/api/users', loadRoute('users'));
app.use('/api/bookings', loadRoute('bookings'));
app.use('/api/logs', loadRoute('logs'));
app.use('/api/exercises', loadRoute('exercises'));

// 所有未匹配路由返回登录页
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    const ip = lanIP();
    console.log('✅ 健身私教管理系统已启动');
    console.log(`   本机访问：   http://localhost:${PORT}`);
    if (ip) console.log(`   局域网访问： http://${ip}:${PORT}  （手机/平板连同一 WiFi 后输入此地址）`);
    console.log('   默认账号：admin/admin123 | coach1/coach123 | student1/stu123');
  });
}

module.exports = app;
