import { GripVertical } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '@lib/utils/cn';

// react-resizable-panels v4 renamed the public API:
//   PanelGroup → Group
//   PanelResizeHandle → Separator
//   Panel → Panel (unchanged)
// The shadcn wrapper here exposes the original shadcn names
// (ResizablePanelGroup / ResizableHandle) so consumers don't have to
// rewrite call sites.
const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) => (
  <ResizablePrimitive.Group
    className={cn('flex h-full w-full data-[panel-group-direction=vertical]:flex-col', className)}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  withHandle,
  className,
  'data-testid': dataTestId,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean;
  'data-testid'?: string;
}) => (
  <ResizablePrimitive.Separator
    data-testid={dataTestId ?? 'handle-resize'}
    className={cn(
      'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90',
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
