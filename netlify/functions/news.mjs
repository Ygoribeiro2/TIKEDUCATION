const allowedCategories = new Set(['all', 'news', 'tech', 'history', 'science', 'culture', 'health', 'environment']);
const labels = {
  all: 'educação, ciência, tecnologia, cultura, saúde e meio ambiente',
  news: 'notícias gerais e educação',
  tech: 'tecnologia e inovação',
  history: 'história e patrimônio',
  science: 'ciência e descobertas',
  culture: 'cultura e artes',
  health: 'saúde e bem-estar',
  environment: 'meio ambiente e sustentabilidade'
};
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

export default async (request) => {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não permitido.' }), { status: 405, headers });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'A chave GEMINI_API_KEY não está configurada no ambiente do servidor.' }), { status: 503, headers });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get('category') || 'all';
  const batch = Math.max(1, Math.min(1000, Number.parseInt(url.searchParams.get('batch') || '1', 10) || 1));
  if (!allowedCategories.has(category)) {
    return new Response(JSON.stringify({ error: 'Categoria inválida.' }), { status: 400, headers });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Gere exatamente 3 textos curtos, em português brasileiro, em estilo de boletim educativo sobre ${labels[category]}. Lote ${batch}: varie os temas e não repita títulos óbvios. Cada item deve ter título e descrição de 1 a 2 frases. Não invente acontecimentos recentes, números, citações, fontes ou alegações de última hora; prefira explicações educativas verificáveis e formule com cautela quando necessário. São textos gerados por IA, não reportagens jornalísticas. Retorne somente os campos exigidos pelo esquema JSON.` }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              articles: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING' },
                    description: { type: 'STRING' }
                  },
                  required: ['title', 'description']
                }
              }
            },
            required: ['articles']
          }
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Gemini API returned an error:', response.status, data?.error?.message);
      return new Response(JSON.stringify({ error: 'O serviço Gemini não conseguiu gerar as notícias agora.' }), { status: 502, headers });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
    let result;
    try { result = JSON.parse(text || '{}'); } catch { result = null; }
    const articles = Array.isArray(result?.articles)
      ? result.articles.filter((item) => typeof item?.title === 'string' && typeof item?.description === 'string').slice(0, 3)
      : [];
    if (articles.length !== 3) {
      return new Response(JSON.stringify({ error: 'Gemini retornou uma resposta incompleta. Tente novamente.' }), { status: 502, headers });
    }
    return new Response(JSON.stringify({ articles }), { status: 200, headers });
  } catch (error) {
    console.error('Gemini request failed:', error);
    return new Response(JSON.stringify({ error: 'Não foi possível conectar ao Gemini.' }), { status: 502, headers });
  } finally {
    clearTimeout(timeout);
  }
};
