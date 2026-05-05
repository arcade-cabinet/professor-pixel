import { Switch, Route, useLocation } from 'wouter';
import { useEffect } from 'react';
import { queryClient } from '@lib/net/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppErrorBoundary, PageErrorBoundary } from '@/components/error-boundary';
import { globalErrorHandler } from '@lib/errors/global-handler';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import LessonPage from '@/pages/lesson';
import PixelPresence from '@/components/pixel/presence';
import UniversalWizard from '@/components/wizard/universal';
import AssetLibraryTest from '@/pages/_dev/asset-library';
import PygamePreviewTest from '@/pages/_dev/pygame-preview';
import PersistenceTest from '@/pages/_dev/persistence';

function Router() {
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
        path="/asset-test"
        component={() => (
          <PageErrorBoundary context="Asset Library Test">
            <AssetLibraryTest />
          </PageErrorBoundary>
        )}
      />
      <Route
        path="/pygame-preview-test"
        component={() => (
          <PageErrorBoundary context="Pygame Preview Test">
            <PygamePreviewTest />
          </PageErrorBoundary>
        )}
      />
      <Route
        path="/persistence-test"
        component={() => (
          <PageErrorBoundary context="Persistence Test">
            <PersistenceTest />
          </PageErrorBoundary>
        )}
      />
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
          </>
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
