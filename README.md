# 个人健身训练日志系统

这是一个可以直接部署到 GitHub Pages 的纯静态网页项目。主页面为 `index.html`，不依赖后端、不依赖数据库，训练历史保存在浏览器 `localStorage` 中。

## 文件结构

```text
/
├── index.html
├── README.md
├── assets/
│   └── README_OCR_FILES.md
└── tessdata/
    └── README.md
```

## 如何新建 GitHub 仓库

1. 登录 GitHub。
2. 点击右上角 `+`，选择 `New repository`。
3. 仓库名可以填写 `fitness-log` 或你喜欢的名称。
4. 选择 `Public`。
5. 点击 `Create repository`。

## 如何上传这些文件

1. 打开新建好的仓库页面。
2. 点击 `Add file`。
3. 选择 `Upload files`。
4. 上传本项目中的 `index.html`、`README.md`、`assets/`、`tessdata/`。
5. 点击 `Commit changes`。

如果你使用 Git 命令，也可以在项目目录执行：

```bash
git init
git add .
git commit -m "Add fitness log static site"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

## 如何启用 GitHub Pages

1. 进入仓库页面。
2. 点击 `Settings`。
3. 左侧点击 `Pages`。
4. 在 `Build and deployment` 中选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
5. 点击 `Save`。
6. 等待 1 到 3 分钟，GitHub 会生成 HTTPS 网页链接。

访问链接格式为：

```text
https://你的用户名.github.io/仓库名/
```

例如：

```text
https://yourname.github.io/fitness-log/
```

## 如何复制链接到微信打开

1. 打开 GitHub Pages 生成的 HTTPS 链接。
2. 复制浏览器地址栏中的链接。
3. 发送到微信聊天或文件传输助手。
4. 在微信中点击链接即可打开使用。

## 如何备份 JSON

网页顶部有 `导出全部 JSON` 按钮。点击后会下载全部历史记录备份文件。

建议定期备份，尤其是在：

- 更换手机或电脑前
- 清理浏览器缓存前
- 更换浏览器前
- 重新部署网页前

## 如何恢复 JSON

点击网页顶部的 `导入恢复 JSON`，选择之前导出的 JSON 文件即可恢复历史记录。

导入会覆盖当前浏览器中的历史记录，请谨慎操作。

## OCR 离线识别需要额外下载哪些文件

如果只使用手动记录、历史记录、周/月总结、JSON 备份恢复，不需要 OCR 文件。

如果需要离线 OCR，请把以下文件放入对应目录：

```text
assets/tesseract.min.js
assets/worker.min.js
assets/tesseract-core.wasm.js
tessdata/chi_sim.traineddata.gz
tessdata/eng.traineddata.gz
```

OCR 文件缺失时，网页其他功能仍然可用。页面会提示：

```text
OCR 文件未加载，可以手动粘贴识别文字后解析。
```

详细说明见：

- `assets/README_OCR_FILES.md`
- `tessdata/README.md`

## 数据保存位置

历史记录保存在浏览器 localStorage 中，key 为：

```text
hxx_fitness_history_v2
```

这意味着同一个 GitHub Pages 链接，在不同浏览器或不同手机中数据不会自动同步。需要通过 JSON 导出和导入来迁移。
