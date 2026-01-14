import { TeamMember } from './types';

// Public build: defaults are intentionally empty so users can plug in their own data.
// This avoids shipping any third‑party or client-specific information.

// Team member data sent to AI (with descriptions, no images)
export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [];

// Image URLs for UI display only (not sent to AI)
export const TEAM_MEMBER_IMAGES: Record<number, string> = {};

export const DEFAULT_CASE_STUDIES: any[] = [];

export const DEFAULT_AWARDS: any[] = [];

// Intro cards data for hero-banner component
export const DEFAULT_INTRO_CARDS: any[] = [];

export const DEFAULT_SERVICES: any[] = [];

