const SCRYFALL_API = 'https://api.scryfall.com';

/**
 * Search for cards using Scryfall API
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of card objects
 */
async function searchCards(query) {
  try {
    const response = await fetch(`${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching cards:', error);
    return [];
  }
}

/**
 * Get a random card from Scryfall API
 * @returns {Promise<Object>} A random card object
 */
async function getRandomCard() {
  try {
    const response = await fetch(`${SCRYFALL_API}/cards/random`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch random card: ${response.status}`);
    }
    
    const card = await response.json();
    return card;
  } catch (error) {
    console.error('Error fetching random card:', error);
    return null;
  }
}

/**
 * Get a specific card by Scryfall ID
 * @param {string} cardId - The Scryfall card ID
 * @returns {Promise<Object>} The card object
 */
async function getCardById(cardId) {
  try {
    const response = await fetch(`${SCRYFALL_API}/cards/${cardId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch card: ${response.status}`);
    }
    
    const card = await response.json();
    return card;
  } catch (error) {
    console.error('Error fetching card by ID:', error);
    return null;
  }
}

/**
 * Display a single card on the card page
 * @param {Object} card - The card object from Scryfall API
 */
function displayCard(card) {
  if (!card) {
    document.querySelector('.card-page').innerHTML = '<p>Card not found</p>';
    return;
  }

  const cardArtUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '';
  const cardName = card.name || 'Unknown';
  const manaCost = card.mana_cost || '';
  const typeLine = card.type_line || '';
  const oracleText = card.oracle_text || '';
  const power = card.power || '0';
  const toughness = card.toughness || '0';
  const artist = card.artist || 'Unknown';
  const watermark = card.watermark || 'N/A';

  const cardHTML = `
    <div class="big-card">
      <div class="art-panel">
        <a href="${cardArtUrl}" data-lightbox="image-1" data-title="${cardName} - Illustrated by ${artist}">
          <img src="${cardArtUrl}" alt="${cardName}" class="card-art" />
        </a>
      </div>

      <div class="detail-panel">
        <div class="detail-header">
          <h2 class="card-name">${cardName}</h2>
          <div class="mana-cost">${manaCost}</div>
        </div>

        <button id="favoriteBtn" class="favorite-btn">♡ Add to Favorites</button>

        <div class="type-line">${typeLine}</div>

        <div class="rules-text">
          ${oracleText.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>

        <div class="power-toughness">${power}/${toughness}</div>

        <div class="detail-footer">
          <p><strong>Watermark:</strong> ${watermark}</p>
          <p><strong>Illustrated by:</strong> ${artist}</p>
        </div>

        <div class="legality-section">
          ${displayLegality(card.legalities)}
        </div>
      </div>
    </div>
  `;

  document.querySelector('.card-page').innerHTML = cardHTML;
  
  // Reinitialize lightbox if it exists
  if (typeof lightbox !== 'undefined') {
    lightbox.init();
  }
}

/**
 * Display legality information for a card
 * @param {Object} legalities - The legalities object from Scryfall
 * @returns {string} HTML string with legality information
 */
function displayLegality(legalities) {
  if (!legalities) return '';

  const formats = Object.keys(legalities);
  const midpoint = Math.ceil(formats.length / 2);
  const leftFormats = formats.slice(0, midpoint);
  const rightFormats = formats.slice(midpoint);

  const formatHTML = (formatList) =>
    formatList
      .map(format => {
        const status = legalities[format];
        const badgeClass = status === 'legal' ? 'legal' : 'not-legal';
        const badgeText = status === 'legal' ? 'LEGAL' : 'NOT LEGAL';
        const formatName = format.charAt(0).toUpperCase() + format.slice(1);
        return `
          <div class="legality-row">
            <span class="legal-badge ${badgeClass}">${badgeText}</span>
            <span>${formatName}</span>
          </div>
        `;
      })
      .join('');

  return `
    <div class="legality-column">
      ${formatHTML(leftFormats)}
    </div>
    <div class="legality-column">
      ${formatHTML(rightFormats)}
    </div>
  `;
}

/**
 * Display search results as a grid of cards with pagination and sorting
 * @param {Array} cards - Array of card objects
 * @param {number} currentPage - Current page number (1-indexed)
 * @param {number} cardsPerPage - Number of cards per page
 * @param {string} sortBy - Sort option: 'name', 'release-date', 'edhrec'
 */
function displaySearchResults(cards, currentPage = 1, cardsPerPage = 12, sortBy = 'name') {
  const container = document.querySelector('.cards-container');

  if (cards.length === 0) {
    container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 40px;">No cards found. Try a different search!</p>';
    return;
  }

  // Sort cards based on sortBy parameter
  let sortedCards = [...cards];
  switch (sortBy) {
    case 'name':
      sortedCards.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'release-date':
      sortedCards.sort((a, b) => new Date(b.released_at) - new Date(a.released_at));
      break;
    case 'edhrec':
      sortedCards.sort((a, b) => {
        const rankA = a.edhrec_rank || Infinity;
        const rankB = b.edhrec_rank || Infinity;
        return rankA - rankB;
      });
      break;
    default:
      sortedCards.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Calculate pagination
  const totalPages = Math.ceil(sortedCards.length / cardsPerPage);
  const startIndex = (currentPage - 1) * cardsPerPage;
  const endIndex = startIndex + cardsPerPage;
  const paginatedCards = sortedCards.slice(startIndex, endIndex);

  // Generate card HTML with clickable links
  const cardsHTML = paginatedCards
    .map(
      card => `
    <a href="card-detail.html?id=${card.id}" class="card-link" style="text-decoration: none; color: inherit;">
      <div class="card">
        <h3>${card.name}</h3>
        <img src="${card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || ''}" alt="${card.name}" />
        <p>${card.type_line}</p>
      </div>
    </a>
  `
    )
    .join('');

  // Generate sort controls
  const sortHTML = `
    <div class="sort-controls" style="grid-column: 1 / -1; padding: 20px; text-align: center;">
      <label for="sort-select" style="font-weight: bold; margin-right: 10px;">Sort by:</label>
      <select id="sort-select" class="sort-select" onchange="window.handleSortChange(this.value)" style="padding: 8px 12px; font-size: 14px; border-radius: 8px; border: 1px solid #ccc; cursor: pointer;">
        <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Name (A-Z)</option>
        <option value="release-date" ${sortBy === 'release-date' ? 'selected' : ''}>Release Date (Newest)</option>
        <option value="edhrec" ${sortBy === 'edhrec' ? 'selected' : ''}>EDHRec Rank</option>
      </select>
    </div>
  `;

  // Generate pagination controls
  let paginationHTML = '';
  if (totalPages > 1) {
    paginationHTML = `
      <div class="pagination" style="grid-column: 1 / -1; display: flex; justify-content: center; gap: 10px; margin-top: 20px; align-items: center;">
        ${currentPage > 1 ? `<button class="pagination-btn" onclick="window.handlePageChange(${currentPage - 1})">← Previous</button>` : '<button class="pagination-btn" disabled style="opacity: 0.5; cursor: not-allowed;">← Previous</button>'}
        <span style="font-size: 16px; font-weight: bold;">Page ${currentPage} of ${totalPages}</span>
        ${currentPage < totalPages ? `<button class="pagination-btn" onclick="window.handlePageChange(${currentPage + 1})">Next →</button>` : '<button class="pagination-btn" disabled style="opacity: 0.5; cursor: not-allowed;">Next →</button>'}
      </div>
    `;
  }

  container.innerHTML = sortHTML + cardsHTML + paginationHTML;
}
