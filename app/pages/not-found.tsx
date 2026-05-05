// 404 — friendly dead-end. Mistyped URLs and stale bookmarks land here;
// kids need warmth + two clear escape hatches (home + lessons), not a stack
// trace or "did you forget to add the page to the router?" dev-mode copy.

import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SafeImage from '@/components/ui/safe-image';
import { strings } from '@lib/i18n';
import pixelConfused from '@assets/pixel/Pixel_confused_puzzled_expression_843c04f4.png';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950 px-4">
      <Card className="w-full max-w-md p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-center">
        <SafeImage
          src={pixelConfused}
          alt={strings.notFound.pixelAlt}
          fallbackEmoji="🤔"
          className="w-24 h-24 mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {strings.notFound.title}
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{strings.notFound.body}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
            data-testid="not-found-home"
          >
            <Link href="/">{strings.notFound.home}</Link>
          </Button>
          <Button asChild variant="outline" className="w-full" data-testid="not-found-lessons">
            <Link href="/lessons">{strings.notFound.lessons}</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
