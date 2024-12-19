# 0x Gasless Trading Bot 🤖💱


> [!WARNING]  
> This is a demo, and is not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

This demo showcases a TypeScript-based CLI trading bot that automates ERC20 token trades using the [0x Gasless API](https://0x.org/docs/gasless-api/introduction) on [Base](https://www.base.org/) network. The bot is designed to help traders execute gasless trades with intelligent, risk-managed strategies.


## 🌟 Features

- **🚀 Automated Trading**: Execute buy and sell orders automatically based on predefined conditions.
- **📊 Stop Loss and Take Profit**: Set stop loss and take profit percentages to manage risk and secure profits.
- **🔗 ERC20 Token Support**: Trade any ERC20 token by providing its contract address.
- **⏰ Real-time Monitoring**: Monitor token prices in real-time and trigger trades when conditions are met.
- **💾 MongoDB Integration**: Store trade and order data in a MongoDB database for record-keeping and analysis.

## 🛠 Installation

Install dependencies using Bun:

```bash
bun install
```

## 🐳 Quick MongoDB Instance with Docker

Create a simple Dockerfile with the following to run a MongoDB container:

```dockerfile
# Use the official MongoDB image from the Docker Hub
FROM mongo:latest

# Expose the default MongoDB port
EXPOSE 27017

# Command to run MongoDB
CMD ["mongod"]
```

Docker setup steps:

1. Build the Docker image:
    ```bash
    docker build -t 0xcli-mongodb .
    ```

2. Run the Docker container:
    ```bash
    docker run -d --name 0xcli-mongodb -p 27017:27017 0xcli-mongodb
    ```

## 🔐 Environment Variables

Configure your `.env` file with the following variables:

```env
ZERO_EX_API_KEY=your_zero_ex_api_key
MONGODB_URI=your_mongodb_uri
```

## 🚀 Running the CLI Tool

Execute the CLI tool:

```bash
bun ./src/index.ts start
```

## 📝 Usage

The CLI tool will prompt you for the following inputs:

1. **Contract Address**: Enter the ERC20 contract address for the token to buy (on Base)
2. **Private Key**: Enter your private key.
3. **Stop Loss Percentage**: Enter the stop loss percentage (Range: 0 - 100).
4. **Take Profit Percentage**: Enter the take profit percentage (Range: 0 - 1000).
5. **Amount in ETH**: Enter the amount in ETH that will be used to buy the ERC20.
6. **Timeout**: Enter the timeout duration in seconds.

## 🤖 Outcome

Once the inputs are entered, the bot will run the following:

1. Buys the specified ERC20 token using WETH. 
    - If not the wallet does not have enough WETH, it will try to wrap ETH for WETH.
2. Watches for conditions:
    - Price increases by X% → Trigger "Take Profit" → Sell.
    - Price drops by Y% → Trigger "Stop Loss" → Sell.
    - Timeout after Z sec → Trigger "Timeout" → Sell.
3. Updates MongoDB with trade results and PnL.

![trading-bot](https://github.com/user-attachments/assets/77ca2bfa-4f6b-463c-99e1-6ca1e0c2c4cc)



## 🔍 How It Works

1. **🏁 Initialization**: Connect to MongoDB and set up configurations.
2. **📥 User Input**: Gather required trading parameters.
3. **💱 Trade Execution**: Use 0x API to fetch prices and execute trades.
4. **📈 Monitoring**: Continuously track token prices and trigger trades.
5. **💾 Data Storage**: Store comprehensive trade and order data.

## 📖 Documentation

For detailed information, refer to the [0x Gasless API documentation](https://0x.org/docs/category/gasless-api).

## 🤝 Contribution Guidelines

1. **Fork the Repository:** Start by forking the repository and creating a new branch for your contributions.

2. **Set Up Environment:** Follow the setup guide in the README to ensure your environment matches the development requirements.

3. **Code Standards:** Adhere to the ESLint rules provided in the project

4. **Documentation:** Include or update relevant documentation for new features or changes.

5. **Pull Request:**
- Provide a clear description of the changes and the issue(s) addressed
- Tag at least one maintainer for review
- Include screenshots or logs for UI changes or CLI commands

## 📜 Code of Conduct

1. **Be Respectful:** Treat others with respect and kindness in all interactions.
2. **Constructive Feedback:** Provide feedback that is thoughtful, helpful, and actionable.
3. **No Harassment:** Harassment, abusive language, or any form of discrimination will not be tolerated.
4. **Collaborative Environment:** Support an open and welcoming space for contributors from all backgrounds.

## 📄 Licenses

Copyright 2025 ZeroEx Labs

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at [LICENSE](http://www.apache.org/licenses/LICENSE-2.0) for details.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

## 📞 Support

### GitHub Issues
For bugs, feature requests, and other inquiries related to this example, please open an issue on the GitHub repository.

### Developer Support
The 0x developer support team is available to quickly answer your technical questions. Contact the [support team](https://0x.org/docs/introduction/community#contact-support) either through the "Intercom messenger" in the bottom right corner throughout the [0x.org](https://0x.org/).
