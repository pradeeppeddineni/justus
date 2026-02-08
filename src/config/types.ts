// Full TypeScript types for the Just Us config

export interface DeviceProfile {
  width: number;
  height: number;
  pixel_ratio: number;
  safe_area_top: number;
  safe_area_bottom: number;
  corner_radius: number;
  notch_type: 'dynamic_island' | 'punch_hole' | 'none';
}

export interface MetaConfig {
  couple_name: string;
  url_slug: string;
  valentines_date: string;
  timezone: string;
}

export interface DevicesConfig {
  p1: { model: string };
  p2: { model: string };
  profiles: Record<string, DeviceProfile>;
}

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  background: string;
  text: string;
  font_display: string;
  font_body: string;
  particle_color: string;
  custom_css: string;
}

export interface QuestionConfig {
  question: string;
  category: 'deep' | 'fun' | 'romantic';
}

export interface MemoryPair {
  real: string;
  fake: string;
  who_tells: 'p1' | 'p2';
}

export interface RewriteMemory {
  description: string;
  image: string;
  date: string;
}

export interface ComeCloserPrompt {
  type: 'proximity' | 'touch' | 'kiss' | 'embrace';
  instruction: string;
  then: string;
  duration?: number;
  resume_trigger?: 'shake' | 'tap';
}

export interface HeatForfeits {
  strip: {
    text: string;
    resume: 'tap' | 'shake';
  };
  kiss: {
    prompts: string[];
    resume: 'tap' | 'shake';
  };
  intimate: {
    prompts: {
      mild: string[];
      medium: string[];
      spicy: string[];
      fire: string[];
    };
    resume: 'tap' | 'shake';
  };
}

export interface CardFrameOptions {
  polaroid: {
    border_color: string;
    caption_area: boolean;
    rotation: string;
  };
  filmstrip: {
    frames: number;
    sprocket_holes: boolean;
  };
  splitscreen: {
    split: 'diagonal' | 'vertical' | 'horizontal';
    blend: string;
  };
  collage: {
    layout: string;
    background: string;
  };
}

export interface GhostFragment {
  act: string;
  fragment: string;
  hide_method: 'opacity' | 'micro_text' | 'stroke' | 'particle' | 'star';
}

export interface ShakeMoment {
  act: string;
  trigger_after: string;
}

export interface ActsConfig {
  enabled: string[];

  invitation: {
    teaser_text: string;
  };

  the_lock: {
    instruction_p1: string;
    instruction_p2: string;
    sync_type: 'simultaneous_tap' | 'proximity';
  };

  know_me: {
    time_per_question: number;
    questions: QuestionConfig[];
  };

  lie_detector: {
    rounds: number;
    memories: MemoryPair[];
  };

  through_your_eyes: {
    canvas_bg: string;
    stroke_color_p1: string;
    stroke_color_p2: string;
    rounds: number;
    prompt: string;
  };

  heartbeat: {
    duration: number;
    sync_animation: 'merge' | 'pulse' | 'orbit';
  };

  the_unsaid: {
    prompt: string;
    reveal_speed: 'slow' | 'medium' | 'fast';
    particle_count: number;
  };

  rewrite_history: {
    memories: RewriteMemory[];
  };

  come_closer: {
    prompts: ComeCloserPrompt[];
  };

  heat: {
    mode: 'truth_or_strip' | 'truth_or_dare' | 'classic';
    intensity: 'mild' | 'medium' | 'spicy' | 'fire';
    rounds: number;
    escalation: 'auto' | 'manual';
    truths: {
      mild: string[];
      medium: string[];
      spicy: string[];
      fire: string[];
    };
    forfeits: HeatForfeits;
  };

  our_moment: {
    mode: string;
    instructions: {
      p1: string;
      p2: string;
    };
    card_style: 'polaroid' | 'filmstrip' | 'splitscreen' | 'collage';
    card_overlay: {
      text: string;
      font: string;
      position: string;
    };
    frame_options: CardFrameOptions;
  };

  the_promise: {
    star_field_density: number;
    prompt: string;
    star_save: boolean;
  };

  the_glitch: {
    credits_text: string[];
    video_url: string;
  };

  ghost: {
    fragments: GhostFragment[];
    full_message: string;
  };

  shake_moments: ShakeMoment[];
}

export interface AssetsConfig {
  music: {
    ambient: string;
    heartbeat: string;
    finale: string;
  };
  fonts: {
    display: string;
    body: string;
  };
}

export interface ExportConfig {
  format: 'json' | 'pdf';
  include: string[];
}

export interface JustUsConfig {
  meta: MetaConfig;
  devices: DevicesConfig;
  theme: ThemeConfig;
  acts: ActsConfig;
  assets: AssetsConfig;
  export: ExportConfig;
}
