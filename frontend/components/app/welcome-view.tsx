import { Bed, Bell, Buildings } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';

function WelcomeImage() {
  return (
    <div className="relative mb-6">
      <div className="from-primary/20 to-primary/5 absolute inset-0 rounded-full bg-gradient-to-br blur-2xl" />
      <div className="from-primary/10 to-primary/5 border-primary/20 relative flex size-20 items-center justify-center rounded-full border bg-gradient-to-br">
        <Buildings className="text-primary size-10" weight="duotone" />
      </div>
      <div className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full border border-amber-400/20 bg-gradient-to-br from-amber-400/20 to-amber-400/5">
        <Bell className="size-4 text-amber-500" weight="duotone" />
      </div>
      <div className="absolute -bottom-2 -left-2 flex size-6 items-center justify-center rounded-full border border-emerald-400/20 bg-gradient-to-br from-emerald-400/20 to-emerald-400/5">
        <Bed className="size-3 text-emerald-500" weight="duotone" />
      </div>
    </div>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref}>
      <section className="bg-background flex flex-col items-center justify-center text-center">
        <WelcomeImage />

        <p className="text-foreground max-w-prose pt-1 leading-6 font-medium">
          Book and manage your hotel reservations by voice
        </p>

        <Button
          size="lg"
          onClick={onStartCall}
          className="mt-6 w-64 rounded-full font-mono text-xs font-bold tracking-wider uppercase"
        >
          {startButtonText}
        </Button>
      </section>

      <div className="fixed bottom-5 left-0 flex w-full items-center justify-center">
        <p className="text-muted-foreground max-w-prose pt-1 text-xs leading-5 font-normal text-pretty md:text-sm">
          Need help getting set up? Check out the{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://docs.livekit.io/agents/start/voice-ai/"
            className="underline"
          >
            Voice AI quickstart
          </a>
          .
        </p>
      </div>
    </div>
  );
};
