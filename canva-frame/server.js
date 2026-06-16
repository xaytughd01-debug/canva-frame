const express = require("express");
const multer = require("multer");
const potrace = require("potrace");
const PDFDocument = require("pdfkit");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const os = require("os"); // SUNUCU İÇİN EKLENDİ

const app = express();
// SUNUCU İÇİN EKLENDİ: Bulutun verdiği portu veya lokalde 3000'i kullan
const port = process.env.PORT || 3000;

const placeholderImage = path.join(__dirname, "placeholder.jpg");

if (!fs.existsSync(placeholderImage)) {
  console.error("HATA: placeholder.jpg bulunamadı! Lütfen projeye ekleyin.");
  process.exit(1);
}

// SUNUCU İÇİN EKLENDİ: Artık 'uploads/' klasörü yerine işletim sisteminin Temp klasörü kullanılıyor
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

app.use(express.static(path.join(__dirname, 'public')));

app.post("/uret", upload.single("resim"), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ hata: "Lütfen bir PNG yükleyin." });

  const inputPng = req.file.path;
  const silhouettePath = path.join(os.tmpdir(), `${req.file.filename}_sil.png`);

  try {
    const trimmedBuffer = await sharp(inputPng).trim().toBuffer();
    const { data, info } = await sharp(trimmedBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const PADDING = 20;
    const paddedW = info.width + PADDING * 2;
    const paddedH = info.height + PADDING * 2;

    const bwData = Buffer.alloc(paddedW * paddedH, 255);

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const alpha = data[(y * info.width + x) * 4 + 3];
        if (alpha > 128) {
          bwData[(y + PADDING) * paddedW + (x + PADDING)] = 0;
        }
      }
    }

    await sharp(bwData, {
      raw: { width: paddedW, height: paddedH, channels: 1 },
    })
      .png()
      .toFile(silhouettePath);

    potrace.trace(
      silhouettePath,
      {
        turdSize: 5,
        alphaMax: 1,
        optCurve: true,
        optTolerance: 0.5,
      },
      (err, svgContent) => {
        fs.unlink(inputPng, () => {});
        fs.unlink(silhouettePath, () => {});

        if (err)
          return res.status(500).json({ hata: "Vektöre çevirme hatası." });

        const pathMatch = svgContent.match(/d="([^"]+)"/);
        if (!pathMatch)
          return res.status(500).json({ hata: "Şekil algılanamadı." });

        const finalPath = pathMatch[1];

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=canva_cerceve.pdf",
        );

        const doc = new PDFDocument({
          size: [info.width, info.height],
          margin: 0,
        });
        doc.pipe(res);
        doc.save();

        doc.translate(-PADDING, -PADDING);
        doc.path(finalPath).clip();
        doc.image(placeholderImage, PADDING, PADDING, {
          width: info.width,
          height: info.height,
        });

        doc.restore();
        doc.end();
      },
    );
  } catch (err) {
    fs.unlink(inputPng, () => {});
    fs.unlink(silhouettePath, () => {});
    res.status(500).json({ hata: "Beklenmeyen hata: " + err.message });
  }
});

app.use((err, req, res, next) => {
  if (req.file) fs.unlink(req.file.path, () => {});
  res.status(400).json({ hata: err.message });
});

app.listen(port, () => {
  console.log(`🚀 Final Sistem Aktif! Port: ${port}`);
});
