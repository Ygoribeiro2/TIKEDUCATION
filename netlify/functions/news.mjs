const categories = {
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
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, 405);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: 'GEMINI_API_KEY não está configurada no ambiente do Netlify.' }, 503);

  const url = new URL(request.url);
  const category = url.searchParams.get('category') || 'all';
  const batch = Math.max(1, Math.min(1000, Number.parseInt(url.searchParams.get('batch') || '1', 10) || 1));
  if (!Object.hasOwn(categories, category)) return json({ error: 'Categoria inválida.' }, 400);

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: [
          'Crie exatamente três textos educativos originais em português brasileiro.',
          `Categoria obrigatória: ${categories[category]}.`,
          category === 'all' ? 'Varie entre educação, ciência, tecnologia, cultura, saúde e meio ambiente.' : `Todos os três textos devem ser exclusivamente sobre: ${categories[category]}.`,
          `Este é o lote ${batch}; varie os assuntos em relação a lotes anteriores da mesma categoria.`,
          'Cada texto deve ter um título curto e uma descrição informativa de uma ou duas frases.',
          'Não invente acontecimentos recentes, números, citações, fontes ou alegações de última hora.',
          'Os textos são conteúdo educativo gerado por IA, não notícias verificadas nem reportagens.',
          'Responda somente no formato JSON definido pelo esquema.'
        ].join(' ')}] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              articles: {
                type: 'ARRAY',
                minItems: 3,
                maxItems: 3,
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
      console.error('Gemini API error:', response.status, data?.error?.message);
      return json({ error: 'O Gemini não conseguiu gerar conteúdo agora. Confira o modelo e a chave da API.' }, 502);
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
    let result;
    try { result = JSON.parse(text || '{}'); } catch { result = null; }
    const articles = Array.isArray(result?.articles)
      ? result.articles.filter((item) => typeof item?.title === 'string' && typeof item?.description === 'string').slice(0, 3)
      : [];
    if (articles.length !== 3) return json({ error: 'O Gemini retornou uma resposta incompleta. Tente novamente.' }, 502);
    return json({ articles });
  } catch (error) {
    console.error('Gemini request failed:', error);
    return json({ error: error.name === 'AbortError' ? 'A geração demorou demais. Tente novamente.' : 'Não foi possível conectar ao Gemini.' }, 502);
  } finally {
    clearTimeout(timeout);
  }
};
