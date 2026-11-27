import type { AppNotification, Brand, Category, News, Offer, Product } from '../types';
import type { FeedKind } from './api';

const NOW = '2026-11-24T09:00:00.000Z';

/* ---------- Demo Brands ---------- */
export const DEMO_BRANDS: Brand[] = [
  {
    $id: 'brand-hdfc',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'HDFC Bank',
    logoUrl: '/demo/brand-hdfc.svg',
    description: 'India’s largest private sector bank offering credit cards, savings accounts, home loans, and SmartBuy partner rewards.',
    status: 'approved',
  },
  {
    $id: 'brand-sbi',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'State Bank of India',
    logoUrl: '/demo/brand-sbi.svg',
    description: 'India’s largest public sector bank with wide branch reach, SBI Card cashback products, and competitive home loan rates.',
    status: 'approved',
  },
  {
    $id: 'brand-icici',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'ICICI Bank',
    logoUrl: '/demo/brand-icici.svg',
    description: 'Full-service private bank known for digital banking, lifetime-free co-branded credit cards, and instant personal loans.',
    status: 'approved',
  },
  {
    $id: 'brand-axis',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Axis Bank',
    logoUrl: '/demo/brand-axis.svg',
    description: 'Private sector bank offering utility cashback cards, travel miles cards, salary accounts, and instant digital lending.',
    status: 'approved',
  },
  {
    $id: 'brand-kotak',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Kotak Mahindra Bank',
    logoUrl: '/demo/brand-kotak.svg',
    description: 'Digital-first Indian bank offering Kotak811 zero-balance accounts, high-yield FDs, and everyday spending cards.',
    status: 'approved',
  },
  {
    $id: 'brand-zerodha',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Zerodha',
    logoUrl: '/demo/brand-zerodha.svg',
    description: 'India’s leading discount stockbroker and direct mutual fund platform with ₹0 equity delivery brokerage.',
    status: 'approved',
  },
  {
    $id: 'brand-swiggy',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Swiggy',
    logoUrl: '/demo/brand-swiggy.svg',
    description: 'Food delivery, Instamart grocery, and Dineout platform with co-branded cashback deals across Indian bank cards.',
    status: 'approved',
  },
  {
    $id: 'brand-mmt',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'MakeMyTrip',
    logoUrl: '/demo/brand-mmt.svg',
    description: 'Online travel booking platform offering instant bank card discounts on domestic flights, international trips, and hotels.',
    status: 'approved',
  },
  {
    $id: 'brand-gov',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Government of India',
    logoUrl: '/demo/brand-gov.svg',
    description: 'Sovereign-backed small savings, pension, and social protection schemes regulated by the Ministry of Finance.',
    status: 'approved',
  },
  {
    $id: 'brand-maxlife',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Axis Max Life & Health',
    logoUrl: '/demo/brand-maxlife.svg',
    description: 'Protection and health insurance plans featuring high claim settlement ratios and flexible family floater coverage.',
    status: 'approved',
  },
];

