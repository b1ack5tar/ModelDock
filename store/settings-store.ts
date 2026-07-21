import { create } from 'zustand';
import type { AppSettings, ProviderConfig } from '@/lib/types';
import { getDB, getSettings, saveSettings, getProviders, saveProvider, deleteProvider } from '@/lib/db';
import { DEFAULT_SETTINGS, isBuiltInProvider } from '@/lib/constants';

interface SettingsStore {
  settings: AppSettings;
  providers: ProviderConfig[];
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  addProvider: (provider: ProviderConfig) => Promise<void>;
  updateProvider: (id: string, partial: Partial<ProviderConfig>) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  setApiKey: (providerId: string, apiKey: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  providers: [],
  isHydrated: false,

  hydrate: async () => {
    try {
      await getDB().initializeDefaults();
      const [settings, providers] = await Promise.all([getSettings(), getProviders()]);
      set({ settings: settings || { ...DEFAULT_SETTINGS }, providers, isHydrated: true });
    } catch (err) {
      console.error('Failed to hydrate settings store:', err);
      set({ isHydrated: true });
    }
  },

  updateSettings: async (partial) => {
    const next = { ...get().settings, ...partial };
    set({ settings: next });
    await saveSettings(next);
  },

  addProvider: async (provider) => {
    set((state) => ({ providers: [...state.providers, provider] }));
    await saveProvider(provider);
  },

  updateProvider: async (id, partial) => {
    const providers = get().providers;
    const idx = providers.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const next = { ...providers[idx], ...partial };
    set({ providers: providers.map((p) => (p.id === id ? next : p)) });
    await saveProvider(next);
  },

  removeProvider: async (id) => {
    if (isBuiltInProvider(id)) return;

    const providers = get().providers.filter((provider) => provider.id !== id);
    let settings = get().settings;

    if (settings.defaultProvider === id) {
      const fallback = providers.find((provider) => provider.models.length > 0);
      if (fallback) {
        settings = {
          ...settings,
          defaultProvider: fallback.id,
          defaultModel: fallback.models[0].id,
        };
      }
    }

    set({ providers, settings });
    await Promise.all([deleteProvider(id), saveSettings(settings)]);
  },

  setApiKey: async (providerId, apiKey) => {
    await get().updateProvider(providerId, { apiKey });
  },
}));
