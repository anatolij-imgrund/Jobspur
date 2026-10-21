import type { Status } from '@/types/application';

import { useResolvedScheme } from './appearance';


/**
 * Kühles Papierweiß, tiefe Tinte, Tannengrün als einziger Akzent.
 * Statusfarben sind gedämpft, damit die Liste ruhig bleibt.
 */
const light = {
  background: '#F3F6F5',
  surface: '#FFFFFF',
  ink: '#16211E',
  muted: '#5F6F6A',
  line: '#DCE3E0',
  accent: '#1F6B57',
  accentInk: '#FFFFFF',
  accentSoft: '#E1EEE9',
  danger: '#A23B30',
  status: {
    applied: { fg: '#3E5468', bg: '#E6ECF1' },
    confirmed: { fg: '#3E5468', bg: '#E6ECF1' },
    interview: { fg: '#8A5A12', bg: '#F6EBD7' },
    offer: { fg: '#1F6B57', bg: '#DDEFE7' },
    rejected: { fg: '#8E3B32', bg: '#F5E3E0' },
    no_response: { fg: '#5F6F6A', bg: '#ECEFEE' },
  } satisfies Record<Status, { fg: string; bg: string }>,
};

const dark: typeof light = {
  background: '#0F1513',
  surface: '#18201D',
  ink: '#E6EEEB',
  muted: '#93A39E',
  line: '#2A3531',
  accent: '#5EBFA3',
  accentInk: '#0F1513',
  accentSoft: '#1E3530',
  danger: '#E8988D',
  status: {
    applied: { fg: '#A9BFD2', bg: '#223039' },
    confirmed: { fg: '#A9BFD2', bg: '#223039' },
    interview: { fg: '#E5BE7A', bg: '#3A2E1B' },
    offer: { fg: '#7FD3B8', bg: '#1C3A31' },
    rejected: { fg: '#E39B91', bg: '#3D2522' },
    no_response: { fg: '#93A39E', bg: '#253029' },
  },
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useResolvedScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 12, pill: 999 } as const;
export const type = {
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  small: { fontSize: 13, fontWeight: '400' },
  label: { fontSize: 12, fontWeight: '600' },
} as const;
