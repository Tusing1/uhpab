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
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false
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
    <div className="rounded-md border bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b bg-white/95 p-2 backdrop-blur">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <React.Fragment key={tool.label}>
              {index === 3 || index === 6 || index === 9 ? (
                <Separator orientation="vertical" className="mx-1 h-7" />
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onMouseDown={(event) => event.preventDefault()}
                onClick={tool.action}
                disabled={disabled}
                title={tool.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </React.Fragment>
          );
        })}
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
          "prose prose-sm min-h-[620px] max-w-none px-1 py-2 text-[12pt] leading-[2] outline-none",
          "font-['Times_New_Roman',Times,serif] text-justify",
          "empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]",
          disabled && "cursor-not-allowed opacity-60"
        )}
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      />
    </div>
  );
};
