import { jsPDF } from 'jspdf';
import type { AnalysisResult, DocumentType } from '@/utils/documentAnalysis';
import { MARKING_RUBRIC_VERSION } from '@/data/markingGuide';
import { sanitizeFileName, triggerBrowserDownload } from '@/lib/download';

const clean = (value: string) => value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7e\n]/g, ' ');
const mark = (value: number) => String(Math.round(value * 100) / 100);

export const createMarkingGuidePdfDocument = (
  result: AnalysisResult, documentType: DocumentType, component: string, fileName: string, studentName?: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const widths = [10, 43, 62, 59, 20, 73];
  const headers = ['No.', 'Assessment area', 'Evidence found', 'Missing / weak', 'Marks', 'Required improvement'];
  const left = 15;
  const bottom = 191;
  const rowLine = 3.8;
  const rubric = result.rubricScore;
  let y = 0;
  let currentSection = '';
  doc.setProperties({ title: `Research marking report - ${fileName}`, author: 'UHPAB Study', subject: 'Adapted practice marking guide; not an official grade' });

  const text = (value: string, x: number, at: number, size = 8.5, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(24, 40, 53);
    doc.text(clean(value), x, at, { lineHeightFactor: 1.267 });
  };
  const tableHeader = () => {
    doc.setFillColor(20, 84, 96);
    doc.rect(left, y, 267, 10, 'F');
    let x = left;
    headers.forEach((label, i) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
      doc.text(label, x + 2, y + 6.4); x += widths[i];
    });
    y += 10;
  };
  const sectionHeader = () => {
    doc.setFillColor(233, 242, 244); doc.rect(left, y, 267, 9, 'F');
    text(currentSection, left + 2, y + 6, 9, true); y += 9;
  };
  const pageHeader = (first = false) => {
    text('UHPAB STUDY / RESEARCH MARKING REPORT', left, 16, 14, true);
    text('Adapted practice rubric. Not an official UHPAB grade or certification.', left, 23, 9);
    if (first) {
      doc.setFontSize(9);
      const metadata = doc.splitTextToSize(clean(`${documentType.toUpperCase()} / ${component} | File: ${fileName}${studentName ? ` | Student: ${studentName}` : ''}`), 267);
      text(metadata.join('\n'), left, 31, 9);
      y = 34 + metadata.length * 4;
      text(`Confirmed credit: ${mark(result.matchedGuidelines)} / ${mark(result.totalGuidelines)}${rubric?.provisional ? ' | PROVISIONAL - human checks outstanding' : ''}`, left, y + 3, 11, true);
      const notice = 'Full credit requires substantive, study-specific evidence. Unassessable checks earn no confirmed credit; visual formatting, source authenticity and unreadable material require human review. Proposal scores exclude report-only requirements.';
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(notice, 267);
      text(lines.join('\n'), left, y + 11, 8.5);
      y += 15 + lines.length * 3.8;
    } else { text(`${documentType.toUpperCase()} / ${component} | Criterion table continued`, left, 30, 9); y = 36; }
    tableHeader();
    if (currentSection) sectionHeader();
  };
  const newPage = () => { doc.addPage(); pageHeader(); };
  pageHeader(true);
  let number = 0;
  for (const section of rubric?.sections || []) {
    currentSection = `${section.title} - ${mark(section.awarded)} / ${mark(section.marks)}`;
    if (y + 22 > bottom) newPage(); else sectionHeader();
    for (const criterion of section.criteria) {
      number++;
      const found = criterion.found?.length ? criterion.found.join('\n\n') : criterion.evidenceSnippet || 'No supporting passage identified.';
      const missing = criterion.missing?.length ? criterion.missing.join('\n\n') : criterion.status === 'met' ? 'No shortfall identified in assessed requirements.' : criterion.guidance;
      const improvement = criterion.improvements?.length ? criterion.improvements.join('\n\n') : criterion.status === 'met' ? 'Retain the supporting evidence and check supervisor feedback.' : criterion.guidance;
      const values = [String(number), `${criterion.label}${criterion.pageNumber ? `\nPage ${criterion.pageNumber}` : ''}${criterion.assessmentState === 'unassessable' ? '\nHUMAN CHECK REQUIRED' : ''}`, found, missing, `${mark(criterion.awarded)} / ${mark(criterion.marks)}`, improvement];
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      const cells: string[][] = values.map((value, i) => doc.splitTextToSize(clean(value), widths[i] - 4));
      const totalLines = Math.max(...cells.map(lines => lines.length));
      // Keep ordinary criterion rows together; split only oversized feedback.
      const completeRowHeight = totalLines * rowLine + 5;
      if (y + completeRowHeight > bottom && completeRowHeight <= bottom - 55) newPage();
      let offset = 0;
      while (offset < totalLines) {
        if (bottom - y < 14) newPage();
        const capacity = Math.max(1, Math.floor((bottom - y - 5) / rowLine));
        const count = Math.min(capacity, totalLines - offset);
        const height = count * rowLine + 5;
        let x = left;
        cells.forEach((lines, i) => {
          doc.setDrawColor(204, 215, 221);
          doc.setFillColor(number % 2 ? 249 : 255, number % 2 ? 251 : 255, number % 2 ? 252 : 255);
          doc.rect(x, y, widths[i], height, 'FD');
          const content = offset > 0 && (i === 0 || i === 4) ? lines : lines.slice(offset, offset + count);
          text(content.join('\n'), x + 2, y + 5, 8.5, i === 4);
          x += widths[i];
        });
        y += height;
        offset += count;
        if (offset < totalLines) newPage();
      }
    }
  }
  if (!rubric?.sections.length) text('No detailed rubric data. Run a strict examiner review to create the criterion table.', left, y + 10);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor(204, 215, 221); doc.line(left, 197, 282, 197);
    text('https://uhpab-study.pages.dev', left, 203, 8);
    text(`${rubric?.rubricVersion || MARKING_RUBRIC_VERSION} | ${new Date().toLocaleDateString('en-GB')} | Page ${page} of ${pages}`, 165, 203, 8);
    doc.link(left, 199, 60, 6, { url: 'https://uhpab-study.pages.dev' });
  }
  return doc;
};

export const downloadMarkingGuidePdf = (result: AnalysisResult, documentType: DocumentType, component: string, fileName: string, studentName?: string) => {
  const doc = createMarkingGuidePdfDocument(result, documentType, component, fileName, studentName);
  const url = URL.createObjectURL(doc.output('blob'));
  triggerBrowserDownload(url, sanitizeFileName(`marking-report-${fileName || 'document'}.pdf`), { message: 'Marking table PDF export started' });
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
};
