
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { 
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MenuItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface MobileMenuProps {
  title?: string;
  items: MenuItem[];
}

const MobileMenu: React.FC<MobileMenuProps> = ({ title = 'Menu', items }) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu size={24} />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader className="pb-4">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <nav className="grid gap-2 py-4">
          {items.map((item) => (
            <SheetClose asChild key={item.href}>
              <Link 
                to={item.href}
                className="flex items-center gap-3 px-4 py-3 text-base rounded-md hover:bg-secondary transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
