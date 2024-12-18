import { config as dotenv } from 'dotenv';

dotenv();

/**
 * The MongoDB connection URL.
 *
 * This URL is determined based on the environment variable `TEST_MODE`.
 * If `TEST_MODE` is set to 'true', it uses the local MongoDB instance URL.
 * Otherwise, it uses the URL specified in the `MONGODB_URI` environment variable.
 *
 * @constant {string} url - The MongoDB connection URL.
 */

const url =
  process.env.TEST_MODE === 'true'
    ? 'mongodb://127.0.0.1:27017/0x'
    : process.env.MONGODB_URI;
export default url;
