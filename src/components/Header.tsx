import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Link2,
  LogOut,
  Moon,
  QrCode,
  Share2,
  Sun,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface HeaderProps {
  roomId?: string;
  onCopyLink?: () => void;
  onShowQRCode?: () => void;
  getRoomLink?: () => string;
  onLeave?: () => void;
}

export function Header({ roomId, onCopyLink, getRoomLink, onLeave }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [showQRModal, setShowQRModal] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink();
    } else if (getRoomLink) {
      const link = getRoomLink();
      if (link) {
        navigator.clipboard.writeText(link);
        toast.success('Room link copied to clipboard!');
      }
    }
  };
  const handleShowQRCode = () => {
    setShowQRModal(true);
  };


  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-background border-b backdrop-blur supports-backdrop-filter:bg-background/60">
      {/* Logo Section */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          <h1 className="text-lg font-semibold">Spin</h1>
        </div>
      </div>

      {/* Action Icons Section */}
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {
            getRoomLink && (<DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="mr-2 h-4 w-4" />
                  <span>Copy Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShowQRCode}>
                  <QrCode className="mr-2 h-4 w-4" />
                  <span>Show QR Code</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>)
          }

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{theme === "dark" ? "Light Mode" : "Dark Mode"}</p>
            </TooltipContent>
          </Tooltip>


          {onLeave && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onLeave} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Leave Room</p>
              </TooltipContent>
            </Tooltip>
          )}

        </div>
      </TooltipProvider>

      {/* QR Code Dialog */}
      {
        showQRModal && roomId && getRoomLink && (
          <Dialog open={showQRModal}>
            <DialogContent className="sm:max-w-md" showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>Share Room</DialogTitle>
              </DialogHeader>
              <div className="text-center space-y-6">
                {/* QR Code */}
                <div className="bg-background p-6 rounded-xl border-4 border-primary inline-block">
                  <QRCodeSVG
                    value={getRoomLink()}
                    size={200}
                    level="H"
                  />
                </div>

                {/* Room ID Display */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-semibold">Room ID</p>
                  <div className="bg-accent px-4 py-3 rounded-lg">
                    <p className="font-mono font-bold text-lg text-primary">{roomId}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Scan the QR code or share the link/ID with viewers to join this room
                </p>
              </div>
              <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                  <Button type="button" variant="secondary"
                    onClick={() => setShowQRModal(false)}
                  >
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      }


    </header>
  );
}
