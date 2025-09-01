import { createAmazonHeaders, getAmazonConfig, AmazonCountry } from './aws-auth';

/**
 * Amazon Product Advertising API Service
 * Handles product search, item lookup, and cart creation
 */

export interface AmazonProduct {
  product_id: string;
  product_title: string;
  product_photos: string[];
  product_page_url: string;
  offer: {
    price: string;
    currency_code?: string;
    store_name?: string;
    availability?: string;
  };
  rating?: number;
  review_count?: number;
  brand?: string;
  features?: string[];
}

export interface SearchParams {
  keywords: string;
  country?: AmazonCountry;
  itemPage?: number;
  itemCount?: number;
  searchIndex?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
}

interface AmazonAPIResponse {
  SearchResult?: {
    Items?: AmazonAPIItem[];
    TotalResultCount?: number;
    SearchURL?: string;
  };
  Errors?: Array<{
    Code: string;
    Message: string;
  }>;
}

interface AmazonAPIItem {
  ASIN: string;
  DetailPageURL: string;
  Images?: {
    Primary?: {
      Large?: { URL: string };
      Medium?: { URL: string };
    };
  };
  ItemInfo?: {
    Title?: { DisplayValue: string };
    ByLineInfo?: {
      Brand?: { DisplayValue: string };
      Manufacturer?: { DisplayValue: string };
    };
    Features?: {
      DisplayValues: string[];
    };
  };
  Offers?: {
    Listings?: Array<{
      Id: string;
      Price?: {
        DisplayAmount: string;
        Amount: number;
        Currency: string;
      };
      Availability?: {
        Message: string;
      };
      SavingBasis?: {
        DisplayAmount: string;
      };
    }>;
    Summaries?: Array<{
      HighestPrice?: {
        DisplayAmount: string;
      };
      LowestPrice?: {
        DisplayAmount: string;
      };
    }>;
  };
  CustomerReviews?: {
    StarRating?: {
      Value: number;
    };
    Count: number;
  };
}

/**
 * Search for products using Amazon Product Advertising API
 */
