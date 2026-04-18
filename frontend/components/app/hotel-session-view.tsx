'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, type MotionProps, motion } from 'motion/react';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import {
  Bed,
  Calendar,
  Clock,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Wrench,
  X,
} from '@phosphor-icons/react';
import { AgentChatTranscript } from '@/components/agents-ui/agent-chat-transcript';
import {
  AgentControlBar,
  type AgentControlBarControls,
} from '@/components/agents-ui/agent-control-bar';
import { TileLayout } from '@/components/agents-ui/blocks/agent-session-view-01/components/tile-view';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/shadcn/utils';

const MotionMessage = motion.create(Shimmer);

const BOTTOM_VIEW_MOTION_PROPS: MotionProps = {
  variants: {
    visible: {
      opacity: 1,
      translateY: '0%',
    },
    hidden: {
      opacity: 0,
      translateY: '100%',
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.3,
    delay: 0.5,
    ease: 'easeOut',
  },
};

const CHAT_MOTION_PROPS: MotionProps = {
  variants: {
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeOut',
        duration: 0.3,
      },
    },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.2,
        ease: 'easeOut',
        duration: 0.3,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

const SHIMMER_MOTION_PROPS: MotionProps = {
  variants: {
    visible: {
      opacity: 1,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0.8,
      },
    },
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

function Fade({ top = false, bottom = false, className }: FadeProps) {
  return (
    <div
      className={cn(
        'from-background pointer-events-none h-4 bg-linear-to-b to-transparent',
        top && 'bg-linear-to-b',
        bottom && 'bg-linear-to-t',
        className
      )}
    />
  );
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: string;
  timestamp: Date;
}

interface BookingInfo {
  id: string;
  room_type: string;
  booking_date: string;
  num_days: number;
  features: Record<string, boolean>;
}

export interface HotelSessionViewProps {
  preConnectMessage?: string;
  supportsChatInput?: boolean;
  supportsVideoInput?: boolean;
  supportsScreenShare?: boolean;
  isPreConnectBufferEnabled?: boolean;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;
  className?: string;
}

function getToolIcon(toolName: string) {
  switch (toolName) {
    case 'get_bookings':
      return <MagnifyingGlass className="size-4" />;
    case 'create_booking':
      return <Plus className="size-4" />;
    case 'modify_booking':
      return <PencilSimple className="size-4" />;
    case 'cancel_booking':
      return <X className="size-4" />;
    default:
      return <Wrench className="size-4" />;
  }
}

function getToolLabel(toolName: string) {
  switch (toolName) {
    case 'get_bookings':
      return 'View Bookings';
    case 'create_booking':
      return 'Create Booking';
    case 'modify_booking':
      return 'Modify Booking';
    case 'cancel_booking':
      return 'Cancel Booking';
    default:
      return toolName;
  }
}

function parseBookingFromMessage(message: string): BookingInfo | null {
  const patterns = [
    /booking ID is (\w+).*?for a (\w+) room starting ([\d-]+) for (\d+) days/i,
    /Room type (\w+).*?Check-in date ([\d-]+).*?Duration (\d+) days/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        id: match[1] || 'unknown',
        room_type: match[2] || 'standard',
        booking_date: match[3] || new Date().toISOString().split('T')[0],
        num_days: parseInt(match[4] || '1', 10),
        features: {},
      };
    }
  }
  return null;
}

