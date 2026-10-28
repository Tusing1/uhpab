import type PptxGenJS from 'pptxgenjs';
import type { DefenceDeck, DefenceFactKey, DefenceSlide } from './defenceSlides';
import { auditDefenceEvidence, defenceEvidenceReport } from './defenceEvidence';
import { DEFENCE_RULES_VERSION, reviewDefenceRules } from './defenceSectionRules';
import logo from '@/data/defenceLogo.json';

export const DEFENCE_LOGO_DATA = logo.dataUrl;

const PX_PER_INCH = 96;
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/** Geometry is in inches; font sizes and line spacing are in points. */
export const DEFENCE_SLIDE_LAYOUT = Object.freeze({
  slideCount: 10,
  width: 1280 / PX_PER_INCH,
  height: 720 / PX_PER_INCH,
  previewWidth: 1280,
  previewHeight: 720,
  pixelsPerInch: PX_PER_INCH,
  marginX: 68 / PX_PER_INCH,
  titleY: 46 / PX_PER_INCH,
  titleFontSize: 30,
  coverTitleFontSize: 32,
  titleMaxLines: 2,
  coverTitleMaxLines: 4,
  titleLineSpacing: 37.5,
  coverTitleLineSpacing: 40,
  bodyFontSize: 24,
  minimumBodyFontSize: 18,
  bodyLineSpacing: 30,
  textHeightPadding: 0.08,
  textWidthSafety: 0.12,
  dividerGap: 12 / PX_PER_INCH,
  bodyGap: 28 / PX_PER_INCH,
  itemGap: 0.1,
  bulletIndent: 18,
  bodyBottom: 626 / PX_PER_INCH,
  footerY: 650 / PX_PER_INCH,
  footerHeight: 24 / PX_PER_INCH,
  footerFontSize: 11,
  fontFace: 'Arial',
  textColor: '000000',
  backgroundColor: 'FFFFFF',
  accentColor: '087F83',
  logoSize: 0.65,
  logoGap: 0.22,
});

const FACT_LABELS: Record<DefenceFactKey, string> = {
  topic: 'Exact study topic',
  candidate: 'Candidate',
  htin: 'HTIN',
  school: 'School',
  course: 'Course',
  supervisor: 'Supervisor',
  background: 'Background',
  problem: 'Research problem',
  aim: 'Study aim',
  objectives: 'Specific objectives',
  questions: 'Research questions',
  scope: 'Scope',
  literature: 'Literature',
  justification: 'Justification',
  design: 'Study design',
  setting: 'Study setting',
  population: 'Study population',
  eligibility: 'Eligibility criteria',
  sample: 'Sample size',
  sampling: 'Sampling procedure',
  instruments: 'Instruments',
  variables: 'Variables',
  collection: 'Data collection',
  quality: 'Quality control',
  analysis: 'Data analysis',
  ethics: 'Ethics',
  contribution: 'Study contribution',
  references: 'References',
};
const FACT_KEYS = Object.keys(FACT_LABELS) as DefenceFactKey[];

export interface DefenceSlideTextLayout {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: number;
  fontSize: number;
  lineSpacing: number;
  bold: boolean;
  bullet: boolean;
}

export interface DefenceSlideExportLayout {
  title: DefenceSlideTextLayout;
  bullets: DefenceSlideTextLayout[];
  divider: { x: number; y: number; w: number };
  logo: { x: number; y: number; w: number; h: number };
  bodyFontSize: number;
  autoFitted: boolean;
  issues: string[];
}

// Upper-bound Arial advances leave room for Office/font-substitution differences.
// Unknown glyphs are deliberately wide. No canvas, browser fonts or DOM are needed.
function glyphWidth(character: string): number {
  if (character === ' ') return 0.32;
  if (character === '\t') return 4;
  if ('MW@%'.includes(character)) return 1.05;
  if ('mw'.includes(character)) return 0.92;
  if ('ilI.,:;!\'`|'.includes(character)) return 0.34;
  if ('ftjr()[]{}'.includes(character)) return 0.44;
  if (/[A-Z]/.test(character)) return 0.79;
  if (/[a-z0-9]/.test(character)) return 0.63;
  if ('-/\\+*?"<>='.includes(character)) return 0.66;
  return 1.12;
}

