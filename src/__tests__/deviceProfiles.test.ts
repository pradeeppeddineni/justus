import { describe, it, expect } from 'vitest';
import { deviceProfiles } from '../config/deviceProfiles';

describe('deviceProfiles', () => {
  it('has a generic fallback profile', () => {
    expect(deviceProfiles['generic']).toBeDefined();
  });

  it('has iPhone 15 Pro profile', () => {
    const profile = deviceProfiles['iphone_15_pro'];
    expect(profile).toBeDefined();
    expect(profile.width).toBe(393);
    expect(profile.height).toBe(852);
    expect(profile.pixel_ratio).toBe(3);
    expect(profile.notch_type).toBe('dynamic_island');
  });

  it('all profiles have required fields', () => {
    for (const [name, profile] of Object.entries(deviceProfiles)) {
      expect(profile.width, `${name} missing width`).toBeGreaterThan(0);
      expect(profile.height, `${name} missing height`).toBeGreaterThan(0);
      expect(profile.pixel_ratio, `${name} missing pixel_ratio`).toBeGreaterThan(0);
      expect(typeof profile.safe_area_top, `${name} missing safe_area_top`).toBe('number');
      expect(typeof profile.safe_area_bottom, `${name} missing safe_area_bottom`).toBe('number');
      expect(typeof profile.corner_radius, `${name} missing corner_radius`).toBe('number');
      expect(['dynamic_island', 'punch_hole', 'none']).toContain(profile.notch_type);
    }
  });

  it('has profiles for major device families', () => {
    const requiredProfiles = [
      'iphone_15_pro',
      'iphone_15_pro_max',
      'iphone_se',
      'pixel_8',
      'samsung_s24',
      'generic',
    ];
    for (const name of requiredProfiles) {
      expect(deviceProfiles[name], `Missing profile: ${name}`).toBeDefined();
    }
  });
});
