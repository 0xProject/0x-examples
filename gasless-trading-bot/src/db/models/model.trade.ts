import { Schema, model } from 'mongoose';

// Trade Schema
/**
 * Schema representing a trade in the database.
 *
 * @property {ObjectId} orderId - Reference to the associated order.
 * @property {string} txnHash - Unique transaction hash of the trade.
 * @property {string} tokenAddress - Address of the token involved in the trade.
 * @property {number} ethAmount - Amount of Ethereum / Wrapped Ethereum / Input Token involved in the trade.
 * @property {Date} timestamp - Timestamp of when the trade occurred, defaults to the current date and time.
 * @property {string} tradeType - Type of trade, either 'buy' or 'sell'.
 */
const tradeSchema = new Schema({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  txnHash: {
    type: String,
    required: true,
    unique: true,
  },
  tokenAddress: {
    type: String,
    required: true,
  },
  ethAmount: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  tradeType: {
    type: String,
    enum: ['buy', 'sell'],
    required: true,
  },
});

const Trade = model('Trade', tradeSchema);
export default Trade;
