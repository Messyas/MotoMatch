// src/components/Sidebar.tsx (VERSÃO BRANCA E FIXA) — com transição sofisticada ENTRE ÍCONES
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
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
  User,
  Bot,
  Shield,
  Briefcase,
  LogIn,
  LogOut,
  Package,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useState, type ElementType } from "react";
import { DISPOSITIVOS_STORAGE_KEY } from "@/components/dispositivosProvider/dispositivosProvider";

type NavItem = {
  href?: string;
  label: string;
  icon: ElementType;
  children?: {
    href: string;
    label: string;
    icon: ElementType;
  }[];
};

const baseNavItems = [{ href: "/", label: "Início", icon: Home }];
const userNavItems = [
  { href: "/chat", label: "Chat AI", icon: Bot },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
  { href: "/conta", label: "Minha Conta", icon: User },
];
const adminNavItems = [
  {
    label: "Dashboard",
    icon: Briefcase,
    children: [
      { href: "/admin/dashboard-users", label: "Usuários", icon: Shield },
      {
        href: "/admin/dashboard-devices",
        label: "Dispositivos",
        icon: Package,
      },
    ],
  },
  { href: "/admin/dispositivos", label: "Produtos", icon: Package },
  { href: "/admin/users", label: "Usuários", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const prefersReduced = useReducedMotion();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  let navItems: NavItem[] = [...baseNavItems];
  if (user) {
    navItems = [...navItems, ...userNavItems];
    if (user.tipo === "0" || user.tipo === "2") {
      navItems.push(...adminNavItems);
    }
  }

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem(DISPOSITIVOS_STORAGE_KEY);
    } catch (err) {
      console.error("Falha ao limpar dados locais antes do logout:", err);
    }
    await logout();
    router.push("/login");
  };

  // Transições dos ícones — todas suaves e discretas
  const iconHover = prefersReduced ? {} : { y: -2, scale: 1.06 };
  const iconTap = prefersReduced ? {} : { y: 0, scale: 0.95 };

  const renderNavLinks = (isMobile = false) => {
    if (isMobile) {
      return (
        <nav className="grid gap-2">
          {navItems.map((item: NavItem) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            if ("children" in item) {
              return (
                <div key={item.label} className="flex flex-col rounded-xl">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ${
                      openMenus[item.label]
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span className="flex-1">{item.label}</span>
                    <Icon className="h-5 w-5" />
                  </button>

                  {openMenus[item.label] && item.children?.length && (
                    <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-muted pl-3">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = pathname === child.href;

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors ${
                              isChildActive
                                ? "text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="flex-1">{child.label}</span>
                            <ChildIcon className="h-4 w-4" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href || "#"}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-base ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="flex-1 text-left">{item.label}</span>
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      );
    }

    return (
      <nav className="grid gap-2">
        {navItems.map((item: NavItem) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          if ("children" in item) {
            return (
              <div
                key={item.label}
                className="flex flex-col items-center md:items-start"
              >
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleMenu(item.label)}
                        className={`flex items-center justify-center md:justify-start gap-4 rounded-xl px-3 py-2 transition-colors hover:text-foreground relative ${
                          openMenus[item.label]
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {/* Mesmo layout dos outros ícones */}
                        <span className="relative inline-flex h-9 w-9 items-center justify-center">
                          {openMenus[item.label] && (
                            <motion.span
                              layoutId="iconActive"
                              className="absolute inset-0 rounded-xl bg-muted"
                              style={{ borderRadius: 12 }}
                              transition={{
                                type: "spring",
                                stiffness: 520,
                                damping: 38,
                                mass: 0.6,
                              }}
                            />
                          )}
                          <motion.span
                            whileHover={{ y: -2, scale: 1.06 }}
                            whileTap={{ y: 0, scale: 0.95 }}
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 30,
                            }}
                            className="relative"
                          >
                            <Icon className="h-5 w-5" />
                          </motion.span>
                        </span>

                        {/* Label só no mobile */}
                        {isMobile && <span className="ml-4">{item.label}</span>}
                      </button>
                    </TooltipTrigger>
                    {!isMobile && (
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                {/* Submenu */}
                {openMenus[item.label] && item.children?.length && (
                  <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-muted pl-3">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = pathname === child.href;

                      return (
                        <TooltipProvider key={child.href} delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={child.href}
                                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                                  isChildActive
                                    ? "text-foreground font-medium"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <ChildIcon className="h-4 w-4" />
                                {isMobile && <span>{child.label}</span>}
                              </Link>
                            </TooltipTrigger>
                            {!isMobile && (
                              <TooltipContent side="right">
                                {child.label}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <TooltipProvider key={item.href} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href || "#"}
                    className={`flex items-center justify-center md:justify-start gap-4 rounded-xl px-3 py-2 transition-colors hover:text-foreground relative ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {/* Área do ícone com realce animado exclusivo dos ícones */}
                    <span className="relative inline-flex h-9 w-9 items-center justify-center">
                      {/* Glow/placa atrás do ÍCONE ATIVO (móvel entre ícones) */}
                      {isActive && (
                        <motion.span
                          layoutId="iconActive"
                          className="absolute inset-0 rounded-xl bg-muted"
                          // tamanho um pouco maior que o ícone para formar uma "pílula" quadradinha
                          style={{ borderRadius: 12 }}
                          transition={{
                            type: "spring",
                            stiffness: 520,
                            damping: 38,
                            mass: 0.6,
                          }}
                        />
                      )}

                      {/* Ícone com micro-interações */}
                      <motion.span
                        whileHover={iconHover}
                        whileTap={iconTap}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 30,
                        }}
                        className="relative"
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isActive ? "text-foreground" : "text-muted-foreground"
                          }`}
                        />
                      </motion.span>
                    </span>

                    {/* Label só no mobile (como no seu código) */}
                    {isMobile && <span className="ml-4">{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {!isMobile && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>
    );
  };

  if (loading) return null;

  return (
    <>
      {/* === SIDEBAR FIXA PARA DESKTOP === */}
      <div className="hidden border-r bg-white md:fixed md:flex md:flex-col justify-between w-[80px] h-screen top-0 left-0 z-50">
        <div className="flex flex-col items-center gap-4 px-2 py-4">
          {renderNavLinks()}
        </div>
        <div className="mt-auto flex flex-col items-center gap-4 px-2 py-4">
          {user ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="text-muted-foreground"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/login")}
                    className="text-muted-foreground"
                  >
                    <LogIn className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Login</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* === BOTÃO FLOANTE PARA ABRIR A SIDEBAR NO MOBILE === */}
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
        <SheetContent
          side="left"
          className="flex flex-col w-[55%] max-w-sm [&_[data-slot=sheet-close]]:hidden"
        >
          <div className="flex items-center justify-end px-3 pt-3 pb-1">
            <SheetClose asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full border-slate-200 shadow-sm"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar menu</span>
              </Button>
            </SheetClose>
          </div>
          {renderNavLinks(true)}
          <div className="mt-auto">
            {user ? (
              <Button onClick={handleLogout} variant="secondary" className="w-full">
                Sair
              </Button>
            ) : (
              <Button onClick={() => router.push("/login")} variant="secondary" className="w-full">
                Login
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