/* ---------- Demo Products (18 products across all 6 categories) ---------- */
export const DEMO_PRODUCTS: Product[] = [
  /* --- Credit Cards (5) --- */
  {
    $id: 'prod-sbi-cashback',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'SBI Cashback Credit Card',
    slug: 'sbi-cashback-credit-card',
    type: 'credit_card',
    category: 'credit-cards',
    subcategory: 'cashback-credit-cards',
    bankName: 'SBI Card',
    bankLogo: '/demo/brand-sbi.svg',
    summary: 'Flat 5% cashback on online spends across most merchants without brand restrictions, credited directly to your card statement.',
    facts: [
      'Annual fee|₹999 + GST (waived on ₹2L/yr spend)',
      'Reward rate|5% online · 1% offline cashback',
      'Interest rate|3.50% per month',
      'Lounge access|Not included',
      'Welcome benefit|Direct cashback from Day 1',
    ],
    benefits: [
      '5% cashback on online spends up to ₹5,000 cashback per billing cycle',
      '1% unlimited cashback on offline retail spends (excluding exempted categories)',
      '1% fuel surcharge waiver on transactions between ₹500 and ₹3,000',
      'Automatic statement credit within 2 working days of bill generation',
    ],
    exclusions: [
      'No cashback on rent, utilities, fuel, wallet loads, EMI, or insurance payments',
      'Not eligible for instant bank sale discounts on Amazon or Flipkart',
    ],
    pros: [
      'Works across almost every online merchant without brand lock-in',
      'Cashback credits directly to your statement with zero redemption fee',
      'Reasonable ₹2 lakh annual spend waiver threshold',
    ],
    cons: [
      'No complimentary airport lounge access',
      'Excluded from instant SBI Card e-commerce festive discounts',
    ],
    features: [
      'Contactless Tap & Pay enabled',
      'Monthly cashback cap of ₹5,000 across online and offline spends',
      'Easy Flexipay conversion for transactions above ₹2,500',
    ],
    eligibility: 'Indian resident aged 21–60 years with regular salaried or self-employed income and a CIBIL score of 750+.',
    customerTypes: ['Salaried', 'Self-employed'],
    feeValue: 999,
    rewardRate: 5,
    cashbackRate: 5,
    editorialRank: 1,
    minIncome: 25000,
    minAge: 21,
    maxAge: 60,
    applyUrl: 'https://www.sbicard.com/en/personal/credit-cards/rewards/cashback-sbi-card.page',
    verifiedAt: '2026-11-20T08:00:00.000Z',
    status: 'approved',
    review: 'Still the benchmark online cashback card in India for shoppers who buy across multiple sites and prefer automatic statement credit over reward points.',
    applySteps: [
      'Check basic income and age eligibility',
      'Keep PAN, Aadhaar, and latest salary slip or ITR ready',
      'Submit digital application on the official SBI Card portal',
      'Complete video KYC and track approval status online',
    ],
  },
  {
    $id: 'prod-hdfc-millennia',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'HDFC Bank Millennia Credit Card',
    slug: 'hdfc-millennia-credit-card',
    type: 'credit_card',
    category: 'credit-cards',
    subcategory: 'best-credit-cards',
    bankName: 'HDFC Bank',
    bankLogo: '/demo/brand-hdfc.svg',
    summary: 'All-round cashback card offering 5% back on Amazon, Flipkart, Swiggy, Zomato, BookMyShow, and Uber plus milestone vouchers.',
    facts: [
      'Annual fee|₹1,000 + GST (waived on ₹1L/yr spend)',
      'Reward rate|5% partner · 1% other spends',
      'Interest rate|3.60% per month',
      'Lounge access|₹1,000 voucher or lounge on ₹1L/qtr',
      'Welcome benefit|1,000 CashPoints on fee payment',
    ],
    benefits: [
      '5% CashBack on Amazon, Flipkart, Swiggy, Zomato, Myntra, Tata CLiQ, and Uber',
      '1% CashBack on all other spends including EMI and wallet loads (subject to caps)',
      '₹1,000 gift voucher every calendar quarter on spending ₹1,00,000',
      'Up to 20% dining savings via Swiggy Dineout partner restaurants',
    ],
    exclusions: [
      'CashPoints redemption against statement balance capped at ₹3,000 per month',
      'Redemption fee of ₹50 + GST applies per CashPoints redemption request',
    ],
    pros: [
      'Low ₹1 lakh annual fee waiver milestone',
      'Eligible for HDFC Bank instant discounts during e-commerce sales',
      '1 CashPoint equals ₹1 when redeemed against statement balance',
    ],
    cons: [
      '5% partner cashback capped at ₹1,000 per billing cycle',
      'Airport lounge access requires quarterly spend milestone',
    ],
    features: [
      'Zero lost card liability after reporting',
      'SmartBuy portal accelerated rewards on flights and hotels',
      'Available on Visa, Mastercard, RuPay, and Diners networks',
    ],
    eligibility: 'Salaried applicants aged 21–40 with ₹35,000+ monthly income, or self-employed aged 21–40 with ₹6 lakh+ annual ITR.',
    customerTypes: ['Salaried', 'Self-employed'],
    feeValue: 1000,
    rewardRate: 5,
    cashbackRate: 5,
    editorialRank: 2,
    minIncome: 35000,
    minAge: 21,
    maxAge: 55,
    applyUrl: 'https://www.hdfcbank.com/personal/pay/cards/millennia-cards/millennia-cc-new',
    verifiedAt: '2026-11-21T08:00:00.000Z',
    status: 'approved',
    review: 'A dependable first mainstream card from HDFC Bank. With a low ₹1 lakh fee waiver and wide online partner coverage, it works well for salaried professionals.',
    applySteps: [
      'Verify income and HDFC Bank relationship eligibility',
      'Select preferred card network (RuPay/Visa/Mastercard)',
      'Complete online KYC on the official HDFC Bank website',
      'Receive virtual card instantly upon approval',
    ],
  },
  {
    $id: 'prod-icici-amazon-pay',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Amazon Pay ICICI Bank Credit Card',
    slug: 'amazon-pay-icici-credit-card',
    type: 'credit_card',
    category: 'credit-cards',
    subcategory: 'lifetime-free-credit-cards',
    bankName: 'ICICI Bank',
    bankLogo: '/demo/brand-icici.svg',
    summary: 'Truly lifetime-free credit card offering unlimited 5% cashback for Amazon Prime members with zero annual fee.',
    facts: [
      'Annual fee|₹0 (Lifetime Free)',
      'Reward rate|5% Prime · 3% Non-Prime · 1% other',
      'Interest rate|3.50% per month',
      'Lounge access|Not included',
      'Welcome benefit|Amazon Pay rewards on activation',
    ],
    benefits: [
      'Unlimited 5% cashback on Amazon.in purchases for Prime members (3% for non-Prime)',
      '2% cashback on Amazon Pay partner merchants, recharges, and utility bill payments',
      '1% unlimited cashback on all other retail and online spends',
      'Zero joining fee and zero annual renewal fee for life',
    ],
    exclusions: [
      'Cashback is credited as Amazon Pay Gift Card balance, not bank cash',
      'No cashback on fuel, rent, gold coins, or EMI conversions',
    ],
    pros: [
      'No annual fee and no spend threshold to worry about',
      'No upper cap on monthly cashback earnings',
      'Instant digital issuance for pre-approved ICICI Bank customers',
    ],
    cons: [
      'Earnings are locked to Amazon Pay balance',
      'Does not work for standard ICICI Bank instant sale discounts',
    ],
    features: [
      'Automatic monthly transfer to linked Amazon Pay account',
      '1% fuel surcharge waiver across petrol pumps in India',
      'No-cost EMI options on Amazon.in',
    ],
    eligibility: 'Indian resident aged 21–60 with monthly income of ₹25,000+ (salaried) or ₹35,000+ (self-employed).',
    customerTypes: ['Salaried', 'Self-employed', 'Student'],
    feeValue: 0,
    rewardRate: 5,
    cashbackRate: 5,
    editorialRank: 3,
    minIncome: 25000,
    minAge: 21,
    maxAge: 60,
    applyUrl: 'https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card',
    verifiedAt: '2026-11-22T08:00:00.000Z',
    status: 'approved',
    review: 'One of India’s easiest lifetime-free cards to recommend. Even if you only shop on Amazon occasionally, having zero annual fee makes it a keeper.',
    applySteps: [
      'Sign in to your Amazon account and open the ICICI card page',
      'Verify PAN and Aadhaar via video KYC',
      'Activate digital card inside Amazon Pay within minutes of approval',
    ],
  },
  {
    $id: 'prod-axis-ace',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Axis Bank ACE Credit Card',
    slug: 'axis-bank-ace-credit-card',
    type: 'credit_card',
    category: 'credit-cards',
    subcategory: 'cashback-credit-cards',
    bankName: 'Axis Bank',
    bankLogo: '/demo/brand-axis.svg',
    summary: 'High-value utility and everyday cashback card giving 5% on Google Pay bill payments and 4% on Swiggy, Zomato, and Ola.',
    facts: [
      'Annual fee|₹499 + GST (waived on ₹2L/yr spend)',
      'Reward rate|5% GPay bills · 4% food · 1.5% offline',
      'Interest rate|3.60% per month',
      'Lounge access|4 domestic visits/year (spend-linked)',
      'Welcome benefit|Joining fee waived on ₹10k in 45 days',
    ],
    benefits: [
      '5% cashback on electricity, gas, broadband, DTH, and mobile recharges via Google Pay',
      '4% cashback on Swiggy, Zomato, and Ola rides',
      '1.5% unlimited cashback on all other eligible online and offline transactions',
      'Up to 15% off at partner restaurants via Axis Bank Dining Delights',
    ],
    exclusions: [
      '5% and 4% categories share a combined ₹500 cashback cap per billing cycle',
      'Domestic lounge access requires ₹50,000 spend in the preceding 3 months',
    ],
    pros: [
      'Rare 5% cashback on household utility bills via Google Pay',
      'Strong 1.5% flat offline cashback rate with no upper cap',
      'Affordable ₹499 annual fee',
    ],
    cons: [
      '₹500 monthly cap on accelerated 5% and 4% categories',
      'Android Google Pay required for 5% utility cashback',
    ],
    features: [
      'Direct statement credit without manual redemption',
      '1% fuel surcharge waiver on spends from ₹400 to ₹4,000',
      'Contactless NFC payments supported',
    ],
    eligibility: 'Indian citizens aged 18–70 with stable salaried or business income and healthy credit bureau history.',
    customerTypes: ['Salaried', 'Self-employed'],
    feeValue: 499,
    rewardRate: 5,
    cashbackRate: 5,
    editorialRank: 4,
    minIncome: 20000,
    minAge: 18,
    maxAge: 70,
    applyUrl: 'https://www.axisbank.com/retail/cards/credit-card/axis-bank-ace-credit-card',
    verifiedAt: '2026-11-19T08:00:00.000Z',
    status: 'approved',
    review: 'A practical daily card for Indian households paying monthly electricity, broadband, and gas bills while wanting reliable 1.5% offline cashback.',
    applySteps: [
      'Apply through Google Pay or the official Axis Bank website',
      'Upload KYC documents and income proof',
      'Complete video KYC and activate via the Axis Mobile app',
    ],
  },
  {
    $id: 'prod-hdfc-tata-neu-rupay',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Tata Neu Infinity HDFC Bank RuPay Card',
    slug: 'tata-neu-infinity-hdfc-rupay-card',
    type: 'credit_card',
    category: 'credit-cards',
    subcategory: 'rupay-credit-cards',
    bankName: 'HDFC Bank',
    bankLogo: '/demo/brand-hdfc.svg',
    summary: 'UPI-enabled RuPay credit card earning 1.5% NeuCoins on Scan & Pay UPI spends and up to 10% across Tata brands.',
    facts: [
      'Annual fee|₹1,499 + GST (waived on ₹3L/yr spend)',
      'Reward rate|Up to 10% Tata Neu · 1.5% UPI',
      'Interest rate|3.60% per month',
      'Lounge access|8 domestic + 4 international/year',
      'Welcome benefit|1,499 NeuCoins on first transaction',
    ],
    benefits: [
      '1.5% back as NeuCoins on eligible UPI merchant payments via Tata Neu app',
      'Up to 10% NeuCoins on BigBasket, Croma, 1mg, Air India, and Westside via Tata Neu',
      '5% NeuCoins on utility, insurance, and telecom bills paid on Tata Neu',
      '8 complimentary domestic and 4 international lounge visits per year',
    ],
    exclusions: [
      'UPI cashback capped at 500 NeuCoins per calendar month',
      'NeuCoins can only be redeemed across Tata Neu partner brands (1 NeuCoin = ₹1)',
    ],
    pros: [
      'Strong 1.5% reward rate on everyday UPI QR payments',
      'Includes both domestic and international airport lounge access',
      'High value for BigBasket, Croma, and Tata 1mg shoppers',
    ],
    cons: [
      'Redemption restricted to the Tata ecosystem',
      '₹3 lakh annual waiver requirement is higher than entry cards',
    ],
    features: [
      'Link directly to UPI apps for Scan & Pay merchant checkout',
      'Low 2% foreign currency markup fee',
      'Complimentary Priority Pass for international travel',
    ],
    eligibility: 'Salaried applicants with ₹1,00,000+ monthly income or self-employed with ₹12 lakh+ annual ITR, age 21–60.',
    customerTypes: ['Salaried', 'Self-employed', 'Business'],
    feeValue: 1499,
    rewardRate: 5,
    cashbackRate: 1.5,
    editorialRank: 5,
    minIncome: 75000,
    minAge: 21,
    maxAge: 60,
    applyUrl: 'https://www.hdfcbank.com/personal/pay/cards/credit-cards/tata-neu-infinity-hdfc-bank-credit-card',
    verifiedAt: '2026-11-22T08:00:00.000Z',
    status: 'approved',
    review: 'Among the strongest RuPay UPI credit cards for frequent BigBasket, 1mg, and merchant QR spenders who also want international lounge access.',
    applySteps: [
      'Open Tata Neu or HDFC Bank official website',
      'Choose RuPay network during application',
      'Complete digital KYC and link card to UPI after issuance',
    ],
  },

  /* --- Banking (3) --- */
  {
    $id: 'prod-kotak-811',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Kotak811 Zero Balance Savings Account',
    slug: 'kotak-811-zero-balance-savings-account',
    type: 'bank_account',
    category: 'banking',
    subcategory: 'zero-balance-accounts',
    bankName: 'Kotak Mahindra Bank',
    bankLogo: '/demo/brand-kotak.svg',
    summary: '100% digital zero-balance savings account with instant virtual debit card, UPI, and ActivMoney auto-sweep FD option.',
    facts: [
      'Interest rate|3.50% p.a. (up to 7% via ActivMoney)',
      'Min. balance|₹0 (Zero balance)',
      'Debit card|Free virtual card · ₹299 physical',
      'Account type|Digital Savings Account',
      'Free NEFT/IMPS|Unlimited online transfers',
    ],
    benefits: [
      'Zero minimum average balance requirement with no non-maintenance penalty',
      'Open online in minutes with PAN, Aadhaar, and Video KYC',
      'Free virtual debit card ready immediately for online payments and UPI',
      'Optional ActivMoney auto-sweep into high-yield fixed deposits',
    ],
    exclusions: [
      'Physical debit card carries an annual maintenance fee',
      'Full account limits require Video KYC verification',
    ],
    pros: [
      'Truly zero balance with reliable mobile banking app',
      'Instant virtual card and seamless UPI onboarding',
      'ActivMoney lets idle funds earn FD-like interest',
    ],
    cons: [
      'Base savings interest rate is 3.50% without auto-sweep',
      'Cash deposit at branches carries limits on basic tier',
    ],
    features: [
      'DICGC insured up to ₹5 lakh per depositor',
      'Instant IMPS, NEFT, RTGS, and UPI support',
      'Scan & Pay built into the Kotak811 app',
    ],
    eligibility: 'Resident Indian individual aged 18 years and above with valid PAN and Aadhaar linked to mobile.',
    customerTypes: ['Student', 'Salaried', 'Self-employed', 'Senior citizen'],
    feeValue: 0,
    rewardRate: 3.5,
    editorialRank: 1,
    minIncome: 0,
    minAge: 18,
    maxAge: 85,
    applyUrl: 'https://www.kotak.com/en/personal-banking/accounts/savings-account/811-zero-balance-digital-savings-account.html',
    verifiedAt: '2026-11-20T08:00:00.000Z',
    status: 'approved',
    review: 'An easy, dependable zero-balance secondary or starter account with clean digital onboarding and zero maintenance fee stress.',
    applySteps: [
      'Enter mobile number, PAN, and Aadhaar on Kotak811 portal',
      'Complete 5-minute Video KYC with original PAN card',
      'Start using UPI and virtual debit card immediately',
    ],
  },
  {
    $id: 'prod-hdfc-savingsmax',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'HDFC Bank SavingsMax Account',
    slug: 'hdfc-bank-savingsmax-account',
    type: 'bank_account',
    category: 'banking',
    subcategory: 'best-savings-accounts',
    bankName: 'HDFC Bank',
    bankLogo: '/demo/brand-hdfc.svg',
    summary: 'Full-featured savings account with lifetime-free Platinum Debit Card, free unlimited ATM access, and pre-approved loan offers.',
    facts: [
      'Interest rate|3.00% – 3.50% p.a.',
      'Min. balance|₹25,000 AMB (or ₹1.5L FD)',
      'Debit card|Lifetime Free Platinum Debit Card',
      'Account type|Premium Regular Savings',
      'Free NEFT/IMPS|Free online NEFT/RTGS',
    ],
    benefits: [
      'Complimentary Platinum Debit Card with ₹0 annual fee and cashback on bills',
      'Free unlimited ATM withdrawals across HDFC Bank and non-HDFC ATMs in India',
      'Personal accidental death cover up to ₹10 lakh via Platinum Debit Card',
      'Priority pre-approved offers on HDFC credit cards and loans',
    ],
    exclusions: [
      'Non-maintenance charges apply if ₹25,000 AMB or ₹1.5 lakh linked FD is not maintained',
    ],
    pros: [
      'Lifetime-free Platinum Debit Card saves ₹850+ GST annually',
      'Wide ATM and branch network across India',
      'Strong relationship benefits for credit card upgrades',
    ],
    cons: [
      'Requires ₹25,000 average monthly balance',
      'Savings interest rate is lower than small finance banks',
    ],
    features: [
      'MoneyMaximizer sweep-out FD facility',
      'NetBanking, PayZapp, and MobileBanking access',
      'Free cheque book and passbook facility',
    ],
    eligibility: 'Resident Indian individuals aged 18+ or HUFs with valid KYC documents.',
    customerTypes: ['Salaried', 'Self-employed', 'Business', 'Senior citizen'],
    feeValue: 0,
    rewardRate: 3.5,
    editorialRank: 2,
    minIncome: 25000,
    minAge: 18,
    maxAge: 85,
    applyUrl: 'https://www.hdfcbank.com/personal/save/accounts/savings-accounts/savingsmax-account',
    verifiedAt: '2026-11-18T08:00:00.000Z',
    status: 'approved',
    review: 'A great primary household account if you comfortably hold ₹25,000 balance and want unlimited free ATM withdrawals plus a free Platinum Debit Card.',
    applySteps: [
      'Apply online on the HDFC Bank website or visit a branch',
      'Complete Aadhaar e-KYC and Video KYC',
      'Fund initial deposit to activate account and debit card dispatch',
    ],
  },
  {
    $id: 'prod-sbi-amrit-fd',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'SBI Fixed Deposit (Special & Regular Tenures)',
    slug: 'sbi-fixed-deposit',
    type: 'bank_account',
    category: 'banking',
    subcategory: 'fixed-deposits',
    bankName: 'State Bank of India',
    bankLogo: '/demo/brand-sbi.svg',
    summary: 'Sovereign-grade safety fixed deposits with extra 50 bps interest for senior citizens and flexible tenures from 7 days to 10 years.',
    facts: [
      'Interest rate|Up to 7.25% p.a. (7.75% Senior)',
      'Min. balance|₹1,000 minimum deposit',
      'Debit card|Not applicable (Term Deposit)',
      'Account type|Fixed Deposit / Term Deposit',
      'Premature exit|Allowed with 0.50%–1% penalty',
    ],
    benefits: [
      'Additional 0.50% p.a. interest rate for senior citizens aged 60+',
      'Open and close instantly online via YONO SBI without branch visits',
      'Loan or overdraft facility available up to 90% of deposit value',
      'Nomination and auto-renewal options supported online',
    ],
    exclusions: [
      'Interest earned is taxable as per your income tax slab; TDS applies above threshold',
    ],
    pros: [
      'Backed by India’s largest public sector bank (D-SIB status)',
      'Low ₹1,000 entry deposit and flexible interest payout options',
      'Instant online premature withdrawal if emergency funds are needed',
    ],
    cons: [
      'Rates are slightly lower than some small finance banks',
      'Premature closure attracts standard interest penalty',
    ],
    features: [
      'Monthly, quarterly, or maturity cumulative payout options',
      '5-year Tax Saving FD eligible under Section 80C (Old Regime)',
      'DICGC insurance coverage up to ₹5 lakh',
    ],
    eligibility: 'Any resident Indian individual, minor (with guardian), or senior citizen with an active SBI account.',
    customerTypes: ['Salaried', 'Self-employed', 'Senior citizen', 'Student'],
    feeValue: 0,
    rewardRate: 7.25,
    editorialRank: 3,
    minIncome: 0,
    minAge: 18,
    maxAge: 95,
    applyUrl: 'https://sbi.co.in/web/interest-rates/deposit-rates/retail-domestic-term-deposits',
    verifiedAt: '2026-11-23T08:00:00.000Z',
    status: 'approved',
    review: 'The gold standard for emergency funds and conservative capital preservation, especially attractive for senior citizens seeking predictable quarterly income.',
    applySteps: [
      'Log in to YONO SBI or SBI Internet Banking',
      'Choose Fixed Deposit tenure and payout frequency',
      'Confirm nominee details and book FD instantly',
    ],
  },

  /* --- Loans (3) --- */
  {
    $id: 'prod-sbi-home-loan',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'SBI Regular Home Loan',
    slug: 'sbi-regular-home-loan',
    type: 'loan',
    category: 'loans',
    subcategory: 'home-loans',
    bankName: 'State Bank of India',
    bankLogo: '/demo/brand-sbi.svg',
    summary: 'Repo-linked floating-rate home loan starting at 8.50% p.a. with zero prepayment penalty and tenures up to 30 years.',
    facts: [
      'Interest rate|8.50% – 9.65% p.a. (Repo-linked)',
      'Processing fee|0.35% + GST (often waived in offers)',
      'Max tenure|Up to 30 years',
      'Max amount|Up to 90% of property value',
      'Prepayment fee|₹0 on floating rate',
    ],
    benefits: [
      'Transparent External Benchmark Lending Rate (EBLR) linked to RBI Repo Rate',
      'Zero prepayment or foreclosure charges on floating-rate home loans',
      '0.05% interest concession available for women borrowers',
      'Daily reducing balance interest calculation saves substantial interest',
    ],
    exclusions: [
      'Lowest interest slab requires CIBIL score of 750 or higher',
      'Legal and technical property valuation charges apply separately',
    ],
    pros: [
      'Among the lowest floating home loan rates in India',
      'Zero hidden foreclosure charges or lock-in periods',
      'Maxgain overdraft variant helps park surplus cash to save interest',
    ],
    cons: [
      'Documentation and legal verification can take longer than private banks',
    ],
    features: [
      'Balance transfer and top-up home loan options available',
      'Dedicated digital tracking via YONO Home Loans',
      'Tax deductions under Sections 24(b) and 80C (Old Tax Regime)',
    ],
    eligibility: 'Resident Indian salaried or self-employed individuals aged 18–70 years with verifiable income and clear property title.',
    customerTypes: ['Salaried', 'Self-employed'],
    feeValue: 8.5,
    rewardRate: 0,
    editorialRank: 1,
    minIncome: 25000,
    minAge: 18,
    maxAge: 70,
    applyUrl: 'https://homeloans.sbi/',
    verifiedAt: '2026-11-23T08:00:00.000Z',
    status: 'approved',
    review: 'SBI Home Loan remains the benchmark for transparent repo-rate transmission and zero prepayment charges across long 20–30 year tenures.',
    applySteps: [
      'Estimate monthly EMI using the FORWORD Home Loan Calculator',
      'Submit income proof, bank statements, and property documents on SBI portal',
      'Complete property legal/technical appraisal and receive sanction letter',
    ],
  },
  {
    $id: 'prod-hdfc-personal-loan',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'HDFC Bank Xpress Personal Loan',
    slug: 'hdfc-bank-personal-loan',
    type: 'loan',
    category: 'loans',
    subcategory: 'personal-loans',
    bankName: 'HDFC Bank',
    bankLogo: '/demo/brand-hdfc.svg',
    summary: 'Unsecured personal loan up to ₹40 lakh with quick digital disbursal for salaried employees and flexible 12–60 month tenures.',
    facts: [
      'Interest rate|10.75% – 21.00% p.a.',
      'Processing fee|Up to ₹4,999 + GST',
      'Max tenure|Up to 60 months (5 years)',
      'Max amount|Up to ₹40 lakh',
      'Prepayment fee|Allowed after 12 EMIs (2%–4%)',
    ],
    benefits: [
      '100% digital disbursal in as little as 10 seconds for pre-approved customers',
      'Zero collateral or guarantor required',
      'Flexible repayment tenure from 12 to 60 months',
      'Transparent flat processing fee structure during partner campaigns',
    ],
    exclusions: [
      'Prepayment or part-payment is not allowed during the first 12 EMIs',
    ],
    pros: [
      'Fast approval and minimal paperwork for corporate salaried borrowers',
      'Competitive starting rates for 750+ CIBIL profiles',
      'Fixed EMI makes monthly budgeting predictable',
    ],
    cons: [
      'Foreclosure charges of 2%–4% apply after lock-in period',
      'Strictly targeted at salaried individuals',
    ],
    features: [
      'Check instant eligibility online with soft inquiry',
      'Manage repayment schedule inside HDFC NetBanking',
      'Optional loan protection insurance cover',
    ],
    eligibility: 'Salaried employees aged 21–60 with minimum 2 years work experience and net monthly income of ₹25,000+.',
    customerTypes: ['Salaried'],
    feeValue: 10.75,
    rewardRate: 0,
    editorialRank: 2,
    minIncome: 25000,
    minAge: 21,
    maxAge: 60,
    applyUrl: 'https://www.hdfcbank.com/personal/borrow/popular-loans/personal-loan',
    verifiedAt: '2026-11-21T08:00:00.000Z',
    status: 'approved',
    review: 'A strong option when you need quick unsecured funds with predictable EMIs, provided you qualify for the sub-12% interest slab.',
    applySteps: [
      'Check EMI affordability before borrowing',
      'Verify mobile number and employer details on HDFC Bank site',
      'Complete e-KYC, e-mandate, and receive funds in bank account',
    ],
  },
  {
    $id: 'prod-icici-car-loan',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'ICICI Bank New Car Loan',
    slug: 'icici-bank-new-car-loan',
    type: 'loan',
    category: 'loans',
    subcategory: 'car-loans',
    bankName: 'ICICI Bank',
    bankLogo: '/demo/brand-icici.svg',
    summary: 'Up to 100% on-road financing on select car models with fixed interest rates and instant digital sanction letters.',
    facts: [
      'Interest rate|9.10% – 10.50% p.a.',
      'Processing fee|₹3,500 – ₹7,500 + GST',
      'Max tenure|Up to 84 months (7 years)',
      'Max amount|Up to 100% of on-road price',
      'Prepayment fee|5% of principal outstanding',
    ],
    benefits: [
      'Financing up to 100% of on-road price for eligible customers and models',
      'Long repayment tenure up to 7 years to keep EMIs comfortable',
      'Pre-approved digital sanction directly inside iMobile Pay app',
      'Special green-rate concessions available on electric vehicles (EVs)',
    ],
    exclusions: [
      'Foreclosure attracts a standard 5% charge on principal balance',
    ],
    pros: [
      'Fast dealership coordination and instant sanction letter',
      'Covers both petrol/diesel and EV passenger cars',
      'Available to both salaried and self-employed buyers',
    ],
    cons: [
      'Prepayment charges are higher than floating-rate home loans',
    ],
    features: [
      'Fixed interest rate throughout the loan tenure',
      'Zero branch visit required for existing ICICI Bank users',
      'Flexible EMI date selection',
    ],
    eligibility: 'Salaried individuals aged 23–60 or self-employed aged 25–65 with minimum annual income of ₹3 lakh+.',
    customerTypes: ['Salaried', 'Self-employed', 'Business'],
    feeValue: 9.1,
    rewardRate: 0,
    editorialRank: 3,
    minIncome: 25000,
    minAge: 23,
    maxAge: 65,
    applyUrl: 'https://www.icicibank.com/personal-banking/loans/car-loan',
    verifiedAt: '2026-11-17T08:00:00.000Z',
    status: 'approved',
    review: 'Convenient dealership integration and up to 100% on-road funding make this a practical pick if you want fast car loan approval.',
    applySteps: [
      'Compare total interest over 5 vs 7 years in our EMI calculator',
      'Apply online via ICICI Bank portal or iMobile Pay',
      'Submit KYC and proforma invoice from your dealer for disbursal',
    ],
  },

  /* --- Insurance (3) --- */
  {
    $id: 'prod-hdfc-ergo-optima',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'HDFC ERGO Optima Secure Health Plan',
    slug: 'hdfc-ergo-optima-secure',
    type: 'insurance',
    category: 'insurance',
    subcategory: 'health-insurance',
    bankName: 'HDFC ERGO',
    bankLogo: '/demo/brand-hdfc.svg',
    summary: 'Comprehensive family floater health insurance that automatically doubles your base cover from Day 1 with zero room-rent cap.',
    facts: [
      'Starting premium|₹11,800/yr (₹10L cover, age 30)',
      'Claim ratio|99.2% incurred claim settlement',
      'Room rent limit|No capping (Any room)',
      'Network hospitals|13,000+ cashless hospitals',
      'Waiting period|3 years for pre-existing diseases',
    ],
    benefits: [
      '2X coverage automatically from Day 1 via Secure Benefit at no extra cost',
      'Plus Benefit adds 50% bonus cover each year up to 100% regardless of claims',
      'No room-rent sub-limits or disease-wise capping',
      'Consumables cover included under Protect Benefit',
    ],
    exclusions: [
      '30-day initial waiting period (except accidental hospitalization)',
      '36-month waiting period for declared pre-existing medical conditions',
    ],
    pros: [
      'No room-rent limit protects against proportionate claim deductions',
      'Consumables included by default—reduces out-of-pocket hospital bills',
      'Strong cashless hospital network across metro and tier-2 cities',
    ],
    cons: [
      'Premiums are slightly higher than budget insurers',
      'Maternity cover is not included in the base plan',
    ],
    features: [
      'Automatic 100% sum insured restoration',
      '60 days pre-hospitalization and 180 days post-hospitalization cover',
      'Section 80D tax benefit under Old Tax Regime',
    ],
    eligibility: 'Adults aged 18–65 years and dependent children from 91 days to 25 years.',
    customerTypes: ['Salaried', 'Self-employed', 'Business', 'Senior citizen'],
    feeValue: 11800,
    rewardRate: 0,
    editorialRank: 1,
    minIncome: 20000,
    minAge: 18,
    maxAge: 65,
    applyUrl: 'https://www.hdfcergo.com/health-insurance/optima-secure',
    verifiedAt: '2026-11-22T08:00:00.000Z',
    status: 'approved',
    review: 'One of the cleanest health insurance policy wordings in India—no room rent caps, built-in consumables cover, and instant 2X base protection.',
    applySteps: [
      'Select sum insured (₹10L–₹25L recommended for metro families)',
      'Declare medical history accurately to avoid future claim issues',
      'Complete online payment and download digital e-card',
    ],
  },
  {
    $id: 'prod-maxlife-term',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Axis Max Life Smart Secure Plus Term Plan',
    slug: 'axis-max-life-smart-secure-plus-term',
    type: 'insurance',
    category: 'insurance',
    subcategory: 'term-life-insurance',
    bankName: 'Axis Max Life',
    bankLogo: '/demo/brand-maxlife.svg',
    summary: 'Pure term life protection with 99.65% claim settlement ratio, terminal illness cover, and optional critical illness rider.',
    facts: [
      'Starting premium|₹12,400/yr (₹1 Cr cover, age 30)',
      'Claim ratio|99.65% claim settlement ratio',
      'Cover tenure|Up to age 85 years',
      'Network hospitals|Not applicable (Life cover)',
      'Waiting period|Standard policy terms apply',
    ],
    benefits: [
      'High ₹1 Cr+ pure term protection at affordable annual premiums',
      'Built-in Terminal Illness cover pays up to ₹1 Cr early on diagnosis',
      'Option for Special Exit Value to recover total premiums paid at specific milestones',
      'Flexible lump-sum or monthly income payout options for nominees',
    ],
    exclusions: [
      'Standard 12-month suicide exclusion clause applies from policy inception',
    ],
    pros: [
      'Consistently among India’s highest claim settlement ratios (99.65%)',
      'Optional Waiver of Premium rider on critical illness or disability',
      '15% salaried-customer discount available on first-year premium',
    ],
    cons: [
      'Medical tests required for higher sum assured tiers',
      'Return-of-premium variant costs significantly more than pure term',
    ],
    features: [
      'InstaClaim payout support within 1 working day for eligible policies',
      'Joint life spouse cover add-on available',
      'Tax benefits under Section 80C and Section 10(10D)',
    ],
    eligibility: 'Indian residents aged 18–60 years with minimum annual income of ₹5 lakh for ₹1 Cr cover.',
    customerTypes: ['Salaried', 'Self-employed', 'Business'],
    feeValue: 12400,
    rewardRate: 0,
    editorialRank: 2,
    minIncome: 40000,
    minAge: 18,
    maxAge: 60,
    applyUrl: 'https://www.axismaxlife.com/term-insurance-plans/smart-secure-plus-plan',
    verifiedAt: '2026-11-20T08:00:00.000Z',
    status: 'approved',
    review: 'A reliable pure term plan for earning members supporting dependents. Stick to regular pay up to age 60–65 for the best cost efficiency.',
    applySteps: [
      'Calculate cover amount (10–15× annual income plus liabilities)',
      'Fill lifestyle, smoking, and medical disclosures honestly',
      'Complete tele/home medical exam and activate policy',
    ],
  },
  {
    $id: 'prod-icici-lombard-car',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'ICICI Lombard Comprehensive Car Insurance',
    slug: 'icici-lombard-car-insurance',
    type: 'insurance',
    category: 'insurance',
    subcategory: 'car-insurance',
    bankName: 'ICICI Bank',
    bankLogo: '/demo/brand-icici.svg',
    summary: 'Cashless motor insurance across 6,500+ network garages with Zero Depreciation, Engine Protect, and Roadside Assistance add-ons.',
    facts: [
      'Starting premium|₹6,200/yr (depends on IDV & model)',
      'Claim ratio|97.8% motor claim settlement',
      'Room rent limit|Not applicable (Motor cover)',
      'Network hospitals|6,500+ cashless garages',
      'Waiting period|Immediate coverage on renewal',
    ],
    benefits: [
      'Instant digital inspection and paperless claims through IL TakeCare app',
      'Zero Depreciation, Return to Invoice, and Engine Protect add-ons',
      '24×7 Roadside Assistance across highways and major cities',
      'Up to 50% No Claim Bonus (NCB) discount on claim-free renewals',
    ],
    exclusions: [
      'Normal wear and tear, mechanical breakdown, and driving under influence',
    ],
    pros: [
      'Fast app-based video claim approval for minor repairs',
      'Large cashless authorized service center tie-ups',
    ],
    cons: [
      'Add-on bundles increase annual premium on older vehicles',
    ],
    features: [
      'Covers own damage, theft, fire, floods, and mandatory third-party liability',
      'Personal accident cover of ₹15 lakh for owner-driver',
    ],
    eligibility: 'Private four-wheeler owners in India with valid RC and driving license.',
    customerTypes: ['Salaried', 'Self-employed', 'Business', 'Senior citizen'],
    feeValue: 6200,
    rewardRate: 0,
    editorialRank: 3,
    minIncome: 0,
    minAge: 18,
    maxAge: 80,
    applyUrl: 'https://www.icicilombard.com/motor-insurance/car-insurance',
    verifiedAt: '2026-11-16T08:00:00.000Z',
    status: 'approved',
    review: 'A dependable motor cover if you prioritize hassle-free cashless repairs at authorized brand workshops.',
    applySteps: [
      'Enter car registration number and previous policy NCB details',
      'Choose Zero Depreciation and Engine Protect add-ons',
      'Pay online to receive instant PDF policy copy',
    ],
  },

  /* --- Investments (2) --- */
  {
    $id: 'prod-zerodha-coin-sip',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Zerodha Coin — Direct Mutual Funds & SIP',
    slug: 'zerodha-coin-direct-mutual-funds',
    type: 'investment',
    category: 'investments',
    subcategory: 'mutual-funds',
    bankName: 'Zerodha',
    bankLogo: '/demo/brand-zerodha.svg',
    summary: 'Invest in 0% commission Direct Mutual Funds, Nifty 50 Index Funds, and flexible SIPs directly into your Demat account.',
    facts: [
      'Commission|₹0 (100% Direct Plans)',
      'Min. SIP|₹100 – ₹500/month (fund dependent)',
      'Platform fee|₹0 on Coin · ₹300/yr Demat AMC',
      'Asset classes|Equity, Index, Debt, ELSS, Gold',
      'Lock-in|None (3 yrs for ELSS tax funds)',
    ],
    benefits: [
      'Zero commission Direct mutual funds save up to 0.75%–1.0% every year vs Regular plans',
      'Pause, step-up, or modify SIP dates and amounts anytime with one tap',
      'Single consolidated portfolio view across equities, ETFs, bonds, and mutual funds',
      'UPI Autopay mandates for seamless monthly investing',
    ],
    exclusions: [
      'Standard Demat AMC of ₹300 + GST/year applies for non-BSDA accounts',
      'Mutual fund investments are subject to market risks',
    ],
    pros: [
      'Zero distributor commission boosts long-term compounding',
      'Clean, clutter-free interface with step-up SIP automation',
      'Access to all major SEBI-registered Indian AMCs',
    ],
    cons: [
      'Units held in Demat mode require Zerodha account for redemption',
    ],
    features: [
      'Automated Step-Up SIPs linked to annual salary hikes',
      'Direct access to Nifty 50 Index Funds, Flexi-Cap, and Liquid funds',
      'Tax-ready capital gains P&L statements for ITR filing',
    ],
    eligibility: 'Indian residents and NRIs aged 18+ with PAN, Aadhaar, and bank account.',
    customerTypes: ['Student', 'Salaried', 'Self-employed', 'Business', 'Senior citizen'],
    feeValue: 0,
    rewardRate: 12,
    editorialRank: 1,
    minIncome: 0,
    minAge: 18,
    maxAge: 85,
    applyUrl: 'https://coin.zerodha.com/',
    verifiedAt: '2026-11-23T08:00:00.000Z',
    status: 'approved',
    review: 'Ideal for long-term SIP investors who want direct zero-commission mutual funds alongside stocks and ETFs under one clean roof.',
    applySteps: [
      'Plan monthly goal using FORWORD SIP Calculator',
      'Complete paperless Aadhaar e-KYC on Zerodha',
      'Set up UPI Autopay and start your first index or flexi-cap SIP',
    ],
  },
  {
    $id: 'prod-nps-tier1',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'National Pension System (NPS Tier 1)',
    slug: 'national-pension-system-nps-tier-1',
    type: 'investment',
    category: 'investments',
    subcategory: 'nps',
    bankName: 'Government of India (PFRDA)',
    bankLogo: '/demo/brand-gov.svg',
    summary: 'Ultra-low-cost retirement wealth builder regulated by PFRDA offering equity-debt auto-allocation and exclusive tax deductions.',
    facts: [
      'Commission|0.03% – 0.09% fund management fee',
      'Min. SIP|₹500 per contribution (₹1,000/yr)',
      'Platform fee|Low CRA maintenance charge',
      'Asset classes|Equity (up to 75%), Corp & Govt Bonds',
      'Lock-in|Until age 60 (partial exit allowed)',
    ],
    benefits: [
      'Up to 14% employer contribution deductible under Section 80CCD(2) even in New Tax Regime',
      'Extra ₹50,000 tax deduction under Section 80CCD(1B) in Old Tax Regime',
      '60% of retirement corpus at age 60 is completely tax-free on lump-sum withdrawal',
      'Automatic lifecycle rebalancing reduces equity risk as you approach retirement',
    ],
    exclusions: [
      '40% of retirement corpus at age 60 must be used to buy an annuity plan',
      'Early withdrawals before age 60 are restricted to specific purposes',
    ],
    pros: [
      'Lowest fund management expense ratio among Indian retirement products',
      'One of the few tax-saving deductions still available under the New Tax Regime (Corporate NPS)',
      'Disciplined long-term compounding until retirement',
    ],
    cons: [
      'Mandatory 40% annuity allocation at age 60 reduces liquidity',
    ],
    features: [
      'Portable Permanent Retirement Account Number (PRAN) across jobs',
      'Choice of 11 PFRDA-regulated Pension Fund Managers',
      'Zero tax impact when switching between equity and debt allocations inside NPS',
    ],
    eligibility: 'Indian citizens (resident and NRI) aged 18–70 years.',
    customerTypes: ['Salaried', 'Self-employed', 'Business'],
    feeValue: 0,
    rewardRate: 10.5,
    editorialRank: 2,
    minIncome: 0,
    minAge: 18,
    maxAge: 70,
    applyUrl: 'https://enps.nsdl.com/',
    verifiedAt: '2026-11-22T08:00:00.000Z',
    status: 'approved',
    review: 'A standout retirement vehicle—especially for salaried employees whose employers offer Corporate NPS under Section 80CCD(2) in the New Tax Regime.',
    applySteps: [
      'Open eNPS portal or request Corporate NPS via HR',
      'Choose Active or Auto Choice (up to 75% equity)',
      'Generate PRAN via Aadhaar e-Sign and automate monthly contributions',
    ],
  },

  /* --- Government Schemes (2) --- */
  {
    $id: 'prod-gov-ppf',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Public Provident Fund (PPF)',
    slug: 'public-provident-fund-ppf',
    type: 'scheme',
    category: 'government-schemes',
    subcategory: 'ppf',
    bankName: 'Government of India',
    bankLogo: '/demo/brand-gov.svg',
    summary: 'Sovereign-backed EEE tax-free savings scheme earning 7.10% p.a. compounded annually with complete tax exemption on maturity.',
    facts: [
      'Interest rate|7.10% p.a. (Govt notified quarterly)',
      'Deposit limit|₹500 to ₹1,50,000 per financial year',
      'Tax status|EEE (Exempt-Exempt-Exempt)',
      'Lock-in|15 years (extendable in 5-yr blocks)',
      'Risk level|Zero default risk (Sovereign)',
    ],
    benefits: [
      '100% sovereign guarantee from the Government of India',
      'Interest earned and final maturity corpus are completely tax-free under both tax regimes',
      'Deposit up to ₹1.5 lakh/year eligible for Section 80C deduction (Old Regime)',
      'Partial withdrawals allowed from the 7th financial year onwards',
    ],
    exclusions: [
      '15-year lock-in period limits short-term liquidity',
      'NRIs cannot open a new PPF account',
    ],
    pros: [
      'Tax-free 7.1% return equals ~10.1% pre-tax FD return for the 30% tax bracket',
      'Protected against court attachment for debt recovery',
      'Can be opened easily at Post Offices, SBI, HDFC, or ICICI Bank',
    ],
    cons: [
      'Annual contribution is capped at ₹1.5 lakh',
      'Interest rate is reviewed quarterly by the Ministry of Finance',
    ],
    features: [
      'Loan facility available between 3rd and 6th financial year',
      'Deposit before the 5th of every month to maximize monthly interest',
      'Extendable indefinitely in 5-year blocks after maturity',
    ],
    eligibility: 'Any resident Indian citizen; parents can also open one account for a minor child.',
    customerTypes: ['Salaried', 'Self-employed', 'Business', 'Student', 'Senior citizen'],
    feeValue: 0,
    rewardRate: 7.1,
    editorialRank: 1,
    minIncome: 0,
    minAge: 18,
    maxAge: 85,
    applyUrl: 'https://www.nsiindia.gov.in/',
    verifiedAt: '2026-11-23T08:00:00.000Z',
    status: 'approved',
    review: 'The cornerstone debt allocation for Indian households—unmatched combination of sovereign safety and completely tax-free compounding.',
    applySteps: [
      'Model 15-year maturity value in the FORWORD PPF Calculator',
      'Open PPF online via SBI, HDFC, ICICI NetBanking or India Post',
      'Contribute before April 5 each year to maximize tax-free interest',
    ],
  },
  {
    $id: 'prod-gov-ssy',
    $createdAt: NOW,
    $updatedAt: NOW,
    name: 'Sukanya Samriddhi Yojana (SSY)',
    slug: 'sukanya-samriddhi-yojana-ssy',
    type: 'scheme',
    category: 'government-schemes',
    subcategory: 'sukanya-samriddhi-yojana',
    bankName: 'Government of India',
    bankLogo: '/demo/brand-gov.svg',
    summary: 'High-yield 8.20% p.a. sovereign savings scheme designed for a girl child’s higher education and future financial security.',
    facts: [
      'Interest rate|8.20% p.a. (Govt notified quarterly)',
      'Deposit limit|₹250 to ₹1,50,000 per financial year',
      'Tax status|EEE (Exempt-Exempt-Exempt)',
      'Lock-in|21 years (50% exit at age 18 for study)',
      'Risk level|Zero default risk (Sovereign)',
    ],
    benefits: [
      'Highest sovereign small-savings interest rate at 8.20% p.a. compounded annually',
      'Completely tax-free interest and maturity amount (EEE status)',
      'Deposits required only for the first 15 years while interest compounds for 21 years',
      'Up to 50% partial withdrawal permitted when the girl child turns 18 for education',
    ],
    exclusions: [
      'Only available for a girl child below 10 years of age at account opening',
      'Maximum of two accounts per family (exceptions for twins/triplets)',
    ],
    pros: [
      'Beats most bank FDs by 100+ bps while remaining 100% tax-free',
      'Low ₹250 minimum annual deposit keeps the account active',
      'Sovereign-backed capital protection',
    ],
    cons: [
      'Long 21-year maturity window with strict withdrawal rules',
    ],
    features: [
      'Easy online transfer from Post Office to authorized banks anywhere in India',
      'Eligible for Section 80C deduction under Old Tax Regime',
    ],
    eligibility: 'Parents or legal guardians of a resident Indian girl child aged below 10 years.',
    customerTypes: ['Salaried', 'Self-employed', 'Business'],
    feeValue: 0,
    rewardRate: 8.2,
    editorialRank: 2,
    minIncome: 0,
    minAge: 18,
    maxAge: 65,
    applyUrl: 'https://www.nsiindia.gov.in/',
    verifiedAt: '2026-11-23T08:00:00.000Z',
    status: 'approved',
    review: 'Unbeatable fixed-income compounding for parents planning a daughter’s college corpus—8.20% completely tax-free with sovereign backing.',
    applySteps: [
      'Keep girl child’s birth certificate and parent KYC ready',
      'Open SSY account at any Post Office or SBI/HDFC/ICICI branch',
      'Set annual standing instruction before April 5 for maximum interest',
    ],
  },
];

