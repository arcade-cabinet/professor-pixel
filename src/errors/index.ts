// Hand-curated barrel. `ErrorPattern` lives in educational.ts (RegExp-based
// pattern matcher) and is not re-exported because the only consumer imports
// it directly from './educational'.
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
