import type { JustUsConfig } from './config/types';

interface AppProps {
  config: JustUsConfig;
}

export default function App({ config }: AppProps) {
  return (
    <div className="h-full w-full bg-surface flex items-center justify-center safe-area">
      <p className="font-display text-warm text-title animate-breathe">
        {config.meta.couple_name}
      </p>
    </div>
  );
}