/* ---------- Demo News & Guides (16 articles across news & tax-savings guides) ---------- */
export const DEMO_NEWS: News[] = [
  {
    $id: 'news-rbi-repo-rate-emi',
    $createdAt: '2026-11-24T06:30:00.000Z',
    $updatedAt: '2026-11-24T06:30:00.000Z',
    title: 'RBI Holds Policy Stance Steady: What It Means for Home Loan EMIs and Bank FD Rates',
    slug: 'rbi-policy-stance-home-loan-emi-fd-rates',
    summary: 'The Reserve Bank of India’s Monetary Policy Committee kept the benchmark repo rate unchanged while signalling measured liquidity support. Here is how floating-rate borrowers and fixed-deposit savers should respond.',
    body: `The Reserve Bank of India’s Monetary Policy Committee (MPC) maintained its benchmark policy repo rate in its latest review, keeping external benchmark lending rates (EBLR) steady across Indian commercial banks.

## Impact on Home Loan Borrowers

Most retail home loans issued after October 2019 are directly linked to the RBI repo rate. With the policy rate holding steady, existing borrowers will not see an immediate EMI hike, while new borrowers with a CIBIL score of 750+ can still negotiate starting rates near **8.50% p.a.**

- Review your current spread over the repo rate if your home loan rate exceeds 9.00%.
- Making even **one extra EMI prepayment every year** on a 20-year loan can cut over 3 years off your tenure.
- Floating-rate home loans carry zero prepayment penalties under RBI guidelines.

## What Fixed Deposit Savers Should Do Now

Bank deposit rates typically peak before the next rate-cut cycle begins. Major public and private banks currently offer between **7.00% and 7.75% p.a.** (including the 50 bps senior citizen premium) on 1-to-3 year special tenures.

**Key takeaway:** Locking in a portion of medium-term safe savings in a 2-to-3 year FD ladder helps protect yields before deposit rates soften.

## Action Checklist for Households

1. Keep 6 months of household expenses liquid in a sweep-in savings account or liquid fund.
2. Compare your existing home loan rate against current bank card rates before considering a balance transfer.
3. Rebalance long-term goals rather than chasing short-term interest rate headlines.`,
    imageUrl: '/demo/news-banking.jpg',
    categoryName: 'Banking News',
    categorySlug: 'banking-news',
    publisher: 'FORWORD Desk',
    sourceUrl: 'https://www.rbi.org.in/',
    author: 'Aarav Mehta',
    publishedAt: '2026-11-24T06:30:00.000Z',
    readTime: 4,
    status: 'approved',
    isFeatured: true,
    isBreaking: true,
    views: 18420,
    relatedProductIds: ['prod-sbi-home-loan', 'prod-sbi-amrit-fd', 'prod-kotak-811'],
  },
  {
    $id: 'news-sip-inflows-record',
    $createdAt: '2026-11-24T05:15:00.000Z',
    $updatedAt: '2026-11-24T05:15:00.000Z',
    title: 'Monthly Mutual Fund SIP Inflows Cross New Milestone as Retail Investors Stick to Index Funds',
    slug: 'monthly-mutual-fund-sip-inflows-index-funds',
    summary: 'Domestic SIP contributions hit fresh highs as salaried Indian investors increasingly automate monthly investing into low-cost Nifty 50 index and flexi-cap direct funds.',
    body: `Indian retail investors continue to anchor domestic equity markets through disciplined Systematic Investment Plans (SIPs), according to the latest monthly AMFI data.

## Why Direct Index SIPs Are Winning

Over the past three years, investor awareness around expense ratios has sharpened. Switching from a 1.5% regular fund to a **0.15%–0.25% Direct Nifty 50 Index Fund** can add lakhs to a 15-year retirement corpus without taking extra risk.

## How Step-Up SIPs Accelerate Wealth

A static ₹10,000 monthly SIP at 12% annualized return grows to roughly ₹50 lakh in 15 years. Increasing that SIP by just **10% every year** alongside annual salary increments nearly doubles the final corpus.

## Key Guardrails Before Starting a SIP

- Match equity SIPs strictly to goals that are at least **5–7 years away**.
- Avoid stopping SIPs during 10%–15% market corrections—that is when rupee-cost averaging works hardest.
- Check portfolio overlap before holding more than 3–4 equity funds.`,
    imageUrl: '/demo/news-markets.jpg',
    categoryName: 'Mutual Fund News',
    categorySlug: 'mutual-fund-news',
    publisher: 'FORWORD Markets',
    sourceUrl: 'https://www.amfiindia.com/',
    author: 'Priya Nair',
    publishedAt: '2026-11-24T05:15:00.000Z',
    readTime: 3,
    status: 'approved',
    isFeatured: false,
    isBreaking: true,
    views: 14950,
    relatedProductIds: ['prod-zerodha-coin-sip', 'prod-nps-tier1'],
  },
  {
    $id: 'news-rupay-upi-credit-cards-rules',
    $createdAt: '2026-11-23T15:40:00.000Z',
    $updatedAt: '2026-11-23T15:40:00.000Z',
    title: 'Credit Card Reward Rules Updated: How to Maximize Cashback on Online & UPI Spends in 2026',
    slug: 'credit-card-reward-rules-cashback-upi-2026',
    summary: 'With major banks tightening lounge milestones and utility exclusions, choosing the right two-card cashback + RuPay UPI combination can easily save ₹18,000–₹30,000 a year.',
    body: `Indian credit card issuers have revised reward exclusions, lounge spend thresholds, and rent payment fees across several popular cards. Rather than chasing complicated points transfers, many cardholders are shifting to transparent cashback setups.

## The Two-Card Everyday Strategy

Pairing one **5% online cashback card** with a **RuPay UPI credit card** covers over 80% of typical urban household spending:

- Use a dedicated online cashback card for e-commerce, subscriptions, and travel portals.
- Use a RuPay credit card linked to UPI for local groceries, pharmacies, and merchant QR codes.
- Always pay the **Total Amount Due** via autopay to avoid 42%+ annualized interest charges.

## Watch Out for New Exclusions

Most banks now exclude rent, education via third-party wallets, and government tax payments from earning base rewards and counting toward annual fee waivers.

## Protecting Your Credit Score

Keep combined credit utilization below **30%** of your total credit limit across cards, and avoid applying for multiple cards in the same month.`,
    imageUrl: '/demo/news-cards.jpg',
    categoryName: 'Credit Card News',
    categorySlug: 'credit-card-news',
    publisher: 'FORWORD Cards',
    sourceUrl: 'https://www.npci.org.in/',
    author: 'Rohan Kulkarni',
    publishedAt: '2026-11-23T15:40:00.000Z',
    readTime: 4,
    status: 'approved',
    isFeatured: false,
    isBreaking: false,
    views: 13210,
    relatedProductIds: ['prod-sbi-cashback', 'prod-hdfc-millennia', 'prod-hdfc-tata-neu-rupay'],
  },
  {
    $id: 'news-new-vs-old-tax-regime-2026',
    $createdAt: '2026-11-23T11:20:00.000Z',
    $updatedAt: '2026-11-23T11:20:00.000Z',
    title: 'New vs Old Tax Regime: The Exact Break-Even Deduction Number for Salaried Taxpayers',
    slug: 'new-vs-old-tax-regime-break-even-salaried',
    summary: 'With the higher standard deduction and revised slabs in the New Tax Regime, calculate whether claiming HRA, 80C, and home loan interest still keeps the Old Regime ahead.',
    body: `Choosing between India’s New Tax Regime and Old Tax Regime is one of the highest-impact personal finance decisions salaried taxpayers make every April.

## Key Advantages of the New Tax Regime

The New Tax Regime is now the default option and offers lower slab rates along with a **₹75,000 standard deduction** for salaried employees. It also allows **Corporate NPS contributions under Section 80CCD(2)** up to 14% of basic salary.

## When the Old Tax Regime Still Wins

You typically come out ahead in the Old Tax Regime only when your total eligible deductions—combining HRA, Section 80C (₹1.5L), Section 80D health insurance, Section 80CCD(1B) NPS (₹50,000), and Section 24(b) home loan interest (₹2L)—cross roughly **₹4.25 lakh to ₹4.5 lakh** at incomes above ₹15 lakh.

## How to Decide in 2 Minutes

Run your actual CTC breakup through our Income Tax Calculator before declaring investments to HR so you never lock money into poor-return tax-saving policies unnecessarily.`,
    imageUrl: '/demo/news-markets.jpg',
    categoryName: 'Tax News',
    categorySlug: 'tax-news',
    publisher: 'FORWORD Tax Desk',
    sourceUrl: 'https://www.incometax.gov.in/',
    author: 'Neha Deshmukh',
    publishedAt: '2026-11-23T11:20:00.000Z',
    readTime: 4,
    status: 'approved',
    isFeatured: false,
    isBreaking: false,
    views: 11840,
    relatedProductIds: ['prod-nps-tier1', 'prod-gov-ppf'],
  },
  {
    $id: 'news-health-insurance-checklist-2026',
    $createdAt: '2026-11-22T14:00:00.000Z',
    $updatedAt: '2026-11-22T14:00:00.000Z',
    title: 'Medical Inflation Tops 14% in Indian Metros: 5 Clauses to Check Before Renewing Health Insurance',
    slug: 'medical-inflation-health-insurance-clauses-checklist',
    summary: 'A ₹5 lakh corporate health policy is no longer enough for metro hospitalization. Check room-rent limits, consumables cover, and restoration rules before buying.',
    body: `Healthcare costs in Tier-1 Indian cities continue to climb at over 12%–14% annually, making an independent personal health insurance policy essential alongside employer coverage.

## 1. Zero Room-Rent Capping

If a policy caps room rent at 1% of sum insured and you choose a higher room category, insurers apply **proportionate deductions** across surgeon fees and diagnostics—not just the room charge. Always pick a plan with no room-rent cap.

## 2. Consumables & Non-Payable Items

Gloves, PPE kits, syringes, and surgical disposables can make up 10%–15% of hospital bills. Choose a policy or add-on that covers consumables explicitly.

## 3. Clean Pre-Existing Disclosure

Disclosing blood pressure, thyroid, or diabetes honestly at proposal time prevents claim rejection years later and starts your waiting period clock immediately.`,
    imageUrl: '/demo/news-banking.jpg',
    categoryName: 'Insurance News',
    categorySlug: 'insurance-news',
    publisher: 'FORWORD Protect',
    sourceUrl: 'https://irdai.gov.in/',
    author: 'Dr. Kavita Rao',
    publishedAt: '2026-11-22T14:00:00.000Z',
    readTime: 3,
    status: 'approved',
    isFeatured: false,
    isBreaking: false,
    views: 9420,
    relatedProductIds: ['prod-hdfc-ergo-optima', 'prod-maxlife-term'],
  },
  {
    $id: 'news-nifty-banknifty-earnings-outlook',
    $createdAt: '2026-11-22T09:10:00.000Z',
    $updatedAt: '2026-11-22T09:10:00.000Z',
    title: 'Nifty 50 & Banking Stocks: Q3 Credit Growth and Margin Trends Investors Are Tracking',
    slug: 'nifty-50-banking-stocks-credit-growth-outlook',
    summary: 'Private and PSU banks show resilient asset quality even as deposit competition keeps net interest margins in focus heading into the final quarter.',
    body: `Indian equity benchmarks remain closely tied to banking sector earnings, which command over a third of Nifty 50 index weight.

## Credit Growth vs Deposit Mobilization

System-wide bank credit continues to expand at a healthy double-digit clip led by retail housing and MSME lending, while banks actively compete for low-cost CASA deposits.

## Asset Quality Stays Healthy

Gross NPA ratios across leading private and public sector lenders remain near multi-year lows, giving balance sheets comfortable provisioning buffers.

## Takeaways for Long-Term Investors

Rather than timing individual bank earnings surprises, retail investors can capture India’s financial sector growth through diversified broad-market index funds.`,
    imageUrl: '/demo/news-markets.jpg',
    categoryName: 'Stock Market News',
    categorySlug: 'stock-market-news',
    publisher: 'FORWORD Markets',
    sourceUrl: 'https://www.nseindia.com/',
    author: 'Siddharth Verma',
    publishedAt: '2026-11-22T09:10:00.000Z',
    readTime: 3,
    status: 'approved',
    isFeatured: false,
    isBreaking: false,
    views: 10310,
    relatedProductIds: ['prod-zerodha-coin-sip'],
  },
  {
    $id: 'news-ppf-ssy-quarterly-rates',
    $createdAt: '2026-11-21T13:00:00.000Z',
    $updatedAt: '2026-11-21T13:00:00.000Z',
    title: 'Small Savings Rates Unchanged: PPF at 7.1% and Sukanya Samriddhi at 8.2% Remain Tax-Free',
    slug: 'small-savings-rates-ppf-ssy-tax-free',
    summary: 'The Finance Ministry retained quarterly interest rates across PPF, SSY, and NSC. Learn the April 5 deposit rule that maximizes your annual compounding.',
    body: `The Ministry of Finance kept interest rates steady on all small savings schemes for the current quarter, preserving Sukanya Samriddhi Yojana (8.20%) and PPF (7.10%) as top tax-free debt instruments.

## Why the 5th-of-the-Month Rule Matters

PPF interest is calculated on the **lowest balance between the close of the 5th day and the end of each month**. Depositing your lump sum or monthly instalment between the 1st and 5th ensures you earn full interest for that month.

## Comparing PPF vs Bank FDs

For an investor in the 30% income tax slab, a 7.10% tax-free PPF yield is equivalent to earning **over 10.1% p.a.** on a taxable bank fixed deposit.`,
    imageUrl: '/demo/news-banking.jpg',
    categoryName: 'Government Schemes',
    categorySlug: 'government-schemes-news',
    publisher: 'FORWORD Desk',
    sourceUrl: 'https://www.nsiindia.gov.in/',
    author: 'Meera Iyer',
    publishedAt: '2026-11-21T13:00:00.000Z',
    readTime: 3,
    status: 'approved',
    isFeatured: false,
    isBreaking: false,
    views: 8740,
    relatedProductIds: ['prod-gov-ppf', 'prod-gov-ssy'],
  },
  {
    $id: 'news-personal-finance-50-30-20-india',
    $createdAt: '2026-11-21T08:45:00.000Z',
    $updatedAt: '2026-11-21T08:45:00.000Z',
    title: 'How to Build a 6-Month Emergency Fund in India Without Letting Cash Sit Idle',
    slug: 'build-6-month-emergency-fund-india',
    summary: 'A practical 3-tier blueprint combining a zero-balance savings account, sweep-in FD, and liquid fund so emergencies never derail your SIPs.',
    body: `Before putting money into equity funds or stocks, every household needs a dedicated 6-month emergency reserve covering rent, EMIs, groceries, utilities, and insurance premiums.

## The 3-Tier Emergency Reserve Blueprint

- **Tier 1 (1 month of expenses):** Keep in a separate zero-balance savings account with instant UPI and ATM access.
- **Tier 2 (2 months of expenses):** Hold in an auto-sweep fixed deposit for instant liquidity with 6.5%–7% yield.
- **Tier 3 (3 months of expenses):** Allocate to a high-safety overnight or liquid mutual fund with T+1 redemption.

## Why Separation Matters

Keeping your emergency reserve outside your daily spending salary account removes the temptation to dip into it for impulsive purchases.`,
    imageUrl: '/demo/news-cards.jpg',
    categoryName: 'Personal Finance',
    categorySlug: 'personal-finance',
    publisher: 'FORWORD Guides',
    sourceUrl: 'https://www.forword.in/',
    author: 'Aarav Mehta',
    publishedAt: '2026-11-21T08:45:00.000Z',
    readTime: 3,
    status: 'approved',
    isFeatured: false,
    isBreaking: false,
    views: 9850,
    relatedProductIds: ['prod-kotak-811', 'prod-sbi-amrit-fd'],
  },
  {
    $id: 'news-home-loan-prepayment-vs-sip',
    $createdAt: '2026-11-20T16:20:00.000Z',
    $updatedAt: '2026-11-20T16:20:00.000Z',
    title: 'Prepay Your 8.75% Home Loan or Start an Equity SIP? Here Is the Real Math',
    slug: 'prepay-home-loan-vs-equity-sip-math',
    summary: 'Should you put your annual bonus toward reducing home loan principal or invest in mutual funds? Compare guaranteed interest savings against post-tax equity returns.',
    body: `Homeowners often debate whether surplus cash should reduce their mortgage or compound in equity mutual funds.

## Guaranteed 8.75% Tax-Free Return

Every rupee you prepay on an 8.75% home loan earns a **risk-free, guaranteed 8.75% post-tax saving** (assuming you are in the New Tax Regime with no Section 24b benefit). In the first 7 years of a 20-year loan, prepayments eliminate massive future interest.

## The Balanced 50/50 Split

Instead of an all-or-nothing choice, splitting your annual bonus **50% toward principal prepayment** and **50% into a long-term Nifty 50 SIP** lowers debt stress while keeping wealth creation on track.`,
    imageUrl: '/demo/news-banking.jpg',
    categoryName: 'Loan News',
    categorySlug: 'loan-news',
    publisher: 'FORWORD Desk',
    sourceUrl: 'https://www.forword.in/',
    author: 'Rohan Kulkarni',
    publishedAt: '2026-11-20T16:20:00.000Z',
    readTime: 3,
    status: 'approved',
    isFeatured: false,
    isBreaking: false,
    views: 8190,
    relatedProductIds: ['prod-sbi-home-loan', 'prod-zerodha-coin-sip'],
  },
  {
    $id: 'news-gold-allocation-etf-sovereign',
    $createdAt: '2026-11-20T10:15:00.000Z',
    $updatedAt: '2026-11-20T10:15:00.000Z',
    title: 'Gold Near Record Levels: How Indian Investors Can Allocate 5%–10% via Gold ETFs',
    slug: 'gold-allocation-indian-investors-gold-etfs',
    summary: 'With festive demand and global central bank buying supporting gold prices, low-cost Gold ETFs and Gold Mutual Funds offer transparent pricing without making charges.',
    body: `Gold has historically served as a reliable hedge against rupee depreciation and equity volatility in Indian household portfolios.

## Why Gold ETFs Beat Jewellery for Investing

Physical gold jewellery carries 8%–20% making charges plus 3% GST and storage concerns. SEBI-regulated **Gold ETFs** track 99.5% pure domestic gold prices with expense ratios near 0.30%–0.50% and instant market liquidity.

## Keep Allocation Disciplined

Financial planners typically recommend capping gold at **5% to 10%** of your total investment portfolio—enough to cushion equity downturns without dragging long-term compounding.`,
    imageUrl: '/demo/news-markets.jpg',
    categoryName: 'Gold & Silver News',
    categorySlug: 'gold-silver-news',
    publisher: 'FORWORD Commodities',
    sourceUrl: 'https://www.sebi.gov.in/',
    author: 'Priya Nair',
    publishedAt: '2026-11-20T10:15:00.000Z',
    readTime: 3,
    status: 'approved',
    isFeatured: false,
    isBreaking: false,
    views: 7620,
    relatedProductIds: ['prod-zerodha-coin-sip'],
  },
  {
    $id: 'news-upi-autopay-fintech-growth',
    $createdAt: '2026-11-19T12:30:00.000Z',
    $updatedAt: '2026-11-19T12:30:00.000Z',
    title: 'UPI Crosses 16 Billion Monthly Transactions: Credit Line on UPI & Autopay Lead Growth',
    slug: 'upi-monthly-transactions-credit-line-autopay',
    summary: 'NPCI’s expansion of UPI Autopay, UPI Lite, and pre-sanctioned credit lines on UPI is reshaping how Indians pay utility bills, SIPs, and small-ticket retail purchases.',
    body: `India’s Unified Payments Interface (UPI) continues to set global digital payments records, with recurring mandates and credit-on-UPI emerging as the fastest-growing segments.

## Credit Card & Credit Line on UPI

Linking a RuPay credit card to UPI lets users keep their primary savings bank statement clutter-free while enjoying up to 45 days of interest-free credit and merchant cashback rewards.

## Managing UPI Autopay Safely

Review your active UPI Autopay mandates once a quarter inside your UPI app and cancel unused streaming or app subscriptions before renewal dates.`,
    imageUrl: '/demo/news-cards.jpg',
    categoryName: 'Technology & Fintech News',
    categorySlug: 'technology-fintech-news',
    publisher: 'FORWORD Fintech',
    sourceUrl: 'https://www.npci.org.in/',
    author: 'Siddharth Verma',
    publishedAt: '2026-11-19T12:30:00.000Z',
    readTime: 3,
    status: 'approved',
    isFeatured: false,
    isBreaking: false,
    views: 6890,
    relatedProductIds: ['prod-hdfc-tata-neu-rupay', 'prod-kotak-811'],
  },
  {
    $id: 'news-india-gdp-economy-outlook',
    $createdAt: '2026-11-19T08:00:00.000Z',
    $updatedAt: '2026-11-19T08:00:00.000Z',
    title: 'India Macro Brief: Resilient Domestic Consumption and Infrastructure Capex Anchor GDP Growth',
    slug: 'india-macro-brief-consumption-capex-gdp',
    summary: 'Steady GST collections, cooling core inflation, and public infrastructure outlay keep India among the fastest-growing major economies this fiscal year.',
    body: `Strong services exports, robust tax buoyancy, and continued infrastructure spending remain the core pillars supporting India’s macroeconomic momentum.

## Inflation & Household Budgets

Moderating core inflation offers breathing room for urban and rural households, though seasonal food price spikes remain on the RBI’s radar.

## What It Means for Savers

A steady macro environment supports corporate earnings growth over the medium term while keeping sovereign bond yields attractive for debt investors.`,
    imageUrl: '/demo/news-banking.jpg',
    categoryName: 'Economy News',
    categorySlug: 'economy-news',
    publisher: 'FORWORD Economy',
    sourceUrl: 'https://www.rbi.org.in/',
    author: 'Meera Iyer',
    publishedAt: '2026-11-19T08:00:00.000Z',
    readTime: 3,
    status: 'approved',
    isFeatured: false,
    isBreaking: false,
    views: 6120,
    relatedProductIds: ['prod-gov-ppf', 'prod-sbi-amrit-fd'],
  },

  /* --- Tax & Savings Guides (mapped to tax-savings subcategories) --- */
  {
    $id: 'guide-income-tax-slabs',
    $createdAt: '2026-11-18T10:00:00.000Z',
    $updatedAt: '2026-11-18T10:00:00.000Z',
    title: 'Complete Guide to Indian Income Tax Slabs, Rebate 87A, and Standard Deduction',
    slug: 'guide-indian-income-tax-slabs-rebate-87a',
    summary: 'Understand current New and Old Tax Regime slabs, Section 87A tax rebate, marginal relief, and how salaried standard deduction reduces taxable income.',
    body: `Knowing your exact marginal tax bracket helps you evaluate bank FDs, debt funds, and salary structure choices accurately.

## Standard Deduction & Rebate Basics

Salaried individuals and pensioners receive a flat **₹75,000 standard deduction** under the New Tax Regime (₹50,000 under the Old Regime), automatically deducted from gross salary without needing bills.

## Calculating Effective Tax Rate

Remember that income tax in India is progressive—moving into a higher slab only taxes the **incremental income** above that threshold, not your entire salary.`,
    imageUrl: '/demo/news-markets.jpg',
    categoryName: 'Income Tax',
    categorySlug: 'income-tax',
    publisher: 'FORWORD Tax Guides',
    sourceUrl: 'https://www.incometax.gov.in/',
    author: 'Neha Deshmukh',
    publishedAt: '2026-11-18T10:00:00.000Z',
    readTime: 4,
    status: 'approved',
    views: 5400,
    relatedProductIds: ['prod-nps-tier1', 'prod-gov-ppf'],
  },
  {
    $id: 'guide-tax-saving-investments',
    $createdAt: '2026-11-18T09:00:00.000Z',
    $updatedAt: '2026-11-18T09:00:00.000Z',
    title: 'Best Tax-Saving Investments in India: PPF, ELSS, SSY, and Corporate NPS Compared',
    slug: 'best-tax-saving-investments-ppf-elss-nps',
    summary: 'Compare lock-in periods, expected returns, and tax treatment across Section 80C, 80CCD(2), and 80D instruments before making year-end tax investments.',
    body: `Never buy an expensive endowment policy just to finish Section 80C in March. Align your tax-saving choices with your actual asset allocation.

## Top Options for Old & New Regimes

- **Corporate NPS (Section 80CCD(2)):** Works in BOTH New and Old Tax Regimes up to 14% of basic salary.
- **PPF (Section 80C):** Sovereign-backed 7.10% completely tax-free compounding.
- **ELSS Mutual Funds:** Shortest 3-year lock-in among 80C options with long-term equity growth potential.
- **Health Insurance (Section 80D):** Protects your family while offering up to ₹25,000–₹75,000 deduction under Old Regime.`,
    imageUrl: '/demo/news-banking.jpg',
    categoryName: 'Tax Saving Investments',
    categorySlug: 'tax-saving-investments',
    publisher: 'FORWORD Tax Guides',
    sourceUrl: 'https://www.incometax.gov.in/',
    author: 'Neha Deshmukh',
    publishedAt: '2026-11-18T09:00:00.000Z',
    readTime: 4,
    status: 'approved',
    views: 4950,
    relatedProductIds: ['prod-gov-ppf', 'prod-gov-ssy', 'prod-nps-tier1'],
  },
  {
    $id: 'guide-itr-filing-checklist',
    $createdAt: '2026-11-17T09:00:00.000Z',
    $updatedAt: '2026-11-17T09:00:00.000Z',
    title: 'ITR Filing Checklist: Form 16, AIS, TIS, and Capital Gains Verification Made Simple',
    slug: 'itr-filing-checklist-form-16-ais-tis',
    summary: 'A step-by-step checklist to reconcile Form 26AS, AIS, dividend income, and stock/mutual fund capital gains before e-verifying your Income Tax Return.',
    body: `Filing your Income Tax Return accurately takes under 30 minutes when you reconcile your statements first.

## 4 Documents to Download Before Filing

1. **Form 16 (Part A & B)** from your employer.
2. **Annual Information Statement (AIS) & TIS** from the Income Tax e-filing portal.
3. **Bank Interest Certificates** for savings accounts and fixed deposits.
4. **Capital Gains P&L Report** from your broker or mutual fund platform.

## Always E-Verify Within 30 Days

An unverified ITR is treated as invalid. Complete instant Aadhaar OTP e-verification immediately after submitting your return.`,
    imageUrl: '/demo/news-markets.jpg',
    categoryName: 'ITR Guides',
    categorySlug: 'itr-guides',
    publisher: 'FORWORD Tax Guides',
    sourceUrl: 'https://www.incometax.gov.in/',
    author: 'Neha Deshmukh',
    publishedAt: '2026-11-17T09:00:00.000Z',
    readTime: 3,
    status: 'approved',
    views: 4210,
    relatedProductIds: ['prod-zerodha-coin-sip'],
  },
  {
    $id: 'guide-monthly-budget-planning',
    $createdAt: '2026-11-16T09:00:00.000Z',
    $updatedAt: '2026-11-16T09:00:00.000Z',
    title: 'Pay-Yourself-First Budget Plan: Automating Salary Day Savings in 15 Minutes',
    slug: 'pay-yourself-first-budget-plan-india',
    summary: 'Set up automatic SIPs, emergency transfers, and bill-pay reminders on salary day so you save 25%+ effortlessly without tracking every rupee.',
    body: `Manual expense spreadsheets rarely last beyond two months. Automating money movement on the 1st–5th of every month works far better.

## The 3-Bucket Salary Day Automation

- **Bucket 1 (Investments — 25%+):** Schedule SIPs, PPF, or NPS debits for the 3rd of each month.
- **Bucket 2 (Fixed Needs — 50%):** Rent, EMIs, groceries, utilities, and insurance.
- **Bucket 3 (Guilt-Free Spending — 25%):** Dining, travel, gadgets, and hobbies.

Once savings leave your account automatically on salary day, you can spend the remainder guilt-free.`,
    imageUrl: '/demo/news-cards.jpg',
    categoryName: 'Budget Planning',
    categorySlug: 'budget-planning',
    publisher: 'FORWORD Guides',
    sourceUrl: 'https://www.forword.in/',
    author: 'Aarav Mehta',
    publishedAt: '2026-11-16T09:00:00.000Z',
    readTime: 3,
    status: 'approved',
    views: 3980,
    relatedProductIds: ['prod-kotak-811', 'prod-zerodha-coin-sip'],
  },
];

