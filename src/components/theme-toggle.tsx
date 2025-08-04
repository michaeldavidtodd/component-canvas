import { Moon, Sun, Monitor } from "lucide-react"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useTheme } from "./theme-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <ToggleGroup 
      type="single" 
      value={theme} 
      onValueChange={(value) => {
        if (value) setTheme(value as "light" | "dark" | "system")
      }}
      className="border rounded-md"
    >
      <ToggleGroupItem value="light" aria-label="Light theme" size="sm">
        <Sun className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark theme" size="sm">
        <Moon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="system" aria-label="System theme" size="sm">
        <Monitor className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}