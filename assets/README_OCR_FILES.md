# OCR 前端文件说明

如果要启用“上传训练截图生成日志”的本地离线 OCR，请将 Tesseract.js 相关前端文件放在本目录。

需要的文件：

```text
assets/tesseract.min.js
assets/worker.min.js
assets/tesseract-core.wasm.js
```

`index.html` 中使用的相对路径为：

```text
assets/tesseract.min.js
assets/worker.min.js
assets/tesseract-core.wasm.js
```

如果这些文件不存在，网页不会整体报错，训练记录、历史记录、周总结、月总结、JSON 备份恢复等功能仍然可以正常使用。

OCR 不可用时，可以把图片中的文字手动粘贴到 OCR 文本框，再点击“用识别文字填入日志”。

中文和英文识别数据包不要放在本目录，请放到 `tessdata/` 目录。
