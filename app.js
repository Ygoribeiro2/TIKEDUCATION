const DEFAULT_BG = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1400&q=80';
const REACTIONS_STORAGE_KEY = 'globalpulse:reactions:v1';
const BATCH_SIZE = 3;
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
const categoryLabels = Object.fromEntries(categories.map(({ id, label }) => [id, label]));
const fallbackDatabase = {
  news: [
    ['Energia limpa ganha espaço nas cidades', 'Projetos solares e eólicos ajudam comunidades a diversificar suas fontes de energia e reduzir impactos ambientais.'],
    ['Novas rotas inteligentes transformam a mobilidade', 'Dados de trânsito em tempo real ajudam a planejar deslocamentos e a reduzir congestionamentos.'],
    ['Educação digital amplia formas de aprender', 'Aulas interativas e conteúdos em formatos curtos podem complementar o estudo e facilitar a revisão.']
  ],
  tech: [
    ['Inteligência artificial entra na rotina de trabalho', 'Ferramentas de IA estão sendo usadas para organizar informações e automatizar tarefas repetitivas.'],
    ['Computação quântica busca reduzir erros', 'Pesquisadores estudam formas de tornar os qubits mais estáveis para resolver problemas especializados.'],
    ['Dispositivos conectados ampliam a automação', 'Sensores e redes permitem que aparelhos troquem informações e respondam a mudanças no ambiente.']
  ],
  history: [
    ['Rotas comerciais conectaram sociedades antigas', 'O comércio de longa distância também levou ideias, técnicas e costumes entre diferentes povos.'],
    ['Bibliotecas preservaram conhecimento por séculos', 'Centros de estudo reuniam textos e registros importantes para a transmissão do saber.'],
    ['A navegação mudou a forma de explorar o mundo', 'Instrumentos e mapas mais precisos ajudaram navegadores a percorrer distâncias maiores.']
  ],
  science: [
    ['Observatórios ajudam a estudar o universo', 'Telescópios captam diferentes tipos de luz para investigar estrelas, galáxias e planetas.'],
    ['Microrganismos influenciam os ecossistemas', 'Bactérias e fungos participam da decomposição e da circulação de nutrientes na natureza.'],
    ['O sono participa da consolidação da memória', 'Durante o descanso, o cérebro reorganiza informações e fortalece algumas lembranças.']
  ],
  culture: [
    ['A arte urbana transforma espaços públicos', 'Murais e intervenções visuais podem contar histórias locais e renovar a relação com a cidade.'],
    ['A música também é uma ferramenta de aprendizagem', 'Ritmo e repetição ajudam algumas pessoas a memorizar conteúdos e reconhecer padrões.'],
    ['O cinema combina técnicas e linguagens', 'Imagem, som e montagem se unem para criar narrativas e provocar diferentes emoções.']
  ],
  health: [
    ['Rotinas de sono favorecem o bem-estar', 'Horários regulares e um ambiente tranquilo podem contribuir para uma boa qualidade de descanso.'],
    ['Movimento diário traz benefícios à saúde', 'Caminhadas e outras atividades adequadas à condição de cada pessoa ajudam a reduzir o sedentarismo.'],
    ['Alimentação variada ajuda a compor uma rotina equilibrada', 'Diferentes grupos de alimentos fornecem nutrientes importantes para o funcionamento do organismo.']
  ],
  environment: [
    ['Árvores urbanas ajudam a amenizar o calor', 'A sombra e a evapotranspiração das árvores podem reduzir temperaturas em áreas construídas.'],
    ['Reciclagem depende da separação correta', 'Separar materiais recicláveis e resíduos orgânicos facilita o reaproveitamento e o tratamento adequado.'],
    ['Áreas úmidas abrigam grande biodiversidade', 'Pântanos e manguezais servem de habitat para diversas espécies e ajudam a regular os ciclos da água.']
  ]
};

