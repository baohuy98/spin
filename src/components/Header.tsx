import { useTheme } from "@/components/ThemeProvider";
import { useViewTheme } from "@/components/ViewThemeProvider";
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
  Users,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface HeaderProps {
  roomId?: string;
  onCopyLink?: () => void;
  onShowQRCode?: () => void;
  getRoomLink?: () => string;
  onLeave?: () => void;
  pickedMembers?: Array<{ name: string; timestamp: Date }>;
}

export function Header({ roomId, onCopyLink, getRoomLink, onLeave, pickedMembers = [] }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { viewTheme, setViewTheme } = useViewTheme();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPickedMembersModal, setShowPickedMembersModal] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const getViewThemeIcon = () => {
    switch (viewTheme) {
      case 'christmas':
        return '🎄';
      case 'lunar-new-year':
        return '🧧';
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getViewThemeLabel = () => {
    switch (viewTheme) {
      case 'christmas':
        return 'Christmas';
      case 'lunar-new-year':
        return 'Lunar New Year';
      default:
        return 'None';
    }
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

          {/* Picked Members Icon - Only show when there are picked members */}
          {pickedMembers.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPickedMembersModal(true)}
                  className="relative"
                >
                  <Users className="h-5 w-5" />
                  {pickedMembers.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {pickedMembers.length}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Picked Members ({pickedMembers.length})</p>
              </TooltipContent>
            </Tooltip>
          )}

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

          {/* Festive Theme Selector */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {typeof getViewThemeIcon() === 'string' ? (
                      <span className="text-xl">{getViewThemeIcon()}</span>
                    ) : (
                      getViewThemeIcon()
                    )}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Festive Theme: {getViewThemeLabel()}</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setViewTheme('none')}>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>None</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewTheme('christmas')}>
                <span className="mr-2 text-lg">🎄</span>
                <span>Christmas</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewTheme('lunar-new-year')}>
                <span className="mr-2 text-lg">🧧</span>
                <span>Lunar New Year</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
      {showQRModal && roomId && getRoomLink && (
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="sm:max-w-md">
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
          </DialogContent>
        </Dialog>
      )}

      {/* Picked Members Modal */}
      <AnimatePresence>
        {showPickedMembersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center h-screen p-4 z-50"
            onClick={() => setShowPickedMembersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="bg-card border rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold">List of winners</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    Total: {pickedMembers.length} {pickedMembers.length === 1 ? 'pick' : 'picks'}
                  </p>
                </div>

                {/* Members List */}
                <div className="overflow-y-auto max-h-96 space-y-3 pr-2">
                  {pickedMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No members picked yet</p>
                      <p className="text-xs mt-2">Start spinning to see picked members here!</p>
                    </div>
                  ) : (
                    [...pickedMembers].reverse().map((member, index) => (
                      <motion.div
                        key={`${member.name}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-accent rounded-lg p-4 border-l-4 border-primary hover:bg-accent/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-semibold text-lg">{member.name}</p>
                              <p className="text-muted-foreground text-xs">
                                {new Date(member.timestamp).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          {index === 0 && (
                            <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">
                              Latest
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowPickedMembersModal(false)}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
