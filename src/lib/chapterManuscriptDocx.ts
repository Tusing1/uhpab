import { htmlToDOM, Element, Text, type DOMNode } from 'html-react-parser';
import { AlignmentType, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

const text = (value: string, bold = false, italics = false, underline = false) => new TextRun({ text: value, font: 'Times New Roman', size: 24, bold, italics, underline: underline ? {} : undefined });
function inline(nodes: DOMNode[], bold = false, italics = false, underline = false): TextRun[] {
  return nodes.flatMap(node => {
    if (node instanceof Text) return [text(node.data, bold, italics, underline)];
    if (!(node instanceof Element) || ['script', 'style', 'iframe', 'object'].includes(node.name)) return [];
    if (node.name === 'br') return [new TextRun({ break: 1 })];
    return inline(node.children as DOMNode[], bold || ['b', 'strong'].includes(node.name), italics || ['i', 'em'].includes(node.name), underline || node.name === 'u');
  });
}
function paragraph(nodes: DOMNode[], element?: Element, prefix = '') {
  const style = element?.attribs.style || '';
  const alignment = style.match(/text-align:\s*(left|center|right|justify)/i)?.[1];
  const length = (property: string) => {
    const match = style.match(new RegExp(`${property}:\\s*(-?[\\d.]+)(in|pt|px|em)`, 'i'));
    return match ? Number(match[1]) * ({ in: 1440, pt: 20, px: 15, em: 240 }[match[2].toLowerCase()] || 1) : 0;
  };
  const indent = length('text-indent');
  return new Paragraph({
    alignment: ({ left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED })[alignment || 'justify'],
    spacing: { line: 480, after: 0 },
    indent: { left: length('padding-left'), ...(indent < 0 ? { hanging: -indent } : { firstLine: indent }) },
    children: [...(prefix ? [text(prefix)] : []), ...inline(nodes, /^h[1-6]$/.test(element?.name || ''))],
  });
}
function tableRows(node: Element): Element[] {
  return node.children.flatMap(child => child instanceof Element ? child.name === 'tr' ? [child] : tableRows(child) : []);
}
export function chapterManuscriptBlocks(html: string, placeholder: string): Array<Paragraph | Table> {
  if (!html.trim()) return [new Paragraph({ spacing: { line: 480 }, children: [text(`[[${placeholder}]]`, false, true)] })];
  const blocks = (nodes: DOMNode[]): Array<Paragraph | Table> => nodes.flatMap((node): Array<Paragraph | Table> => {
    if (node instanceof Text) return node.data.trim() ? [paragraph([node])] : [];
    if (!(node instanceof Element) || ['script', 'style', 'iframe', 'object'].includes(node.name)) return [];
    if (node.name === 'table') {
      const rows = tableRows(node).filter(row => row.children.some(child => child instanceof Element && ['td', 'th'].includes(child.name))).map(row => new TableRow({ children: row.children.filter(child => child instanceof Element && ['td', 'th'].includes(child.name)).map(cell => {
        const element = cell as Element;
        const children = blocks(element.children as DOMNode[]);
        return new TableCell({ children: children.length ? children : [paragraph([])], margins: { top: 80, bottom: 80, left: 100, right: 100 } });
      }) }));
      return rows.length ? [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }), paragraph([])] : [];
    }
    if (['ol', 'ul'].includes(node.name)) return node.children.filter(child => child instanceof Element && child.name === 'li').map((child, index) => paragraph((child as Element).children as DOMNode[], child as Element, node.name === 'ol' ? `${index + 1}. ` : '\u2022 '));
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li'].includes(node.name)) return [paragraph(node.children as DOMNode[], node)];
    if (node.children.some(child => child instanceof Element && ['p', 'div', 'table', 'ol', 'ul'].includes(child.name))) return blocks(node.children as DOMNode[]);
    return [paragraph(node.children as DOMNode[], node)];
  });
  const nodes = htmlToDOM(html);
  const hasText = (items: DOMNode[]): boolean => items.some(node => node instanceof Text ? Boolean(node.data.trim()) : node instanceof Element && hasText(node.children as DOMNode[]));
  return hasText(nodes) ? blocks(nodes) : chapterManuscriptBlocks('', placeholder);
}
