from pathlib import Path

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor as SlideColor
from pptx.util import Inches as SlideInches, Pt as SlidePt
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor


ROOT = Path(__file__).parent
ROOT.mkdir(parents=True, exist_ok=True)

pdf = canvas.Canvas(str(ROOT / "e2e-two-pages.pdf"), pagesize=(960, 540), invariant=1)
for number, color in [(1, "#086f83"), (2, "#ab4d13")]:
    pdf.setFillColor(HexColor(color))
    pdf.rect(0, 0, 960, 540, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#ffffff"))
    pdf.setFont("Helvetica-Bold", 44)
    pdf.drawString(55, 405, f"FellowShow PDF page {number}")
    pdf.setFont("Helvetica", 27)
    pdf.drawString(55, 320, "The text and page order must remain unchanged.")
    pdf.drawString(55, 258, "Top left marker")
    pdf.rect(785, 55, 100, 100, stroke=0, fill=1)
    pdf.showPage()
pdf.save()

doc = Document()
doc.core_properties.author = "FellowShow test fixture"
for style_name in ["Title", "Heading 1"]:
    doc.styles[style_name].font.color.rgb = RGBColor(0, 0, 0)
for number in [1, 2]:
    if number > 1:
        doc.add_page_break()
    doc.add_paragraph(f"FellowShow Word page {number}", style="Title")
    paragraph = doc.add_paragraph("The imported page must preserve this text.")
    paragraph.runs[0].font.size = Pt(20)
    doc.add_paragraph("First authored line\nsecond authored line\nThird authored line")
    doc.add_paragraph(f"Page order marker {number}")
for element in [doc.element, doc.styles.element]:
    for border in element.xpath(".//w:pBdr"):
        border.getparent().remove(border)
doc.save(ROOT / "e2e-two-pages.docx")

slides = Presentation()
slides.slide_width = SlideInches(12.8)
slides.slide_height = SlideInches(7.2)
for number, color in [(1, "086F83"), (2, "AB4D13")]:
    slide = slides.slides.add_slide(slides.slide_layouts[6])
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = SlideColor.from_string(color)
    textbox = slide.shapes.add_textbox(SlideInches(.7), SlideInches(1), SlideInches(11.5), SlideInches(5))
    frame = textbox.text_frame
    for index, text in enumerate([
        f"FellowShow PowerPoint slide {number}",
        "The text and slide order must remain unchanged.",
        f"Slide order marker {number}",
    ]):
        paragraph = frame.paragraphs[0] if index == 0 else frame.add_paragraph()
        paragraph.text = text
        paragraph.font.size = SlidePt(36 if index == 0 else 24)
        paragraph.font.color.rgb = SlideColor(255, 255, 255)
slides.save(ROOT / "e2e-two-slides.pptx")

image = Image.new("RGB", (960, 540), "white")
draw = ImageDraw.Draw(image)
for bounds, color in [((0, 0, 479, 269), "#086f83"), ((480, 0, 959, 269), "#ab4d13"), ((0, 270, 479, 539), "#3c467d"), ((480, 270, 959, 539), "#486a2d")]:
    draw.rectangle(bounds, fill=color)
font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 38)
for xy, label in [((35, 80), "TOP LEFT"), ((515, 80), "TOP RIGHT"), ((35, 350), "BOTTOM LEFT"), ((515, 350), "BOTTOM RIGHT")]:
    draw.text(xy, label, font=font, fill="white")
image.save(ROOT / "e2e-quadrants.png")

for suffix in ["pdf", "docx", "pptx", "png", "mp4"]:
    (ROOT / f"e2e-corrupted.{suffix}").write_bytes(b"FellowShow invalid fixture\x00\xff")
print("Created two-page PDF, two-page Word, two-slide PowerPoint, image, and five corrupted fixtures")
