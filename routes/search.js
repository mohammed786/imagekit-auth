const express = require('express');
const router = express.Router();

// Lazily initialize the Meilisearch client so the module loads synchronously
let client;

const getClient = async () => {
  if (client) return client;

  // Safely resolve Meilisearch constructor for SDK compatibility
  const meiliModule = await import('meilisearch');
  const Meilisearch =
    meiliModule.Meilisearch || meiliModule.MeiliSearch || meiliModule.default;

  client = new Meilisearch({
    host: process.env.MEILISEARCH_HOST || 'https://search.atozhardware.in',
    apiKey: process.env.MEILISEARCH_KEY || 'AtoZHardware@123',
  });

  return client;
};

// GET /api/v1/search?query=<term>
router.get('/', async (req, res) => {
  try {
    const { 
      query = '', 
      limit = 20, 
      page = 1, 
      category, 
      brand, 
      sort 
    } = req.query;

    const meili = await getClient();

    // 1. Construct dynamic filters
    const filters = [];
    if (category) filters.push(`category_name = "${category}"`);
    if (brand) filters.push(`brand_name = "${brand}"`);

    // 2. Prepare search parameters
    const searchParams = {
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      attributesToHighlight: ['product_name', 'brand_name', 'key_feature'],
    };

    if (filters.length > 0) {
      searchParams.filter = filters.join(' AND ');
    }

    if (sort) {
      searchParams.sort = [sort];
    }

    // 3. Execute search
    const results = await meili.index('products').search(query, searchParams);

    // 4. Return structured JSON with metadata
    return res.json({
      success: true,
      hits: results.hits,
      pagination: {
        totalHits: results.estimatedTotalHits,
        limit: results.limit,
        offset: results.offset,
        page: parseInt(page, 10),
        totalPages: Math.ceil(results.estimatedTotalHits / results.limit) || 1,
      },
    });

    /* 
      NOTE: If your frontend strictly expects ONLY an array (without the wrapper), 
      you can keep: return res.json(results.hits);
    */

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      details: error.message,
    });
  }
});

module.exports = router;
