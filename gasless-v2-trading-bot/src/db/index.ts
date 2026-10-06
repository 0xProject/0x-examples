import mongoose from 'mongoose';

import url from './config';
import User from './models/model.user';
import Order from './models/model.order';
import Trade from './models/model.trade';

/**
 * Establishes a connection to the MongoDB database using Mongoose.
 *
 * This function retrieves the database URI from a predefined variable `url`.
 * If the URI is not defined, it logs an error message and exits the process.
 *
 * The function sets Mongoose's `strictQuery` option to `false` and attempts to connect to the database
 * with retry writes enabled and write concern set to 'majority'.
 *
 * If the connection attempt fails, it logs the error and exits the process.
 *
 * @throws Will terminate the process if the database URI is not defined or if the connection attempt fails.
 */

const connect = async (): Promise<void> => {
  const dbUri = url;

  if (!dbUri) {
    console.error('Database URL is not defined');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(dbUri, {
      retryWrites: true,
      w: 'majority',
    });
  } catch (err) {
    console.error("Couldn't connect to DB:", err);
    process.exit(1);
  }
};

export { connect, User, Order, Trade };
