import "@testing-library/jest-dom";
import { POST } from '@/app/api/(auth)/login/route.js'; // Adjust path to match your API file
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  experimenters: {
    findUnique: jest.fn(),
  },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('Login API Tests', () => {
  let mockRequest;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create fresh mock request for each test
    mockRequest = {
      json: jest.fn(),
    };
  });

  // Test 1: Successful login
  test('should login successfully with correct credentials', async () => {
    // Setup test data
    const testUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword123',
      name: 'Test User'
    };

    // Mock request data
    mockRequest.json.mockResolvedValue({
      Email: 'test@example.com',
      password: 'correctPassword'
    });

    // Mock database response
    prisma.experimenters.findUnique.mockResolvedValue(testUser);
    
    // Mock password comparison
    bcrypt.compare.mockResolvedValue(true);

    // Execute the API function
    const response = await POST(mockRequest);
    const responseData = await response.json();

    // Check results
    expect(response.status).toBe(200);
    expect(responseData.message).toBe('Login successful');
    expect(responseData.user.email).toBe('test@example.com');
    expect(responseData.user).not.toHaveProperty('password');
  });

  // Test 2: Wrong password
  test('should reject incorrect password', async () => {
    const testUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword123',
      name: 'Test User'
    };

    mockRequest.json.mockResolvedValue({
      Email: 'test@example.com',
      password: 'wrongPassword'
    });

    prisma.experimenters.findUnique.mockResolvedValue(testUser);
    bcrypt.compare.mockResolvedValue(false);

    const response = await POST(mockRequest);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.message).toBe('Invalid email or password.');
  });

  // Test 3: User doesn't exist
  test('should reject non-existent user', async () => {
    mockRequest.json.mockResolvedValue({
      Email: 'fake@example.com',
      password: 'anyPassword'
    });

    prisma.experimenters.findUnique.mockResolvedValue(null);

    const response = await POST(mockRequest);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.message).toBe('Invalid email or password.');
  });

  // Test 4: Missing required fields
  test('should require email and password', async () => {
    mockRequest.json.mockResolvedValue({
      password: 'somePassword'
      // Email missing
    });

    const response = await POST(mockRequest);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.message).toBe('Email and password are required.');
  });

  // Test 5: Password not in response
  test('should never return password in response', async () => {
    const testUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword123',
      name: 'Test User',
      role: 'admin'
    };

    mockRequest.json.mockResolvedValue({
      Email: 'test@example.com',
      password: 'correctPassword'
    });

    prisma.experimenters.findUnique.mockResolvedValue(testUser);
    bcrypt.compare.mockResolvedValue(true);

    const response = await POST(mockRequest);
    const responseData = await response.json();

    expect(responseData.user).not.toHaveProperty('password');
    expect(responseData.user).toEqual({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    });
  });

  // Test 6: Handle database errors
  test('should handle server errors gracefully', async () => {
    mockRequest.json.mockResolvedValue({
      Email: 'test@example.com',
      password: 'correctPassword'
    });

    // Simulate database error
    prisma.experimenters.findUnique.mockRejectedValue(new Error('Database down'));

    const response = await POST(mockRequest);
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.message).toBe('Internal Server Error please check');
  });
});