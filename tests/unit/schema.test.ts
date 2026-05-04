import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LessonSchema,
  ProjectSchema,
  UserProgressSchema,
  UserSchema,
} from '@lib/types/schema';

describe('Zod schemas', () => {
  it('validates a well-formed user', () => {
    expect(() =>
      UserSchema.parse({ id: 'u1', username: 'pixel-fan' }),
    ).not.toThrow();
  });

  it('rejects users missing required fields with field-path detail', () => {
    const result = UserSchema.safeParse({ id: 'u1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('username');
    }
  });

  it('rejects unknown fields (strict mode) on Lesson', () => {
    const lesson = {
      id: 'l1',
      title: 't',
      description: 'd',
      order: 0,
      content: {
        introduction: 'i',
        steps: [
          {
            id: 's1',
            title: 'st',
            description: 'sd',
            initialCode: '',
            solution: '',
            hints: [],
          },
        ],
      },
      vibes: 'unexpected', // strict mode catches this
    };
    expect(LessonSchema.safeParse(lesson).success).toBe(false);
  });

  it('rejects malformed lessons with structured error pointing at the field', () => {
    const result = LessonSchema.safeParse({
      id: 'l1',
      title: 't',
      description: 'd',
      order: 'oops',
      content: { introduction: 'i', steps: [] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('order');
    }
  });

  it('coerces ISO strings to Date on Project.createdAt', () => {
    const parsed = ProjectSchema.parse({
      id: 'p1',
      userId: 'u1',
      name: 'demo',
      template: 'platformer',
      published: false,
      createdAt: '2026-05-04T19:00:00Z',
      files: [],
      assets: [],
    });
    expect(parsed.createdAt).toBeInstanceOf(Date);
  });

  it('roundtrips UserProgress', () => {
    const data = {
      id: 'pg1',
      userId: 'u1',
      lessonId: 'l1',
      currentStep: 2,
      completed: false,
    };
    expect(UserProgressSchema.parse(data)).toEqual(data);
  });

  it('parses the shipped public/api/static/lessons.json', () => {
    const path = resolve(
      __dirname,
      '..',
      '..',
      'public/api/static/lessons.json',
    );
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    const parsed = LessonSchema.array().safeParse(raw);
    if (!parsed.success) {
      // surface the first error so the test failure is actionable
      const first = parsed.error.issues[0];
      throw new Error(
        `lessons.json failed validation at ${first.path.join('.')}: ${first.message}`,
      );
    }
    expect(parsed.data.length).toBeGreaterThan(0);
  });
});
