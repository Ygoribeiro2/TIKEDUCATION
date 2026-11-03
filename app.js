// Currents API keys are public when used directly in browser code. For production,
// proxy this request through a backend and rotate any key previously committed.
const CURRENTS_API_KEY = 'sI4_MxTyZXaZZCfOE2yCfVUVssmI6BiCttH4b1wEQc7Mk_86';
const DEFAULT_BG = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
const REQUEST_TIMEOUT_MS = 10000;
const REACTIONS_STORAGE_KEY = 'globalpulse:reactions:v1';

const categories = [
  { id: 'all', label: 'Para você' },
  { id: 'news', label: 'Notícias' },
  { id: 'tech', label: 'Tech' },
  { id: 'history', label: 'História' },
  { id: 'science', label: 'Ciência' },
  { id: 'culture', label: 'Cultura' },
  { id: 'health', label: 'Saúde' },
  { id: 'environment', label: 'Ambiente' }
];

const categoryLabels = Object.fromEntries(categories.map((category) => [category.id, category.label]));

const fallbackDatabase = {
  news: [
    { title: 'Nova onda de energia limpa desafia mercado global', text: 'Investidores e cidades aceleram o uso de tecnologias mais eficientes para reduzir perdas e aumentar a capacidade de produção.', tag: 'NOTÍCIAS', image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Mobilidade urbana cresce com novas rotas inteligentes', text: 'Sistemas de tráfego em tempo real ajudam cidades a reduzir congestionamentos e melhorar o tempo de deslocamento.', tag: 'NOTÍCIAS', image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Educação digital cresce com ferramentas de aprendizagem', text: 'Plataformas e conteúdos em formatos curtos ajudam estudantes a aprender de maneira mais direta e prática.', tag: 'NOTÍCIAS', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80' }
  ],
  tech: [
    { title: 'Computação quântica entra em fase de testes reais', text: 'Pesquisadores trabalham para reduzir erros e ampliar a capacidade de processamento em problemas complexos.', tag: 'TECH', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80' },
    { title: 'IA melhora análise de imagens e diagnósticos', text: 'Modelos inteligentes ajudam a encontrar padrões mais rapidamente em grandes volumes de dados e imagens.', tag: 'TECH', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Dispositivos mais leves mudam a rotina digital', text: 'Hardware enxuto e maior autonomia estão redefinindo como as pessoas acessam conteúdos e trabalham no dia a dia.', tag: 'TECH', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80' }
  ],
  history: [
    { title: 'Civilizações antigas usavam engenharia avançada', text: 'Estruturas antigas ainda impressionam pela precisão e pela lógica matemática presentes em sua construção e planejamento.', tag: 'HISTÓRIA', image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1200&q=80' },
    { title: 'O mundo antigo guardava saberes surpreendentes', text: 'Bibliotecas, observatórios e estudos astronômicos revelam a curiosidade de civilizações que marcaram a história.', tag: 'HISTÓRIA', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80' },
    { title: 'A ciência em tempos de grandes descobertas', text: 'Inventos e teorias de séculos atrás continuam influenciando a forma como entendemos o mundo e a tecnologia.', tag: 'HISTÓRIA', image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80' }
  ],
  science: [
    { title: 'O cérebro reconhece padrões em frações de segundo', text: 'Essa velocidade de percepção ajuda a processar informações, antecipar riscos e tomar decisões rápidas.', tag: 'CIÊNCIA', image: 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&w=1200&q=80' },
    { title: 'A física da água mostra energia em movimento', text: 'De pequenos fluxos a grandes cachoeiras, o comportamento da água revela leis fundamentais da natureza.', tag: 'CIÊNCIA', image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80' },
    { title: 'A exploração do espaço continua surpreendendo', text: 'Missões atuais ampliam o entendimento sobre planetas, luas e sinais de vida em outros mundos.', tag: 'CIÊNCIA', image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80' }
  ],
  culture: [
    { title: 'Arte urbana vira linguagem global', text: 'Pessoas em cidades do mundo usam muralismo, fotografia e música para contar histórias locais e universais.', tag: 'CULTURA', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80' },
    { title: 'A música transforma a forma de aprender', text: 'Ritmo, memória e atenção trabalham juntos, mostrando como sons podem reforçar conhecimento e emoções.', tag: 'CULTURA', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Cinema e realidade digital se misturam', text: 'Novos formatos de criação ampliam a criatividade e conectam histórias a experiências imersivas.', tag: 'CULTURA', image: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=1200&q=80' }
  ],
  health: [
    { title: 'Sono e memória estão diretamente ligados', text: 'Um descanso adequado contribui para a consolidação das lembranças e pode favorecer a criatividade.', tag: 'SAÚDE', image: 'https://images.unsplash.com/photo-1516549656523-d0b794d4624b?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Hábitos simples ajudam no bem-estar diário', text: 'Pequenas mudanças de rotina podem ter impacto positivo em energia, foco e qualidade de vida.', tag: 'SAÚDE', image: 'https://images.unsplash.com/photo-1541534401786-2077eed87a74?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Alimentação equilibrada faz parte do cuidado', text: 'Hábitos consistentes e conexões sociais são pilares importantes para a saúde e o bem-estar.', tag: 'SAÚDE', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80' }
  ],
  environment: [
    { title: 'Florestas urbanas ajudam a frear o calor', text: 'Árvores e áreas verdes reduzem a temperatura, melhoram o ar e trazem mais conforto aos bairros.', tag: 'AMBIENTE', image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Cidades sustentáveis redefinem o espaço urbano', text: 'Mobilidade, energia e arquitetura ambiental ajudam a criar metrópoles mais equilibradas.', tag: 'AMBIENTE', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Recursos renováveis ganham escala', text: 'Soluções mais acessíveis ajudam comunidades a reduzir emissões e aumentar a autonomia energética.', tag: 'AMBIENTE', image: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=1200&q=80' }
  ]
};

const state = {
  category: 'all',
  page: 1,
  loading: false,
  hasMore: true,
  news: [],
  observer: null,
  reactions: { liked: new Set(), saved: new Set() }
};

const feed = document.getElementById('feed-container');
const categoryBar = document.getElementById('category-bar');
const loader = document.getElementById('loader');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeText(value, fallback = '') {
  if (value === null || value === undefined || value === 'None') return fallback;
  return String(value).trim() || fallback;
}

function safeUrl(value, fallback = '#') {
  const text = safeText(value, fallback);
  return /^https?:\/\//i.test(text) ? text : fallback;
}

function buildReactionKey({ title, category, url = '' }) {
  return `${safeText(category, '').toLowerCase()}|${safeText(title, '').toLowerCase()}|${safeUrl(url, '')}`;
}

function loadReactions() {
  try {
    const stored = JSON.parse(localStorage.getItem(REACTIONS_STORAGE_KEY) || '{"liked":[],"saved":[]}');
    return {
      liked: new Set(Array.isArray(stored.liked) ? stored.liked : []),
      saved: new Set(Array.isArray(stored.saved) ? stored.saved : [])
    };
  } catch (error) {
    console.warn('Não foi possível restaurar curtidas e favoritos.', error);
    return { liked: new Set(), saved: new Set() };
  }
}

function saveReactions() {
  try {
    localStorage.setItem(REACTIONS_STORAGE_KEY, JSON.stringify({
      liked: [...state.reactions.liked],
      saved: [...state.reactions.saved]
    }));
  } catch (error) {
    console.warn('Não foi possível salvar curtidas e favoritos.', error);
  }
}

function getCategorySlug(value) {
  const text = safeText(value, '').toLowerCase();
  if (!text) return 'news';
  if (text.includes('hist')) return 'history';
  if (text.includes('ciên') || text.includes('cien') || text.includes('science')) return 'science';
  if (text.includes('tech') || text.includes('tecnologia') || text.includes('digital')) return 'tech';
  if (text.includes('saud')) return 'health';
  if (text.includes('amb') || text.includes('clima') || text.includes('eco')) return 'environment';
  if (text.includes('art') || text.includes('cultura') || text.includes('culture')) return 'culture';
  return 'news';
}

function normalizeNewsItem(item) {
  if (!item || !item.title) return null;
  const rawCategory = Array.isArray(item.category) ? item.category[0] : item.category;
  const category = getCategorySlug(rawCategory || 'news');
  const title = safeText(item.title, 'Notícia relevante');
  const url = safeUrl(item.url, '');

  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    text: safeText(item.description || item.summary, 'Confira mais detalhes sobre esta novidade.'),
    tag: safeText(rawCategory, category === 'news' ? 'NOTÍCIAS' : category.toUpperCase()).toUpperCase(),
    category,
    reactionKey: buildReactionKey({ title, category, url }),
    url,
    image: safeUrl(item.image, DEFAULT_BG),
    author: safeText(item.author, 'Agência GlobalPulse'),
    published: item.published || new Date().toISOString()
  };
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recente'
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function setLoading(loading) {
  state.loading = loading;
  loader.classList.toggle('hidden', !loading);
  feed.setAttribute('aria-busy', String(loading));
}

function renderCategoryBar() {
  categoryBar.replaceChildren();

  categories.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `cat-btn rounded-full px-4 py-2 text-[11px] font-bold tracking-[0.08em] uppercase ${state.category === category.id ? 'active' : ''}`;
    button.textContent = category.label;
    button.setAttribute('aria-pressed', String(state.category === category.id));
    button.addEventListener('click', () => selectCategory(category.id));
    categoryBar.appendChild(button);
  });
}

async function requestJson(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchCurrentsPage(pageNumber) {
  const url = `https://api.currentsapi.services/v1/latest-news?language=pt&page_number=${pageNumber}&apiKey=${encodeURIComponent(CURRENTS_API_KEY)}`;
  const attempts = [
    () => requestJson(url),
    async () => {
      const proxyData = await requestJson(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, 12000);
      if (proxyData) return proxyData;
      const wrapped = await requestJson(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, 12000);
      if (!wrapped || !wrapped.contents) return null;
      try { return JSON.parse(wrapped.contents); } catch { return null; }
    }
  ];

  for (const attempt of attempts) {
    try {
      const data = await attempt();
      if (data && Array.isArray(data.news)) return data.news;
    } catch (error) {
      console.warn('Não foi possível carregar notícias desta tentativa:', error);
    }
  }
  return [];
}

function getLocalCards(category) {
  const items = category === 'all' ? fallbackDatabase.news : (fallbackDatabase[category] || []);
  return items.map((item, index) => normalizeNewsItem({ ...item, category, published: new Date().toISOString(), id: `local-${category}-${index}` }));
}

function selectCategory(category) {
  if (!categories.some((item) => item.id === category)) return;

  state.category = category;
  renderCategoryBar();
  feed.scrollTo({ top: 0, behavior: 'instant' });

  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }

  if (category === 'all') {
    if (state.news.length) renderFeed();
    else loadMoreCards();
    return;
  }

  const categoryNews = state.news.filter((item) => item.category === category);
  const cards = categoryNews.length ? categoryNews : getLocalCards(category);
  renderCards(cards.length ? cards : []);
}

async function loadMoreCards() {
  if (state.loading || !state.hasMore || state.category !== 'all') return;
  setLoading(true);

  try {
    const rawNews = await fetchCurrentsPage(state.page);
    const normalized = rawNews.map(normalizeNewsItem).filter(Boolean);

    if (!normalized.length) {
      state.hasMore = false;
      if (state.page === 1 && state.news.length === 0) {
        state.news = getLocalCards('all');
      }
    } else {
      state.news = state.page === 1 ? normalized : [...state.news, ...normalized];
      state.page += 1;
    }

    renderFeed();
  } catch (error) {
    console.error('Erro ao carregar o feed:', error);
    state.hasMore = false;
    if (!state.news.length) state.news = getLocalCards('all');
    renderFeed();
  } finally {
    setLoading(false);
  }
}

function renderFeed() {
  const visibleNews = state.category === 'all'
    ? state.news
    : state.news.filter((item) => item.category === state.category);
  renderCards(visibleNews);
}

function applyReactionState(button, active, type) {
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', type === 'like'
    ? (active ? 'Remover curtida' : 'Curtir notícia')
    : (active ? 'Remover dos favoritos' : 'Salvar notícia'));

  const icon = button.querySelector('i');
  const color = type === 'like' ? 'text-red-400' : 'text-yellow-400';
  if (icon) {
    icon.classList.toggle(color, active);
    icon.classList.toggle('text-white', !active);
  }
}

function renderCards(cards) {
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }

  if (!cards.length) {
    const label = categoryLabels[state.category] || 'categoria';
    feed.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-panel">
          <i class="fa-solid fa-newspaper text-3xl text-gray-500 mb-3 block" aria-hidden="true"></i>
          <p class="text-base font-semibold text-gray-300">Nenhuma novidade encontrada em ${label.toLowerCase()} no momento.</p>
          <button type="button" class="empty-state-btn" data-reset-category="all">Ver para você</button>
        </div>
      </div>`;

    const resetButton = feed.querySelector('[data-reset-category]');
    resetButton?.addEventListener('click', () => selectCategory('all'));
    return;
  }

  feed.innerHTML = cards.map((card) => {
    const articleUrl = safeUrl(card.url, '#');
    const linkMarkup = articleUrl === '#'
      ? '<span class="action-btn opacity-50" aria-label="Link da matéria indisponível"><i class="fa-solid fa-link text-lg"></i></span>'
      : `<a href="${escapeHtml(articleUrl)}" target="_blank" rel="noopener noreferrer" class="action-btn" aria-label="Ler matéria"><i class="fa-solid fa-arrow-up-right-from-square text-lg"></i></a>`;

    const reactionKey = card.reactionKey || buildReactionKey({ title: card.title, category: card.category, url: card.url });

    return `
      <section class="card-snap" data-id="${escapeHtml(card.id)}" data-category="${escapeHtml(card.category)}" data-reaction-key="${escapeHtml(reactionKey)}">
        <img class="card-bg" src="${escapeHtml(card.image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_BG}'" />
        <div class="card-overlay" aria-hidden="true"></div>
        <div class="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-5">
          <button type="button" class="action-btn like-btn" aria-label="Curtir notícia" aria-pressed="false">
            <i class="fa-solid fa-heart text-lg" aria-hidden="true"></i>
          </button>
          <button type="button" class="action-btn save-btn" aria-label="Salvar notícia" aria-pressed="false">
            <i class="fa-solid fa-bookmark text-lg" aria-hidden="true"></i>
          </button>
          ${linkMarkup}
        </div>
        <div class="relative z-10 w-full max-w-md mx-auto mb-2">
          <div class="mb-3 inline-block rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-100">
            ${escapeHtml(card.tag)}
          </div>
          <h2 class="text-shadow text-2xl font-black leading-tight text-white mb-2">${escapeHtml(card.title)}</h2>
          <p class="text-shadow text-sm leading-relaxed text-gray-200">${escapeHtml(card.text)}</p>
          <div class="mt-4 flex items-center justify-between gap-3 text-[11px] text-gray-300">
            <span>${escapeHtml(card.author)}</span>
            <time datetime="${escapeHtml(card.published)}">${escapeHtml(formatDate(card.published))}</time>
          </div>
        </div>
      </section>`;
  }).join('');

  bindCardEvents();
  observeLastCard();
}

function bindCardEvents() {
  feed.querySelectorAll('.like-btn, .save-btn').forEach((button) => {
    const card = button.closest('.card-snap');
    const reactionKey = card?.dataset.reactionKey || '';
    const isLike = button.classList.contains('like-btn');
    const isActive = isLike ? state.reactions.liked.has(reactionKey) : state.reactions.saved.has(reactionKey);

    applyReactionState(button, isActive, isLike ? 'like' : 'save');

    button.addEventListener('click', () => {
      const activeKey = button.closest('.card-snap')?.dataset.reactionKey || '';
      const collection = isLike ? state.reactions.liked : state.reactions.saved;

      if (collection.has(activeKey)) {
        collection.delete(activeKey);
      } else {
        collection.add(activeKey);
      }

      saveReactions();
      applyReactionState(button, collection.has(activeKey), isLike ? 'like' : 'save');
    });
  });
}

function observeLastCard() {
  if (state.category !== 'all' || !state.hasMore || !('IntersectionObserver' in window)) return;
  const lastCard = feed.querySelector('.card-snap:last-of-type');
  if (!lastCard) return;

  state.observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) loadMoreCards();
  }, { root: feed, rootMargin: '250px 0px', threshold: 0 });
  state.observer.observe(lastCard);
}

function init() {
  state.reactions = loadReactions();
  renderCategoryBar();
  loadMoreCards();
  feed.addEventListener('scroll', () => {
    if (feed.scrollTop + feed.clientHeight >= feed.scrollHeight - 250) loadMoreCards();
  }, { passive: true });
}

init();

