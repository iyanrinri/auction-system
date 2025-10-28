// Global test setup
import 'reflect-metadata';

// Set timezone to UTC for consistent date testing
process.env.TZ = 'UTC';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test_auction_system';
process.env.RABBITMQ_URL = 'amqp://test:test@localhost:5672';

// Suppress console output during tests unless explicitly needed
const originalConsole = { ...console };

// Only suppress in test environment
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
}

// Global test timeout
jest.setTimeout(30000);

// Restore console for debugging when needed
(global as any).restoreConsole = () => {
  Object.assign(console, originalConsole);
};

// Mock Date.now() for consistent time-based testing
const mockDate = new Date('2025-10-28T10:00:00.000Z');
const originalDateNow = Date.now;

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
});

afterAll(() => {
  Date.now = originalDateNow;
});

// Global beforeEach to reset mocks
beforeEach(() => {
  jest.clearAllMocks();
});

// Global afterEach to clean up
afterEach(() => {
  jest.restoreAllMocks();
});

// Add custom matchers if needed
expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },
});

// Declare custom matcher types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
    }
  }
}