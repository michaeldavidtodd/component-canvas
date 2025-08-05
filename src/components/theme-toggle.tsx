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
      className="border rounded-md p-1"
    >
      <ToggleGroupItem value="light" aria-label="Light theme" size="sm" className="flex items-center gap-1">
        <span className="text-xs">Light</span>
        <Sun className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark theme" size="sm" className="flex items-center gap-1">
        <span className="text-xs">Dark</span>
        <Moon className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="system" aria-label="System theme" size="sm" className="flex items-center gap-1">
        <span className="text-xs">System</span>
        <Monitor className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}