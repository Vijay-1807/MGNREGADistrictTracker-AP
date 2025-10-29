import { Home, BarChart3, GitCompare } from 'lucide-react'
import { NavBar } from "./tubelight-navbar"

export function NavBarDemo() {
  const navItems = [
    { name: 'Home', url: '/', icon: Home },
    { name: 'Historical Performance', url: '/historical', icon: BarChart3 },
    { name: 'Compare', url: '/compare', icon: GitCompare }
  ]

  return <NavBar items={navItems} />
}
