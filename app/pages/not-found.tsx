// 404 — friendly dead-end. Mistyped URLs and stale bookmarks land here;
// kids need warmth + two clear escape hatches (home + lessons), not a stack
// trace or "did you forget to add the page to the router?" dev-mode copy.

import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import pixelConfused from '@assets/pixel/Pixel_confused_puzzled_expression_843c04f4.png';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950 px-4">
      <Card className="w-full max-w-md p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-center">
        <img src={pixelConfused} alt="Pixel looking confused" className="w-24 h-24 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          That page wandered off!
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Pixel can&apos;t find this one — but don&apos;t worry, let&apos;s get you back to
          building!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
              data-testid="not-found-home"
            >
              Back to Home
            </Button>
          </Link>
          <Link href="/lessons">
            <Button variant="outline" className="w-full" data-testid="not-found-lessons">
              Go to Lessons
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
