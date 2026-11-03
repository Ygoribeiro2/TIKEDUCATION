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
const examples = {
  news: [
    ['Energia limpa ganha espaço nas cidades', 'Projetos solares e eólicos ajudam comunidades a diversificar suas fontes de energia e reduzir impactos ambientais.'],
    ['Novas rotas inteligentes transformam a mobilidade', 'Dados de trânsito em tempo real ajudam a planejar deslocamentos e a reduzir congestionamentos.'],
    ['Educação digital amplia formas de aprender', 'Aulas interativas e conteúdos em formatos curtos podem complementar o estudo e facilitar a revisão.']
  ],
  tech: [
    ['Inteligência artificial entra na rotina de trabalho', 'Ferramentas de IA podem organizar informações e automatizar algumas tarefas repetitivas.'],
    ['Computação quântica busca reduzir erros', 'Pesquisadores estudam formas de tornar os qubits mais estáveis para problemas especializados.'],
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
    ['Movimento diário traz benefícios à saúde', 'Atividades adequadas à condição de cada pessoa ajudam a reduzir o sedentarismo.'],
    ['Alimentação variada ajuda a compor uma rotina equilibrada', 'Diferentes grupos de alimentos fornecem nutrientes importantes para o organismo.']
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
  news: [],
  buffer: [],
  seen: new Set(),
  requestId: 0,
  controller: null,
  loadRequested: false,
  hasScrolled: false,
  reactions: { liked: new Set(), saved: new Set() }
};
const feed = document.getElementById('feed-container');
const categoryBar = document.getElementById('category-bar');
const loader = document.getElementById('loader');

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function cleanText(value, fallback = '') {
  return value == null ? fallback : String(value).trim() || fallback;
}
function makeReactionKey(title, category) {
  return `${category}|${cleanText(title).toLocaleLowerCase('pt-BR')}`;
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
    localStorage.setItem(REACTIONS_STORAGE_KEY, JSON.stringify({ liked: [...state.reactions.liked], saved: [...state.reactions.saved] }));
  } catch (error) {
    console.warn('Não foi possível salvar as reações neste navegador.', error);
  }
}
function setLoading(loading, message = 'Buscando novidades...') {
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
function makeExampleCards(category) {
  const selected = category === 'all' ? 'news' : category;
  return (examples[selected] || examples.news).map(([title, text], index) => ({
    id: `example-${selected}-${index}`,
    reactionKey: makeReactionKey(title, selected),
    title, text, category: selected,
    tag: `${categoryLabels[selected]} • EXEMPLO`,
    author: 'Conteúdo de demonstração',
    published: new Date().toISOString(),
    url: '#', image: DEFAULT_BG
  }));
}
function normalizeGenerated(item, index, category, batch) {
  if (!item || typeof item.title !== 'string' || typeof item.description !== 'string') return null;
  const title = cleanText(item.title).slice(0, 140);
  const text = cleanText(item.description).slice(0, 500);
  if (!title || !text) return null;
  const selected = category === 'all' ? 'news' : category;
  return {
    id: `gemini-${category}-${batch}-${index}-${title}`,
    reactionKey: makeReactionKey(title, selected),
    title, text, category: selected,
    tag: `${categoryLabels[category] || 'Notícias'} • IA`,
    author: 'Gemini IA • conteúdo gerado',
    published: new Date().toISOString(),
    url: '#', image: DEFAULT_BG
  };
}
async function requestBatch(category, batch, signal) {
  const response = await fetch(`/.netlify/functions/news?category=${encodeURIComponent(category)}&batch=${batch}`, {
    headers: { Accept: 'application/json' }, signal
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.error || `Não foi possível gerar as notícias (HTTP ${response.status}).`);
  }
  const result = await response.json();
  if (!Array.isArray(result.articles) || result.articles.length !== BATCH_SIZE) {
    throw new Error('O gerador não retornou exatamente três notícias.');
  }
  return result.articles;
}
function selectCategory(category) {
  if (!categories.some((item) => item.id === category) || category === state.category) return;
  state.controller?.abort();
  state.requestId += 1;
  state.category = category;
  state.batch = 0;
  state.loading = false;
  state.news = makeExampleCards(category);
  state.buffer = [];
  state.seen = new Set(state.news.map((item) => item.reactionKey));
  state.loadRequested = false;
  state.hasScrolled = false;
  feed.replaceChildren();
  feed.scrollTo({ top: 0, behavior: 'instant' });
  renderCategoryBar();
  appendCards(state.news);
  loadGeneratedBatch({ initial: true, showLoader: true });
}

// A successful request either replaces the initial examples, fills the preload buffer,
// or appends a visible batch. It never starts another request in a tight loop.
async function loadGeneratedBatch({ initial = false, prefetch = false, showLoader = false } = {}) {
  if (state.loading) {
    if (!prefetch) state.loadRequested = true;
    return;
  }
  const requestId = state.requestId;
  const category = state.category;
  const batch = state.batch + 1;
  const controller = new AbortController();
  state.controller = controller;
  state.loading = true;
  const timeout = window.setTimeout(() => controller.abort(), 25000);
  if (showLoader) setLoading(true, initial ? 'Gerando novidades...' : 'Buscando novidades...');

  try {
    const generated = await requestBatch(category, batch, controller.signal);
    if (requestId !== state.requestId) return;
    const articles = generated
      .map((item, index) => normalizeGenerated(item, index, category, batch))
      .filter((item) => item && !state.seen.has(item.reactionKey));
    if (articles.length !== BATCH_SIZE) throw new Error('O Gemini retornou notícias repetidas ou incompletas.');
    articles.forEach((item) => state.seen.add(item.reactionKey));
    state.batch = batch;

    if (initial && !state.hasScrolled) {
      state.news = articles;
      feed.replaceChildren();
      appendCards(articles);
    } else if (prefetch) {
      state.buffer = articles;
      if (state.loadRequested) {
        state.loadRequested = false;
        appendBufferedBatch();
      }
    } else {
      state.news.push(...articles);
      appendCards(articles);
    }
  } catch (error) {
    if (requestId === state.requestId && error.name !== 'AbortError') {
      console.error('Erro ao carregar notícias do Gemini:', error);
      showNotice(initial
        ? 'Não foi possível conectar ao Gemini. Os exemplos continuam disponíveis; confira a configuração da API.'
        : 'Não foi possível carregar mais novidades. Tente novamente.', true);
    }
  } finally {
    window.clearTimeout(timeout);
    if (requestId === state.requestId) {
      state.loading = false;
      state.controller = null;
      if (showLoader) setLoading(false);
      // Only prefetch one batch, hold it in memory, and wait for scrolling to consume it.
      if (state.batch > 0 && !state.buffer.length && !state.loadRequested) {
        queueMicrotask(() => loadGeneratedBatch({ prefetch: true }));
      } else if (state.loadRequested && !state.buffer.length && !initial && !prefetch) {
        state.loadRequested = false;
        queueMicrotask(() => loadGeneratedBatch({ showLoader: true }));
      }
    }
  }
}
function appendBufferedBatch() {
  if (!state.buffer.length) return false;
  const batch = state.buffer;
  state.buffer = [];
  state.news.push(...batch);
  appendCards(batch);
  // Fetch one next batch into the buffer; do not append it until the next scroll.
  if (!state.loading) queueMicrotask(() => loadGeneratedBatch({ prefetch: true }));
  return true;
}
function showNotice(message, retry) {
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
      loadGeneratedBatch({ showLoader: true });
    });
    notice.appendChild(button);
  }
  feed.appendChild(notice);
}
function appendCards(cards) {
  if (!cards.length) return;
  feed.querySelector('.feed-notice')?.remove();
  const markup = cards.map((card) => {
    const linkMarkup = card.url === '#'
      ? '<span class="action-btn opacity-50" aria-label="Link da matéria indisponível"><i class="fa-solid fa-link text-lg" aria-hidden="true"></i></span>'
      : `<a href="${escapeHtml(card.url)}" target="_blank" rel="noopener noreferrer" class="action-btn" aria-label="Ler matéria"><i class="fa-solid fa-arrow-up-right-from-square text-lg" aria-hidden="true"></i></a>`;
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
  feed.insertAdjacentHTML('beforeend', markup);
  bindCardEvents();
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
function requestMoreIfNearEnd() {
  const cards = feed.querySelectorAll('.card-snap');
  if (!cards.length) return;
  const currentIndex = Math.floor(feed.scrollTop / Math.max(feed.clientHeight, 1));
  if (cards.length - currentIndex > BATCH_SIZE) return;
  if (state.buffer.length) {
    appendBufferedBatch();
  } else if (state.loading) {
    state.loadRequested = true;
  } else {
    loadGeneratedBatch({ showLoader: true });
  }
}
function init() {
  state.reactions = loadReactions();
  renderCategoryBar();
  state.news = makeExampleCards(state.category);
  state.seen = new Set(state.news.map((item) => item.reactionKey));
  appendCards(state.news);
  loadGeneratedBatch({ initial: true, showLoader: true });
  feed.addEventListener('scroll', () => {
    if (feed.scrollTop > 0) state.hasScrolled = true;
    requestMoreIfNearEnd();
  }, { passive: true });
}
init();
