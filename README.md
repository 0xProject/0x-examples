# 0x Examples

A collection of 0x API code examples

---

> ⚠️ **WARNING — READ BEFORE USING 0x API**
>
> - **NEVER** set an allowance on the [Settler contract](https://0x.org/docs/introduction/0x-cheat-sheet#0x-settler-contracts).  
>   Doing so may lead to **loss of tokens** or **security risks**.  
>   The Settler contract does **not** require allowances — setting one enables misuse by other parties.
>
> - **ONLY** set allowances on [Permit2](https://0x.org/docs/introduction/0x-cheat-sheet#permit2-contract) or [AllowanceHolder](https://0x.org/docs/introduction/0x-cheat-sheet#allowanceholder-contract) contracts, as indicated by the API response.
>
> - The correct allowance target is returned in `issues.allowance.spender`.

> - The examples in this repo are demos, and are not ready for production use. The code has not been audited and does not account for all error handling. Use at your own risk.

---

## v2 (Latest)

### Swap API

#### Next.js Demo Apps
- [AllowanceHolder](https://github.com/0xProject/0x-examples/tree/main/swap-v2-allowance-holder-next-app) — Next.js demo app
- [Permit2](https://github.com/0xProject/0x-examples/tree/main/swap-v2-permit2-next-app) — Next.js demo app

#### Headless Examples
- [AllowanceHolder](https://github.com/0xProject/0x-examples/tree/main/swap-v2-allowance-holder-headless-example) — Command-line example
- [AllowanceHolder](https://github.com/0xProject/0x-examples/tree/main/swap-v2-allowance-holder-quicknode-headless-example) — Command-line example with Quicknode Marketplace 0x Addon
- [Permit2](https://github.com/0xProject/0x-examples/tree/main/swap-v2-permit2-headless-example) — Command-line example

#### Smart Contract Integration
- [Foundry Integration](https://github.com/0xProject/0x-examples/tree/main/swap-v2-with-foundry) — Use Swap API v2 in your smart contracts  


### Gasless API
- [Headless Example](https://github.com/0xProject/0x-examples/blob/main/gasless-v2-headless-example/README.md) — Command-line example
- [Trading Bot](https://github.com/0xProject/0x-examples/tree/main/gasless-v2-trading-bot) — Simple trading bot script with Gasless API v2  



## Contribution Guidelines

1. **Fork the Repository:** Start by forking the repository and creating a new branch for your contributions.

2. **Set Up Environment:** Follow the setup guide in the README to ensure your environment matches the development requirements.

3. **Code Standards:** Adhere to the ESLint rules provided in the project

4. **Documentation:** Include or update relevant documentation for new features or changes.

5. **Pull Request:**
- Provide a clear description of the changes and the issue(s) addressed
- Tag at least one maintainer for review
- Include screenshots or logs for UI changes or CLI commands

## Code of Conduct

1. **Be Respectful:** Treat others with respect and kindness in all interactions.

2. **Constructive Feedback:** Provide feedback that is thoughtful, helpful, and actionable.

3. **No Harassment:** Harassment, abusive language, or any form of discrimination will not be tolerated.

4. **Collaborative Environment:** Support an open and welcoming space for contributors from all backgrounds.

## Licenses

Copyright 2025 ZeroEx Labs

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at [LICENSE](http://www.apache.org/licenses/LICENSE-2.0) for details.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

## Support

### GitHub Issues
For bugs, feature requests, and other inquiries related to this example, please open an issue on the GitHub repository.

### Developer Support
The 0x developer support team is available to quickly answer your technical questions. Contact the [support team](https://0x.org/docs/introduction/community#contact-support) either through the "Intercom messenger" in the bottom right corner throughout the [0x.org](https://0x.org/).
