import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FileCheck,
  DollarSign,
  AlertTriangle,
  ListTodo,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Shield
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_creatorhub-146/artifacts/njlys9fn_ChatGPT%20Image%20Oct%202%2C%202025%2C%2008_06_35%20AM.png";

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/talents', icon: Users, label: 'Talents' },
  { path: '/personas', icon: UserCircle, label: 'Personas' },
  { path: '/consents', icon: FileCheck, label: 'Consents' },
  { path: '/revenue', icon: DollarSign, label: 'Revenue' },
  { path: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
];

const roleLabels = {
  owner: 'Owner',
  ops_director: 'Ops Director',
  talent_manager: 'Talent Manager',
  marketing_ops: 'Marketing Ops',
  finance: 'Finance',
  safety_support: 'Safety & Support'
};

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    
    return (
      <Link
        to={item.path}
        data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
        className={`sidebar-link ${isActive ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-all duration-300 ease-in-out
          bg-card/50 backdrop-blur-xl border-r border-border
          flex flex-col
        `}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <img 
              src={LOGO_URL} 
              alt="fleshsesh" 
              className="h-8 object-contain"
              data-testid="logo"
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex"
            data-testid="collapse-sidebar-btn"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden"
            data-testid="close-mobile-menu-btn"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {navItems.map(item => (
              <NavLink key={item.path} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="p-4 border-t border-border">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid="user-name">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate" data-testid="user-role">
                    {roleLabels[user?.role] || user?.role}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                onClick={logout}
                data-testid="logout-btn"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={logout}
              className="w-full"
              data-testid="logout-btn-collapsed"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden"
            data-testid="open-mobile-menu-btn"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 lg:hidden flex justify-center">
            <img 
              src={LOGO_URL} 
              alt="fleshsesh" 
              className="h-6 object-contain"
            />
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-mono">
              TalentOS v1.0
            </span>
          </div>
          
          <div className="w-10 lg:hidden" /> {/* Spacer for mobile */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