/* ---------- Demo Offers (14 active offers spanning every offer category) ---------- */
export const DEMO_OFFERS: Offer[] = [
  {
    $id: 'offer-hdfc-mmt-flights',
    $createdAt: '2026-11-24T08:00:00.000Z',
    $updatedAt: '2026-11-24T08:00:00.000Z',
    title: 'Flat 12% Instant Discount on Domestic & International Flights',
    brandId: 'brand-mmt',
    brandName: 'MakeMyTrip',
    brandLogo: '/demo/brand-mmt.svg',
    imageUrl: '/demo/news-cards.jpg',
    description: 'Save up to ₹1,800 on domestic flights and up to ₹5,000 on international flight bookings paid using eligible HDFC Bank Credit Cards & EasyEMI.',
    discount: 'Up to ₹5,000 Off',
    couponCode: 'MMTHDFC',
    validTill: '2027-06-30',
    terms: [
      'Valid on minimum booking value of ₹5,000 for domestic flights and ₹15,000 for international flights.',
      'Applicable once per HDFC Bank credit card per calendar month.',
      'Not applicable on corporate or commercial HDFC Bank credit cards.',
    ],
    externalUrl: 'https://www.makemytrip.com/promos/',
    category: 'travel',
    isExclusive: true,
    isTrending: true,
    status: 'approved',
  },
  {
    $id: 'offer-sbi-cashback-welcome',
    $createdAt: '2026-11-24T07:00:00.000Z',
    $updatedAt: '2026-11-24T07:00:00.000Z',
    title: '5% Direct Cashback on Online Shopping Across Top Portals',
    brandId: 'brand-sbi',
    brandName: 'State Bank of India',
    brandLogo: '/demo/brand-sbi.svg',
    imageUrl: '/demo/news-cards.jpg',
    description: 'Earn flat 5% statement cashback on online retail purchases across fashion, electronics, and travel with the SBI Cashback Credit Card.',
    discount: '5% Cashback',
    validTill: '2027-09-30',
    terms: [
      'Cashback capped at ₹5,000 per billing cycle across online and offline spends.',
      'Auto-credited to your card account within 2 days of statement generation.',
      'Excludes rent, utility bills, fuel, wallet loads, and EMI transactions.',
    ],
    externalUrl: 'https://www.sbicard.com/en/personal/offers.page',
    category: 'credit-card',
    isExclusive: true,
    isTrending: true,
    status: 'approved',
  },
  {
    $id: 'offer-swiggy-hdfc-dining',
    $createdAt: '2026-11-23T18:00:00.000Z',
    $updatedAt: '2026-11-23T18:00:00.000Z',
    title: '10% Cashback on Swiggy Food, Instamart & Dineout Orders',
    brandId: 'brand-swiggy',
    brandName: 'Swiggy',
    brandLogo: '/demo/brand-swiggy.svg',
    imageUrl: '/demo/news-cards.jpg',
    description: 'Enjoy 10% cashback across Swiggy food delivery, Instamart quick groceries, and Dineout restaurant bills plus complimentary Swiggy One membership.',
    discount: '10% Cashback',
    couponCode: 'SWIGGY10',
    validTill: '2027-05-31',
    terms: [
      'Maximum cashback of ₹1,500 per billing cycle on Swiggy spends.',
      'Valid on minimum order value of ₹199 on food and ₹399 on Instamart.',
      'Complimentary 3-month Swiggy One activates on card issuance.',
    ],
    externalUrl: 'https://www.swiggy.com/',
    category: 'food',
    isExclusive: false,
    isTrending: true,
    status: 'approved',
  },
  {
    $id: 'offer-icici-amazon-shopping',
    $createdAt: '2026-11-23T15:00:00.000Z',
    $updatedAt: '2026-11-23T15:00:00.000Z',
    title: 'Flat 10% Instant Bank Discount on Electronics & Appliances',
    brandId: 'brand-icici',
    brandName: 'ICICI Bank',
    brandLogo: '/demo/brand-icici.svg',
    imageUrl: '/demo/news-cards.jpg',
    description: 'Get 10% instant discount up to ₹2,500 on smartphones, laptops, and home appliances using ICICI Bank Credit Cards and Credit Card EMI.',
    discount: '10% Instant Off',
    validTill: '2027-04-30',
    terms: [
      'Minimum transaction value of ₹5,000 required at checkout.',
      'Discount applies automatically on the payment screen for eligible ICICI cards.',
      'Valid on non-EMI and EMI transactions across participating merchants.',
    ],
    externalUrl: 'https://www.icicibank.com/offers',
    category: 'shopping',
    isExclusive: false,
    isTrending: true,
    status: 'approved',
  },
  {
    $id: 'offer-axis-gpay-recharge',
    $createdAt: '2026-11-23T12:00:00.000Z',
    $updatedAt: '2026-11-23T12:00:00.000Z',
    title: '5% Cashback on Electricity, Broadband & Mobile Recharges',
    brandId: 'brand-axis',
    brandName: 'Axis Bank',
    brandLogo: '/demo/brand-axis.svg',
    imageUrl: '/demo/news-cards.jpg',
    description: 'Pay monthly electricity, DTH, broadband, gas, and prepaid mobile bills on Google Pay using Axis Bank ACE Credit Card and earn 5% direct cashback.',
    discount: '5% Bill Cashback',
    validTill: '2027-08-31',
    terms: [
      'Applicable only on bill payments completed through Google Pay.',
      'Combined monthly cashback cap of ₹500 on 5% and 4% partner categories.',
      'Cashback credits directly to your monthly credit card statement.',
    ],
    externalUrl: 'https://www.axisbank.com/grab-deals/online-offers',
    category: 'recharge',
    isExclusive: true,
    isTrending: false,
    status: 'approved',
  },
  {
    $id: 'offer-kotak-zero-balance-voucher',
    $createdAt: '2026-11-22T17:00:00.000Z',
    $updatedAt: '2026-11-22T17:00:00.000Z',
    title: 'Zero Balance Kotak811 Account + Instant Virtual Card Rewards',
    brandId: 'brand-kotak',
    brandName: 'Kotak Mahindra Bank',
    brandLogo: '/demo/brand-kotak.svg',
    imageUrl: '/demo/news-banking.jpg',
    description: 'Open a Kotak811 zero-balance digital savings account with Video KYC and earn up to ₹500 cashback on your first 5 UPI & virtual card spends.',
    discount: '₹500 Cashback',
    validTill: '2027-07-31',
    terms: [
      'Valid for new-to-bank Kotak811 full-KYC savings account holders.',
      'Complete Video KYC and 5 qualifying transactions within 30 days of opening.',
      'Zero minimum balance fee applies across India.',
    ],
    externalUrl: 'https://www.kotak.com/en/offers.html',
    category: 'bank',
    isExclusive: false,
    isTrending: true,
    status: 'approved',
  },
  {
    $id: 'offer-hdfc-smartbuy-cashback',
    $createdAt: '2026-11-22T14:00:00.000Z',
    $updatedAt: '2026-11-22T14:00:00.000Z',
    title: 'Up to 5X Reward Points & 5% Cashback on SmartBuy Gift Vouchers',
    brandId: 'brand-hdfc',
    brandName: 'HDFC Bank',
    brandLogo: '/demo/brand-hdfc.svg',
    imageUrl: '/demo/news-cards.jpg',
    description: 'Buy instant brand vouchers for Amazon, Flipkart, Myntra, BigBasket, and Uber via HDFC SmartBuy GyFTR to unlock accelerated cashback.',
    discount: 'Up to 5X Rewards',
    validTill: '2027-06-30',
    terms: [
      'Monthly accelerated rewards cap varies by HDFC Bank credit card variant.',
      'Voucher convenience fees may apply on select Amazon Pay gift cards.',
      'Bonus points post within 90 days of transaction settlement.',
    ],
    externalUrl: 'https://offers.smartbuy.hdfcbank.com/',
    category: 'cashback',
    isExclusive: true,
    isTrending: true,
    status: 'approved',
  },
  {
    $id: 'offer-sbi-home-loan-fee-waiver',
    $createdAt: '2026-11-22T10:00:00.000Z',
    $updatedAt: '2026-11-22T10:00:00.000Z',
    title: 'Zero Processing Fee on SBI Digital Home Loan Balance Transfers',
    brandId: 'brand-sbi',
    brandName: 'State Bank of India',
    brandLogo: '/demo/brand-sbi.svg',
    imageUrl: '/demo/news-banking.jpg',
    description: 'Switch your existing high-rate housing loan to SBI Regular Home Loan with 100% processing fee waiver and repo-linked rates starting at 8.50% p.a.',
    discount: '0% Processing Fee',
    validTill: '2027-03-31',
    terms: [
      'Valid on approved balance transfer applications submitted online.',
      'Lowest interest slab requires CIBIL score of 750+ and verified property documents.',
      'Government stamp duty and CERSAI charges apply as per state norms.',
    ],
    externalUrl: 'https://homeloans.sbi/',
    category: 'loan',
    isExclusive: true,
    isTrending: false,
    status: 'approved',
  },
  {
    $id: 'offer-zerodha-zero-brokerage',
    $createdAt: '2026-11-21T16:00:00.000Z',
    $updatedAt: '2026-11-21T16:00:00.000Z',
    title: '₹0 Commission Direct Mutual Funds & Zero Equity Delivery Brokerage',
    brandId: 'brand-zerodha',
    brandName: 'Zerodha',
    brandLogo: '/demo/brand-zerodha.svg',
    imageUrl: '/demo/news-markets.jpg',
    description: 'Open your online Zerodha Demat & Coin account to invest in direct mutual fund SIPs and NSE/BSE delivery stocks with zero brokerage.',
    discount: '₹0 Commission',
    validTill: '2027-12-31',
    terms: [
      '₹0 brokerage applies to equity delivery and Direct Mutual Fund investments.',
      'Statutory STT, exchange transaction charges, and GST apply as mandated.',
      'Standard Demat AMC applies for non-BSDA accounts.',
    ],
    externalUrl: 'https://zerodha.com/pricing/',
    category: 'investment',
    isExclusive: false,
    isTrending: true,
    status: 'approved',
  },
  {
    $id: 'offer-maxlife-online-term-discount',
    $createdAt: '2026-11-21T11:00:00.000Z',
    $updatedAt: '2026-11-21T11:00:00.000Z',
    title: 'Save Up to 15% on First-Year Term Insurance Premium Online',
    brandId: 'brand-maxlife',
    brandName: 'Axis Max Life & Health',
    brandLogo: '/demo/brand-maxlife.svg',
    imageUrl: '/demo/news-banking.jpg',
    description: 'Salaried applicants buying ₹1 Cr+ Smart Secure Plus Term Plan online receive up to 15% first-year salaried discount and instant digital policy issuance.',
    discount: 'Up to 15% Off',
    validTill: '2027-06-30',
    terms: [
      'Salaried discount applies on first-year base premium for eligible applicants.',
      'Subject to medical and financial underwriting approval.',
      '30-day free-look period included as per IRDAI guidelines.',
    ],
    externalUrl: 'https://www.axismaxlife.com/term-insurance-plans',
    category: 'insurance',
    isExclusive: true,
    isTrending: false,
    status: 'approved',
  },
  {
    $id: 'offer-hdfc-millennia-lounge-voucher',
    $createdAt: '2026-11-20T15:00:00.000Z',
    $updatedAt: '2026-11-20T15:00:00.000Z',
    title: '₹1,000 Quarterly Gift Voucher on HDFC Millennia Milestone Spends',
    brandId: 'brand-hdfc',
    brandName: 'HDFC Bank',
    brandLogo: '/demo/brand-hdfc.svg',
    imageUrl: '/demo/news-cards.jpg',
    description: 'Unlock a ₹1,000 shopping voucher every calendar quarter (up to ₹4,000/year) on eligible ₹1 lakh quarterly spends with HDFC Millennia Credit Card.',
    discount: '₹4,000/yr Bonus',
    validTill: '2027-09-30',
    terms: [
      'Quarterly spend milestone of ₹1,00,000 excludes EMI, rent, and wallet loads.',
      'Voucher claim link is sent via SMS and email after quarter closure.',
    ],
    externalUrl: 'https://www.hdfcbank.com/personal/pay/cards/millennia-cards/millennia-cc-new',
    category: 'credit-card',
    isExclusive: false,
    isTrending: false,
    status: 'approved',
  },
  {
    $id: 'offer-axis-dining-delights',
    $createdAt: '2026-11-20T12:00:00.000Z',
    $updatedAt: '2026-11-20T12:00:00.000Z',
    title: 'Flat 15% Off Up to ₹500 on Partner Restaurants via EazyDiner',
    brandId: 'brand-axis',
    brandName: 'Axis Bank',
    brandLogo: '/demo/brand-axis.svg',
    imageUrl: '/demo/news-cards.jpg',
    description: 'Pay your restaurant bill via PayEazy using any Axis Bank Credit or Debit Card to enjoy 15% instant discount across 10,000+ restaurants in India.',
    discount: '15% Dining Off',
    couponCode: 'AXISDINING',
    validTill: '2027-05-31',
    terms: [
      'Minimum dining bill of ₹1,500 required to avail instant discount.',
      'Maximum discount capped at ₹500 per transaction, twice per month.',
    ],
    externalUrl: 'https://www.axisbank.com/grab-deals/dining-delights',
    category: 'food',
    isExclusive: false,
    isTrending: false,
    status: 'approved',
  },
];

