import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { healthTrainingSchools, findSchoolById } from '@/data/schools';
import { cn } from '@/lib/utils';

interface SchoolPickerProps {
  value: string;
  onChange: (schoolIdOrName: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  inputId?: string;
}

const customPrefix = 'custom-school:';

const SchoolPicker: React.FC<SchoolPickerProps> = ({
  value,
  onChange,
  label = 'School',
  required = false,
  placeholder = 'Search your school',
  inputId = 'school'
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedSchool = findSchoolById(value);
  const customSchoolName = value.startsWith(customPrefix) ? value.replace(customPrefix, '') : '';
  const displayValue = selectedSchool?.name || customSchoolName || value;

  const filteredSchools = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return healthTrainingSchools.slice(0, 40);

    return healthTrainingSchools
      .filter((school) =>
        [school.name, school.location, school.categoryLabel]
          .join(' ')
          .toLowerCase()
          .includes(search)
      )
      .slice(0, 40);
  }, [query]);

  const handleCustomSchool = () => {
    const customName = query.trim();
    if (!customName) return;
    onChange(`${customPrefix}${customName}`);
    setOpen(false);
  };

  const helperText = useMemo(() => {
    if (selectedSchool) {
      return `${selectedSchool.categoryLabel} - ${selectedSchool.location}`;
    }

    if (customSchoolName) {
      return 'New school entered manually. We will save it as a custom school.';
    }

    return 'Search the official list, or choose Other if the school is new.';
  }, [customSchoolName, selectedSchool]);

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={inputId}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-auto min-h-10 w-full justify-between gap-2 px-3 py-2 text-left font-normal",
              !displayValue && "text-muted-foreground"
            )}
          >
            <span className="line-clamp-2">{displayValue || placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Type school name or location..."
            />
            <CommandList>
              <CommandEmpty>
                <div className="space-y-3 px-3 py-2">
                  <p>No official school matched that search.</p>
                  {query.trim() && (
                    <Button size="sm" className="w-full gap-2" onClick={handleCustomSchool}>
                      <PlusCircle className="h-4 w-4" />
                      Use "{query.trim()}" as new school
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup heading="Official schools">
                {filteredSchools.map((school) => (
                  <CommandItem
                    key={school.id}
                    value={school.id}
                    onSelect={() => {
                      onChange(school.id);
                      setOpen(false);
                    }}
                    className="items-start gap-2"
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        value === school.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>
                      <span className="block font-medium">{school.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {school.location} - {school.categoryLabel}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Other">
                <CommandItem
                  value="other-school"
                  onSelect={handleCustomSchool}
                  disabled={!query.trim()}
                  className="gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{query.trim() ? `Use "${query.trim()}" as new school` : 'Type a new school name above'}</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <input type="hidden" value={value} required={required} />
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
};

export default SchoolPicker;
