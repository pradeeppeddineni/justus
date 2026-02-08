import { describe, it, expect } from 'vitest';
import { loadConfig } from '../config/configLoader';

describe('configLoader', () => {
  it('loads and parses config.yaml', () => {
    const config = loadConfig();
    expect(config).toBeDefined();
    expect(config.meta).toBeDefined();
    expect(config.theme).toBeDefined();
    expect(config.acts).toBeDefined();
  });

  it('has required meta fields', () => {
    const config = loadConfig();
    expect(config.meta.couple_name).toBeTruthy();
    expect(config.meta.url_slug).toBeTruthy();
    expect(config.meta.valentines_date).toBeTruthy();
    expect(config.meta.timezone).toBeTruthy();
  });

  it('has valid theme colors', () => {
    const config = loadConfig();
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    expect(config.theme.primary).toMatch(hexPattern);
    expect(config.theme.secondary).toMatch(hexPattern);
    expect(config.theme.accent).toMatch(hexPattern);
    expect(config.theme.glow).toMatch(hexPattern);
    expect(config.theme.background).toMatch(hexPattern);
    expect(config.theme.text).toMatch(hexPattern);
  });

  it('has enabled acts list', () => {
    const config = loadConfig();
    expect(config.acts.enabled).toBeInstanceOf(Array);
    expect(config.acts.enabled.length).toBeGreaterThan(0);
  });

  it('has at least one question for know_me', () => {
    const config = loadConfig();
    expect(config.acts.know_me.questions.length).toBeGreaterThan(0);
    expect(config.acts.know_me.questions[0].question).toBeTruthy();
    expect(config.acts.know_me.questions[0].category).toBeTruthy();
  });

  it('has valid device config', () => {
    const config = loadConfig();
    expect(config.devices.p1.model).toBeTruthy();
    expect(config.devices.p2.model).toBeTruthy();
  });

  it('returns same instance on subsequent calls', () => {
    const config1 = loadConfig();
    const config2 = loadConfig();
    expect(config1).toBe(config2);
  });
});
