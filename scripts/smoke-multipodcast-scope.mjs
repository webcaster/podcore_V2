import assert from 'node:assert/strict';
import { getPodcastScopeId, podcastScopeClause } from '../server/dist/services/podcastScope.js';

function makeDb(settings) {
  return {
    get(sql, params) {
      assert.match(sql, /FROM settings/);
      assert.deepEqual(params, ['app']);
      return { value: JSON.stringify(settings) };
    },
  };
}

function makeRequest(headerValue = '') {
  return { header: (name) => name === 'x-podcore-podcast-id' ? headerValue : undefined };
}

const settings = {
  activePodcastId: 'podcast-a',
  podcasts: [{ id: 'podcast-a', active: true }, { id: 'podcast-b', active: false }],
};

const db = makeDb(settings);
assert.equal(getPodcastScopeId(makeRequest(), db), 'podcast-a');
assert.equal(getPodcastScopeId(makeRequest('podcast-b'), db), 'podcast-b');
assert.equal(getPodcastScopeId(makeRequest('unbekannt'), db), 'podcast-a');
assert.deepEqual(podcastScopeClause('podcast_id', 'podcast-b'), { sql: ' AND podcast_id = ?', params: ['podcast-b'] });
assert.deepEqual(podcastScopeClause('podcast_id', null), { sql: '', params: [] });

const singlePodcastDb = makeDb({});
assert.equal(getPodcastScopeId(makeRequest(), singlePodcastDb), null);

console.log('Mehrfach-Podcast-Scope-Rauchtest erfolgreich: Auswahl, Header-Override und Einzelpodcast-Fallback geprüft.');