function textWidth(text: string, fontSize: number, bold: boolean): number {
  let ems = 0;
  for (const character of text) ems += glyphWidth(character);
  return ems * fontSize * (bold ? 1.06 : 1) / 72;
}

function measureText(text: string, width: number, fontSize: number, bold: boolean) {
  const available = width - DEFENCE_SLIDE_LAYOUT.textWidthSafety;
  let lines = 0;
  let wideToken = false;
  for (const paragraph of text.split(/\r\n?|\n|\u2028|\u2029/)) {
    let lineWidth = 0;
    let spaceWidth = 0;
    lines++;
    for (const token of paragraph.match(/[^ \t]+|[ \t]+/g) || []) {
      const width = textWidth(token, fontSize, bold);
      if (/^[ \t]+$/.test(token)) {
        spaceWidth += width;
        continue;
      }
      if (width > available || (lineWidth === 0 && spaceWidth + width > available)) wideToken = true;
      if (lineWidth > 0 && lineWidth + spaceWidth + width > available) {
        lines++;
        lineWidth = width;
      } else {
        lineWidth += spaceWidth + width;
      }
      spaceWidth = 0;
    }
  }
  return { lines, wideToken };
}

function invalidXmlText(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13)
      || (code >= 0xD800 && code <= 0xDFFF) || code === 0xFFFE || code === 0xFFFF) return true;
  }
  return false;
}

