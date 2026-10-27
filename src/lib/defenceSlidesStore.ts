import { DEFENCE_FACT_FIELDS, type DefenceDeck } from './defenceSlides';

type SavedDeck = { id: string; ownerId: string; deck: DefenceDeck };

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === 'undefined') { reject(new Error('This browser cannot save presentations. Download a copy before leaving.')); return; }
  const request = indexedDB.open('uhpab-defence-slides', 1);
  request.onupgradeneeded = () => {
    const store = request.result.createObjectStore('decks', { keyPath: 'id' });
    store.createIndex('ownerId', 'ownerId');
  };
  request.onerror = () => reject(new Error('Your presentation could not be saved on this device.'));
  request.onblocked = () => reject(new Error('Close other open presentation tabs and retry saving.'));
  request.onsuccess = () => resolve(request.result);
});

export async function listDefenceDecks(ownerId: string): Promise<DefenceDeck[]> {
  if (!ownerId) return [];
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('decks').objectStore('decks').index('ownerId').getAll(ownerId);
      request.onsuccess = () => resolve((request.result as SavedDeck[])
        .filter(record => record.ownerId === ownerId && record.deck?.version === 1 && record.deck.slides?.length === 10
          && typeof record.deck.updatedAt === 'string'
          && DEFENCE_FACT_FIELDS.every(({ key }) => typeof record.deck.facts?.[key]?.value === 'string')
          && record.deck.slides.every(slide => typeof slide.title === 'string' && typeof slide.notes === 'string' && Array.isArray(slide.bullets) && Array.isArray(slide.sourceKeys)))
        .map(record => record.deck).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      request.onerror = () => reject(new Error('Saved presentations could not be opened.'));
    });
  } finally { db.close(); }
}

export async function saveDefenceDeck(ownerId: string, deck: DefenceDeck): Promise<void> {
  if (!ownerId) throw new Error('Sign in to save your presentation.');
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('decks', 'readwrite');
      tx.objectStore('decks').put({ id: `${ownerId}:${deck.id}`, ownerId, deck } satisfies SavedDeck);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Your changes could not be saved. Download a copy before leaving.'));
      tx.onabort = () => reject(new Error('Saving was interrupted. Download a copy before leaving.'));
    });
  } finally { db.close(); }
}
