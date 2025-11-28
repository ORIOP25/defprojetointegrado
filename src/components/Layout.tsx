import { useState, useContext } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Receipt,
  Lightbulb,
  LogOut,
  Menu,
  X,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determina se o utilizador é admin global
  const isGlobalAdmin = user?.role === 'global_admin';

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: true, // Todos veem
    },
    {
      title: "Alunos",
      href: "/students",
      icon: GraduationCap,
      show: true, // Todos veem
    },
    {
      title: "Staff",
      href: "/staff",
      icon: Users,
      show: true, // Todos veem (a proteção de edição é interna à página)
    },
    {
      title: "Finanças",
      href: "/finances",
      icon: Receipt,
      show: isGlobalAdmin, // Apenas Admin
    },
    {
      title: "Recomendações IA",
      href: "/recommendations",
      icon: Lightbulb,
      show: isGlobalAdmin, // Apenas Admin
    },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          SIGE
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Sistema de Gestão Escolar</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.filter(item => item.show).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "group-hover:text-foreground")} />
              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-4 h-14">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-start text-left overflow-hidden">
                <span className="text-sm font-medium truncate w-full">
                  {user?.email}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>A minha conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Terminar Sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card fixed inset-y-0 z-50">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-background/80 backdrop-blur-sm z-50 flex items-center px-4 justify-between">
        <span className="font-bold text-lg">SIGE</span>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-x-hidden w-full">
        <div className="max-w-7xl mx-auto fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;