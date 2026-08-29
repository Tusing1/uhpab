import { Document, Packer, Paragraph, TextRun } from 'docx';
import { createMarkingGuidePdfDocument } from '@/lib/markingGuidePdf';
import type { AnalysisResult, DocumentType, ExportFormat } from './types';

/**
 * Generate a detailed feedback report in PDF or DOCX format.
 */
export const generateDetailedReport = async (
  result: AnalysisResult,
  documentType: DocumentType,
  componentName: string,
  fileName: string,
  format: ExportFormat
): Promise<{ content: Blob; extension: string }> => {
  const complianceRate = (result.matchedGuidelines / result.totalGuidelines) * 100;

  if (format === 'pdf') {
    const pdf = createMarkingGuidePdfDocument(result, documentType, componentName, fileName);

    return {
      content: pdf.output('blob'),
      extension: 'pdf',
    };
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'UHPAB Document Analysis Report',
              bold: true,
              size: 32,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `${fileName} (${documentType.toUpperCase()})`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Component: ${componentName}` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Analysis Date: ${new Date().toLocaleDateString()}` }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Overall Compliance: ${complianceRate.toFixed(1)}% (${result.matchedGuidelines}/${result.totalGuidelines} guidelines met)`,
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: complianceRate >= 70
                ? 'This document meets the minimum compliance requirements.'
                : 'This document requires improvements to meet guidelines.',
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Issues Identified:', bold: true }),
          ],
        }),
        ...result.issues.map((issue, index) =>
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. ${issue}` }),
            ],
          })
        ),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  return {
    content: blob,
    extension: format,
  };
};