/** Zero-based index; the first slide is always the cover. Also usable by previews. */
export function defenceSlideLayout(slide: DefenceSlide, index: number): DefenceSlideExportLayout {
  const layout = DEFENCE_SLIDE_LAYOUT;
  const label = `Slide ${index + 1}`;
  const issues: string[] = [];
  if (!Number.isInteger(index) || index < 0 || index >= layout.slideCount) {
    issues.push('Use a slide index from 0 to 9 for the ten-slide defence layout.');
  }
  const cover = index === 0;
  const width = layout.width - 2 * layout.marginX;
  const titleText = typeof slide?.title === 'string' ? slide.title : '';
  const maxTitleLines = cover ? layout.coverTitleMaxLines : layout.titleMaxLines;
  const titleWidth = width - layout.logoSize - layout.logoGap;
  const titleSizes = cover ? [32, 30, 28] : [30, 28, 26];
  const fontSize = titleSizes.find(size => {
    const measured = measureText(titleText, titleWidth, size, true);
    return measured.lines <= maxTitleLines && !measured.wideToken;
  }) || titleSizes[titleSizes.length - 1];
  const lineSpacing = fontSize * 1.25;
  const measuredTitle = measureText(titleText, titleWidth, fontSize, true);
  if (!titleText.trim()) issues.push(`${label}: add a title before exporting.`);
  if (measuredTitle.lines > maxTitleLines) {
    issues.push(cover
      ? `${label}: the exact topic needs about ${measuredTitle.lines} lines at ${fontSize}pt; the cover allows ${maxTitleLines}. Review the topic with your supervisor or approve shorter presentation wording and update the topic and cover together. The exporter will not truncate it.`
      : `${label}: the title needs about ${measuredTitle.lines} lines; the limit is ${maxTitleLines} at ${fontSize}pt. Shorten the heading and put its explanation in speaker notes.`);
  }
  if (measuredTitle.wideToken) {
    issues.push(`${label}: a title word or link is wider than the slide. Add an appropriate word break or move the full link to speaker notes.`);
  }
  const title: DefenceSlideTextLayout = {
    text: titleText, x: layout.marginX, y: layout.titleY, w: titleWidth,
    h: measuredTitle.lines * lineSpacing / 72 + layout.textHeightPadding,
    lines: measuredTitle.lines, fontSize, lineSpacing, bold: true, bullet: false,
  };
  const brand = { x: layout.width - layout.marginX - layout.logoSize, y: layout.titleY, w: layout.logoSize, h: layout.logoSize };
  const divider = { x: layout.marginX, y: Math.max(title.y + title.h, brand.y + brand.h) + layout.dividerGap, w: width };
  const rawBullets = Array.isArray(slide?.bullets) ? slide.bullets : [];
  if (!Array.isArray(slide?.bullets)) issues.push(`${label}: use a list of text points for the slide body.`);
  const placeBullets = (size: number) => {
    let y = divider.y + layout.bodyGap;
    return rawBullets.map((value): DefenceSlideTextLayout => {
      const text = typeof value === 'string' ? value : '';
      const measured = measureText(text, width - (cover ? 0 : layout.bulletIndent / 72), size, false);
      const item = {
        text, x: layout.marginX, y, w: width,
        h: measured.lines * size * 1.25 / 72 + layout.textHeightPadding,
        lines: measured.lines, fontSize: size,
        lineSpacing: size * 1.25, bold: false, bullet: !cover,
      };
      y += item.h + layout.itemGap;
      return item;
    });
  };
  const bottomOf = (items: DefenceSlideTextLayout[]) => items.length ? items[items.length - 1].y + items[items.length - 1].h : divider.y;
  const sizes = slide.bodyFontSize === undefined ? [24, 22, 20, 18] : [slide.bodyFontSize];
  const bodyFontSize = sizes.find(size => [18, 20, 22, 24].includes(size)
    && bottomOf(placeBullets(size)) <= layout.bodyBottom + 0.0001) || sizes[sizes.length - 1];
  const safeSize = [18, 20, 22, 24].includes(bodyFontSize) ? bodyFontSize : layout.bodyFontSize;
  if (safeSize !== bodyFontSize) issues.push(`${label}: choose Auto, 18, 20, 22 or 24 points for the text size.`);
  const bullets = placeBullets(safeSize);
  rawBullets.forEach((value, bulletIndex) => {
    const text = typeof value === 'string' ? value : '';
    if (!text.trim()) issues.push(`${label}, point ${bulletIndex + 1}: add text or remove the empty point.`);
    const measured = measureText(text, width - (cover ? 0 : layout.bulletIndent / 72), safeSize, false);
    if (measured.wideToken) {
      issues.push(`${label}, point ${bulletIndex + 1}: an unbroken word or link is too wide at ${safeSize}pt. Add an appropriate word break or move the full link to speaker notes.`);
    }
  });
  const bottom = bottomOf(bullets);
  if (bottom > layout.bodyBottom + 0.0001) {
    const lines = bullets.reduce((sum, item) => sum + item.lines, 0);
    issues.push(`${label}: ${bullets.length} points (about ${lines} wrapped lines) still exceed the available space at ${safeSize}pt. ${slide.bodyFontSize ? 'Choose Auto text size, or' : 'The automatic minimum is 18pt;'} move supporting detail to speaker notes. Keep the complete objectives and questions. No text has been removed.`);
  }
  if ([titleText, ...bullets.map(item => item.text)].some(text => text.includes('\t'))) {
    issues.push(`${label}: replace tab characters with spaces or line breaks so text fits consistently in PowerPoint.`);
  }
  if ([titleText, ...bullets.map(item => item.text)].some(invalidXmlText)) {
    issues.push(`${label}: remove invalid control characters from the title or points before exporting.`);
  }
  return { title, bullets, divider, logo: brand, bodyFontSize: safeSize, autoFitted: slide.bodyFontSize === undefined && safeSize < layout.bodyFontSize, issues };
}

