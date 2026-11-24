export type ProductType = 'credit_card' | 'bank_account' | 'loan' | 'insurance' | 'investment' | 'scheme';
export type SubMode = 'products' | 'guides' | 'eligibility' | 'compare';
export interface Sub { slug: string; label: string; mode?: SubMode }
export interface Cat { slug: string; label: string; icon: string; desc: string; type?: ProductType; mode: 'products' | 'guides'; subs: Sub[] }
export interface OfferCategory { slug: string; label: string }
