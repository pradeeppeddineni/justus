import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { loadConfig } from '../config/configLoader';

// Mock PartySocket to prevent real connections
vi.mock('partysocket', () => {
  class MockPartySocket {
    addEventListener() {}
    send = vi.fn();
    close = vi.fn();
  }
  return { default: MockPartySocket };
});

describe('App', () => {
  it('renders without crashing', () => {
    const config = loadConfig();
    const { container } = render(<App config={config} />);
    expect(container).toBeTruthy();
  });

  it('shows connection screen when not connected', () => {
    const config = loadConfig();
    render(<App config={config} />);
    // Should show waiting/connecting message since PartyKit is mocked
    expect(screen.getByText(/connecting|waiting/i)).toBeInTheDocument();
  });
});
