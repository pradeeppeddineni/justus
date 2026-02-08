import yaml from 'js-yaml';
import type { JustUsConfig } from './types';
import { deviceProfiles } from './deviceProfiles';

// Import raw YAML at build time via Vite's ?raw suffix
import configRaw from './config.yaml?raw';

let _config: JustUsConfig | null = null;

export function loadConfig(): JustUsConfig {
  if (_config) return _config;

  const parsed = yaml.load(configRaw) as JustUsConfig;
  _config = parsed;
  return _config;
}

export function getConfig(): JustUsConfig {
  if (!_config) {
    return loadConfig();
  }
  return _config;
}

// Theme CSS variables — call once at app init
export function applyThemeToDOM(config: JustUsConfig): void {
  const root = document.documentElement;
  const { theme } = config;

  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-secondary', theme.secondary);
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-glow', theme.glow);
  root.style.setProperty('--color-background', theme.background);
  root.style.setProperty('--color-text', theme.text);
  root.style.setProperty('--color-particle', theme.particle_color);
  root.style.setProperty('--font-display', theme.font_display);
  root.style.setProperty('--font-body', theme.font_body);
}

// Device profile CSS variables — call after player assignment
export function applyDeviceProfile(config: JustUsConfig, player: 'p1' | 'p2'): void {
  const root = document.documentElement;
  const modelKey = config.devices[player].model;
  const profile = config.devices.profiles?.[modelKey]
    ?? deviceProfiles[modelKey]
    ?? deviceProfiles['generic'];

  root.style.setProperty('--safe-area-top', `${profile.safe_area_top}px`);
  root.style.setProperty('--safe-area-bottom', `${profile.safe_area_bottom}px`);
  root.style.setProperty('--corner-radius', `${profile.corner_radius}px`);
  root.style.setProperty('--device-width', `${profile.width}px`);
  root.style.setProperty('--device-height', `${profile.height}px`);
  root.style.setProperty('--device-pixel-ratio', `${profile.pixel_ratio}`);
}
