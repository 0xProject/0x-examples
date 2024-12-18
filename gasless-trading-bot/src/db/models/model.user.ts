import { Schema, model } from 'mongoose';

// User Schema
/**
 * @typedef {Object} UserSchema
 * @property {string} walletAddress - The unique wallet address of the user.
 * @property {number} totalPnl - The total profit and loss of the user. Defaults to 0.
 * @property {Array<ObjectId>} orders - An array of order references associated with the user.
 */
const userSchema = new Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
  },
  totalPnl: {
    type: Number,
    required: true,
    default: 0,
  },
  orders: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
  ],
});

const User = model('User', userSchema);
export default User;
