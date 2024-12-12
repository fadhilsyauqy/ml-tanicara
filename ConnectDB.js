import mysql from 'mysql2/promise';
import { Connector } from '@google-cloud/cloud-sql-connector';
import { config } from 'dotenv';
import path from 'path';

config(); // Load environment variables

const pathKey = path.resolve('./tanicare-application-75ffd3206ebc.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = pathKey;

const connector = new Connector();

const clientOpts = await connector.getOptions({
    instanceConnectionName: 'tanicare-application:asia-southeast2:tanicare-login-app',
    ipType: 'PUBLIC',
});

// Create a function to return the pool connection
const connection = async () => {
    return mysql.createPool({
        ...clientOpts,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
};

export default connection;
