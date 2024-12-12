import Joi from '@hapi/joi';
import controller from './handler.js';

const routes = [
    {
        method: 'POST',
        path: '/signup',
        options: {
            validate: {
                payload: Joi.object({
                    name: Joi.string().min(6).required(),
                    email: Joi.string().email().required(),
                    password: Joi.string().min(8).required(),
                }),
            },
        },
        handler: controller.signup,
    },
    {
        method: 'POST',
        path: '/login',
        options: {
            validate: {
                payload: Joi.object({
                    email: Joi.string().email().required(),
                    password: Joi.string().min(8).required(),
                }),
            },
        },
        handler: controller.login,
    },
    {
        method: 'GET',
        path: '/profile',
        options: {
            validate: {
                headers: Joi.object({
                    'authorization': Joi.string().pattern(/^Bearer .+/).required(),
                }).unknown(),
            },
        },
        handler: controller.getUser,
    },
    {
        method: 'GET',
        path: '/refresh',
        options: {
            validate: {
                headers: Joi.object({
                    'authorization': Joi.string().pattern(/^Bearer .+/).required(),
                }).unknown(),
            },
        },
        handler: controller.refreshToken,
    },
];

export default routes;
