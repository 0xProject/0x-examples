class Validator {
  /**
   * Validates Ethereum contract address.
   * @param address - The contract address to validate.
   * @returns true if valid, false otherwise.
   */
  static isValidContractAddress(address: string): boolean {
    const addressPattern = /^0x[a-fA-F0-9]{40}$/;
    return addressPattern.test(address);
  }

  /**
   * Validates Ethereum private key.
   * @param privateKey - The private key to validate.
   * @returns true if valid, false otherwise.
   */
  static isValidPrivateKey(privateKey: string): boolean {
    const privateKeyPattern = /^[0-9a-fA-F]{64}$/;
    return privateKeyPattern.test(privateKey);
  }

  /**
   * Validates stop loss value.
   * @param sl - Stop Loss value to validate.
   * @returns true if valid, false otherwise.
   */
  static isValidStopLoss(sl: number): boolean {
    // Ensure the value is a positive number, and reasonable (e.g., between 0 and 100).
    return !isNaN(sl) && sl > 0 && sl <= 100;
  }

  /**
   * Validates take profit value.
   * @param tp - Take Profit value to validate.
   * @returns true if valid, false otherwise.
   */
  static isValidTakeProfit(tp: number): boolean {
    // Ensure the value is a positive number, and reasonable (e.g., between 0 and 1000).
    return !isNaN(tp) && tp > 0 && tp <= 1000;
  }

  /**
   * Validates amount in ETH.
   * @param amount - The amount of ETH to validate.
   * @returns true if valid, false otherwise.
   */
  static isValidETHAmount(amount: number): boolean {
    // ETH amount must be a positive number.
    return !isNaN(amount) && amount > 0;
  }

  /**
   * Validates timeout value.
   * @param timeout - The timeout value to validate.
   * @returns true if valid, false otherwise.
   */
  static isValidTimeout(timeout: number): boolean {
    // Timeout must be a positive integer.
    return Number.isInteger(timeout) && timeout > 0;
  }
}

export default Validator;
