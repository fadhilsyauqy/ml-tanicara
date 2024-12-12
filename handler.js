import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { generateToken, verifyToken } from './token.js';
import DB from './ConnectDB.js'; // DB connection

// Helper function to fetch a user by email or ID
export const fetchUserByEmailOrID = async (data, isEmail = true) => {
    const pool = await DB();
    let sql = 'SELECT * FROM `users` WHERE `email`=?';
    if (!isEmail) {
        sql = 'SELECT `id`, `name`, `email` FROM `users` WHERE `id`=?';
    }
    const [row] = await pool.query(sql, [data]);
    return row;
};

export default {
    signup: async (request, h) => {
        try {
            const { name, email, password } = request.payload;

            // Check if the email already exists in the database
            const existingUser = await fetchUserByEmailOrID(email);
            if (existingUser.length > 0) {
                return h.response({
                    status: 422,
                    message: 'Email is already registered.',
                }).code(422);  // Return 422 if email exists
            }

            const saltRounds = 10;
            const hashPassword = await bcrypt.hash(password, saltRounds);

            const pool = await DB();
            const [result] = await pool.query(
                'INSERT INTO `users` (`name`, `email`, `password`) VALUES (?, ?, ?)',
                [name, email, hashPassword]
            );

            return h.response({
                status: 201,
                message: 'You have been successfully registered.',
                user_id: result.insertId,
            }).code(201);
        } catch (err) {
            return h.response({
                status: 500,
                message: err.message,
            }).code(500);
        }
    },

    login: async (request, h) => {
        try {
            const { email, password } = request.payload;

            const user = await fetchUserByEmailOrID(email);
            if (user.length === 0) {
                return h.response({
                    status: 422,
                    message: 'Your email is not registered.',
                }).code(422);  // Correct status for unregistered email
            }

            const verifyPassword = await bcrypt.compare(password, user[0].password);
            if (!verifyPassword) {
                return h.response({
                    status: 422,
                    message: 'Incorrect password!',
                }).code(422);
            }

            const access_token = generateToken({ id: user[0].id });
            const refresh_token = generateToken({ id: user[0].id }, false);

            const md5Refresh = createHash('md5')
                .update(refresh_token)
                .digest('hex');

            const pool = await DB();
            const [result] = await pool.query(
                'INSERT INTO `token_users` (`user_id`, `token`) VALUES (?, ?)',
                [user[0].id, md5Refresh]
            );

            if (!result.affectedRows) {
                throw new Error('Failed to whitelist the refresh token.');
            }

            return h.response({
                status: 200,
                access_token,
                refresh_token,
            }).code(200);
        } catch (err) {
            return h.response({
                status: 500,
                message: err.message,
            }).code(500);
        }
    },

    getUser: async (request, h) => {
        try {
            const authHeader = request.headers['authorization'];
            if (!authHeader) {
                return h.response({
                    status: 400,
                    message: 'Authorization header is missing',
                }).code(400);
            }

            const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
            const data = verifyToken(token); // Verify token

            if (data?.status) {
                return h.response(data).code(data.status || 401);
            }

            const pool = await DB();
            const user = await fetchUserByEmailOrID(data.id, false);
            if (user.length !== 1) {
                return h.response({
                    status: 404,
                    message: 'User not found',
                }).code(404);
            }

            return h.response({
                status: 200,
                user: user[0],
            }).code(200);
        } catch (err) {
            return h.response({
                status: 500,
                message: err.message,
            }).code(500);
        }
    },

    refreshToken: async (request, h) => {
        try {
            const authHeader = request.headers['authorization'];
            if (!authHeader) {
                return h.response({
                    status: 400,
                    message: 'Authorization header is missing',
                }).code(400);
            }

            const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
            const data = verifyToken(token, false); // Verify refresh token

            if (data?.status) return h.response(data).code(data.status || 401);

            const md5Refresh = createHash('md5')
                .update(token)
                .digest('hex');

            const pool = await DB();
            const [refTokenRow] = await pool.query(
                'SELECT * FROM `token_users` WHERE `token`=?',
                [md5Refresh]
            );

            if (refTokenRow.length !== 1) {
                return h.response({
                    status: 401,
                    message: 'Unauthorized: Invalid Refresh Token.',
                }).code(401);
            }

            const access_token = generateToken({ id: data.id });
            const refresh_token = generateToken({ id: data.id }, false);

            const newMd5Refresh = createHash('md5')
                .update(refresh_token)
                .digest('hex');

            const [result] = await pool.query(
                'UPDATE `token_users` SET `token`=? WHERE `token`=?',
                [newMd5Refresh, md5Refresh]
            );

            if (!result.affectedRows) {
                throw new Error('Failed to whitelist the Refresh token.');
            }

            return h.response({
                status: 200,
                access_token,
                refresh_token,
            }).code(200);
        } catch (err) {
            return h.response({
                status: 500,
                message: err.message,
            }).code(500);
        }
    },
};
