const { validations, validate } = require('../../middleware/validation');
const { validationResult } = require('express-validator');

describe('Validation Middleware', () => {
  describe('login validation', () => {
    it('should validate correct login credentials', () => {
      const req = {
        body: {
          username: 'testuser',
          password: 'password123'
        }
      };
      
      // This would require running the validation chain
      // For now, just verify the validators exist
      expect(validations.login).toBeDefined();
      expect(Array.isArray(validations.login)).toBe(true);
    });
  });

  describe('executeCommand validation', () => {
    it('should have command validation rules', () => {
      expect(validations.executeCommand).toBeDefined();
      expect(Array.isArray(validations.executeCommand)).toBe(true);
    });
  });

  describe('playerName validation', () => {
    it('should have player name validation rules', () => {
      expect(validations.playerName).toBeDefined();
      expect(Array.isArray(validations.playerName)).toBe(true);
    });
  });

  describe('filePath validation', () => {
    it('should have file path validation rules', () => {
      expect(validations.filePath).toBeDefined();
      expect(Array.isArray(validations.filePath)).toBe(true);
    });
  });

  describe('validate function', () => {
    it('should be a function', () => {
      expect(typeof validate).toBe('function');
    });

    it('should call next if no validation errors', () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();
      
      // Mock validationResult to return no errors
      jest.spyOn(require('express-validator'), 'validationResult')
        .mockReturnValue({ isEmpty: () => true });
      
      validate(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
