import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Maximize2,
  Plus,
  Download,
  Share2,
  Settings,
  Sun,
  User,
} from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-background border-b">
      {/* Logo Section */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 via-green-400 to-orange-400 flex items-center justify-center">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          <h1 className="text-lg font-semibold">HeySpinner</h1>
        </div>
      </div>

      {/* Action Icons Section */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon">
          <Maximize2 className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon">
          <Plus className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon">
          <Download className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon">
          <Share2 className="h-5 w-5" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>


        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
