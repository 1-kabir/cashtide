# CashTide - Minimal Financial Management for Students & Freelancers

**CashTide** is an open-source financial management app designed specifically for students, freelancers, and small teams to easily track wallets, subscriptions, free trials, and transactions with AI-powered insights.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- pnpm (v8+)
- Docker (optional, for self-hosting)
- Supabase account (for auth, DB, storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/1-kabir/cashtide.git
cd cashtide

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configurations

# Start development servers
pnpm run dev
```

## 📱 Mobile App (React Native + Expo)

### Features
- **Neumorphic UI** with soft colors and playful design
- **Multi-wallet support** with shared wallet capabilities
- **Subscription tracking** with reminders
- **Free trial monitoring** with expiration alerts
- **AI Assistant** for financial insights (read-only)
- **Multi-currency support** with automatic conversion
- **Dark/light theme** switching

### Running the App

```bash
cd mobile
pnpm run start
# Scan QR code with Expo Go app or run on emulator
```

## 🌐 Backend (Node.js + Express + Supabase)

### Architecture
- **Node.js + Express** backend
- **Supabase** for authentication, database, and storage
- **LangChain JS** for AI integration
- **Mistral/Cerebras** as LLM providers
- **Docker** support for self-hosting

### API Endpoints
- `/api/auth` - Authentication
- `/api/wallets` - Wallet management
- `/api/transactions` - Transaction CRUD
- `/api/subscriptions` - Subscription tracking
- `/api/free-trials` - Free trial monitoring
- `/api/ai/assistant` - AI Assistant
- `/api/ai/extension` - Chrome extension processing

### Configuration

Create `config.yml`:
```yaml
# LLM Configuration
llm:
  provider: "mistral" # or "cerebras"
  assistant:
    model: "mistral-small"
    max_tokens: 1000
    temperature: 0.7
  extension:
    model: "mistral-small"
    max_tokens: 500
    temperature: 0.3

# Rate Limits
rate_limits:
  global: 1000
  per_user: 100
  ai_assistant: 50
  ai_extension: 200

# Currency API
currency:
  api_key: "your_api_key"
  base_currency: "USD"
  update_interval: "24h"
```

## 🧩 Chrome Extension

### Features
- **One-click transaction capture** from any webpage
- **Manual entry** with current page URL
- **AI-powered extraction** of financial data
- **Transaction review** system in main app
- **Multi-entry support** from single pages

### Development

```bash
cd chrome-extension
pnpm run build
# Load unpacked extension in Chrome
```

## 🤖 AI Integration

### AI Assistant
- **Read-only access** to financial data
- **Natural language queries** about spending
- **Subscription analysis** and insights
- **Free trial tracking** assistance
- **Budgeting suggestions**

### Chrome Extension AI
- **Transaction extraction** from webpages
- **Subscription detection**
- **Free trial identification**
- **Multi-entry processing**
- **Wallet assignment** based on descriptions

## 📂 Project Structure

```
cashtide/
├── backend/              # Node.js + Express backend
│   ├── config/           # Configuration files
│   ├── src/              # Source code
│   ├── Dockerfile        # Docker configuration
│   └── ...
├── mobile/               # React Native + Expo app
│   ├── assets/           # App assets
│   ├── components/       # UI components
│   ├── screens/          # App screens
│   └── ...
├── chrome-extension/     # Chrome extension
│   ├── src/              # Extension source
│   ├── manifest.json     # Extension manifest
│   └── ...
├── temp/                 # Temporary documentation
│   ├── FRONTEND.md       # Frontend architecture
│   ├── BACKEND.md        # Backend architecture
│   ├── AI.md             # AI architecture
│   ├── MISC.md           # Miscellaneous notes
│   └── TODO.md           # Development phases
├── .gitignore            # Git ignore rules
├── config.yml            # Main configuration
├── .env.example          # Environment variables template
├── package.json          # pnpm workspace
└── README.md             # This file
```

## 🎨 Design System

### Colors
- **Primary**: Soft beige palette
- **Secondary**: Muted pastels
- **Accent**: Subtle highlights
- **Background**: White (default), Dark (optional)

### Typography
- **Primary Font**: Google Sans Flex
- **Fallback Font**: Poppins
- **Sizes**: Responsive typography scale

### UI Principles
- **Neumorphic design** with soft edges
- **Minimal and uncluttered** interfaces
- **Subtle animations** and transitions
- **No gradients** - clean, flat design
- **Playful yet professional** aesthetic

## 🔧 Development Workflow

### Available Scripts

```bash
# Install dependencies
pnpm install

# Run backend in development
pnpm run dev:backend

# Run mobile app in development
pnpm run dev:mobile

# Build Chrome extension
pnpm run build:extension

# Run all tests
pnpm run test

# Format code
pnpm run format

# Lint code
pnpm run lint
```

### Environment Variables

Create `.env` file:
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_JWT_SECRET=your_jwt_secret

# LLM Providers
MISTRAL_API_KEY=your_mistral_key
CEREBRAS_API_KEY=your_cerebras_key

# Currency API
CURRENCY_API_KEY=your_currency_api_key

# App Configuration
APP_ENV=development
PORT=3000
JWT_SECRET=your_jwt_secret
```

## 📦 Deployment

### Self-Hosting with Docker

```bash
# Build Docker image
docker build -t cashtide .

# Run container
docker run -p 3000:3000 \
  -v ./config.yml:/app/config.yml \
  -v ./.env:/app/.env \
  cashtide
```

### Mobile App Deployment

```bash
cd mobile
# Build for Android
pnpm run build:android

# Build for iOS
pnpm run build:ios
```

## 🤝 Contributing

We welcome contributions! Please see our [Contribution Guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Expo](https://expo.dev/) for cross-platform mobile development
- [Supabase](https://supabase.com/) for backend services
- [LangChain](https://js.langchain.com/) for AI integration
- [React Native](https://reactnative.dev/) for mobile framework

## 📬 Contact

For questions or support, please open an issue or contact us at [support@cashtide.com](mailto:support@cashtide.com).

---

**CashTide** - Simplifying financial management for students and freelancers.

[Website](https://cashtide.com) | [GitHub](https://github.com/cashtide) | [Twitter](https://twitter.com/cashtide)
