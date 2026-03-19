

// Agent voice preferences (gender hint for future premium TTS)
const AGENT_GENDER: Record<string, 'male' | 'female'> = {
  counsely: 'female', searchy: 'female', buzzy: 'female',
  wordy: 'female', pixely: 'female',
  tasky: 'male', skepty: 'male', quanty: 'male',
  watchy: 'male', buildy: 'male', finy: 'male', tradey: 'male',
};

export async function POST(req: Request) {
  try {
    const { text, agentId, lang } = await req.json();
    
    if (!text || text.length > 1000) {
      return new Response(JSON.stringify({ error: 'Text required (max 1000 chars)' }), { 
        status: 400, headers: { 'Content-Type': 'application/json' } 
      });
    }

    const tl = lang === 'en' ? 'en' : 'ko';
    const encoded = encodeURIComponent(text.slice(0, 200));
    
    // Google Translate TTS — free, natural, edge-compatible
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encoded}`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!res.ok) {
      throw new Error(`Google TTS returned ${res.status}`);
    }

    const audio = await res.arrayBuffer();
    
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('TTS error:', err?.message);
    return new Response(JSON.stringify({ error: 'TTS failed', fallback: true }), { 
      status: 500, headers: { 'Content-Type': 'application/json' } 
    });
  }
}
