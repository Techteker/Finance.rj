import { Component, Suspense, lazy, type ComponentType, type ErrorInfo, type ReactNode, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/auth';
import { LanguageProvider } from './hooks/i18n';
import { CompareProvider, FavoritesProvider, ToastProvider } from './hooks/app';
import { safeStorageGet, safeStorageSet } from './lib/format';
import { Article, Home, NewsCategory, NewsFeed, Notifications } from './pages/news';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyNamed<T extends Record<K, ComponentType<any>>, K extends keyof T>(loader: () => Promise<T>, name: K) {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}

const loadOnboarding = () => import('./pages/onboarding');
const Splash = lazyNamed(loadOnboarding, 'Splash');
const Welcome = lazyNamed(loadOnboarding, 'Welcome');
const Onboarding = lazyNamed(loadOnboarding, 'Onboarding');
const LanguageSelect = lazyNamed(loadOnboarding, 'LanguageSelect');
const NotificationPermission = lazyNamed(loadOnboarding, 'NotificationPermission');
const AccountCreated = lazyNamed(loadOnboarding, 'AccountCreated');

const loadAuth = () => import('./pages/auth');
const Login = lazyNamed(loadAuth, 'Login');
const MobileLogin = lazyNamed(loadAuth, 'MobileLogin');
const VerifyOtp = lazyNamed(loadAuth, 'VerifyOtp');
const VerifyEmail = lazyNamed(loadAuth, 'VerifyEmail');
const Register = lazyNamed(loadAuth, 'Register');
const ForgotPassword = lazyNamed(loadAuth, 'ForgotPassword');
const ResetPassword = lazyNamed(loadAuth, 'ResetPassword');
const ChangePassword = lazyNamed(loadAuth, 'ChangePassword');

const loadCategory = () => import('./pages/category');
const CategoryHub = lazyNamed(loadCategory, 'CategoryHub');
const AllCategories = lazyNamed(loadCategory, 'AllCategories');
const NewsCategoriesGrid = lazyNamed(loadCategory, 'NewsCategoriesGrid');
const CategoryLanding = lazyNamed(loadCategory, 'CategoryLanding');
const MenuDrawer = lazyNamed(loadCategory, 'MenuDrawer');
const CalculatorsHub = lazyNamed(loadCategory, 'CalculatorsHub');

const loadProducts = () => import('./pages/products');
const SubcategoryPage = lazyNamed(loadProducts, 'SubcategoryPage');
const ProductDetail = lazyNamed(loadProducts, 'ProductDetail');
const ApplicationGuide = lazyNamed(loadProducts, 'ApplicationGuide');
const PartnerRedirect = lazyNamed(loadProducts, 'PartnerRedirect');
const ComparePage = lazyNamed(loadProducts, 'ComparePage');
const Disclosure = lazyNamed(loadProducts, 'Disclosure');

const loadOffers = () => import('./pages/offers');
const Offers = lazyNamed(loadOffers, 'Offers');
const OfferDetail = lazyNamed(loadOffers, 'OfferDetail');
const BrandDetail = lazyNamed(loadOffers, 'BrandDetail');

const Favorites = lazyNamed(() => import('./pages/favorites'), 'Favorites');

const loadProfile = () => import('./pages/profile');
const Profile = lazyNamed(loadProfile, 'Profile');
const EditProfile = lazyNamed(loadProfile, 'EditProfile');
const Activity = lazyNamed(loadProfile, 'Activity');
const ReadingHistory = lazyNamed(loadProfile, 'ReadingHistory');
const RecentlyViewed = lazyNamed(loadProfile, 'RecentlyViewed');
const MyReviews = lazyNamed(loadProfile, 'MyReviews');
const PrefSettings = lazyNamed(loadProfile, 'PrefSettings');
const Settings = lazyNamed(loadProfile, 'Settings');

const loadRewards = () => import('./pages/rewards');
const RewardsDashboard = lazyNamed(loadRewards, 'RewardsDashboard');
const ReadEarn = lazyNamed(loadRewards, 'ReadEarn');
const DailyTasks = lazyNamed(loadRewards, 'DailyTasks');
const DailyCheckIn = lazyNamed(loadRewards, 'DailyCheckIn');
const RewardHistory = lazyNamed(loadRewards, 'RewardHistory');
const EarningsHistory = lazyNamed(loadRewards, 'EarningsHistory');
const CoinsPage = lazyNamed(loadRewards, 'CoinsPage');
const WalletPage = lazyNamed(loadRewards, 'WalletPage');
const Withdraw = lazyNamed(loadRewards, 'Withdraw');
const WithdrawalHistory = lazyNamed(loadRewards, 'WithdrawalHistory');
const Transactions = lazyNamed(loadRewards, 'Transactions');
const Referral = lazyNamed(loadRewards, 'Referral');
const ReferralRewards = lazyNamed(loadRewards, 'ReferralRewards');

const CalculatorPage = lazyNamed(() => import('./pages/calculators'), 'CalculatorPage');

const loadSearch = () => import('./pages/search');
const SearchPage = lazyNamed(loadSearch, 'SearchPage');
const AdvancedSearch = lazyNamed(loadSearch, 'AdvancedSearch');

const loadUtility = () => import('./pages/utility');
const Help = lazyNamed(loadUtility, 'Help');
const Faq = lazyNamed(loadUtility, 'Faq');
const Contact = lazyNamed(loadUtility, 'Contact');
const About = lazyNamed(loadUtility, 'About');
const Terms = lazyNamed(loadUtility, 'Terms');
const Privacy = lazyNamed(loadUtility, 'Privacy');
const Offline = lazyNamed(loadUtility, 'Offline');
const Maintenance = lazyNamed(loadUtility, 'Maintenance');
const NotFound = lazyNamed(loadUtility, 'NotFound');
const CookieSettings = lazyNamed(loadUtility, 'CookieSettings');
const CookieBanner = lazyNamed(loadUtility, 'CookieBanner');

function RouteFallback() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-4 py-8" aria-busy="true" aria-label="Loading page">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-surface" />
      <div className="h-28 w-full animate-pulse rounded-2xl bg-surface" />
      <div className="h-24 w-full animate-pulse rounded-2xl bg-surface" />
      <div className="h-24 w-full animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render error:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
          <p className="text-sm text-slate">An unexpected error occurred while rendering this page. Reload to continue.</p>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="rounded-btn bg-pri px-5 py-3 text-sm font-bold text-white hover:bg-pri-dark"
          >
            Reload FORWORD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function isAutostart() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1';
}