/* ---------- Demo Trending Search Terms ---------- */
export const DEMO_TRENDING_TERMS: Category[] = [
  { $id: 'trend-1', $createdAt: NOW, $updatedAt: NOW, name: 'Cashback Credit Card', slug: 'cashback-credit-cards', kind: 'product', isTrending: true, sortOrder: 1 },
  { $id: 'trend-2', $createdAt: NOW, $updatedAt: NOW, name: 'RBI Repo Rate', slug: 'banking-news', kind: 'news', isTrending: true, sortOrder: 2 },
  { $id: 'trend-3', $createdAt: NOW, $updatedAt: NOW, name: 'SBI Home Loan', slug: 'home-loans', kind: 'product', isTrending: true, sortOrder: 3 },
  { $id: 'trend-4', $createdAt: NOW, $updatedAt: NOW, name: 'HDFC Bank', slug: 'credit-cards', kind: 'product', isTrending: true, sortOrder: 4 },
  { $id: 'trend-5', $createdAt: NOW, $updatedAt: NOW, name: 'SIP Mutual Funds', slug: 'mutual-funds', kind: 'product', isTrending: true, sortOrder: 5 },
  { $id: 'trend-6', $createdAt: NOW, $updatedAt: NOW, name: 'PPF', slug: 'ppf', kind: 'product', isTrending: true, sortOrder: 6 },
];

