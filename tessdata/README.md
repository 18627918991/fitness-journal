# OCR 语言数据包说明

如果要启用离线 OCR，需要将 Tesseract 语言数据包放在本目录。

需要的文件：

```text
tessdata/chi_sim.traineddata.gz
tessdata/eng.traineddata.gz
```

含义：

- `chi_sim.traineddata.gz`：简体中文识别数据包
- `eng.traineddata.gz`：英文和数字识别数据包

`index.html` 中配置的语言为：

```text
chi_sim+eng
```

因此两个文件都建议放入本目录。缺少这些文件时，OCR 识别可能失败，但网页其他功能不受影响。
