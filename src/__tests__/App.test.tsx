import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { loadConfig } from '../config/configLoader';

describe('App', () => {
  it('renders couple name from config', () => {
    const config = loadConfig();
    render(<App config={config} />);
    expect(screen.getByText(config.meta.couple_name)).toBeInTheDocument();
  });
});
