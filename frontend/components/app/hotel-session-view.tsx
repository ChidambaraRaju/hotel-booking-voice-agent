'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import {
  Bed,
  Buildings,
  Calendar,
  Check,
  Clock,
  Hourglass,
  Microphone,
  MicrophoneSlash,
  Phone,
  Spinner,
  Ticket,
  Warning,
  X,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/shadcn/utils';

interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'success' | 'error';
  timestamp: Date;
}

interface BookingInfo {
  id: string;
  room_type: string;
  booking_date: string;
  num_days: number;
  features: Record<string, boolean>;
}

function getToolIcon(toolName: string) {
  switch (toolName) {
    case 'get_bookings':
      return <Ticket className="size-4" />;
    case 'create_booking':
      return <Bed className="size-4" />;
    case 'modify_booking':
      return <Clock className="size-4" />;
    case 'cancel_booking':
      return <X className="size-4" />;
    default:
      return <Warning className="size-4" />;
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
    /Your booking is ([\w\s]+) room.*?(\d{4}-\d{2}-\d{2}).*?(\d+) days/i,
    /(\w+) room.*?(?:starting|from|on) ([\d-]+).*?(\d+) nights?/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        id: match[1] || 'unknown',
        room_type: (match[2] || 'standard').toLowerCase(),
        booking_date: match[3] || new Date().toISOString().split('T')[0],
        num_days: parseInt(match[4] || '1', 10),
        features: {},
      };
    }
  }
  return null;
}

