
import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

interface SectionComponent {
  id: string;
  label: string;
  description: string;
}
interface SectionNavigationProps {
  selectedSection: string;
  setSelectedSection: (section: string) => void;
  selectedComponent: string;
  setSelectedComponent: (component: string) => void;
  sectionComponents: SectionComponent[];
  projectType: 'proposal' | 'report';
}
export const SectionNavigation: React.FC<SectionNavigationProps> = ({
  selectedSection,
  setSelectedSection,
  selectedComponent,
  setSelectedComponent,
  sectionComponents,
  projectType
}) => (
  <div className="space-y-6">
    <div>
      <Label className="mb-2 block">Section</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {selectedSection === 'preliminaryPages'
              ? 'Preliminary Pages'
              : selectedSection === 'chapter1'
              ? 'Chapter 1: Introduction'
              : selectedSection === 'chapter2'
              ? 'Chapter 2: Literature Review'
              : selectedSection === 'chapter3'
              ? 'Chapter 3: Methodology'
              : selectedSection === 'chapter4'
              ? 'Chapter 4: Findings'
              : selectedSection === 'chapter5'
              ? 'Chapter 5: Discussion & Conclusion'
              : selectedSection === 'references'
              ? 'References'
              : selectedSection === 'appendices'
              ? 'Appendices'
              : selectedSection}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem onClick={() => setSelectedSection('preliminaryPages')}>
            Preliminary Pages
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSelectedSection('chapter1')}>
            Chapter 1: Introduction
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSelectedSection('chapter2')}>
            Chapter 2: Literature Review
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSelectedSection('chapter3')}>
            Chapter 3: Methodology
          </DropdownMenuItem>
          {projectType === 'report' && (
            <>
              <DropdownMenuItem onClick={() => setSelectedSection('chapter4')}>
                Chapter 4: Findings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedSection('chapter5')}>
                Chapter 5: Discussion & Conclusion
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={() => setSelectedSection('references')}>
            References
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSelectedSection('appendices')}>
            Appendices
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <div>
      <Label className="mb-2 block">Component</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {sectionComponents.find(c => c.id === selectedComponent)?.label || 'Select Component'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto">
          {sectionComponents.map((component) => (
            <DropdownMenuItem
              key={component.id}
              onClick={() => setSelectedComponent(component.id)}
            >
              {component.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
);
