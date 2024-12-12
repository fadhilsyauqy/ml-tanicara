import Hapi from '@hapi/hapi';
import dbConnection from './ConnectDB.js';
import routes from './routes.js';

const init = async () => {
    const server = Hapi.server({
        port: process.env.PORT || 3000,
        host: 'localhost',
    });

    // Add routes
    server.route(routes);

    // Start server
    try {
        const pool = await dbConnection();
        await pool.query('SELECT 1'); // Test connection
        console.log('Database connected successfully.');

        await server.start();
        console.log(`Server is running on ${server.info.uri}`);
    } catch (err) {
        console.error(`Failed to connect to the database: ${err.message}`);
        process.exit(1);
    }
};

init();
