import { Outlet, type RouteObject } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import PageTransition from './components/PageTransition';
import Header from './components/Header';
import MobileTabBar from './components/MobileTabBar';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import HomeView from './pages/HomeView';
import LoginView from './pages/LoginView';
import SignupView from './pages/SignupView';
import WelcomeView from './pages/WelcomeView';
import EpisodeView from './pages/EpisodeView';
import ActivityView from './pages/ActivityView';
import LessonView from './pages/LessonView';
import CharacterLessonListView from './pages/CharacterLessonListView';
import CharacterLessonView from './pages/CharacterLessonView';
import SentenceJourneyListView from './pages/SentenceJourneyListView';
import SentenceJourneyView from './pages/SentenceJourneyView';
import LeaderboardView from './pages/LeaderboardView';
import ProfileView from './pages/ProfileView';
import AdminView from './pages/AdminView';

function ShellLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <MobileTabBar />
      <footer className="hidden sm:block border-t border-gray-100 bg-white py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-400">
          CSG — Learn Chinese With Vlog, Step By Step
        </div>
      </footer>
    </div>
  );
}

function EpisodeLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ScrollToTop />
      <main className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginView /> },
  { path: '/signup', element: <SignupView /> },
  {
    path: '/',
    element: <ShellLayout />,
    children: [
      { index: true, element: <HomeView /> },
      { path: 'welcome', element: <ProtectedRoute><WelcomeView /></ProtectedRoute> },
      { path: 'leaderboard', element: <LeaderboardView /> },
      { path: 'profile', element: <ProtectedRoute><ProfileView /></ProtectedRoute> },
      { path: 'admin', element: <AdminRoute><AdminView /></AdminRoute> },
      { path: 'lesson/:id', element: <ProtectedRoute><LessonView /></ProtectedRoute> },
    ],
  },
  {
    path: '/episode',
    element: <EpisodeLayout />,
    children: [
      { path: ':id', element: <ProtectedRoute><EpisodeView /></ProtectedRoute> },
      { path: ':id/activity/character', element: <ProtectedRoute><CharacterLessonListView /></ProtectedRoute> },
      { path: ':id/activity/character/lesson/:lessonId', element: <ProtectedRoute><CharacterLessonView /></ProtectedRoute> },
      { path: ':id/activity/sentence', element: <ProtectedRoute><SentenceJourneyListView /></ProtectedRoute> },
      { path: ':id/activity/sentence/lesson/:lessonId', element: <ProtectedRoute><SentenceJourneyView /></ProtectedRoute> },
      { path: ':id/activity/:activity', element: <ProtectedRoute><ActivityView /></ProtectedRoute> },
    ],
  },
  {
    path: '*',
    element: <ShellLayout />,
    children: [
      { index: true, element: <HomeView /> },
    ],
  },
];
