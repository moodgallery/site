import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  LayoutDashboard,
  Wallet,
  Target,
  Sparkles,
  CheckSquare,
  Calendar,
  BarChart3,
  Menu,
  LogOut,
  User,
  ChevronRight,
  Settings,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { path: '/finance', label: 'Фінанси', icon: Wallet },
  { path: '/goals', label: 'Цілі', icon: Target },
  { path: '/habits', label: 'Звички', icon: Sparkles },
  { path: '/tasks', label: 'Завдання', icon: CheckSquare },
  { path: '/schedule', label: 'Розклад', icon: Calendar },
  { path: '/weekly-review', label: 'Огляд тижня', icon: BarChart3 },
  { path: '/settings', label: 'Налаштування', icon: Settings },
];

const SidebarContent = ({ onItemClick }) => {
  const location = useLocation();
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/40">
        <h1 className="text-lg font-bold tracking-tight">Personal OS</h1>
        <p className="text-xs text-muted-foreground mt-1">Система продуктивності</p>
      </div>
      
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                data-testid={`nav-${item.path.slice(1)}`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </NavLink>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
};

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border/40 flex-col bg-card/50">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="glass-header h-14 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-card border-border/40">
                <SidebarContent onItemClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            
            <span className="md:hidden text-sm font-semibold">Personal OS</span>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2" data-testid="user-menu-btn">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.picture} alt={user?.name} />
                  <AvatarFallback className="text-xs bg-accent">{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border/40">
              <DropdownMenuItem className="flex items-center gap-2" data-testid="profile-menu-item">
                <User className="h-4 w-4" />
                <span>Профіль</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center gap-2 text-destructive focus:text-destructive"
                onClick={logout}
                data-testid="logout-menu-item"
              >
                <LogOut className="h-4 w-4" />
                <span>Вийти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto mobile-content">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden mobile-bottom-nav bg-card/95 backdrop-blur-lg border-t border-border/40">
        <div className="flex items-center justify-around h-16">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex flex-col items-center gap-1 p-2 rounded-lg transition-colors
                  ${isActive ? 'text-foreground' : 'text-muted-foreground'}
                `}
                data-testid={`mobile-nav-${item.path.slice(1)}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            );
          })}
          <NavLink
            to="/settings"
            className={({ isActive }) => `
              flex flex-col items-center gap-1 p-2 rounded-lg transition-colors
              ${isActive ? 'text-foreground' : 'text-muted-foreground'}
            `}
            data-testid="mobile-nav-settings"
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px]">Більше</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
