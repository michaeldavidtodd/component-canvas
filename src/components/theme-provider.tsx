import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { useAuth } from "@/hooks/useAuth"
import { ThemeContext, type Theme } from "@/hooks/useTheme"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

/**
 * Theme provider replacing `next-themes`.
 *
 * It reproduces the DOM behavior the app relies on — a `.dark`/`.light` class
 * on `<html>`, `localStorage` persistence, live tracking of the OS preference,
 * and `color-scheme` — without the inline `<script>` that next-themes renders
 * inside the component tree. React 19 warns on any `<script>` a component
 * renders, and this client-only app has no SSR markup for the script to
 * pre-apply against anyway; the static script in `index.html` keeps the first
 * paint on-theme instead.
 */

interface ThemeProviderProps {
  attribute?: "class" | `data-${string}`
  themes?: string[]
  defaultTheme?: string
  enableSystem?: boolean
  enableColorScheme?: boolean
  storageKey?: string
  disableTransitionOnChange?: boolean
  nonce?: string
  children: ReactNode
}

const DARK_MEDIA = "(prefers-color-scheme: dark)"

const systemChoice = () => (window.matchMedia(DARK_MEDIA).matches ? "dark" : "light")

const suppressTransitions = (nonce: string) => {
  const style = document.createElement("style")
  if (nonce) style.setAttribute("nonce", nonce)
  style.textContent =
    "*{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
  document.head.appendChild(style)
  // Let the transition suppression register, then restore transitions.
  window.getComputedStyle(document.body)
  window.setTimeout(() => document.head.removeChild(style), 1)
}

export function ThemeProvider({
  children,
  attribute = "data-theme",
  themes = ["light", "dark"],
  defaultTheme = "system",
  enableSystem = true,
  enableColorScheme = true,
  storageKey = "theme",
  disableTransitionOnChange = false,
  nonce = "",
}: ThemeProviderProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  // The stored preference (possibly "system"); the document follows it live.
  const [theme, setThemeState] = useState<string>(() => {
    try {
      return localStorage.getItem(storageKey) || defaultTheme
    } catch {
      return defaultTheme
    }
  })

  const setTheme = useCallback(
    (next: string | ((previous: string) => string)) => {
      const value = typeof next === "function" ? next(theme) : next
      if (!value) return
      setThemeState(value)
      try {
        localStorage.setItem(storageKey, value)
      } catch {
        // localStorage can be unavailable (private browsing); the in-memory
        // state is enough for this session.
      }
    },
    [storageKey, theme],
  )

  // Apply the theme to the document element, mirroring next-themes.
  const applyTheme = useCallback(
    (next: string) => {
      const resolved = next === "system" && enableSystem ? systemChoice() : next
      const root = document.documentElement

      if (attribute === "class") {
        root.classList.remove(...themes)
        if (resolved) root.classList.add(resolved)
      } else if (resolved) {
        root.setAttribute(attribute, resolved)
      } else {
        root.removeAttribute(attribute)
      }

      if (enableColorScheme) {
        const concrete = (name: string) => (themes.includes(name) ? name : null)
        root.style.colorScheme = concrete(resolved) || concrete(defaultTheme) || ""
      }

      if (disableTransitionOnChange) suppressTransitions(nonce)
    },
    [attribute, defaultTheme, disableTransitionOnChange, enableColorScheme, enableSystem, nonce, themes],
  )

  // Runs in a layout effect so the class lands before the first paint.
  useLayoutEffect(() => {
    applyTheme(theme)
  }, [applyTheme, theme])

  // Re-apply when the OS preference flips, so a "system" theme tracks it live.
  useEffect(() => {
    const media = window.matchMedia(DARK_MEDIA)
    const onChange = (event: { matches: boolean }) => {
      if (theme === "system" && enableSystem) applyTheme("system")
    }
    media.addEventListener("change", onChange)
    onChange(media)
    return () => media.removeEventListener("change", onChange)
  }, [theme, enableSystem, applyTheme])

  // Pick up preference changes made in another tab.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return
      if (event.newValue) {
        setThemeState(event.newValue)
      } else {
        setTheme(defaultTheme)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [storageKey, defaultTheme, setTheme])

  // Load theme preference from user profile once per user. Keying this on the
  // user (not the current theme) avoids a race where a freshly saved theme is
  // overwritten by a stale profile fetch.
  const loadedForUser = useRef<string | null>(null)

  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user) return
      if (loadedForUser.current === user.id) return
      loadedForUser.current = user.id

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("theme_preference")
          .eq("user_id", user.id)
          .single()

        if (profile?.theme_preference) {
          setTheme(profile.theme_preference)
        }
      } catch (error) {
        console.error("Error loading user theme preference:", error)
      }
    }

    loadUserTheme()
  }, [user, setTheme])

  // Save theme preference to user profile.
  const setThemeWithSave = async (newTheme: Theme) => {
    setTheme(newTheme)

    if (user) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ theme_preference: newTheme })
          .eq("user_id", user.id)

        if (error) {
          console.error("Error saving theme preference:", error)
          toast({
            title: "Error",
            description: "Failed to save theme preference",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error saving theme preference:", error)
      }
    }
  }

  return (
    <ThemeContext.Provider value={{ theme: theme as Theme, setTheme: setThemeWithSave }}>
      {children}
    </ThemeContext.Provider>
  )
}