/** Uses exactly the same measurements as the exporter; does not change the slide. */
export function defenceSlideLayoutIssues(slide: DefenceSlide, index: number): string[] {
  return defenceSlideLayout(slide, index).issues;
}

function assertDeck(deck: DefenceDeck): void {
  if (!deck || deck.version !== 1 || !Array.isArray(deck.slides) || deck.slides.length !== 10) {
    throw new Error('A defence export requires a version 1 deck with exactly ten slides. Regenerate or restore the ten-slide deck.');
  }
  const ids = new Set<string>();
  if (deck.testData !== undefined && typeof deck.testData !== 'boolean') throw new Error('Test presentation must be a boolean.');
  for (const [index, slide] of deck.slides.entries()) {
    if (!slide || typeof slide.id !== 'string' || !slide.id.trim() || ids.has(slide.id)) {
      throw new Error(`Slide ${index + 1}: each of the ten slides needs a unique ID. Regenerate or restore this slide.`);
    }
    ids.add(slide.id);
    if (slide.bodyFontSize !== undefined && ![18, 20, 22, 24].includes(slide.bodyFontSize)) throw new Error(`Slide ${index + 1}: choose a valid text size.`);
    if (typeof slide.title !== 'string' || !Array.isArray(slide.bullets)
      || slide.bullets.some(text => typeof text !== 'string') || typeof slide.notes !== 'string'
      || !Array.isArray(slide.sourceKeys) || slide.sourceKeys.some(key => !FACT_KEYS.includes(key))) {
      throw new Error(`Slide ${index + 1}: restore valid title, text points, speaker notes and source keys before exporting.`);
    }
  }
  for (const key of FACT_KEYS) {
    const fact = deck.facts?.[key];
    if (!fact || typeof fact.value !== 'string' || typeof fact.source !== 'string'
      || !['found', 'confirmed', 'missing'].includes(fact.status)) {
      throw new Error(`Restore the ${FACT_LABELS[key]} source field before exporting. Unknown details may remain marked missing.`);
    }
  }
}

function factText(deck: DefenceDeck, key: DefenceFactKey): string {
  const fact = deck.facts[key];
  return `[${key}] ${FACT_LABELS[key]}\nStatus: ${fact.draft ? 'Suggested draft - not confirmed' : fact.status}\nSource anchor: ${fact.source.trim() ? fact.source : '[Not supplied]'}\nFull source field:\n${fact.value.trim() ? fact.value : '[Not supplied]'}`;
}

function referencesText(deck: DefenceDeck): string {
  const reference = deck.facts.references;
  return `FULL REFERENCES (AS SUPPLIED)\nStatus: ${reference.status}\nSource anchor: ${reference.source.trim() ? reference.source : '[Not supplied]'}\n${reference.value.trim() ? reference.value : 'No reference entries were supplied.'}`;
}

