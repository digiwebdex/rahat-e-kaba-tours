import {
  LayoutDashboard, Users, CreditCard, Calculator, BarChart3, Pencil,
  Settings, LogOut, Briefcase, BookOpenCheck, Wallet, Bell, Shield,
  ShieldCheck, FileText, UserCog, Building2, BookOpen,
} from "lucide-react";
import logo from "@/assets/al-rawsha-logo.png";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar";
import { supabase } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import type { AppRole } from "@/hooks/useUserRole";

// Al Rawsha Recruiting Platform — new admin menu
const mainMenuItems = [
  { title: "Dashboard",     url: "/admin",             icon: LayoutDashboard, roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Applications",  url: "/admin/applications", icon: Briefcase,      roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Customers",     url: "/admin/customers",   icon: Users,           roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Agents",        url: "/admin/agents",      icon: UserCog,         roles: ["admin", "accountant", "viewer"] },
  { title: "Services",      url: "/admin/services",    icon: Building2,       roles: ["admin", "cms"] },
];

const financeMenuItems = [
  { title: "Payments",        url: "/admin/payments",        icon: CreditCard,    roles: ["admin", "accountant", "booking", "viewer"] },
  { title: "Wallets",         url: "/admin/wallets",         icon: Wallet,        roles: ["admin", "accountant", "viewer"] },
  { title: "Payment Methods", url: "/admin/payment-methods", icon: CreditCard,    roles: ["admin"] },
  { title: "Expenses",        url: "/admin/expenses",        icon: FileText,      roles: ["admin", "accountant", "viewer"] },
  { title: "Accounting",      url: "/admin/accounting",      icon: Calculator,    roles: ["admin", "accountant", "viewer"] },
  { title: "Chart of Accounts", url: "/admin/chart-of-accounts", icon: BookOpenCheck, roles: ["admin", "accountant"] },
  { title: "Agent Payouts",   url: "/admin/agent-payouts",   icon: Wallet,        roles: ["admin", "accountant"] },
  { title: "Reports",         url: "/admin/reports",         icon: BarChart3,     roles: ["admin", "accountant", "viewer"] },
];

const toolsMenuItems = [
  { title: "CMS",            url: "/admin/cms",           icon: Pencil,     roles: ["admin", "cms"] },
  { title: "Notifications",  url: "/admin/notifications", icon: Bell,       roles: ["admin"] },
  { title: "Users",          url: "/admin/users",         icon: Users,      roles: ["admin"] },
  { title: "Audit Logs",     url: "/admin/audit-logs",    icon: Shield,     roles: ["admin"] },
  { title: "Security & 2FA", url: "/admin/security",      icon: ShieldCheck, roles: ["admin"] },
  { title: "User Guide",     url: "/admin/guide",         icon: BookOpen,   roles: ["admin", "accountant", "booking", "cms"] },
  { title: "Settings",       url: "/admin/settings",      icon: Settings,   roles: ["admin"] },
];

export function AdminSidebar({ role }: { role: AppRole }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const filterByRole = (items: typeof mainMenuItems) =>
    items.filter((item) => role && item.roles.includes(role));

  const renderGroup = (label: string, items: typeof mainMenuItems) => {
    const filtered = filterByRole(items);
    if (filtered.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-3 mb-1">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filtered.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    end={item.url === "/admin"}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                    activeClassName="bg-primary/10 text-primary font-medium"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-md p-1 shadow-sm border border-border">
            <img src={logo} alt="Al Rawsha Logo" className="h-9 w-9 object-contain" />
          </div>
          <span className="font-heading text-base font-bold text-primary">Admin</span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {renderGroup("Main", mainMenuItems)}
        {renderGroup("Finance", financeMenuItems)}
        {renderGroup("Tools", toolsMenuItems)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