export async function searchAmazonProducts(params: SearchParams): Promise<{
  products: AmazonProduct[];
  totalResults: number;
  searchUrl?: string;
}> {
  const {
    keywords,
    country = 'us',
    itemPage = 1,
    itemCount = 10,
    searchIndex = 'All',
    minPrice,
    maxPrice,
    brand
  } = params;

  const config = getAmazonConfig(country);
  const affiliateId = process.env.AMAZON_AFFILIATE_ID;
  
  if (!affiliateId) {
    throw new Error('Amazon affiliate ID not configured');
  }

  // Build request payload
  const requestPayload: any = {
    Keywords: keywords,
    Resources: [
      'BrowseNodeInfo.BrowseNodes',
      'BrowseNodeInfo.WebsiteSalesRank',
      'CustomerReviews.Count',
      'CustomerReviews.StarRating',
      'Images.Primary.Large',
      'Images.Primary.Medium',
      'ItemInfo.ByLineInfo',
      'ItemInfo.Features',
      'ItemInfo.Title',
      'Offers.Listings.Availability.Message',
      'Offers.Listings.Price',
      'Offers.Summaries.HighestPrice',
      'Offers.Summaries.LowestPrice'
    ],
    PartnerTag: affiliateId,
    PartnerType: 'Associates',
    Marketplace: `www.${config.domain}`,
    ItemPage: itemPage,
    ItemCount: Math.min(itemCount, 10), // Amazon limits to 10 items per request
    SearchIndex: searchIndex
  };

  // Add optional filters
  if (minPrice !== undefined) requestPayload.MinPrice = minPrice * 100; // Convert to cents
  if (maxPrice !== undefined) requestPayload.MaxPrice = maxPrice * 100;
  if (brand) requestPayload.Brand = brand;

  const payload = JSON.stringify(requestPayload);
  const headers = createAmazonHeaders(payload, country);
  
  // Debug logging
  console.log('Amazon API Request Debug:', {
    endpoint: `https://${config.endpoint}/paapi5/searchitems`,
    affiliateId: affiliateId,
    marketplace: `www.${config.domain}`,
    payloadKeys: Object.keys(requestPayload)
  });
  
  try {
    const response = await fetch(`https://${config.endpoint}/paapi5/searchitems`, {
      method: 'POST',
      headers,
      body: payload
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Amazon API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Amazon API request failed: ${response.status} ${response.statusText}`);
    }

    const data: AmazonAPIResponse = await response.json();
    
    if (data.Errors && data.Errors.length > 0) {
      console.error('Amazon API Errors:', data.Errors);
      throw new Error(`Amazon API Error: ${data.Errors[0]?.Message || 'Unknown error'}`);
    }

    const items = data.SearchResult?.Items || [];
    const totalResults = data.SearchResult?.TotalResultCount || 0;
    const searchUrl = data.SearchResult?.SearchURL;

    const products: AmazonProduct[] = items.map(transformAmazonItem);

    return {
      products,
      totalResults,
      ...(searchUrl && { searchUrl })
    };

  } catch (error) {
    console.error('Amazon product search failed:', error);
    throw error;
  }
}

/**
 * Transform Amazon API item to our standardized product format
 */
function transformAmazonItem(item: AmazonAPIItem): AmazonProduct {
  const listing = item.Offers?.Listings?.[0];
  const summary = item.Offers?.Summaries?.[0];
  
  return {
    product_id: item.ASIN,
    product_title: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
    product_photos: [
      item.Images?.Primary?.Large?.URL,
      item.Images?.Primary?.Medium?.URL
    ].filter(Boolean) as string[],
    product_page_url: item.DetailPageURL,
    offer: {
      price: listing?.Price?.DisplayAmount || 
             summary?.LowestPrice?.DisplayAmount || 
             'Price not available',
      ...(listing?.Price?.Currency && { currency_code: listing.Price.Currency }),
      store_name: item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue ||
                  item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ||
                  'Amazon',
      ...(listing?.Availability?.Message && { availability: listing.Availability.Message })
    },
    ...(item.CustomerReviews?.StarRating?.Value && { rating: item.CustomerReviews.StarRating.Value }),
    ...(item.CustomerReviews?.Count && { review_count: item.CustomerReviews.Count }),
    ...(item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue 
        ? { brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue! } 
        : {}),
    ...(item.ItemInfo?.Features?.DisplayValues && { features: item.ItemInfo.Features.DisplayValues })
  };
}

/**
 * Generate Amazon cart URL with multiple products using Amazon's cart creation API
 * Uses the proper chefscart-20 affiliate ID for production links
 */
export function generateAmazonCartUrl(
  products: Array<{ asin: string; quantity?: number }>,
  country: AmazonCountry = 'us'
): string {
  const config = getAmazonConfig(country);
  // Use chefscart-20 for actual affiliate links (giftlist0ca-20 is only for API access)
  const affiliateId = 'chefscart-20';
  
  if (products.length === 0) {
    throw new Error('No products provided for cart');
  }

  if (products.length === 1) {
    // Single product - use simple product page URL with affiliate tag
    const product = products[0]!;
    return `https://www.${config.domain}/dp/${product.asin}?tag=${affiliateId}&linkCode=osi&th=1&psc=1`;
  }

  // Multiple products - use Amazon's cart creation URL format
  const params = new URLSearchParams();
  params.append('AssociateTag', affiliateId);
  
  products.forEach((product, index) => {
    const itemNum = index + 1;
    params.append(`ASIN.${itemNum}`, product.asin);
    params.append(`Quantity.${itemNum}`, (product.quantity || 1).toString());
  });

  return `https://www.${config.domain}/gp/aws/cart/add.html?${params.toString()}`;
}

/**
 * Get product details by ASIN
 */
export async function getAmazonProduct(
  asin: string,
  country: AmazonCountry = 'us'
): Promise<AmazonProduct | null> {
  const config = getAmazonConfig(country);
  const affiliateId = process.env.AMAZON_AFFILIATE_ID;
  
  if (!affiliateId) {
    throw new Error('Amazon affiliate ID not configured');
  }

  const requestPayload = {
    ItemIds: [asin],
    Resources: [
      'BrowseNodeInfo.BrowseNodes',
      'CustomerReviews.Count',
      'CustomerReviews.StarRating',
      'Images.Primary.Large',
      'ItemInfo.ByLineInfo',
      'ItemInfo.Features',
      'ItemInfo.Title',
      'Offers.Listings.Availability.Message',
      'Offers.Listings.Price'
    ],
    PartnerTag: affiliateId,
    PartnerType: 'Associates',
    Marketplace: `www.${config.domain}`
  };

  const payload = JSON.stringify(requestPayload);
  const headers = createAmazonHeaders(payload, country, '/paapi5/getitems');
  
  try {
    const response = await fetch(`https://${config.endpoint}/paapi5/getitems`, {
      method: 'POST',
      headers,
      body: payload
    });

    if (!response.ok) {
      throw new Error(`Amazon API request failed: ${response.status}`);
    }

    const data: any = await response.json();
    
    if (data.Errors && data.Errors.length > 0) {
      console.error('Amazon API Errors:', data.Errors);
      return null;
    }

    const items = data.ItemsResult?.Items || [];
    if (items.length === 0) {
      return null;
    }

    return transformAmazonItem(items[0]);

  } catch (error) {
    console.error('Amazon product lookup failed:', error);
    return null;
  }
}