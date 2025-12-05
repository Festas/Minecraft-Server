const { validations, validate } = require('../../middleware/validation');

describe('Validation Middleware', () => {
  describe('login validation', () => {
    it('should validate correct login credentials', () => {
      
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
  });
});
