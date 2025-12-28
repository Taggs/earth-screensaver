const { parseStringPromise } = require('xml2js');

/**
 * Parse RSS 2.0 or Atom XML feed
 * @param {string} xmlString - The XML feed content
 * @returns {Promise<Array>} Array of normalized article objects
 */
async function parseRSSFeed(xmlString) {
  try {
    const result = await parseStringPromise(xmlString, {
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    });

    let articles = [];

    // Parse RSS 2.0 format
    if (result.rss && result.rss.channel && result.rss.channel.item) {
      const items = Array.isArray(result.rss.channel.item)
        ? result.rss.channel.item
        : [result.rss.channel.item];

      articles = items.map(item => ({
        title: item.title || 'No title',
        description: stripHtmlTags(item.description || ''),
        url: item.link || '#',
        publishedAt: item.pubDate || new Date().toISOString(),
        author: item.author || item['dc:creator'] || 'Unknown',
        source: {
          name: result.rss.channel.title || 'RSS Feed'
        },
        content: stripHtmlTags(item['content:encoded'] || item.description || '')
      }));
    }
    // Parse Atom format
    else if (result.feed && result.feed.entry) {
      const entries = Array.isArray(result.feed.entry)
        ? result.feed.entry
        : [result.feed.entry];

      articles = entries.map(entry => {
        const link = Array.isArray(entry.link)
          ? entry.link.find(l => l.rel === 'alternate')?.href || entry.link[0]?.href || '#'
          : entry.link?.href || '#';

        const author = entry.author?.name ||
                      (Array.isArray(entry.author) ? entry.author[0]?.name : null) ||
                      'Unknown';

        return {
          title: entry.title?._text || entry.title || 'No title',
          description: stripHtmlTags(entry.summary?._text || entry.summary || ''),
          url: link,
          publishedAt: entry.updated || entry.published || new Date().toISOString(),
          author: author,
          source: {
            name: result.feed.title?._text || result.feed.title || 'Atom Feed'
          },
          content: stripHtmlTags(entry.content?._text || entry.content || entry.summary?._text || entry.summary || '')
        };
      });
    } else {
      throw new Error('Unrecognized XML feed format');
    }

    console.log(`[Feed Parser] Successfully parsed ${articles.length} articles from RSS/Atom feed`);
    return articles;

  } catch (error) {
    console.error('[Feed Parser] Failed to parse RSS/Atom feed:', error);
    throw new Error(`RSS/Atom parsing failed: ${error.message}`);
  }
}

/**
 * Parse WorldNewsAPI JSON response
 * @param {Object} jsonData - The JSON response from WorldNewsAPI
 * @returns {Array} Array of normalized article objects
 */
function parseWorldNewsAPI(jsonData) {
  try {
    if (!jsonData.news || !Array.isArray(jsonData.news)) {
      throw new Error('Invalid WorldNewsAPI response format');
    }

    const articles = jsonData.news.map(item => ({
      title: item.title || 'No title',
      description: item.text || item.summary || '',
      url: item.url || '#',
      publishedAt: item.publish_date || new Date().toISOString(),
      author: item.authors?.join(', ') || item.author || 'Unknown',
      source: {
        name: item.source_country || 'World News'
      },
      content: item.text || item.summary || ''
    }));

    console.log(`[Feed Parser] Successfully parsed ${articles.length} articles from WorldNewsAPI`);
    return articles;

  } catch (error) {
    console.error('[Feed Parser] Failed to parse WorldNewsAPI response:', error);
    throw new Error(`WorldNewsAPI parsing failed: ${error.message}`);
  }
}

/**
 * Parse generic NewsAPI-style JSON response
 * @param {Object} jsonData - The JSON response
 * @returns {Array} Array of normalized article objects
 */
function parseGenericNewsAPI(jsonData) {
  try {
    let articles = [];

    // Check for NewsAPI.org format
    if (jsonData.articles && Array.isArray(jsonData.articles)) {
      articles = jsonData.articles.map(item => ({
        title: item.title || 'No title',
        description: item.description || '',
        url: item.url || '#',
        publishedAt: item.publishedAt || new Date().toISOString(),
        author: item.author || 'Unknown',
        source: {
          name: item.source?.name || 'News API'
        },
        content: item.content || item.description || ''
      }));
    }
    // Check for simple array format
    else if (Array.isArray(jsonData)) {
      articles = jsonData.map(item => ({
        title: item.title || item.headline || 'No title',
        description: item.description || item.summary || '',
        url: item.url || item.link || '#',
        publishedAt: item.publishedAt || item.date || item.published || new Date().toISOString(),
        author: item.author || item.byline || 'Unknown',
        source: {
          name: item.source || 'News Feed'
        },
        content: item.content || item.body || item.description || ''
      }));
    } else {
      throw new Error('Unrecognized JSON feed format');
    }

    console.log(`[Feed Parser] Successfully parsed ${articles.length} articles from generic JSON`);
    return articles;

  } catch (error) {
    console.error('[Feed Parser] Failed to parse generic JSON feed:', error);
    throw new Error(`Generic JSON parsing failed: ${error.message}`);
  }
}

/**
 * Main parsing function - auto-detects feed type and parses accordingly
 * @param {string|Object} content - The feed content (string for XML, object for JSON)
 * @param {string} contentType - The Content-Type header from response
 * @param {string} declaredType - The type declared in news-feeds.json
 * @returns {Promise<Array>} Array of normalized article objects
 */
async function parseFeed(content, contentType, declaredType) {
  console.log(`[Feed Parser] Parsing feed with Content-Type: ${contentType}, Declared: ${declaredType}`);

  try {
    // If content is already parsed JSON
    if (typeof content === 'object') {
      if (declaredType === 'worldnews-api') {
        return parseWorldNewsAPI(content);
      } else {
        return parseGenericNewsAPI(content);
      }
    }

    // If content is string, determine format
    const contentStr = String(content);

    // Check if it's XML (RSS/Atom)
    const isXML = contentType?.includes('xml') ||
                  contentType?.includes('rss') ||
                  contentType?.includes('atom') ||
                  declaredType === 'rss' ||
                  declaredType === 'atom' ||
                  contentStr.trim().startsWith('<');

    if (isXML) {
      return await parseRSSFeed(contentStr);
    }

    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(contentStr);

      if (declaredType === 'worldnews-api') {
        return parseWorldNewsAPI(jsonData);
      } else {
        return parseGenericNewsAPI(jsonData);
      }
    } catch (jsonError) {
      // If JSON parse fails, maybe it's XML after all
      return await parseRSSFeed(contentStr);
    }

  } catch (error) {
    console.error('[Feed Parser] All parsing attempts failed:', error);
    throw error;
  }
}

/**
 * Strip HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
function stripHtmlTags(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

module.exports = {
  parseFeed,
  parseRSSFeed,
  parseWorldNewsAPI,
  parseGenericNewsAPI
};
