import React, { useEffect, useRef } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  Pilcrow,
  Table2,
  Underline
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  singleSpaced?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  singleSpaced = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== value) {
      editor.innerHTML = value || '';
    }
  }, [value]);

  const updateValue = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const runCommand = (command: string, commandValue?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    updateValue();
  };

  const insertTable = () => {
    runCommand(
      'insertHTML',
      '<table style="width:100%; border-collapse:collapse; margin:16px 0;"><tr><th style="border:1px solid #94a3b8; padding:8px;">Heading</th><th style="border:1px solid #94a3b8; padding:8px;">Heading</th></tr><tr><td style="border:1px solid #94a3b8; padding:8px;">Data</td><td style="border:1px solid #94a3b8; padding:8px;">Data</td></tr></table><p><br/></p>'
    );
  };

  const applyHangingIndent = () => {
    runCommand(
      'insertHTML',
      '<p style="padding-left:0.5in; text-indent:-0.5in; margin:0; line-height:2;">[[Paste APA reference here]]</p>'
    );
  };

  const tools = [
    { label: 'Bold', icon: Bold, action: () => runCommand('bold') },
    { label: 'Italic', icon: Italic, action: () => runCommand('italic') },
    { label: 'Underline', icon: Underline, action: () => runCommand('underline') },
    { label: 'Heading 1', icon: Heading1, action: () => runCommand('formatBlock', 'h1') },
    { label: 'Heading 2', icon: Heading2, action: () => runCommand('formatBlock', 'h2') },
    { label: 'Paragraph', icon: Pilcrow, action: () => runCommand('formatBlock', 'p') },
    { label: 'Align left', icon: AlignLeft, action: () => runCommand('justifyLeft') },
    { label: 'Center', icon: AlignCenter, action: () => runCommand('justifyCenter') },
    { label: 'Align right', icon: AlignRight, action: () => runCommand('justifyRight') },
    { label: 'Bullets', icon: List, action: () => runCommand('insertUnorderedList') },
    { label: 'Numbering', icon: ListOrdered, action: () => runCommand('insertOrderedList') },
    { label: 'Decrease indent', icon: IndentDecrease, action: () => runCommand('outdent') },
    { label: 'Increase indent', icon: IndentIncrease, action: () => runCommand('indent') },
    { label: 'Hanging indent', icon: Pilcrow, action: applyHangingIndent },
    { label: 'Table', icon: Table2, action: insertTable }
  ];

  return (
    <div className="min-w-0 rounded-md border bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b bg-white/95 p-2 backdrop-blur" role="toolbar" aria-label="Text formatting">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <React.Fragment key={tool.label}>
              {index === 3 || index === 6 || index === 9 ? (
                <Separator orientation="vertical" className="mx-1 hidden h-7 sm:block" />
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("h-11 w-11 shrink-0 sm:h-8 sm:w-8", index >= 3 && "hidden sm:inline-flex")}
                onMouseDown={(event) => event.preventDefault()}
                onClick={tool.action}
                disabled={disabled}
                title={tool.label}
                aria-label={tool.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </React.Fragment>
          );
        })}
        <details className="sm:hidden">
          <summary aria-label="More formatting" title="More formatting" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden" onMouseDown={event => event.preventDefault()}>
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          </summary>
          <div className="absolute left-0 right-0 top-full z-40 flex flex-wrap gap-1 rounded-b-md border bg-white p-2 shadow-lg">
            {tools.slice(3).map(tool => {
              const Icon = tool.icon;
              return <Button key={tool.label} type="button" size="icon" variant="ghost" className="h-11 w-11" disabled={disabled} aria-label={tool.label} title={tool.label}
                onMouseDown={event => event.preventDefault()} onClick={event => { tool.action(); event.currentTarget.closest('details')?.removeAttribute('open'); }}><Icon className="h-4 w-4" /></Button>;
            })}
          </div>
        </details>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder || 'Write content'}
        data-placeholder={placeholder}
        onInput={updateValue}
        onBlur={updateValue}
        className={cn(
          "prose prose-sm min-h-[320px] max-w-none break-words px-1 py-2 text-[12pt] leading-[2] outline-none sm:min-h-[620px] [overflow-wrap:anywhere] [&_table]:max-w-full",
          "font-['Times_New_Roman',Times,serif] text-justify [&_h1]:text-[12pt] [&_h2]:text-[12pt] [&_h3]:text-[12pt] [&_h1]:text-left [&_h2]:text-left [&_h3]:text-left",
          "empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]",
          disabled && "cursor-not-allowed opacity-60"
        )}
        style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: singleSpaced ? 1 : 2 }}
      />
    </div>
  );
};
