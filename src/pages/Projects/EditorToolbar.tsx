
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Pilcrow,
  PilcrowLeft,
  PilcrowRight,
  IndentIncrease,
  IndentDecrease
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EditorToolbarProps {
  onFormat: (type: "bold" | "italic" | "underline") => void;
  onAlign: (dir: "left" | "center" | "right") => void;
  onParagraph: () => void;
  onIndent: (increase: boolean) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onFormat,
  onAlign,
  onParagraph,
  onIndent,
}) => (
  <div className="bg-muted/30 p-2 rounded-md flex flex-wrap gap-1 mb-2">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onFormat("bold")}
            className="hover:bg-muted"
          >
            <Bold className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Bold (Adds **text**)</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onFormat("italic")}
            className="hover:bg-muted"
          >
            <Italic className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Italic (Adds *text*)</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onFormat("underline")}
            className="hover:bg-muted"
          >
            <Underline className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Underline (Adds __text__)</TooltipContent>
      </Tooltip>
      
      <div className="h-6 border-l border-muted-foreground/20 mx-1"></div>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onAlign("left")}
            className="hover:bg-muted"
          >
            <PilcrowLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Align Left</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onAlign("center")}
            className="hover:bg-muted"
          >
            <Pilcrow className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Center Text</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onAlign("right")}
            className="hover:bg-muted"
          >
            <PilcrowRight className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Align Right</TooltipContent>
      </Tooltip>
      
      <div className="h-6 border-l border-muted-foreground/20 mx-1"></div>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onParagraph}
            className="hover:bg-muted"
          >
            <Pilcrow className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>New Paragraph (Adds line break)</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onIndent(true)}
            className="hover:bg-muted"
          >
            <IndentIncrease className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Increase Indent (Adds 4 spaces)</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onIndent(false)}
            className="hover:bg-muted"
          >
            <IndentDecrease className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Decrease Indent (Removes 4 spaces)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);
