from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

import pdfplumber
import pypdfium2 as pdfium
from PIL import Image, ImageDraw
from pypdf import PdfReader


def extract_pdf(input_path: Path, output_path: Path) -> None:
    reader = PdfReader(str(input_path))
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        pages.append({"pageNumber": index, "text": page.extract_text() or ""})

    payload = {
        "fileName": input_path.name,
        "pageCount": len(reader.pages),
        "pages": pages,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def render_pdf(input_path: Path, render_root: Path) -> dict:
    document = pdfium.PdfDocument(str(input_path))
    pdf_render_dir = render_root / input_path.stem
    pdf_render_dir.mkdir(parents=True, exist_ok=True)
    rendered_paths = []
    blank_pages = []

    for index in range(len(document)):
        page = document[index]
        bitmap = page.render(scale=1.35)
        image = bitmap.to_pil().convert("RGB")
        render_path = pdf_render_dir / f"page-{index + 1:03d}.png"
        image.save(render_path)
        rendered_paths.append(render_path)
        grayscale = image.convert("L")
        histogram = grayscale.histogram()
        dark_pixels = sum(histogram[:245])
        if dark_pixels / max(1, image.width * image.height) < 0.001:
            blank_pages.append(index + 1)

    sheets = []
    batch_size = 4
    thumb_width = 560
    for batch_start in range(0, len(rendered_paths), batch_size):
        batch = rendered_paths[batch_start : batch_start + batch_size]
        thumbs = []
        for page_path in batch:
            image = Image.open(page_path).convert("RGB")
            ratio = thumb_width / image.width
            thumbs.append(image.resize((thumb_width, round(image.height * ratio))))
        rows = math.ceil(len(thumbs) / 2)
        cell_height = max(image.height for image in thumbs) + 42
        sheet = Image.new("RGB", (thumb_width * 2 + 36, rows * cell_height + 18), "#d9dee7")
        draw = ImageDraw.Draw(sheet)
        for offset, thumb in enumerate(thumbs):
            column = offset % 2
            row = offset // 2
            x = 12 + column * (thumb_width + 12)
            y = 30 + row * cell_height
            sheet.paste(thumb, (x, y))
            draw.text((x, 8 + row * cell_height), f"Page {batch_start + offset + 1}", fill="#111827")
        sheet_path = pdf_render_dir / f"contact-{batch_start + 1:03d}-{batch_start + len(batch):03d}.png"
        sheet.save(sheet_path)
        sheets.append(str(sheet_path))

    return {"renderedPages": len(rendered_paths), "blankPages": blank_pages, "contactSheets": sheets}


def inspect_pdf(input_path: Path, render_root: Path) -> dict:
    reader = PdfReader(str(input_path))
    extracted_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    out_of_bounds = []
    with pdfplumber.open(str(input_path)) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            for word in page.extract_words():
                if word["x0"] < -0.5 or word["top"] < -0.5 or word["x1"] > page.width + 0.5 or word["bottom"] > page.height + 0.5:
                    out_of_bounds.append({"page": page_number, "text": word["text"][:80]})

    render_result = render_pdf(input_path, render_root)
    return {
        "file": str(input_path),
        "pages": len(reader.pages),
        "bytes": input_path.stat().st_size,
        "containsConfidenceLabel": bool(
            re.search(r"\b\d{1,3}%\s+confidence\b|\bconfidence\s+(score|rating)\b", extracted_text, re.IGNORECASE)
        ),
        "containsPageNumber": "page " in extracted_text.lower(),
        "outOfBoundsWords": out_of_bounds,
        **render_result,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    extract_parser = subparsers.add_parser("extract")
    extract_parser.add_argument("input", type=Path)
    extract_parser.add_argument("output", type=Path)
    inspect_parser = subparsers.add_parser("inspect")
    inspect_parser.add_argument("output", type=Path)
    inspect_parser.add_argument("render_root", type=Path)
    inspect_parser.add_argument("pdfs", nargs="+", type=Path)
    args = parser.parse_args()

    if args.command == "extract":
        extract_pdf(args.input, args.output)
        return

    results = [inspect_pdf(pdf, args.render_root) for pdf in args.pdfs]
    payload = {"results": results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
