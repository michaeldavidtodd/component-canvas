import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

type Theme = "dark" | "light" | "system"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeProviderInner user={user} toast={toast}>
        {children}
      </ThemeProviderInner>
    </NextThemesProvider>
  )
}

function ThemeProviderInner({ children, user, toast }: { children: React.ReactNode, user: any, toast: any }) {
  const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme() as any
  const [isLoaded, setIsLoaded] = useState(false)

  // Load theme preference from user profile
  useEffect(() => {
    const loadUserTheme = async () => {
      if (user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('theme_preference')
            .eq('user_id', user.id)
            .single()

          if (profile?.theme_preference && profile.theme_preference !== nextTheme) {
            setNextTheme(profile.theme_preference)
          }
        } catch (error) {
          console.error('Error loading user theme preference:', error)
        }
      }
      setIsLoaded(true)
    }

    loadUserTheme()
  }, [user, setNextTheme, nextTheme])

  // Save theme preference to user profile
  const setTheme = async (newTheme: Theme) => {
    setNextTheme(newTheme)
    
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ theme_preference: newTheme })
          .eq('user_id', user.id)

        if (error) {
          console.error('Error saving theme preference:', error)
          toast({
            title: "Error",
            description: "Failed to save theme preference",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error saving theme preference:', error)
      }
    }
  }

  return (
    <ThemeContext.Provider value={{ theme: nextTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}