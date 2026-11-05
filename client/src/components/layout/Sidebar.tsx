"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Menu,
  Home,
  Heart,
  Bot,
  Activity,
  BarChart2,
  Settings,
  Smartphone,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { ElementType } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ElementType;
};

const navItems: NavItem[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/chat", label: "Chat AI", icon: Bot },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
  { href: "/dados", label: "Dados de uso", icon: BarChart2 },
  { href: "/status", label: "Status do sistema", icon: Activity },
  { href: "/admin", label: "Painel Admin", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();

  const iconHover = prefersReduced ? {} : { y: -2, scale: 1.08 };
  const iconTap = prefersReduced ? {} : { y: 0, scale: 0.95 };

  const renderNavLinks = (isMobile = false) => {
    if (isMobile) {
      return (
        <nav className="grid gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SheetClose>
            );
          })}
        </nav>
      );
    }

    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-col items-center gap-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <motion.div
                      whileHover={iconHover}
                      whileTap={iconTap}
                      className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-blue-500" />
                      )}
                    </motion.div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-[72px] flex-col items-center justify-between border-r border-slate-200/80 bg-white py-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-8">
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
          >
            <Smartphone className="h-6 w-6" />
          </Link>
          {renderNavLinks(false)}
        </div>

        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          PM
        </div>
      </aside>

      {/* Mobile Toggle Button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="md:hidden fixed top-4 left-4 z-50 h-11 w-11 rounded-full border-slate-200 bg-white/90 shadow-lg backdrop-blur"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[75%] max-w-xs flex flex-col p-6">
          <div className="flex items-center justify-between pb-6 border-b">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Smartphone className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg">PhoneMatch</span>
            </div>
            <SheetClose asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
          <div className="pt-6 flex-1">{renderNavLinks(true)}</div>
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            PhoneMatch &bull; Multi-marca
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
