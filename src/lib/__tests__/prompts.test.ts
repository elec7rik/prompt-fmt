import { describe, it, expect } from 'vitest';
import {
  getSystemPrompt,
  CONCISE_SYSTEM_PROMPT,
  DETAILED_SYSTEM_PROMPT,
} from '../prompts.js';

describe('prompts', () => {
  describe('getSystemPrompt', () => {
    it('returns concise prompt when detailed is false', () => {
      const result = getSystemPrompt(false);
      expect(result).toBe(CONCISE_SYSTEM_PROMPT);
    });

    it('returns detailed prompt when detailed is true', () => {
      const result = getSystemPrompt(true);
      expect(result).toBe(DETAILED_SYSTEM_PROMPT);
    });

    it('appends project context when provided', () => {
      const context = 'Project Context:\n- Language: typescript';
      const result = getSystemPrompt(false, context);

      expect(result).toContain(CONCISE_SYSTEM_PROMPT);
      expect(result).toContain(context);
      expect(result).toContain('Use the project context above');
    });

    it('does not append context when not provided', () => {
      const result = getSystemPrompt(true);
      expect(result).not.toContain('Project Context');
      expect(result).toBe(DETAILED_SYSTEM_PROMPT);
    });
  });

  describe('CONCISE_SYSTEM_PROMPT', () => {
    it('contains bullet point formatting instructions', () => {
      expect(CONCISE_SYSTEM_PROMPT).toContain('hyphenated bullet points');
    });

    it('contains examples', () => {
      expect(CONCISE_SYSTEM_PROMPT).toContain('Input:');
      expect(CONCISE_SYSTEM_PROMPT).toContain('Output:');
    });

    it('limits to 3-4 bullet points', () => {
      expect(CONCISE_SYSTEM_PROMPT).toContain('3-4 bullet points maximum');
    });
  });

  describe('DETAILED_SYSTEM_PROMPT', () => {
    it('contains the 7 core principles', () => {
      expect(DETAILED_SYSTEM_PROMPT).toContain('BE SPECIFIC');
      expect(DETAILED_SYSTEM_PROMPT).toContain('BE EXPLICIT');
      expect(DETAILED_SYSTEM_PROMPT).toContain('GUIDE THE HOW');
      expect(DETAILED_SYSTEM_PROMPT).toContain('DEFINE SCOPE');
      expect(DETAILED_SYSTEM_PROMPT).toContain('REFERENCE PATTERNS');
      expect(DETAILED_SYSTEM_PROMPT).toContain('REQUEST PLANNING');
      expect(DETAILED_SYSTEM_PROMPT).toContain('INCLUDE CONSTRAINTS');
    });

    it('contains bullet point formatting instructions', () => {
      expect(DETAILED_SYSTEM_PROMPT).toContain('hyphenated bullet points');
    });

    it('contains out-of-scope examples', () => {
      expect(DETAILED_SYSTEM_PROMPT).toContain('Out of scope:');
    });
  });
});
