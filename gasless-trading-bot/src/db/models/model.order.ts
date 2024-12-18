import { Schema, model } from 'mongoose';

// Order Schema
/**
 * Schema definition for an Order.
 *
 * @property {ObjectId} user - Reference to the User who placed the order. Required.
 * @property {string} tokenAddress - The address of the token involved in the order. Required.
 * @property {Date} timestamp - The timestamp when the order was created. Defaults to the current date and time.
 * @property {number} amount - The amount of tokens involved in the order. Required.
 * @property {number} decimals - The number of decimal places for the token amount. Required.
 * @property {number} [tp] - The take profit value for the order. Optional.
 * @property {number} [sl] - The stop loss value for the order. Optional.
 * @property {number} pnl - The profit and loss value for the order. Required.
 * @property {number} timeout - The timeout value for the order. Required.
 * @property {boolean} completed - Indicates whether the order is completed. Defaults to false.
 * @property {ObjectId[]} trades - Array of references to Trade documents associated with the order.
 */
const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tokenAddress: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  amount: {
    type: Number,
    required: true,
  },
  tokenAmount: {
    type: Number,
    required: true,
  },
  decimals: {
    type: Number,
    required: true,
  },
  tp: {
    type: Number,
  },
  sl: {
    type: Number,
  },
  pnl: {
    type: Number,
    required: true,
  },
  timeout: {
    type: Number,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  trades: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Trade',
    },
  ],
});

const Order = model('Order', orderSchema);
export default Order;
