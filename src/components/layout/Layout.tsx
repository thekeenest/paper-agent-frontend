import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Search, 
  FileBarChart, 
  Moon, 
  Sun,
  Github,
  BookOpen,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'New Analysis', href: '/analyze', icon: Search },
  { name: 'Results', href: '/results', icon: FileBarChart },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { theme, toggleTheme, setTheme } = useThemeStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])
  
  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [setTheme])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 border-b",
        mobile ? "h-16 px-4" : "h-16 px-6"
      )}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground flex-shrink-0">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-lg leading-none truncate">PaperAgent</h1>
          <p className="text-xs text-muted-foreground truncate">Conference Analysis</p>
        </div>
        {mobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => mobile && setMobileMenuOpen(false)}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={mobile ? "activeNavMobile" : "activeNav"}
                  className="absolute inset-0 bg-primary/10 rounded-lg"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className={cn(
                'h-5 w-5 relative z-10 transition-colors flex-shrink-0',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )} />
              <span className="relative z-10">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Theme</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
        <a
          href="https://github.com/thekeenest/paper-agent"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Github className="h-4 w-4" />
          <span>View on GitHub</span>
        </a>
        <p className="text-xs text-muted-foreground">
          v1.0.0 • Курсовая работа
        </p>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-card/80 backdrop-blur-xl border-b flex items-center px-4 gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-bold truncate">PaperAgent</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="ml-auto"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card/95 backdrop-blur-xl border-r flex flex-col"
            >
              <NavContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-card/50 backdrop-blur-xl border-r flex-col">
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="container py-6 px-4 sm:py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
