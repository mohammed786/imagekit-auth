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

    const filters = [];
    if (category) filters.push(`category_name = "${category}"`);
    if (brand) filters.push(`brand_name = "${brand}"`);

    const searchParams = {
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      attributesToHighlight: ['product_name', 'brand_name', 'key_feature', 'product_codes', 'l1_values', 'l2_values'],
    };

    if (filters.length > 0) {
      searchParams.filter = filters.join(' AND ');
    }

    if (sort) {
      searchParams.sort = [sort];
    }

    const results = await meili.index('products').search(query, searchParams);

    const cleanQuery = query.trim().toLowerCase();

    // Map hits and resolve exact matched L1 and L2 category IDs
    const hitsWithSelectedCategory = results.hits.map(hit => {
      let matchedVariant = null;

      if (cleanQuery && Array.isArray(hit.flat_variants)) {
        // 1. Try exact product code match
        matchedVariant = hit.flat_variants.find(
          v => v.product_code && v.product_code.toLowerCase() === cleanQuery
        );

        // 2. Try partial product code match
        if (!matchedVariant) {
          matchedVariant = hit.flat_variants.find(
            v => v.product_code && v.product_code.toLowerCase().includes(cleanQuery)
          );
        }

        // 3. Try matching L1 or L2 category values
        if (!matchedVariant) {
          matchedVariant = hit.flat_variants.find(
            v => (v.l1_value && v.l1_value.toLowerCase().includes(cleanQuery)) ||
                 (v.l2_value && v.l2_value.toLowerCase().includes(cleanQuery))
          );
        }
      }

      // Default to first variant if no specific variant matched
      if (!matchedVariant && hit.flat_variants && hit.flat_variants.length > 0) {
        matchedVariant = hit.flat_variants[0];
      }

      return {
        ...hit,
        matched_selection: matchedVariant ? {
          l1_id: matchedVariant.l1_id,
          l1_value: matchedVariant.l1_value,
          l2_id: matchedVariant.l2_id,
          l2_value: matchedVariant.l2_value,
          product_code: matchedVariant.product_code,
          price: matchedVariant.price
        } : null
      };
    });

    return res.json({
      success: true,
      hits: hitsWithSelectedCategory,
      pagination: {
        totalHits: results.estimatedTotalHits,
        limit: results.limit,
        offset: results.offset,
        page: parseInt(page, 10),
        totalPages: Math.ceil(results.estimatedTotalHits / results.limit) || 1,
      },
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      details: error.message,
    });
  }
});

module.exports = router;
