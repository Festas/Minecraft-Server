const request = require('supertest');
const { app } = require('../../server');

describe('Login Error Handling', () => {
    describe('POST /api/login - Error Format Handling', () => {
        it('should return validation errors in errors array format', async () => {
            // Username too short (empty)
            const response = await request(app)
                .post('/api/login')
                .send({ username: '', password: 'password123' });
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('errors');
            expect(Array.isArray(response.body.errors)).toBe(true);
            expect(response.body.errors.length).toBeGreaterThan(0);
            expect(response.body.errors[0]).toHaveProperty('msg');
        });

        it('should accept single character usernames', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({ username: 'a', password: 'password123' });
            
            // Will fail authentication but should pass validation
            expect(response.status).toBe(401); // Authentication failed, not validation
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Invalid credentials');
        });

        it('should reject usernames with invalid characters', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({ username: 'test@user', password: 'password123' });
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('errors');
        });

        it('should require password field', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({ username: 'admin' });
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('errors');
        });
    });
});
