// Export every listed SVG to native Illustrator formats:
//   OUT/ai/<name>.ai   (PDF-compatible)   OUT/pdf/<name>.pdf   OUT/png/<name>.png + <name>@2x.png
// PNG_WIDTH_* is the width in px of the 1x PNG; 0 keeps the artboard size.
// Placeholders __LIST__ and __OUT__ are filled in by run.sh.
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
while (app.documents.length) app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);

var LIST = "__LIST__", OUT = "__OUT__";
var PNG_WIDTH_LOGO = 1200, PNG_WIDTH_ICON = 512;

function readLines(path) {
  var f = new File(path); f.open("r"); var text = f.read(); f.close();
  var lines = text.split("\n"), out = [];   // ExtendScript is ES3: no Array.filter
  for (var i = 0; i < lines.length; i++) if (lines[i].replace(/\s+/g, "") !== "") out.push(lines[i]);
  return out;
}

function exportPng(doc, base, artboardWidth) {
  var target = base.indexOf("icon") >= 0 ? PNG_WIDTH_ICON : PNG_WIDTH_LOGO;
  for (var scale = 1; scale <= 2; scale++) {
    var o = new ExportOptionsPNG24();
    o.transparency = true; o.antiAliasing = true; o.artBoardClipping = true;
    var pct = target ? (target * scale / artboardWidth * 100) : 100 * scale;
    o.horizontalScale = pct; o.verticalScale = pct;
    doc.exportFile(new File(OUT + "/png/" + base + (scale == 2 ? "@2x" : "") + ".png"), ExportType.PNG24, o);
  }
}

var report = [], files = readLines(LIST);
for (var i = 0; i < files.length; i++) {
  var svg = new File(files[i]), base = svg.name.replace(/\.svg$/i, "");
  var doc = app.open(svg), rect = doc.artboards[0].artboardRect;

  var ai = new IllustratorSaveOptions(); ai.pdfCompatible = true; ai.compressed = true;
  doc.saveAs(new File(OUT + "/ai/" + base + ".ai"), ai);

  var pdf = new PDFSaveOptions();
  pdf.compatibility = PDFCompatibility.ACROBAT7; pdf.preserveEditability = false;
  pdf.generateThumbnails = false; pdf.viewAfterSaving = false;
  doc.saveAs(new File(OUT + "/pdf/" + base + ".pdf"), pdf);

  exportPng(doc, base, rect[2] - rect[0]);
  doc.close(SaveOptions.DONOTSAVECHANGES);
  report.push("exported " + base);
}
report.join("\n");
