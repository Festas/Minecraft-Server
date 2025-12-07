const request = require('supertest');
const { app } = require('../../server');

describe('API Routes', () => {
  describe('POST /api/login', () => {
    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ password: 'test' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ username: 'test' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 if username has invalid characters', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ username: 'test$user!', password: 'password123' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/session', () => {
    it('should return unauthenticated for new session', async () => {
      const response = await request(app)
        .get('/api/session');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authenticated', false);
    });
  });

  describe('GET /api/csrf-token', () => {
    it('should return a CSRF token', async () => {
      const response = await request(app)
        .get('/api/csrf-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('csrfToken');
      expect(typeof response.body.csrfToken).toBe('string');
    });

    it('should set a CSRF cookie in the response', async () => {
      const response = await request(app)
        .get('/api/csrf-token');
      
      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      
      // Check that csrf-token cookie is present
      const csrfCookie = response.headers['set-cookie'].find(cookie => 
        cookie.startsWith('csrf-token=')
      );
      expect(csrfCookie).toBeDefined();
      
      // Verify cookie attributes
      expect(csrfCookie).toMatch(/HttpOnly/);
      expect(csrfCookie).toMatch(/Path=\//);
      expect(csrfCookie).toMatch(/SameSite=Lax/i);
    });
  });
});
