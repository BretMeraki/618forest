import fetch from 'node-fetch';
import { FILE_NAMES, WEB_CONTEXT } from './constants.js';

/**
 * WebContext – pulls live snippets from DuckDuckGo and stores a cached summary
 * The summary is passed through the existing truthful-filter (via llm.requestIntelligence)
 * so downstream prompts remain trustworthy.
 */
export class WebContext {
  constructor(
    dataPersistence,
    llmInterface,
    {
      refreshIntervalHours = WEB_CONTEXT.DEFAULT_REFRESH_HOURS,
      ttlHours = WEB_CONTEXT.DEFAULT_TTL_HOURS,
      maxSnippets = 5,
    } = {}
  ) {
    this.dp = dataPersistence;
    this.llm = llmInterface;
    this.refreshMs = refreshIntervalHours * WEB_CONTEXT.REFRESH_MULTIPLIER;
    this.ttlMs = ttlHours * WEB_CONTEXT.TTL_MULTIPLIER;
    this.maxSnippets = maxSnippets;
  }

  async refreshIfNeeded(goal, question = '') {
    // Load cached context
    const cache = (await this.dp.loadGlobalData(FILE_NAMES.EXTERNAL_CONTEXT)) || {};
    const now = Date.now();

    if (cache.goal === goal && now - new Date(cache.fetched_at).getTime() < this.ttlMs) {
      return cache.summary || '';
    }

    // Build search query (goal + current question)
    const query = encodeURIComponent(`${goal} ${question}`.trim());
    const url = `https://duckduckgo.com/html/?q=${query}`;

    let html = '';
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (ForestBot)',
        },
      });
      html = await res.text();
    } catch (e) {
      await this.dp.logError('WebContext.fetch', e, { url });
      return '';
    }

    // Simple regex extraction of titles + snippets
    const items = [];
    const re =
      /<a[^>]*class="result__a"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null && items.length < this.maxSnippets) {
      const title = m[1].replace(/<[^>]+>/g, '').trim();
      const snippet = m[2].replace(/<[^>]+>/g, '').trim();
      if (title && snippet) {
        items.push({ title, snippet });
      }
    }

    if (items.length === 0) {
      return '';
    }

    // Summarise & truthful-filter via LLM
    const prompt = `Summarise and fact-check the following web snippets in <=120 words.\n\n${JSON.stringify(items, null, 2)}`;
    let summary = '';
    try {
      const resp = await this.llm.requestIntelligence('web-snippet-summary', { prompt });
      if (!resp?.request_for_claude) {
        summary = resp.completion || resp.answer || resp.text || '';
      } else {
        // queued for Claude – leave summary empty for now
      }
    } catch (_) {
      /* ignore */
    }

    // Cache
    await this.dp.saveGlobalData(FILE_NAMES.EXTERNAL_CONTEXT, {
      goal,
      summary,
      fetched_at: new Date().toISOString(),
    });

    return summary;
  }
}
