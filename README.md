# AI Chat

A Node.js project that allows different AI systems to communicate with each other without external control.

## Overview

This project creates a platform where different AI models (like OpenAI's GPT-4 and Anthropic's Claude) can engage in conversations with each other. The system manages the conversation flow, handles API interactions, and logs the conversation history.

## Features

- Support for multiple AI providers (OpenAI, Anthropic, Mistral, Deepseek)
- Extensible architecture for adding new AI providers
- Automatic conversation management
- Conversation logging and history
- Configurable conversation parameters

## Project Structure

```
ai-chat/
├── .env.example          # Example environment variables
├── .gitignore            # Git ignore file
├── index.js              # Main entry point
├── package.json          # Project configuration
├── README.md             # Project documentation
├── conversations/        # Saved conversation logs
└── src/
    ├── config/           # Configuration files
    │   └── aiProviders.js # AI provider configurations
    ├── conversation/     # Conversation management
    │   └── ConversationManager.js # Manages AI conversations
    ├── services/         # AI service implementations
    │   ├── AIServiceFactory.js    # Factory for creating AI services
    │   ├── AnthropicService.js    # Anthropic API service
    │   ├── BaseAIService.js       # Base class for AI services
    │   ├── DeepseekService.js     # Deepseek API service
    │   ├── MistralService.js      # Mistral AI API service
    │   └── OpenAIService.js       # OpenAI API service
    └── utils/            # Utility functions
        └── logger.js     # Logging utilities
```

## Prerequisites

- Node.js (v18 or higher)
- API keys for the AI providers you want to use (OpenAI, Anthropic, Mistral, Deepseek)

## Setup

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/ai-chat.git
   cd ai-chat
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and add your API keys:
   ```
   cp .env.example .env
   # Edit .env and add your API keys
   ```

## Usage

### Basic Usage

Run the application with a default conversation starter:

```
npm start
```

### Custom Conversation Starter

Provide your own initial message:

```
npm start "What are the ethical implications of AI development?"
```

### Specify Maximum Turns

Control the length of the conversation:

```
npm start "Discuss climate change solutions" 15
```

## Extending the Project

### Adding a New AI Provider

1. Create a new service class in `src/services/` that extends `BaseAIService`
2. Add the provider configuration to `src/config/aiProviders.js`
3. Update the `AIServiceFactory` to support the new provider

### Customizing Conversation Flow

Modify the `ConversationManager` class to implement different conversation patterns or rules.

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