export default function App() {
  const [splash, setSplash] = useState(() => !isAutostart() && !safeStorageGet('session', 'forword:splash'));
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <LanguageProvider>
              <FavoritesProvider>
                <CompareProvider>
                {splash && (
                  <Suspense fallback={null}>
                    <Splash onDone={() => { safeStorageSet('session', 'forword:splash', '1'); setSplash(false); }} />
                  </Suspense>
                )}
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/language" element={<LanguageSelect />} />
                    <Route path="/notification-permission" element={<NotificationPermission />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/login/mobile" element={<MobileLogin />} />
                    <Route path="/verify-otp" element={<VerifyOtp />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/account-created" element={<AccountCreated />} />

                    <Route path="/" element={<Home />} />
                    <Route path="/feed/:kind" element={<NewsFeed />} />
                    <Route path="/news/category/:slug" element={<NewsCategory />} />
                    <Route path="/news/:slug" element={<Article />} />
                    <Route path="/notifications" element={<Notifications />} />

                    <Route path="/category" element={<CategoryHub />} />
                    <Route path="/category/all" element={<AllCategories />} />
                    <Route path="/category/news" element={<NewsCategoriesGrid />} />
                    <Route path="/category/:slug" element={<CategoryLanding />} />
                    <Route path="/menu" element={<MenuDrawer />} />
                    <Route path="/product/:slug" element={<ProductDetail />} />
                    <Route path="/product/:slug/guide" element={<ApplicationGuide />} />
                    <Route path="/go/:slug" element={<PartnerRedirect />} />
                    <Route path="/compare" element={<ComparePage />} />
                    <Route path="/disclosure" element={<Disclosure />} />

                    <Route path="/offers" element={<Offers />} />
                    <Route path="/offers/category/:cat" element={<Offers />} />
                    <Route path="/offers/:id" element={<OfferDetail />} />
                    <Route path="/brands/:id" element={<BrandDetail />} />

                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/edit" element={<EditProfile />} />
                    <Route path="/profile/activity" element={<Activity />} />
                    <Route path="/profile/history" element={<ReadingHistory />} />
                    <Route path="/profile/recent" element={<RecentlyViewed />} />
                    <Route path="/profile/reviews" element={<MyReviews />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/settings/language" element={<LanguageSelect settings />} />
                    <Route path="/settings/notifications" element={<PrefSettings kind="notifications" />} />
                    <Route path="/settings/privacy" element={<PrefSettings kind="privacy" />} />
                    <Route path="/settings/password" element={<ChangePassword />} />
                    <Route path="/settings/cookies" element={<CookieSettings />} />

                    <Route path="/rewards" element={<RewardsDashboard />} />
                    <Route path="/rewards/read-earn" element={<ReadEarn />} />
                    <Route path="/rewards/tasks" element={<DailyTasks />} />
                    <Route path="/rewards/check-in" element={<DailyCheckIn />} />
                    <Route path="/rewards/history" element={<RewardHistory />} />
                    <Route path="/rewards/earnings" element={<EarningsHistory />} />
                    <Route path="/rewards/coins" element={<CoinsPage />} />
                    <Route path="/wallet" element={<WalletPage />} />
                    <Route path="/wallet/withdraw" element={<Withdraw />} />
                    <Route path="/wallet/withdrawals" element={<WithdrawalHistory />} />
                    <Route path="/wallet/transactions" element={<Transactions />} />
                    <Route path="/referral" element={<Referral />} />
                    <Route path="/referral/rewards" element={<ReferralRewards />} />

                    <Route path="/calculators" element={<CalculatorsHub />} />
                    <Route path="/calculators/:slug" element={<CalculatorPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/search/advanced" element={<AdvancedSearch />} />

                    <Route path="/help" element={<Help />} />
                    <Route path="/faq" element={<Faq />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/offline" element={<Offline />} />
                    <Route path="/maintenance" element={<Maintenance />} />

                    {/* Keep last: /:category/:subcategory, e.g. /credit-cards/best-credit-cards */}
                    <Route path="/:cat/:sub" element={<SubcategoryPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <Suspense fallback={null}>
                  <CookieBanner />
                </Suspense>
                </CompareProvider>
              </FavoritesProvider>
            </LanguageProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
