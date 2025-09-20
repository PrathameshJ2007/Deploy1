// src/app/api/genkit/[...slug]/route.ts
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {defineDotprompt} from '@genkit-ai/dotprompt';
import {NextRequest} from 'next/server';

// Import your flows
import '@/ai/flows/document-processor';

genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export async function POST(req: NextRequest) {
  const {slug} = (req as any).params;
  const {readable, writable} = new TransformStream();
  const writer = writable.getWriter();

  const handleChunk = (chunk: any) => {
    writer.write(new TextEncoder().encode(JSON.stringify(chunk) + '\n'));
  };

  const genkitRequest = await req.json();

  // Replace with your actual implementation
  if (slug === 'runAction') {
    //  const response = await runAction(genkitRequest, handleChunk);
    //  writer.close();
    //  return new Response(JSON.stringify(response));
  } else {
    writer.close();
    return new Response(
      JSON.stringify({error: `Unknown action: ${slug}`}),
      {
        status: 400,
      }
    );
  }

  return new Response(readable, {
    headers: {'Content-Type': 'application/json'},
  });
}