/* ---------- Demo Public Notifications ---------- */
export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    $id: 'notif-demo-1',
    $createdAt: '2026-11-24T06:45:00.000Z',
    $updatedAt: '2026-11-24T06:45:00.000Z',
    title: 'RBI Policy Update: Home Loan EMI & FD Impact',
    body: 'Read our breakdown on locking in 7.25%+ bank FD yields and cutting home loan interest.',
    kind: 'news',
    href: '/news/rbi-policy-stance-home-loan-emi-fd-rates',
  },
  {
    $id: 'notif-demo-2',
    $createdAt: '2026-11-24T05:30:00.000Z',
    $updatedAt: '2026-11-24T05:30:00.000Z',
    title: 'Exclusive Offer: Up to ₹5,000 Off Flights on MakeMyTrip',
    body: 'Use code MMTHDFC with eligible HDFC Bank Credit Cards on domestic & international bookings.',
    kind: 'offer',
    href: '/offers/offer-hdfc-mmt-flights',
  },
  {
    $id: 'notif-demo-3',
    $createdAt: '2026-11-23T16:00:00.000Z',
    $updatedAt: '2026-11-23T16:00:00.000Z',
    title: 'Compare Top Cashback Credit Cards Side by Side',
    body: 'Compare SBI Cashback, HDFC Millennia, and Amazon Pay ICICI fees and reward caps.',
    kind: 'system',
    href: '/compare?ids=prod-sbi-cashback,prod-hdfc-millennia,prod-icici-amazon-pay',
  },
  {
    $id: 'notif-demo-4',
    $createdAt: '2026-11-23T11:30:00.000Z',
    $updatedAt: '2026-11-23T11:30:00.000Z',
    title: 'Daily Reading Streak & Rewards',
    body: 'Sign in and read finance updates to build your streak and earn FORWORD coins.',
    kind: 'reward',
    href: '/rewards',
  },
];

