const { errorHandler, notFoundHandler, asyncHandler } = require('../../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  describe('notFoundHandler', () => {
    it('should create a 404 error', () => {
      const mockReq = { originalUrl: '/test/path' };
      const mockNext = jest.fn();
      
      notFoundHandler(mockReq, {}, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error.status).toBe(404);
      expect(error.message).toContain('/test/path');
    });
  });

  describe('errorHandler', () => {
    it('should send error response with status code', () => {
      const mockErr = new Error('Test error');
      mockErr.status = 400;
      
      const mockReq = { path: '/test', method: 'GET' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        statusCode: 200
      };
      
      errorHandler(mockErr, mockReq, mockRes, jest.fn());
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockRes.json.mock.calls[0][0].error.message).toBe('Test error');
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const mockErr = new Error('Test error');
      const mockReq = { path: '/test', method: 'GET' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        statusCode: 500
      };
      
      errorHandler(mockErr, mockReq, mockRes, jest.fn());
      
      expect(mockRes.json.mock.calls[0][0].error.stack).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should wrap async functions', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrapped = asyncHandler(asyncFn);
      
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();
      
      await wrapped(mockReq, mockRes, mockNext);
      
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should catch errors from async functions', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(asyncFn);
      
      const mockNext = jest.fn();
      
      await wrapped({}, {}, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
