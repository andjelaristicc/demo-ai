import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    console.log('🔊 Voice called, text length:', text?.length);
    console.log('🔑 Key exists?', !!process.env.ELEVENLABS_API_KEY);

    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_turbo_v2', // ← Changed from eleven_turbo_v2_5
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        })
      }
    );

    console.log('📡 ElevenLabs status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs error:', response.status, errorText);
      return NextResponse.json(
        { error: 'ElevenLabs failed', status: response.status, details: errorText },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('✅ Audio size:', audioBuffer.byteLength, 'bytes');

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error: any) {
    console.error('❌ Voice route error:', error.message);
    return NextResponse.json(
      { error: 'Voice generation failed', details: error.message },
      { status: 500 }
    );
  }
}