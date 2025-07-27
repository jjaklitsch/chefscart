# OpenAI Assistants API Integration

This document describes the implementation of OpenAI Assistants API integration in the ChefsCart application to replace the current conversation processing system.

## Overview

The Assistant API integration provides:
- **Thread-based conversation management** with persistent context
- **Natural language processing** with structured tool calling
- **Improved conversation quality** through the GPT-4o model
- **Seamless meal planning workflow** from preferences to shopping cart
- **Backward compatibility** with the existing system

## Architecture

### Core Components

1. **Assistant Service** (`/lib/openai-assistant.ts`)
   - Manages OpenAI Assistant creation and configuration
   - Handles thread management and message processing
   - Provides tool function execution
   - Implements error handling and retry logic

2. **API Endpoints**
   - `/api/assistant/chat` - Main conversation processing
   - `/api/assistant/thread` - Thread management operations
   - `/api/assistant/tools` - Tool function handlers

3. **Frontend Integration**
   - Updated `ConversationalChat` component with feature flag support
   - Maintains existing UI components and user experience
   - Handles thread persistence in localStorage

### Assistant Configuration

The Assistant is configured with:
- **Model**: GPT-4o for optimal performance
- **Personality**: Mila, a friendly AI sous-chef
- **Tools**: Four specialized functions for meal planning workflow

#### Tool Functions

1. **extract_preferences** - Structures user preferences from natural language
2. **generate_meal_options** - Creates personalized meal recommendations
3. **finalize_meal_plan** - Converts selections to shopping cart
4. **update_progress** - Tracks conversation flow progress

## Usage

### Environment Setup

```bash
# Required environment variables
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_USE_ASSISTANT_API=true  # Enable Assistant API
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Feature Flag

The integration uses a feature flag for gradual rollout:

```typescript
const useAssistantAPI = process.env.NEXT_PUBLIC_USE_ASSISTANT_API === 'true'
```

Set to `false` to use the legacy conversation system.

### API Usage Examples

#### Creating a Thread
```typescript
const response = await fetch('/api/assistant/thread', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'create' })
})
const { threadId } = await response.json()
```

#### Processing Messages
```typescript
const response = await fetch('/api/assistant/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'I want to plan dinner for this week',
    threadId: 'thread_abc123',
    context: {
      preferences: {},
      currentStep: 'greeting'
    }
  })
})
```

## Conversation Flow

The Assistant guides users through a structured conversation:

1. **Greeting** - Welcome and meal type inquiry
2. **Meal Types** - What meals to plan (breakfast, lunch, dinner, snacks)
3. **Dietary Restrictions** - Allergies, diets, preferences
4. **Cooking Preferences** - Time, skill level, cuisines
5. **Meal Generation** - AI creates personalized options
6. **Meal Selection** - User chooses preferred meals
7. **Finalization** - Creates shopping cart

### Progress Tracking

```typescript
interface ConversationProgress {
  currentStep: 'greeting' | 'meal_types' | 'dietary_restrictions' | 'cooking_preferences' | 'meal_generation' | 'meal_selection' | 'finalization'
  completedSteps: string[]
  readyForMealGeneration: boolean
  conversationComplete: boolean
}
```

## Error Handling

### Error Types

```typescript
enum AssistantErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ASSISTANT_NOT_FOUND = 'ASSISTANT_NOT_FOUND',
  THREAD_NOT_FOUND = 'THREAD_NOT_FOUND',
  RUN_FAILED = 'RUN_FAILED',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### Retry Logic

The service implements exponential backoff retry for:
- Network errors
- Rate limiting
- Temporary service failures

### Graceful Degradation

If the Assistant API fails:
1. Error is logged and tracked
2. User sees a friendly error message
3. System can fallback to legacy API (if configured)

## Testing

### Unit Tests

Run the Assistant integration tests:

```bash
npm test -- assistant-integration.test.ts
```

Tests cover:
- Thread management operations
- Chat message processing
- Tool function execution
- Error handling scenarios

### Manual Testing

1. Set `NEXT_PUBLIC_USE_ASSISTANT_API=true`
2. Start the development server
3. Navigate to the chat interface
4. Test the complete conversation flow

## Performance Considerations

### Thread Management
- Threads are created per conversation session
- Threads are cleaned up on conversation reset
- Thread IDs are persisted in localStorage

### Rate Limiting
- Implements retry logic with exponential backoff
- Monitors API usage and errors
- Graceful handling of rate limit errors

### Timeouts
- 5-minute timeout for Assistant runs
- 1-second polling interval for run completion
- Configurable timeout values

## Security

### API Key Management
- API key stored securely in environment variables
- Validation ensures key is present before operations
- No API key exposure in client-side code

### Data Privacy
- User conversations stored in OpenAI threads (temporary)
- Threads can be deleted on request
- No sensitive personal data sent to OpenAI

## Migration Strategy

### Phase 1: Development & Testing
- ✅ Implement Assistant API integration
- ✅ Add comprehensive error handling
- ✅ Create unit tests
- ✅ Feature flag implementation

### Phase 2: Gradual Rollout
- [ ] Deploy with feature flag disabled
- [ ] Enable for internal testing
- [ ] A/B test with small user percentage
- [ ] Monitor performance and error rates

### Phase 3: Full Migration
- [ ] Enable for all users
- [ ] Monitor conversation quality metrics
- [ ] Remove legacy conversation API
- [ ] Clean up deprecated code

## Monitoring & Analytics

### Key Metrics
- Conversation completion rate
- Average conversation length
- Tool function success rate
- API error rate and types
- User satisfaction scores

### Logging
- All Assistant API calls logged
- Error details captured with context
- Performance metrics tracked
- User interaction patterns recorded

## Troubleshooting

### Common Issues

**Assistant API not working**
- Check `OPENAI_API_KEY` is set correctly
- Verify `NEXT_PUBLIC_USE_ASSISTANT_API=true`
- Check network connectivity

**Tool functions failing**
- Check meal generation API availability
- Verify tool function arguments format
- Review function execution logs

**Thread errors**
- Ensure thread ID is valid
- Check if thread was deleted
- Verify thread permissions

### Debug Mode

Enable detailed logging:
```bash
DEBUG=assistant:* npm run dev
```

## Future Enhancements

### Planned Features
- **Voice Integration** - Direct voice-to-Assistant communication
- **Multi-language Support** - Conversation in multiple languages
- **Advanced Personalization** - Learning user preferences over time
- **Integration Extensions** - Additional tool functions for enhanced features

### Performance Optimizations
- **Caching** - Cache Assistant responses for common queries
- **Streaming** - Real-time response streaming
- **Parallel Processing** - Concurrent tool function execution

## Support

For technical issues or questions:
- Review this documentation
- Check the test suite for examples
- Consult OpenAI Assistant API docs
- Create GitHub issue with detailed context