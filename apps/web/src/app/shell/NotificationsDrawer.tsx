import { Bell } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function NotificationsDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100%-73px)] items-center justify-center">
            <div className="text-center">
              <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">You&apos;re all caught up!</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
