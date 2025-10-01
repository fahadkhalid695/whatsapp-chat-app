import { render } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

// Mock the auth store
vi.mock('./store/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    token: null,
    user: null,
  }),
}));

// Mock the socket service
vi.mock('./services/socket', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // The app should render successfully
    expect(document.body).toBeTruthy();
  });
});