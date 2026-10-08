// Build the spot-colour variants from the *_color.svg sources:
//   OUT/ai + OUT/pdf   real spot swatches "PANTONE Pink C" and "PANTONE Black 6 C" (CMYK document)
//   OUT/svg + OUT/png  flat RGB (#DD248D, #171717) for screens
// The CMYK alternates are the brandbook values: Pink C = 0/84/36/13, Black 6 C = 5/0/0/93.
// Placeholders __LIST__ and __OUT__ are filled in by run.sh.
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
while (app.documents.length) app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);

var LIST = "__LIST__", OUT = "__OUT__", PNG_WIDTH_LOGO = 1200, PNG_WIDTH_ICON = 512;

function readLines(path) {
  var f = new File(path); f.open("r"); var text = f.read(); f.close();
  var lines = text.split("\n"), out = [];   // ExtendScript is ES3: no Array.filter
  for (var i = 0; i < lines.length; i++) if (lines[i].replace(/\s+/g, "") !== "") out.push(lines[i]);
  return out;
}
function cmyk(c, m, y, k) { var x = new CMYKColor(); x.cyan = c; x.magenta = m; x.yellow = y; x.black = k; return x; }
function spotName(base) { return base.replace(/_color$/, "_spot"); }

function eachPath(items, fn) {
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.typename == "PathItem") { if (it.filled && !it.clipping) fn(it); }
    else if (it.typename == "CompoundPathItem") eachPath(it.pathItems, fn);
    else if (it.typename == "GroupItem") eachPath(it.pageItems, fn);
  }
}
function isDark(c) {
  if (c.typename == "RGBColor") return c.red < 80 && c.green < 80 && c.blue < 80;
  if (c.typename == "CMYKColor") return c.cyan + c.magenta + c.yellow < 60 && c.black > 60;
  return false;
}
function countNonSpot(doc) {
  var bad = 0;
  eachPath(doc.pageItems, function (p) { if (p.fillColor.typename != "SpotColor") bad++; });
  return bad;
}

var report = [], files = readLines(LIST);
for (var i = 0; i < files.length; i++) {
  var svg = new File(files[i]), base = spotName(svg.name.replace(/\.svg$/i, ""));

  // 1) CMYK document with spot swatches -> AI + PDF
  var src = app.open(svg), ab = src.artboards[0].artboardRect, width = ab[2] - ab[0];
  var doc = app.documents.add(DocumentColorSpace.CMYK, width, ab[1] - ab[3]);
  doc.artboards[0].artboardRect = ab;
  var pink = doc.spots.add(); pink.name = "PANTONE Pink C"; pink.colorType = ColorModel.SPOT; pink.color = cmyk(0, 84, 36, 13);
  var black = doc.spots.add(); black.name = "PANTONE Black 6 C"; black.colorType = ColorModel.SPOT; black.color = cmyk(5, 0, 0, 93);
  var sp = new SpotColor(); sp.spot = pink; sp.tint = 100;
  var sb = new SpotColor(); sb.spot = black; sb.tint = 100;
  for (var n = src.pageItems.length - 1; n >= 0; n--) {
    if (src.pageItems[n].parent.typename == "Layer") src.pageItems[n].duplicate(doc.layers[0], ElementPlacement.PLACEATBEGINNING);
  }
  src.close(SaveOptions.DONOTSAVECHANGES);
  app.activeDocument = doc;
  // Changing one path of a compound path recolours its siblings too, so skip what is already a spot colour.
  eachPath(doc.pageItems, function (p) {
    if (p.fillColor.typename == "SpotColor") return;
    p.fillColor = (p.fillColor.typename != "GradientColor" && isDark(p.fillColor)) ? sb : sp;
  });
  var nonSpot = countNonSpot(doc);
  if (nonSpot) throw new Error(base + ": " + nonSpot + " objects are not spot colours");

  var ai = new IllustratorSaveOptions(); ai.pdfCompatible = true; ai.compressed = true;
  doc.saveAs(new File(OUT + "/ai/" + base + ".ai"), ai);
  var pdf = new PDFSaveOptions(); pdf.compatibility = PDFCompatibility.ACROBAT7; pdf.preserveEditability = false;
  pdf.generateThumbnails = false; pdf.viewAfterSaving = false;
  doc.saveAs(new File(OUT + "/pdf/" + base + ".pdf"), pdf);
  doc.close(SaveOptions.DONOTSAVECHANGES);

  // 2) RGB document, gradient -> flat Pink C -> SVG + PNG
  var rgb = app.open(svg), flat = new RGBColor(); flat.red = 221; flat.green = 36; flat.blue = 141;
  eachPath(rgb.pageItems, function (p) { if (p.fillColor.typename == "GradientColor") p.fillColor = flat; });
  var o = new ExportOptionsSVG();
  o.embedRasterImages = false; o.fontType = SVGFontType.OUTLINEFONT; o.documentEncoding = SVGDocumentEncoding.UTF8;
  o.coordinatePrecision = 3; o.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES;
  rgb.exportFile(new File(OUT + "/svg/" + base + ".svg"), ExportType.SVG, o);
  var target = base.indexOf("icon") >= 0 ? PNG_WIDTH_ICON : PNG_WIDTH_LOGO;
  for (var scale = 1; scale <= 2; scale++) {
    var png = new ExportOptionsPNG24(); png.transparency = true; png.antiAliasing = true; png.artBoardClipping = true;
    png.horizontalScale = png.verticalScale = target * scale / width * 100;
    rgb.exportFile(new File(OUT + "/png/" + base + (scale == 2 ? "@2x" : "") + ".png"), ExportType.PNG24, png);
  }
  rgb.close(SaveOptions.DONOTSAVECHANGES);
  report.push("exported " + base);
}
report.join("\n");
