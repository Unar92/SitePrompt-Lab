// Client-side OpenAI API utility for static export
// This allows the app to work without a Node.js server

export interface GenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  response_format?: any;
}

export interface GenerateResponse {
  content: string;
  error?: string;
}

export async function generateWithOpenAI(
  apiKey: string,
  request: GenerateRequest
): Promise<GenerateResponse> {
  if (!apiKey || apiKey.trim() === '') {
    return { content: '', error: 'OpenAI API key is required' };
  }

  try {
    const isReasoningModel = (request.model || 'gpt-5.2').includes('gpt-5.2');
    
    const body: any = {
      model: request.model || 'gpt-5.2',
      messages: [
        { role: isReasoningModel ? 'developer' : 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
    };

    if (request.response_format) {
      body.response_format = {
        type: "json_schema",
        json_schema: request.response_format
      };
    }

    if (isReasoningModel) {
      // Use the standard OpenAI reasoning_effort parameter
      body.reasoning_effort = "medium";
      // Note: reasoning models usually require temperature to be 1.0 or omitted
    } else {
      body.temperature = request.temperature ?? 0.7;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        content: '',
        error: errorData.error?.message || `API Error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
    };
  } catch (error: any) {
    return {
      content: '',
      error: error.message || 'Failed to generate response',
    };
  }
}

