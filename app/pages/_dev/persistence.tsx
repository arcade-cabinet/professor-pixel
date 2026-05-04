import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  saveWizardState,
  loadWizardState,
  saveSessionState,
  loadSessionState,
  saveUserPreferences,
  loadUserPreferences,
  clearWizardState,
  clearSessionState,
  clearAllData,
  setCookie,
  getCookie
} from '@/lib/persistence';

export default function PersistenceTest() {
  const [wizardState, setWizardState] = useState<any>(null);
  const [sessionState, setSessionState] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [testCookie, setTestCookie] = useState<string | null>(null);

  const refreshStates = () => {
    const wizState = loadWizardState();
    const sessState = loadSessionState();
    const prefs = loadUserPreferences();
    const cookie = getCookie('test_cookie');
    
    setWizardState(wizState);
    setSessionState(sessState);
    setPreferences(prefs);
    setTestCookie(cookie);
  };

  useEffect(() => {
    refreshStates();
  }, []);

  const testSaveWizardState = () => {
    saveWizardState({
      version: '1.0.0',
      activeFlowPath: '/test-flow.json',
      currentNodeId: 'test-node-123',
      gameType: 'platformer',
      selectedGameType: 'platformer',
      sessionActions: {
        choices: ['option1', 'option2'],
        createdAssets: ['asset1', 'asset2'],
        gameType: 'platformer',
        currentProject: null,
        completedSteps: ['step1', 'step2'],
        unlockedEditor: true
      },
      updatedAt: new Date().toISOString()
    });
    refreshStates();
  };

  const testSaveSessionState = () => {
    saveSessionState({
      version: '1.0.0',
      uiState: {
        pixelMenuOpen: true,
        embeddedComponent: 'code-editor',
        pixelState: 'minimized',
        wysiwygEditorOpen: false,
        assetBrowserOpen: false,
        assetBrowserType: 'all',
        selectedGameType: 'rpg',
        isMinimizing: false,
        minimizeMessage: 'Test message',
        previewMode: 'full',
        viewMode: 'generated'
      },
      updatedAt: new Date().toISOString()
    });
    refreshStates();
  };

  const testSavePreferences = () => {
    saveUserPreferences({
      theme: 'dark',
      dismissedTips: ['tip1', 'tip2', 'tip3'],
      soundEnabled: false,
      autoSaveEnabled: true
    });
    refreshStates();
  };

  const testSetCookie = () => {
    setCookie('test_cookie', 'Hello from persistence test!', 7);
    refreshStates();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-6">Persistence System Test</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Wizard State (localStorage)</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(wizardState, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Session State (sessionStorage)</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(sessionState, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">User Preferences (cookies)</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(preferences, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="font-semibold mb-2">Test Cookie</h2>
          <pre className="text-xs overflow-auto">
            {testCookie || 'No test cookie set'}
          </pre>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={testSaveWizardState}>Save Test Wizard State</Button>
        <Button onClick={testSaveSessionState}>Save Test Session State</Button>
        <Button onClick={testSavePreferences}>Save Test Preferences</Button>
        <Button onClick={testSetCookie}>Set Test Cookie</Button>
        <Button onClick={() => { clearWizardState(); refreshStates(); }} variant="destructive">
          Clear Wizard State
        </Button>
        <Button onClick={() => { clearSessionState(); refreshStates(); }} variant="destructive">
          Clear Session State
        </Button>
        <Button onClick={() => { clearAllData(); refreshStates(); }} variant="destructive">
          Clear All Data
        </Button>
        <Button onClick={refreshStates} variant="outline">Refresh Display</Button>
      </div>
    </div>
  );
}