// Formatting guidelines for UHPAB research work

const formattingGuidelines = {
  fontAndSpacing: {
    font: 'Times New Roman',
    fontSize: '12pt',
    lineSpacing: 'Double-spaced (except Abstract: single-spaced)',
    paragraphSpacing: 'No additional space between paragraphs',
    margins: '1 inch (2.54 cm) on all sides',
    paragraphStyle: 'Justified alignment, no indentation of first line'
  },
  pageNumbering: {
    preliminaryPages: 'Roman numerals (i, ii, iii, etc.)',
    mainText: 'Arabic numerals (1, 2, 3, etc.)',
    titlePage: 'No page number',
    placement: 'Bottom center of page'
  },
  headings: {
    chapterTitles: 'Centered, bold, all caps, 14pt',
    level1: 'Bold, centered, title case, 12pt',
    level2: 'Bold, left-aligned, title case, 12pt',
    level3: 'Bold, indented, sentence case, 12pt'
  },
  tablesAndFigures: {
    numbering: 'Sequential by chapter (e.g., Table 4.1)',
    titlePlacement: 'Above tables and figures',
    format: 'Bold, centered',
    notes: 'Source information below table/figure if applicable',
    sizing: 'Keep within margins, resize if necessary'
  },
  citations: {
    style: 'APA 7th Edition',
    inText: 'Author-date format (Smith, 2023)',
    multipleAuthors: 'Use "et al." for 3+ authors after first citation',
    directQuotes: 'Include page number (Smith, 2023, p. 45)',
    paraphrasing: 'No page number required unless helping reader locate large text'
  },
  references: {
    format: 'APA 7th Edition',
    ordering: 'Alphabetical by author surname',
    spacing: 'Double-spaced',
    indentation: 'Hanging indent',
    minimum: '20 references (primarily <10 years old)'
  }
};

export default formattingGuidelines;
