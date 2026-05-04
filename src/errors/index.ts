// Hand-curated barrel. `ErrorPattern` is defined differently in
// `educational.ts` (RegExp-based pattern matcher) and `tracker.ts`
// (analytics aggregate). `errorTracker` is defined in both `tracker.ts`
// (the canonical analytics instance) and `global-handler.ts` (a thin
// adapter). The collisions are resolved explicitly below.

// `ErrorPattern` is local to educational.ts (not re-exported to avoid
// collision with the analytics ErrorPattern in tracker.ts).
export {
  educationalErrorTransformer,
  transformError,
  getEducationalError,
  getContextualHelp,
  getSyntaxHelp,
  getPygameHelp,
  getDebuggingTips,
  type EducationalError,
} from './educational';
export {
  globalErrorHandler,
  trackNetworkError,
  trackCustomError,
  debugUtils,
  type GlobalError,
  type ErrorTracker,
} from './global-handler';
export * from './tracker';
