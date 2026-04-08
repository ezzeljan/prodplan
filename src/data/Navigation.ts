export interface NavItem {
  label: string;
  href: string;
}

export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Production Plan", href: "/production-plan" },
];
