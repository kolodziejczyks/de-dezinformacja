export interface FactCheckConfig {
  apiKey?: string;
}

export interface FactCheckPublisher {
  name?: string;
  site?: string;
}

export interface FactCheckClaimReview {
  publisher?: FactCheckPublisher;
  url?: string;
  title?: string;
  reviewDate?: string;
  textualRating?: string;
  languageCode?: string;
}

export interface FactCheckClaim {
  text?: string;
  claimant?: string;
  claimDate?: string;
  claimReview?: FactCheckClaimReview[];
}

export interface FactCheckSearchResponse {
  claims?: FactCheckClaim[];
  nextPageToken?: string;
}

export interface FactCheckReview {
  trackId: string;
  claimText: string;
  claimant: string | null;
  publisherName: string;
  textualRating: string | null;
  reviewDate: string | null;
  reviewUrl: string;
}

export interface FactCheckLookup {
  status: 'results' | 'empty' | 'no-key' | 'error';
  reviews: FactCheckReview[];
  matchedQuery: string | null;
  fellBackToDomain: boolean;
}
