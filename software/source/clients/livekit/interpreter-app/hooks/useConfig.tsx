import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

export type AppConfig = {
  title: string;
  description: string;
  github_link?: string;
  video_fit?: "cover" | "contain";
  settings: UserSettings;
  show_qr?: boolean;
};

export type UserSettings = {
  editable: boolean;
  theme_color: string;
  chat: boolean;
  inputs: {
    camera: boolean;
    mic: boolean;
  };
  outputs: {
    audio: boolean;
    video: boolean;
  };
  ws_url: string;
  token: string;
};

const defaultConfig: AppConfig = {
  title: "LiveKit Agents Playground",
  description: "A playground for testing LiveKit Agents",
  video_fit: "cover",
  settings: {
    editable: true,
    theme_color: "cyan",
    chat: true,
    inputs: {
      camera: true,
      mic: true,
    },
    outputs: {
      audio: true,
      video: true,
    },
    ws_url: "",
    token: "",
  },
  show_qr: false,
};

const useAppConfig = (): AppConfig => {
  return useMemo(() => {
    const appConfig = Constants.expoConfig?.extra?.APP_CONFIG;
    if (appConfig) {
      try {
        const parsedConfig = JSON.parse(appConfig) as AppConfig;
        if (parsedConfig.settings === undefined) {
          parsedConfig.settings = defaultConfig.settings;
        }
        if (parsedConfig.settings.editable === undefined) {
          parsedConfig.settings.editable = true;
        }
        return parsedConfig;
      } catch (e) {
        console.error("Error parsing app config:", e);
      }
    }
    return defaultConfig;
  }, []);
};

type ConfigData = {
  config: AppConfig;
  setUserSettings: (settings: UserSettings) => void;
};

const ConfigContext = createContext<ConfigData | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const appConfig = useAppConfig();
  const [localColorOverride, setLocalColorOverride] = useState<string | null>(null);
  const url = Linking.useURL();

  const getSettingsFromUrl = useCallback(() => {
    if (!appConfig.settings.editable) {
      return null;
    }
    try {
      const parsedUrl = Linking.parse(url || '');
      const params = parsedUrl.queryParams || {};
      return {
        editable: true,
        chat: params.chat === '1',
        theme_color: params.theme_color as string,
        inputs: {
          camera: params.cam === '1',
          mic: params.mic === '1',
        },
        outputs: {
          audio: params.audio === '1',
          video: params.video === '1',
          chat: params.chat === '1',
        },
        ws_url: "",
        token: "",
      } as UserSettings;
    } catch (error) {
      console.warn('Error parsing URL:', error);
      return null;
    }
  }, [appConfig, url]);

  const getSettingsFromStorage = useCallback(async () => {
    if (!appConfig.settings.editable) {
      return null;
    }
    const jsonSettings = await AsyncStorage.getItem('lk_settings');
    if (!jsonSettings) {
      return null;
    }
    return JSON.parse(jsonSettings) as UserSettings;
  }, [appConfig]);

  const setStorageSettings = useCallback(async (us: UserSettings) => {
    const json = JSON.stringify(us);
    await AsyncStorage.setItem('lk_settings', json);
  }, []);

  const getConfig = useCallback(async () => {
    if (!appConfig.settings.editable) {
      if (localColorOverride) {
        appConfig.settings.theme_color = localColorOverride;
      }
      return appConfig;
    }
    const storageSettings = await getSettingsFromStorage();
    const urlSettings = getSettingsFromUrl();
    if (!storageSettings && urlSettings) {
      await setStorageSettings(urlSettings);
    }
    const newStorageSettings = await getSettingsFromStorage();
    if (!newStorageSettings) {
      return appConfig;
    }
    appConfig.settings = newStorageSettings;
    return { ...appConfig };
  }, [appConfig, getSettingsFromStorage, getSettingsFromUrl, localColorOverride, setStorageSettings]);

  const setUserSettings = useCallback(async (settings: UserSettings) => {
    if (!appConfig.settings.editable) {
      setLocalColorOverride(settings.theme_color);
      return;
    }
    await setStorageSettings(settings);
    _setConfig((prev) => ({
      ...prev,
      settings: settings,
    }));
  }, [appConfig, setStorageSettings]);

  const [config, _setConfig] = useState<AppConfig>(appConfig);

  useEffect(() => {
    getConfig().then(_setConfig);
  }, [getConfig]);

  return (
    <ConfigContext.Provider value={{ config, setUserSettings }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = React.useContext(ConfigContext);
  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};