function BookingCard({ booking }: { booking: BookingInfo }) {
  const checkOutDate = new Date(booking.booking_date);
  checkOutDate.setDate(checkOutDate.getDate() + booking.num_days);

  return (
    <Card className="from-card to-card/80 mx-auto w-full max-w-md bg-gradient-to-br">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bed className="text-primary size-5" />
          <span className="font-semibold capitalize">{booking.room_type} Room</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground size-4" />
            <span>Check-in: {booking.booking_date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground size-4" />
            <span>{booking.num_days} days</span>
          </div>
        </div>
        {Object.keys(booking.features).length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="flex flex-wrap gap-2">
              {Object.entries(booking.features).map(([key, value]) =>
                value ? (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key.replace('_', ' ')}
                  </Badge>
                ) : null
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ToolCallBadges({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence mode="popLayout">
        {toolCalls.map((tool, index) => (
          <motion.div
            key={`${tool.name}-${tool.timestamp.getTime()}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5 px-3 py-1',
                tool.result && 'border-green-500/50 bg-green-500/10'
              )}
            >
              {getToolIcon(tool.name)}
              <span>{getToolLabel(tool.name)}</span>
            </Badge>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function HotelSessionView({
  preConnectMessage = 'Welcome to Grand Hotel. Please tell me your name.',
  supportsChatInput = true,
  supportsVideoInput = true,
  supportsScreenShare = true,
  isPreConnectBufferEnabled = true,

  audioVisualizerType,
  audioVisualizerColor,
  audioVisualizerColorShift,
  audioVisualizerBarCount,
  audioVisualizerGridRowCount,
  audioVisualizerGridColumnCount,
  audioVisualizerRadialBarCount,
  audioVisualizerRadialRadius,
  audioVisualizerWaveLineWidth,
  ref,
  className,
  ...props
}: React.ComponentProps<'section'> & HotelSessionViewProps) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const [chatOpen, setChatOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { state: agentState } = useAgent();
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [currentBooking, setCurrentBooking] = useState<BookingInfo | null>(null);

  const controls: AgentControlBarControls = {
    leave: true,
    microphone: true,
    chat: supportsChatInput,
    camera: supportsVideoInput,
    screenShare: supportsScreenShare,
  };

  useEffect(() => {
    const lastMessage = messages.at(-1);
    const lastMessageIsLocal = lastMessage?.from?.isLocal === true;

    if (scrollAreaRef.current && lastMessageIsLocal) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }

    // Parse tool calls and booking info from messages
    for (const msg of messages) {
      const content = 'message' in msg ? String(msg.message) : '';

      // Look for tool call patterns in agent responses
      if (!msg.from?.isLocal && content) {
        const toolPatterns = [/get_bookings|cancel_booking|create_booking|modify_booking/g];

        for (const pattern of toolPatterns) {
          const matches = content.match(new RegExp(pattern.source, 'g'));
          if (matches) {
            for (const match of matches) {
              setToolCalls((prev) => {
                const exists = prev.some(
                  (t) => t.name === match && Date.now() - t.timestamp.getTime() < 5000
                );
                if (!exists) {
                  return [...prev, { name: match, args: {}, timestamp: new Date() }];
                }
                return prev;
              });
            }
          }
        }

        // Parse booking info
        const booking = parseBookingFromMessage(content);
        if (booking) {
          setCurrentBooking(booking);
        }
      }
    }
  }, [messages]);

  return (
    <section
      ref={ref}
      className={cn('bg-background relative z-10 h-full w-full overflow-hidden', className)}
      {...props}
    >
      <Fade top className="absolute inset-x-4 top-0 z-10 h-40" />

      {/* Main content area */}
      <div className="absolute top-0 bottom-[135px] flex w-full flex-col md:bottom-[170px]">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              {...CHAT_MOTION_PROPS}
              className="flex h-full w-full flex-col gap-4 space-y-3 transition-opacity duration-300 ease-out"
            >
              <AgentChatTranscript
                agentState={agentState}
                messages={messages}
                className="mx-auto w-full max-w-2xl [&_.is-user>div]:rounded-[22px] [&>div>div]:px-4 [&>div>div]:pt-40 md:[&>div>div]:px-6"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Non-chat view: Show tool badges and booking card */}
      {!chatOpen && (
        <div className="absolute inset-x-4 top-16 bottom-32 z-40 flex flex-col gap-4 overflow-auto">
          {/* Tool call badges */}
          <ToolCallBadges toolCalls={toolCalls} />

          {/* Booking details card */}
          {currentBooking && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <BookingCard booking={currentBooking} />
            </motion.div>
          )}
        </div>
      )}

      {/* Tile layout */}
      <TileLayout
        chatOpen={chatOpen}
        audioVisualizerType={audioVisualizerType}
        audioVisualizerColor={audioVisualizerColor}
        audioVisualizerColorShift={audioVisualizerColorShift}
        audioVisualizerBarCount={audioVisualizerBarCount}
        audioVisualizerRadialBarCount={audioVisualizerRadialBarCount}
        audioVisualizerRadialRadius={audioVisualizerRadialRadius}
        audioVisualizerGridRowCount={audioVisualizerGridRowCount}
        audioVisualizerGridColumnCount={audioVisualizerGridColumnCount}
        audioVisualizerWaveLineWidth={audioVisualizerWaveLineWidth}
      />

      {/* Bottom */}
      <motion.div
        {...BOTTOM_VIEW_MOTION_PROPS}
        className="absolute inset-x-3 bottom-0 z-50 md:inset-x-12"
      >
        {/* Pre-connect message */}
        {isPreConnectBufferEnabled && (
          <AnimatePresence>
            {messages.length === 0 && (
              <MotionMessage
                key="pre-connect-message"
                duration={2}
                aria-hidden={messages.length > 0}
                {...SHIMMER_MOTION_PROPS}
                className="pointer-events-none mx-auto block w-full max-w-2xl pb-4 text-center text-sm font-semibold"
              >
                {preConnectMessage}
              </MotionMessage>
            )}
          </AnimatePresence>
        )}
        <div className="bg-background relative mx-auto max-w-2xl pb-3 md:pb-12">
          <Fade bottom className="absolute inset-x-0 top-0 h-4 -translate-y-full" />
          <AgentControlBar
            variant="livekit"
            controls={controls}
            isChatOpen={chatOpen}
            isConnected={session.isConnected}
            onDisconnect={session.end}
            onIsChatOpenChange={setChatOpen}
          />
        </div>
      </motion.div>
    </section>
  );
}
