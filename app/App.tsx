import { Switch, Route, useLocation } from 'wouter';
import { useEffect } from 'react';
import { queryClient } from '@lib/net/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppErrorBoundary, PageErrorBoundary } from '@/components/error-boundary';
import { globalErrorHandler } from '@lib/errors/global-handler';
import { useDebugFlag } from '@lib/hooks/use-debug-flag';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import LessonPage from '@/pages/lesson';
import LessonsIndex from '@/pages/lessons';
import PlayPage from '@/pages/play';
import Profile from '@/pages/profile';
import PixelPresence from '@/components/pixel/presence';
import UniversalWizard from '@/components/wizard/universal';
import { DevHud } from '@/components/dev-hud';
import AssetLibraryTest from '@/pages/_dev/asset-library';
import PygamePreviewTest from '@/pages/_dev/pygame-preview';
import PersistenceTest from '@/pages/_dev/persistence';

function Router() {
  // _dev/ pages (asset-test, pygame-preview-test, persistence-test) only mount
  // behind the debug flag (?debug=1 or localStorage.debug='1'). They're internal
  // engineering screens — kids and search-engine crawlers should not be able to
  // reach them by URL guess in production.
  const debugEnabled = useDebugFlag();

  return (
    <Switch>
      <Route
        path="/"
        component={() => (
          <PageErrorBoundary context="Home Page">
            <Home />
          </PageErrorBoundary>
        )}
      />
      <Route
        path="/lessons"
        component={() => (
          <PageErrorBoundary context="Lessons Index">
            <LessonsIndex />
          </PageErrorBoundary>
        )}
      />
      <Route
        path="/lesson/:lessonId"
        component={() => (
          <PageErrorBoundary context="Lesson Page">
            <LessonPage />
          </PageErrorBoundary>
        )}
      />
      <Route
        path="/wizard"
        component={() => (
          <PageErrorBoundary context="Universal Wizard">
            <UniversalWizard />
          </PageErrorBoundary>
        )}
      />
      <Route
        path="/game-wizard"
        component={() => (
          <PageErrorBoundary context="Game Development Wizard">
            <UniversalWizard flowType="game-dev" />
          </PageErrorBoundary>
        )}
      />
      <Route
        path="/play/:projectId"
        component={() => (
          <PageErrorBoundary context="Play Page">
            <PlayPage />
          </PageErrorBoundary>
        )}
      />
      <Route
        path="/profile"
        component={() => (
          <PageErrorBoundary context="Profile Page">
            <Profile />
          </PageErrorBoundary>
        )}
      />
      {debugEnabled && (
        <Route
          path="/asset-test"
          component={() => (
            <PageErrorBoundary context="Asset Library Test">
              <AssetLibraryTest />
            </PageErrorBoundary>
          )}
        />
      )}
      {debugEnabled && (
        <Route
          path="/pygame-preview-test"
          component={() => (
            <PageErrorBoundary context="Pygame Preview Test">
              <PygamePreviewTest />
            </PageErrorBoundary>
          )}
        />
      )}
      {debugEnabled && (
        <Route
          path="/persistence-test"
          component={() => (
            <PageErrorBoundary context="Persistence Test">
              <PersistenceTest />
            </PageErrorBoundary>
          )}
        />
      )}
      <Route
        component={() => (
          <PageErrorBoundary context="Not Found Page">
            <NotFound />
          </PageErrorBoundary>
        )}
      />
    </Switch>
  );
}

function App() {
  const [location, setLocation] = useLocation();

  // Initialize global error handling
  useEffect(() => {
    // Ensure global error handler is initialized
    globalErrorHandler.initialize();
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <>
            <Toaster />
            <Router />
            <PixelPresence onNavigate={setLocation} currentPath={location} />
            <DevHud />
          </>
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
