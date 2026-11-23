import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/auth';
import { CompareProvider, FavoritesProvider, ToastProvider } from './hooks/app';
import { isConfigured } from './lib/appwrite';
import { AccountCreated, LanguageSelect, NotificationPermission, ONBOARDED_KEY, Onboarding, Splash, Welcome } from './pages/onboarding';
import { ChangePassword, ForgotPassword, Login, MobileLogin, Register, ResetPassword, VerifyOtp } from './pages/auth';
import { Article, Home, NewsCategory, NewsFeed, Notifications } from './pages/news';
import { AllCategories, CalculatorsHub, CategoryHub, CategoryLanding, MenuDrawer, NewsCategoriesGrid } from './pages/category';
import { ApplicationGuide, ComparePage, Disclosure, PartnerRedirect, ProductDetail, SubcategoryPage } from './pages/products';
import { BrandDetail, OfferDetail, Offers } from './pages/offers';
import { Favorites } from './pages/favorites';
import { Activity, EditProfile, MyReviews, PrefSettings, Profile, ReadingHistory, RecentlyViewed, Settings } from './pages/profile';
import { CoinsPage, DailyCheckIn, DailyTasks, EarningsHistory, ReadEarn, Referral, ReferralRewards, RewardHistory, RewardsDashboard, Transactions, WalletPage, Withdraw, WithdrawalHistory } from './pages/rewards';
import { CalculatorPage } from './pages/calculators';
import { AdvancedSearch, SearchPage } from './pages/search';
import { About, Contact, CookieBanner, CookieSettings, Faq, Help, Maintenance, NotFound, Offline, Privacy, SetupScreen, Terms } from './pages/utility';

function FirstRun({ children }: { children: JSX.Element }) {
  return localStorage.getItem(ONBOARDED_KEY) ? children : <Navigate to="/welcome" replace />;
}

export default function App() {
  const [splash, setSplash] = useState(() => !sessionStorage.getItem('forword:splash'));
  if (!isConfigured) return <SetupScreen />;
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <FavoritesProvider>
            <CompareProvider>
              {splash && <Splash onDone={() => { sessionStorage.setItem('forword:splash', '1'); setSplash(false); }} />}
              <Routes>
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/language" element={<LanguageSelect />} />
                <Route path="/notification-permission" element={<NotificationPermission />} />
                <Route path="/login" element={<Login />} />
                <Route path="/login/mobile" element={<MobileLogin />} />
                <Route path="/verify-otp" element={<VerifyOtp />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/account-created" element={<AccountCreated />} />

                <Route path="/" element={<FirstRun><Home /></FirstRun>} />
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
              <CookieBanner />
            </CompareProvider>
          </FavoritesProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