const unresolvedText = (value: string): boolean => !value.trim()
  || /\[\[|\[(?:add|insert|enter|provide|replace|verify|citation needed|review)\b|^(?:tbd|todo|not (?:provided|assigned|specified|available))\.?$/i.test(value.trim());

/** Supervisor is optional; all other fact fields are required by this template. */
export function defenceDeckIsWorkingDraft(deck: DefenceDeck): boolean {
  return FACT_KEYS.some(key => key !== 'supervisor'
    && (!deck.facts?.[key] || deck.facts[key].draft === true || deck.facts[key].status === 'missing' || unresolvedText(deck.facts[key].value)))
    || deck.slides.some(slide => [slide.title, ...slide.bullets, slide.notes].some(text => text.trim() && unresolvedText(text)))
    || deck.slides.some(slide => slide.rulesVersion !== DEFENCE_RULES_VERSION)
    || reviewDefenceRules(deck.facts, deck.slides).length > 0
    || auditDefenceEvidence(deck.facts, deck.evidence, deck.slides).issues.length > 0;
}

function sourceDescription(deck: DefenceDeck): string {
  const findings = reviewDefenceRules(deck.facts, deck.slides);
  return `Source: ${deck.sourceName || '[Not supplied]'}\nSource version: ${deck.sourceVersion ?? '[Not supplied]'}\nDeck updated: ${deck.updatedAt}\nPlanned duration: ${deck.durationMinutes} minutes\n${deck.testData ? 'TEST VERSION: Contains demonstration details. Not for academic submission.\n' : ''}Deck status: ${defenceDeckIsWorkingDraft(deck) ? 'WORKING DRAFT' : 'No unresolved source fields or detected rule issues'}${findings.length ? `\nSECTION RULE REVIEW\n${findings.map(finding => `${finding.title}: ${finding.detail}`).join('\n')}` : ''}`;
}

function slideNotes(deck: DefenceDeck, slide: DefenceSlide, index: number): string {
  const keys = [...new Set<DefenceFactKey>(index === 0 ? ['topic', ...slide.sourceKeys] : slide.sourceKeys)];
  const sections = [
    `SLIDE ${index + 1}: ${slide.title}`,
    `SPEAKER NOTES\n${slide.notes.trim() ? slide.notes : '[No speaker notes supplied]'}`,
    sourceDescription(deck),
    ...(deck.generationWarnings?.length ? [`DRAFT REVIEW NOTES\n${deck.generationWarnings.join('\n')}`] : []),
    `SOURCE FIELDS AND ANCHORS\n${keys.length ? keys.map(key => factText(deck, key)).join('\n\n') : '[No source fields linked to this slide]'}`,
  ];
  if (index === DEFENCE_SLIDE_LAYOUT.slideCount - 1) {
    sections.push(`COMPLETE SOURCE FACT RECORD\n${FACT_KEYS.filter(key => key !== 'references').map(key => factText(deck, key)).join('\n\n')}`);
    sections.push(referencesText(deck));
    sections.push(defenceEvidenceReport(deck.facts, deck.evidence, deck.slides));
  }
  return sections.join('\n\n');
}

/** Plain text; intentionally remains available when slide edits exceed PPTX bounds. */
export function buildDefenceHandout(deck: DefenceDeck): string {
  assertDeck(deck);
  return [
    'UHPAB Study\nDEFENCE HANDOUT',
    sourceDescription(deck),
    `SLIDE CONTENT\n\n${deck.slides.map((slide, index) => `Slide ${index + 1}: ${slide.title}\n${slide.bullets.map(text => `- ${text}`).join('\n')}`).join('\n\n')}`,
    `SPEAKER NOTES\n\n${deck.slides.map((slide, index) => `Slide ${index + 1}: ${slide.title}\n${slide.notes.trim() ? slide.notes : '[No speaker notes supplied]'}\nSource keys: ${slide.sourceKeys.length ? slide.sourceKeys.map(key => `[${key}]`).join(', ') : '[None linked]'}`).join('\n\n')}`,
    `FULL SOURCE FIELDS AND ANCHORS\n\n${FACT_KEYS.filter(key => key !== 'references').map(key => factText(deck, key)).join('\n\n')}`,
    defenceEvidenceReport(deck.facts, deck.evidence, deck.slides),
    referencesText(deck),
  ].join('\n\n') + '\n';
}

function addText(slide: PptxGenJS.Slide, item: DefenceSlideTextLayout, name: string): void {
  const layout = DEFENCE_SLIDE_LAYOUT;
  slide.addText(item.text, {
    x: item.x, y: item.y, w: item.w, h: item.h,
    fontFace: layout.fontFace, fontSize: item.fontSize, color: layout.textColor,
    bold: item.bold, lineSpacing: item.lineSpacing, margin: 0,
    paraSpaceBefore: 0, paraSpaceAfter: 0, charSpacing: 0,
    valign: 'top', align: 'left', wrap: true, fit: 'none',
    bullet: item.bullet ? { indent: layout.bulletIndent } : false,
    lang: 'en-GB', isTextBox: true, objectName: name,
  });
}

/** Browser runtime export only: no file writes, download click or DOM access. */
export async function buildDefencePptx(deck: DefenceDeck): Promise<Blob> {
  assertDeck(deck);
  const ruleErrors = reviewDefenceRules(deck.facts, deck.slides).filter(finding => finding.target === 'slide');
  if (ruleErrors.length) throw new Error(ruleErrors[0].detail);
  const layouts = deck.slides.map(defenceSlideLayout);
  const issues = layouts.flatMap(layout => layout.issues);
  const topic = deck.facts.topic;
  if (topic.status !== 'missing' && !unresolvedText(topic.value)
    && deck.slides[0].title.replace(/\s+/g, ' ').trim() !== topic.value.replace(/\s+/g, ' ').trim()) {
    issues.unshift('Slide 1: the cover title must match the exact study topic. Restore the topic wording or update the topic and cover together.');
  }
  const notes = deck.slides.map((slide, index) => slideNotes(deck, slide, index));
  if (notes.some(invalidXmlText)) {
    issues.push('Remove invalid control characters from speaker notes or source fields before exporting. The text handout can still preserve this content.');
  }
  if (issues.length) throw new Error(`PowerPoint export needs attention:\n${issues.join('\n')}`);

  const { default: PptxGen } = await import('pptxgenjs');
  const pptx = new PptxGen();
  const layout = DEFENCE_SLIDE_LAYOUT;
  pptx.defineLayout({ name: 'DEFENCE_WIDE', width: layout.width, height: layout.height });
  pptx.layout = 'DEFENCE_WIDE';
  pptx.author = 'UHPAB Study';
  pptx.subject = 'Proposal defence working presentation';
  pptx.title = deck.slides[0].title;
  pptx.company = 'UHPAB Study';
  pptx.theme = { headFontFace: layout.fontFace, bodyFontFace: layout.fontFace };
  deck.slides.forEach((sourceSlide, index) => {
    const slide = pptx.addSlide();
    const planned = layouts[index];
    slide.background = { color: layout.backgroundColor };
    slide.addImage({ data: DEFENCE_LOGO_DATA, ...planned.logo, altText: 'UHPAB Study logo', objectName: 'UHPAB Study logo' });
    addText(slide, planned.title, index === 0 ? 'Exact study topic' : 'Slide title');
    slide.addShape(pptx.ShapeType.line, {
      ...planned.divider, h: 0,
      line: { color: layout.accentColor, width: 1 }, objectName: 'Academic divider',
    });
    planned.bullets.forEach((item, itemIndex) => addText(slide, item, `Point ${itemIndex + 1}`));
    const footerOptions = {
      y: layout.footerY, h: layout.footerHeight, fontFace: layout.fontFace,
      fontSize: layout.footerFontSize, color: layout.textColor, margin: 0,
      breakLine: false, valign: 'top' as const, fit: 'none' as const,
      paraSpaceBefore: 0, paraSpaceAfter: 0, charSpacing: 0, lang: 'en-GB',
    };
    slide.addText(`UHPAB Study${deck.testData ? '   TEST VERSION' : ''}${defenceDeckIsWorkingDraft(deck) ? '   WORKING DRAFT' : ''}`, {
      ...footerOptions, x: layout.marginX, w: 4.5, objectName: 'Study footer',
    });
    slide.addText(`${index + 1} / ${layout.slideCount}`, {
      ...footerOptions, x: layout.width - layout.marginX - 1, w: 1,
      align: 'right', objectName: 'Slide number',
    });
    slide.addNotes(notes[index]);
  });
  const output = await pptx.write({ outputType: 'blob', compression: true });
  if (!(output instanceof Blob)) throw new Error('PowerPoint generation did not return a downloadable file. Please retry the export.');
  return output.type === PPTX_MIME ? output : new Blob([output], { type: PPTX_MIME });
}