const state = {
  category: 'all',
  batch: 0,
  loading: false,
  hasMore: true,
  prefetchedInitial: false,
  news: [],
  seen: new Set(),
  observer: null,
  controller: null,
  requestId: 0,
  reactions: { liked: new Set(), saved: new Set() }
};
const feed = document.getElementById('feed-container');
const categoryBar = document.getElementById('category-bar');
const loader = document.getElementById('loader');

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function safeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}
function safeUrl(value, fallback = '#') {
  const text = safeText(value, fallback);
  return /^https?:\/\//i.test(text) ? text : fallback;
}
function makeReactionKey(title, category) {
  return `${category}|${safeText(title).toLocaleLowerCase('pt-BR')}`;
}
function loadReactions() {
  try {
    const stored = JSON.parse(localStorage.getItem(REACTIONS_STORAGE_KEY) || '{}');
    return {
      liked: new Set(Array.isArray(stored.liked) ? stored.liked : []),
      saved: new Set(Array.isArray(stored.saved) ? stored.saved : [])
    };
  } catch (error) {
    console.warn('Não foi possível restaurar curtidas e favoritos.', error);
    return { liked: new Set(), saved: new Set() };
  }
}
function persistReactions() {
  try {
    localStorage.setItem(REACTIONS_STORAGE_KEY, JSON.stringify({
      liked: [...state.reactions.liked],
      saved: [...state.reactions.saved]
    }));
  } catch (error) {
    console.warn('Não foi possível salvar as reações neste navegador.', error);
  }
}
function setLoading(loading, message = 'Buscando novidades...') {
  state.loading = loading;
  loader.classList.toggle('hidden', !loading);
  loader.setAttribute('aria-hidden', String(!loading));
  feed.setAttribute('aria-busy', String(loading));
  const label = loader.querySelector('span');
  if (label) label.textContent = message;
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
function fallbackCards(category, batch) {
  const selected = category === 'all' ? 'news' : category;
  const examples = fallbackDatabase[selected] || fallbackDatabase.news;
  return examples.map(([title, text], index) => ({
    id: `fallback-${selected}-${batch}-${index}-${Date.now()}`,
    reactionKey: makeReactionKey(title, selected),
    title,
    text,
    category: selected,
    tag: `${categoryLabels[selected]} • EXEMPLO`,
    author: 'Conteúdo de demonstração',
    published: new Date().toISOString(),
    url: '#',
    image: DEFAULT_BG
  }));
}
function normalizeGeneratedItem(item, index, category, batch) {
  if (!item || typeof item.title !== 'string' || typeof item.description !== 'string') return null;
  const title = safeText(item.title).slice(0, 140);
  const text = safeText(item.description).slice(0, 500);
  if (!title || !text) return null;
  const id = `${category}-${batch}-${index}-${title.toLocaleLowerCase('pt-BR')}`;
  return {
    id,
    reactionKey: makeReactionKey(title, category === 'all' ? 'news' : category),
    title,
    text,
    category: category === 'all' ? 'news' : category,
    tag: `${categoryLabels[category] || 'Notícias'} • IA`,
    author: 'Gemini IA • conteúdo gerado',
    published: new Date().toISOString(),
    url: '#',
    image: DEFAULT_BG
  };
}
async function requestBatch(category, batch, signal) {
  const response = await fetch(`/.netlify/functions/news?category=${encodeURIComponent(category)}&batch=${batch}`, {
    headers: { Accept: 'application/json' },
    signal
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.error || `Falha ao gerar notícias (HTTP ${response.status}).`);
  }
  const result = await response.json();
  if (!Array.isArray(result.articles)) throw new Error('A resposta do gerador veio em formato inválido.');
  return result.articles;
}
function selectCategory(category) {
  if (!categories.some((item) => item.id === category) || category === state.category) return;
  state.controller?.abort();
  state.requestId += 1;
  state.loading = false;
  state.category = category;
  state.batch = 0;
  state.hasMore = true;
  state.prefetchedInitial = false;
  state.news = [];
  state.seen.clear();
  feed.replaceChildren();
  feed.scrollTo({ top: 0, behavior: 'instant' });
  renderCategoryBar();
  loadMoreCards();
}
async function loadMoreCards() {
  if (state.loading || !state.hasMore) return;
  const category = state.category;
  const requestId = state.requestId;
  const batch = state.batch + 1;
  const controller = new AbortController();
  state.controller = controller;
  const timeout = window.setTimeout(() => controller.abort(), 25000);
  setLoading(true, state.news.length ? 'Preparando mais 3 novidades...' : 'Gerando 3 novidades com Gemini...');

  try {
    const generated = await requestBatch(category, batch, controller.signal);
    if (requestId !== state.requestId) return;
    const items = generated
      .map((item, index) => normalizeGeneratedItem(item, index, category, batch))
      .filter((item) => item && !state.seen.has(item.reactionKey));
    if (!items.length) throw new Error('O Gemini não retornou notícias novas. Tente novamente.');
    items.forEach((item) => state.seen.add(item.reactionKey));
    state.batch = batch;
    state.news.push(...items);
    appendCards(items);
  } catch (error) {
    if (requestId !== state.requestId || error.name === 'AbortError') return;
    console.error('Erro ao carregar notícias:', error);
    if (!state.news.length) {
      const samples = fallbackCards(category, batch).filter((item) => !state.seen.has(item.reactionKey));
      samples.forEach((item) => state.seen.add(item.reactionKey));
      state.news.push(...samples);
      appendCards(samples);
      showFeedNotice('Não consegui conectar ao Gemini. Exibindo exemplos; configure GEMINI_API_KEY no Netlify e tente novamente.', true);
    } else {
      showFeedNotice('Não foi possível carregar mais novidades. Toque para tentar novamente.', true);
    }
  } finally {
    window.clearTimeout(timeout);
    if (requestId === state.requestId) {
      state.loading = false;
      setLoading(false);
      state.controller = null;
      updateObserver();
      if (state.batch === 1 && !state.prefetchedInitial && state.news.length) {
        state.prefetchedInitial = true;
        // Prepare the next three cards before the first swipe reaches the end.
        queueMicrotask(loadMoreCards);
      }
    }
  }
}
function showFeedNotice(message, retry) {
  feed.querySelector('.feed-notice')?.remove();
  const notice = document.createElement('div');
  notice.className = 'feed-notice';
  notice.setAttribute('role', 'status');
  const text = document.createElement('p');
  text.textContent = message;
  notice.appendChild(text);
  if (retry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'empty-state-btn';
    button.textContent = 'Tentar novamente';
    button.addEventListener('click', () => {
      notice.remove();
      state.hasMore = true;
      loadMoreCards();
    });
    notice.appendChild(button);
  }
  feed.appendChild(notice);
}
function appendCards(cards) {
  const markup = cards.map((card) => {
    const link = safeUrl(card.url, '#');
    const linkMarkup = link === '#'
      ? '<span class="action-btn opacity-50" aria-label="Link da matéria indisponível"><i class="fa-solid fa-link text-lg" aria-hidden="true"></i></span>'
      : `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="action-btn" aria-label="Ler matéria"><i class="fa-solid fa-arrow-up-right-from-square text-lg" aria-hidden="true"></i></a>`;
    return `<section class="card-snap" data-id="${escapeHtml(card.id)}" data-category="${escapeHtml(card.category)}" data-reaction-key="${escapeHtml(card.reactionKey)}">
      <img class="card-bg" src="${escapeHtml(card.image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_BG}'" />
      <div class="card-overlay" aria-hidden="true"></div>
      <div class="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-5">
        <button type="button" class="action-btn like-btn" aria-label="Curtir notícia" aria-pressed="false"><i class="fa-solid fa-heart text-lg" aria-hidden="true"></i></button>
        <button type="button" class="action-btn save-btn" aria-label="Salvar notícia" aria-pressed="false"><i class="fa-solid fa-bookmark text-lg" aria-hidden="true"></i></button>
        ${linkMarkup}
      </div>
      <div class="relative z-10 w-full max-w-md mx-auto mb-2">
        <div class="mb-3 inline-block rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-100">${escapeHtml(card.tag)}</div>
        <h2 class="text-shadow text-2xl font-black leading-tight text-white mb-2">${escapeHtml(card.title)}</h2>
        <p class="text-shadow text-sm leading-relaxed text-gray-200">${escapeHtml(card.text)}</p>
        <div class="mt-4 flex items-center justify-between gap-3 text-[11px] text-gray-300"><span>${escapeHtml(card.author)}</span><time datetime="${escapeHtml(card.published)}">${escapeHtml(new Date(card.published).toLocaleDateString('pt-BR'))}</time></div>
      </div>
    </section>`;
  }).join('');
  const notice = feed.querySelector('.feed-notice');
  if (notice) notice.remove();
  feed.insertAdjacentHTML('beforeend', markup);
  bindCardEvents();
  updateObserver();
}
function updateReactionButton(button, active, isLike) {
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', isLike ? (active ? 'Remover curtida' : 'Curtir notícia') : (active ? 'Remover dos favoritos' : 'Salvar notícia'));
  const icon = button.querySelector('i');
  const color = isLike ? 'text-red-400' : 'text-yellow-400';
  if (icon) {
    icon.classList.toggle(color, active);
    icon.classList.toggle('text-white', !active);
  }
}
function bindCardEvents() {
  feed.querySelectorAll('.card-snap:not([data-reactions-bound])').forEach((card) => {
    card.dataset.reactionsBound = 'true';
    card.querySelectorAll('.like-btn, .save-btn').forEach((button) => {
      const key = card.dataset.reactionKey;
      const isLike = button.classList.contains('like-btn');
      const collection = isLike ? state.reactions.liked : state.reactions.saved;
      updateReactionButton(button, collection.has(key), isLike);
      button.addEventListener('click', () => {
        if (collection.has(key)) collection.delete(key);
        else collection.add(key);
        persistReactions();
        updateReactionButton(button, collection.has(key), isLike);
      });
    });
  });
}
function updateObserver() {
  state.observer?.disconnect();
  state.observer = null;
  if (!('IntersectionObserver' in window) || state.loading) return;
  const cards = feed.querySelectorAll('.card-snap');
  if (!cards.length) return;
  const lastCard = cards[cards.length - 1];
  state.observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) loadMoreCards();
  }, { root: feed, rootMargin: '200% 0px', threshold: 0 });
  state.observer.observe(lastCard);
}
function init() {
  state.reactions = loadReactions();
  renderCategoryBar();
  loadMoreCards();
  feed.addEventListener('scroll', () => {
    const cards = feed.querySelectorAll('.card-snap');
    if (!cards.length || state.loading || !state.hasMore) return;
    const currentIndex = Math.floor(feed.scrollTop / Math.max(feed.clientHeight, 1));
    if (cards.length - currentIndex <= 3) loadMoreCards();
  }, { passive: true });
}
init();
