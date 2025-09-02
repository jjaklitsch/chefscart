import { createHmac, createHash } from 'crypto';

/**
 * AWS Signature Version 4 Authentication Helper
 * For Amazon Product Advertising API (PA-API 5.0)
 */

// Amazon marketplace configurations
export const AMAZON_COUNTRIES = {
  us: { 
    domain: 'amazon.com', 
    region: 'us-east-1', 
    endpoint: 'webservices.amazon.com'
  }
} as const;

export type AmazonCountry = keyof typeof AMAZON_COUNTRIES;

interface SignatureComponents {
  authorizationHeader: string;
  timestamp: string;
  signedHeaders: string;
}

/**
 * Create HMAC signature using key and data
 */
function sign(key: Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

/**
 * Generate AWS signature key for a given date, region, and service
 */
function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = sign(Buffer.from(`AWS4${secretKey}`, 'utf-8'), dateStamp);
  const kRegion = sign(kDate, regionName);
  const kService = sign(kRegion, serviceName);
  return sign(kService, 'aws4_request');
}

/**
 * Create canonical query string from parameters
 */
function createCanonicalQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key] || '')}`)
    .join('&');
}

/**
 * Create canonical headers string
 */
function createCanonicalHeaders(headers: Record<string, string>): string {
  return Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${(headers[key] || '').trim()}`)
    .join('\n') + '\n';
}

/**
 * Generate AWS Signature V4 for Amazon PA-API requests
 */
export function generateAWSSignature(
  method: string,
  path: string,
  queryParams: Record<string, string>,
  headers: Record<string, string>,
  payload: string,
  accessKey: string,
  secretKey: string,
  region: string,
  service: string = 'ProductAdvertisingAPI'
): SignatureComponents {
  // Create timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const dateStamp = timestamp.slice(0, 8);

  // Add required headers
  const allHeaders = {
    ...headers,
    'x-amz-date': timestamp
  };

  // Create canonical request components
  const canonicalQueryString = createCanonicalQueryString(queryParams);
  const canonicalHeaders = createCanonicalHeaders(allHeaders);
  const signedHeaders = Object.keys(allHeaders)
    .map(key => key.toLowerCase())
    .sort()
    .join(';');

  // Create payload hash
  const payloadHash = createHash('sha256')
    .update(payload, 'utf8')
    .digest('hex');

  // Create canonical request
  const canonicalRequest = [
    method,
    path,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');


  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = createHash('sha256')
    .update(canonicalRequest, 'utf8')
    .digest('hex');
  
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    canonicalRequestHash
  ].join('\n');

  // Generate signature
  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex');

  // Create authorization header
  const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    authorizationHeader,
    timestamp,
    signedHeaders
  };
}

/**
 * Get Amazon API configuration for a specific country
 */
export function getAmazonConfig(country: AmazonCountry = 'us') {
  const config = AMAZON_COUNTRIES[country];
  if (!config) {
    throw new Error(`Unsupported Amazon country: ${country}`);
  }
  return config;
}

/**
 * Create headers for Amazon PA-API request
 */
export function createAmazonHeaders(
  payload: string,
  country: AmazonCountry = 'us',
  operationPath: string = '/paapi5/searchitems'
): Record<string, string> {
  const accessKey = process.env.AMAZON_ACCESS_KEY_ID;
  const secretKey = process.env.AMAZON_SECRET_ACCESS_KEY;
  
  if (!accessKey || !secretKey) {
    throw new Error('Amazon API credentials not configured');
  }

  const config = getAmazonConfig(country);
  const method = 'POST';
  const path = operationPath;
  const queryParams = {};
  
  // Determine the correct x-amz-target based on operation
  let amzTarget = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';
  if (operationPath === '/paapi5/getitems') {
    amzTarget = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems';
  }
  
  const baseHeaders = {
    'host': config.endpoint,
    'content-type': 'application/json; charset=utf-8',
    'content-encoding': 'amz-1.0',
    'x-amz-target': amzTarget
  };

  const { authorizationHeader, timestamp } = generateAWSSignature(
    method,
    path,
    queryParams,
    baseHeaders,
    payload,
    accessKey,
    secretKey,
    config.region
  );

  return {
    ...baseHeaders,
    'authorization': authorizationHeader,
    'x-amz-date': timestamp
  };
}