/* ---------- Pure Query Helpers for Local Demo Fallback ---------- */
export function queryDemoNews(opts: { category?: string; kind?: FeedKind; limit?: number; offset?: number } = {}): News[] {
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(opts.limit ?? 20)));
  const offset = opts.offset && opts.offset > 0 ? Math.trunc(opts.offset) : 0;

  let items = [...DEMO_NEWS];
  if (opts.category) {
    const exact = items.filter((n) => n.categorySlug === opts.category);
    if (exact.length > 0) {
      items = exact;
    } else if (opts.category === 'tax-regime-comparison') {
      items = items.filter((n) => n.categorySlug === 'tax-news' || n.categorySlug === 'income-tax');
    } else if (opts.category === 'tax-calculators') {
      items = items.filter((n) => n.categorySlug === 'income-tax' || n.categorySlug === 'tax-saving-investments');
    } else {
      items = exact;
    }
  } else {
    // Keep main feed focused on news articles (exclude guide-only slugs unless requested by category)
    const guideSlugs = new Set(['income-tax', 'tax-saving-investments', 'tax-regime-comparison', 'tax-calculators', 'itr-guides', 'budget-planning']);
    items = items.filter((n) => !guideSlugs.has(n.categorySlug));
  }

  switch (opts.kind) {
    case 'trending':
    case 'top-stories':
      items.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      break;
    case 'breaking':
      items = items.filter((n) => n.isBreaking).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      break;
    case 'featured':
      items = items.filter((n) => n.isFeatured).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      break;
    case 'recommended':
      items.sort((a, b) => b.$updatedAt.localeCompare(a.$updatedAt));
      break;
    default:
      items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  return items.slice(offset, offset + safeLimit);
}

