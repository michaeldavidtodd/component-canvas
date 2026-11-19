import { useEffect, useRef, type ReactNode } from "react"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
import type { User } from "@supabase/supabase-js"
import { useAuth } from "@/hooks/useAuth"
import { ThemeContext, type Theme } from "@/hooks/useTheme"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

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

function ThemeProviderInner({ children, user, toast }: { children: ReactNode, user: User | null, toast: ReturnType<typeof useToast>["toast"] }) {
  const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme()
  const loadedForUser = useRef<string | null>(null)

  // Load theme preference from user profile once per user. Keying this on the
  // user (not the current theme) avoids a race where a freshly saved theme is
  // overwritten by a stale profile fetch.
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user) return
      if (loadedForUser.current === user.id) return
      loadedForUser.current = user.id

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('user_id', user.id)
          .single()

        if (profile?.theme_preference) {
          setNextTheme(profile.theme_preference)
        }
      } catch (error) {
        console.error('Error loading user theme preference:', error)
      }
    }

    loadUserTheme()
  }, [user, setNextTheme])

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
    <ThemeContext.Provider value={{ theme: (nextTheme ?? "system") as Theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