function ConversationPanel({ messages, agentState }: { messages: unknown[]; agentState: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-border/50 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10">
            <Buildings className="size-5 text-amber-500" weight="duotone" />
          </div>
          <div>
            <h2 className="text-foreground font-semibold">Grand Hotel</h2>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'size-2 rounded-full',
                  agentState === 'listening' && 'animate-pulse bg-emerald-500',
                  agentState === 'thinking' && 'animate-pulse bg-amber-500',
                  agentState === 'speaking' && 'animate-pulse bg-blue-500',
                  agentState === 'initializing' && 'bg-muted-foreground'
                )}
              />
              <span className="text-muted-foreground text-xs capitalize">{agentState}</span>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/10 to-amber-600/5">
                <Hourglass className="size-8 text-amber-500/50" />
              </div>
              <p className="text-muted-foreground text-sm">Connecting to agent...</p>
              <p className="text-muted-foreground/70 mt-1 text-xs">
                Please tell me your name and date of birth
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((msg: unknown, i: number) => {
                const message = msg as { message?: string; from?: { isLocal?: boolean } };
                const isUser = message.from?.isLocal === true;
                const text = message.message || '';

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    className={cn('flex gap-3', isUser && 'flex-row-reverse')}
                  >
                    <div
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full',
                        isUser
                          ? 'from-primary to-primary/80 text-primary-foreground bg-gradient-to-br'
                          : 'from-muted to-muted/80 text-muted-foreground bg-gradient-to-br'
                      )}
                    >
                      {isUser ? (
                        <span className="text-xs font-bold">U</span>
                      ) : (
                        <Buildings className="size-4" weight="duotone" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-3',
                        isUser
                          ? 'from-primary to-primary/90 text-primary-foreground rounded-tr-sm bg-gradient-to-br'
                          : 'from-card to-card/80 border-border/50 text-foreground rounded-tl-sm border bg-gradient-to-br'
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {agentState === 'thinking' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <div className="from-muted to-muted/80 text-muted-foreground flex size-8 items-center justify-center rounded-full bg-gradient-to-br">
                  <Buildings className="size-4" weight="duotone" />
                </div>
                <div className="from-card to-card/80 border-border/50 rounded-2xl rounded-tl-sm border bg-gradient-to-br px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Spinner className="size-4 animate-spin text-amber-500" />
                    <span className="text-muted-foreground text-sm">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function AgentActivityPanel({
  toolCalls,
  currentBooking,
  agentState,
}: {
  toolCalls: ToolCall[];
  currentBooking: BookingInfo | null;
  agentState: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-border/50 border-b px-6 py-4">
        <h2 className="text-foreground font-semibold">Agent Activity</h2>
        <p className="text-muted-foreground text-xs">Real-time pipeline status</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Pipeline Status */}
          <div>
            <h3 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
              Pipeline Status
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {['STT', 'LLM', 'TTS'].map((stage, i) => (
                <div
                  key={stage}
                  className="from-card to-card/80 border-border/50 relative rounded-lg border bg-gradient-to-br p-3 text-center"
                >
                  <div
                    className={cn(
                      'mx-auto mb-1 size-2 rounded-full',
                      agentState === 'initializing' && 'bg-muted-foreground',
                      agentState === 'listening' && i === 0 && 'animate-pulse bg-emerald-500',
                      agentState === 'thinking' && i === 1 && 'animate-pulse bg-amber-500',
                      agentState === 'speaking' && i === 2 && 'animate-pulse bg-blue-500',
                      (agentState === 'listening' || agentState === 'speaking') &&
                        i !== 0 &&
                        i !== 2 &&
                        'bg-emerald-500',
                      agentState === 'thinking' && i === 0 && 'bg-emerald-500',
                      agentState === 'thinking' && i === 2 && 'bg-emerald-500'
                    )}
                  />
                  <p className="text-foreground text-xs font-medium">{stage}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator className="border-border/50" />

          {/* Tool Calls */}
          <div>
            <h3 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
              Tool Calls
            </h3>
            {toolCalls.length === 0 ? (
              <div className="border-border bg-muted/20 rounded-lg border border-dashed p-4 text-center">
                <p className="text-muted-foreground text-xs italic">No tools called yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {toolCalls.map((tool) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'border-border/50 from-card to-card/50 flex items-center gap-3 rounded-lg border bg-gradient-to-br p-3',
                      tool.status === 'success' && 'border-emerald-500/20 bg-emerald-500/5',
                      tool.status === 'pending' && 'border-amber-500/20 bg-amber-500/5',
                      tool.status === 'error' && 'border-red-500/20 bg-red-500/5'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full',
                        tool.status === 'success' && 'bg-emerald-500/20 text-emerald-500',
                        tool.status === 'pending' && 'bg-amber-500/20 text-amber-500',
                        tool.status === 'error' && 'bg-red-500/20 text-red-500'
                      )}
                    >
                      {tool.status === 'pending' ? (
                        <Spinner className="size-4 animate-spin" />
                      ) : tool.status === 'success' ? (
                        <Check className="size-4" weight="bold" />
                      ) : (
                        <X className="size-4" weight="bold" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getToolIcon(tool.name)}
                      <span className="text-sm font-medium">{getToolLabel(tool.name)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <Separator className="border-border/50" />

          {/* Booking Details */}
          <div>
            <h3 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
              Current Booking
            </h3>
            {currentBooking ? (
              <Card className="from-card border-amber-500/20 bg-gradient-to-br to-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bed className="size-5 text-amber-500" weight="duotone" />
                    <span className="capitalize">{currentBooking.room_type}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      Confirmed
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="size-4" />
                      <span>{currentBooking.booking_date}</span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Clock className="size-4" />
                      <span>{currentBooking.num_days} nights</span>
                    </div>
                  </div>
                  {Object.keys(currentBooking.features).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {Object.entries(currentBooking.features).map(
                        ([key, value]) =>
                          value && (
                            <Badge key={key} variant="secondary" className="text-xs capitalize">
                              {key.replace('_', ' ')}
                            </Badge>
                          )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="border-border bg-muted/20 rounded-lg border border-dashed p-6 text-center">
                <Bed className="text-muted-foreground/50 mx-auto mb-2 size-8" />
                <p className="text-muted-foreground text-xs italic">No booking details yet</p>
                <p className="text-muted-foreground/70 mt-1 text-xs">
                  Booking information will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
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

export function HotelSessionView({
  preConnectMessage = 'Welcome to Grand Hotel. Please tell me your name.',
  supportsChatInput = false,
  supportsVideoInput = false,
  supportsScreenShare = false,
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
  const { state: agentState } = useAgent();
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [currentBooking, setCurrentBooking] = useState<BookingInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Parse messages for tool calls and booking info
  useEffect(() => {
    for (const msg of messages) {
      const message = msg as { message?: string; from?: { isLocal?: boolean } };
      const content = message.message || '';
      const isUser = message.from?.isLocal === true;

      if (!isUser && content) {
        const toolNames = ['get_bookings', 'create_booking', 'modify_booking', 'cancel_booking'];

        for (const toolName of toolNames) {
          if (content.toLowerCase().includes(toolName.toLowerCase())) {
            setToolCalls((prev) => {
              const exists = prev.some(
                (t) => t.name === toolName && Date.now() - t.timestamp.getTime() < 15000
              );
              if (!exists) {
                return [
                  ...prev,
                  {
                    id: `${toolName}-${Date.now()}`,
                    name: toolName,
                    status: 'success',
                    timestamp: new Date(),
                  },
                ];
              }
              return prev;
            });
          }
        }

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
      className={cn(
        'bg-background relative flex h-full w-full flex-col overflow-hidden',
        className
      )}
    >
      {/* Main content - split panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Conversation */}
        <div className="border-border/50 w-1/2 border-r">
          <ConversationPanel messages={messages} agentState={agentState} />
        </div>

        {/* Right Panel - Agent Activity */}
        <div className="w-1/2">
          <AgentActivityPanel
            toolCalls={toolCalls}
            currentBooking={currentBooking}
            agentState={agentState}
          />
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="border-border/50 from-background to-background/95 border-t bg-gradient-to-t px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 transition-all',
                isMuted
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
            >
              {isMuted ? (
                <MicrophoneSlash className="size-5" weight="fill" />
              ) : (
                <Microphone className="size-5" weight="fill" />
              )}
              <span className="text-sm font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
          </div>

          <button
            onClick={() => session.end()}
            className="flex items-center gap-2 rounded-full bg-red-500/20 px-6 py-2 text-red-500 transition-all hover:bg-red-500/30"
          >
            <Phone className="size-5 rotate-[135deg]" weight="fill" />
            <span className="text-sm font-medium">End Call</span>
          </button>

          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            <span>Connected</span>
          </div>
        </div>
      </div>
    </section>
  );
}