export function findDemoNewsBySlug(slug: string): News | null {
  const clean = slug.trim();
  if (!clean) return null;
  return DEMO_NEWS.find((n) => n.slug === clean) ?? null;
}

export function queryDemoProducts(opts: { category: string; subcategory?: string; limit?: number }): Product[] {
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(opts.limit ?? 100)));
  const byCat = DEMO_PRODUCTS
    .filter((p) => p.category === opts.category)
    .sort((a, b) => (a.editorialRank ?? 99) - (b.editorialRank ?? 99));

  if (!opts.subcategory) return byCat.slice(0, safeLimit);

  // Broad "best-*" subcategories show all top products in that category
  if (opts.subcategory.startsWith('best-')) return byCat.slice(0, safeLimit);

  const exact = byCat.filter((p) => p.subcategory === opts.subcategory);
  if (exact.length > 0) return exact.slice(0, safeLimit);

  // Friendly fallback: if a user opens a narrow subcategory within a valid category, show category picks instead of an empty screen
  return byCat.slice(0, safeLimit);
}

export function findDemoProductBySlug(slug: string): Product | null {
  const clean = slug.trim();
  if (!clean) return null;
  return DEMO_PRODUCTS.find((p) => p.slug === clean) ?? null;
}

export function findDemoProductsByIds(ids: string[]): Product[] {
  const byId = new Map(DEMO_PRODUCTS.map((p) => [p.$id, p]));
  return ids.map((id) => byId.get(id.trim())).filter((p): p is Product => Boolean(p));
}

export function queryDemoOffers(opts: { category?: string; brandId?: string } = {}): Offer[] {
  let items = [...DEMO_OFFERS];
  if (opts.brandId) items = items.filter((o) => o.brandId === opts.brandId);
  if (opts.category === 'exclusive') items = items.filter((o) => o.isExclusive);
  else if (opts.category === 'trending') items = items.filter((o) => o.isTrending);
  else if (opts.category && opts.category !== 'all') items = items.filter((o) => o.category === opts.category);
  return items.sort((a, b) => b.$createdAt.localeCompare(a.$createdAt));
}

export function findDemoOfferById(id: string): Offer | null {
  const clean = id.trim();
  if (!clean) return null;
  return DEMO_OFFERS.find((o) => o.$id === clean) ?? null;
}

export function findDemoBrandById(id: string): Brand | null {
  const clean = id.trim();
  if (!clean) return null;
  return DEMO_BRANDS.find((b) => b.$id === clean) ?? null;
}

export function searchDemoAll(term: string): { news: News[]; products: Product[]; offers: Offer[] } {
  const q = term.trim().toLowerCase();
  if (q.length < 2) return { news: [], products: [], offers: [] };
  const tokens = q.split(/\s+/).filter(Boolean);
  const matches = (haystack: string) => {
    const lc = haystack.toLowerCase();
    return tokens.every((tk) => lc.includes(tk));
  };

  const news = DEMO_NEWS.filter((n) =>
    matches(`${n.title} ${n.summary} ${n.categoryName} ${n.publisher}`),
  ).slice(0, 8);

  const products = DEMO_PRODUCTS.filter((p) =>
    matches(`${p.name} ${p.bankName} ${p.category} ${p.subcategory} ${p.summary ?? ''} ${p.facts.join(' ')}`),
  ).slice(0, 8);

  const offers = DEMO_OFFERS.filter((o) =>
    matches(`${o.title} ${o.brandName} ${o.category} ${o.discount} ${o.description} ${o.couponCode ?? ''}`),
  ).slice(0, 8);

  return { news, products, offers };
}
