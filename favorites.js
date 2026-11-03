(() => {
  const STORAGE_KEY = 'globalpulse:reactions:v1';
  const feed = document.getElementById('feed-container');
  if (!feed) return;

  function readReactions() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        liked: new Set(Array.isArray(saved.liked) ? saved.liked : []),
        saved: new Set(Array.isArray(saved.saved) ? saved.saved : [])
      };
    } catch (error) {
      console.warn('Não foi possível ler curtidas e favoritos salvos.', error);
      return { liked: new Set(), saved: new Set() };
    }
  }

  let reactions = readReactions();

  function writeReactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        liked: [...reactions.liked],
        saved: [...reactions.saved]
      }));
    } catch (error) {
      console.warn('Não foi possível salvar curtidas e favoritos neste navegador.', error);
    }
  }

  function getCardKey(card) {
    const title = card.querySelector('h2')?.textContent?.trim().toLocaleLowerCase('pt-BR') || '';
    const category = card.dataset.category || '';
    const sourceUrl = card.querySelector('a.action-btn')?.href || '';
    const value = `${category}|${title}|${sourceUrl}`;
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return `article-${(hash >>> 0).toString(36)}`;
  }

  function updateButton(button, active, type) {
    const color = type === 'like' ? 'text-red-400' : 'text-yellow-400';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', type === 'like'
      ? (active ? 'Remover curtida' : 'Curtir notícia')
      : (active ? 'Remover dos favoritos' : 'Salvar notícia'));

    const icon = button.querySelector('i');
    if (icon) {
      icon.classList.toggle(color, active);
      icon.classList.toggle('text-white', !active);
    }
  }

  function restoreCardState(card) {
    const key = getCardKey(card);
    card.dataset.id = key;
    const likeButton = card.querySelector('.like-btn');
    const saveButton = card.querySelector('.save-btn');
    if (likeButton) updateButton(likeButton, reactions.liked.has(key), 'like');
    if (saveButton) updateButton(saveButton, reactions.saved.has(key), 'save');
  }

  function restoreVisibleCards() {
    feed.querySelectorAll('.card-snap').forEach(restoreCardState);
  }

  feed.addEventListener('click', (event) => {
    const button = event.target.closest('.like-btn, .save-btn');
    if (!button || !feed.contains(button)) return;

    const card = button.closest('.card-snap');
    if (!card) return;

    const key = getCardKey(card);
    const isLike = button.classList.contains('like-btn');
    const collection = isLike ? reactions.liked : reactions.saved;
    if (collection.has(key)) collection.delete(key);
    else collection.add(key);
    writeReactions();
  });

  new MutationObserver(restoreVisibleCards).observe(feed, { childList: true, subtree: true });
  restoreVisibleCards();
})();
