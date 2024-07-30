import React, { createContext, useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';


export type AppConfig = {
  title: string;
  description: string;
  settings: UserSettings;
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
  title: "01 App",
  description: "Talk to Open Interpreter!",
  settings: {
    editable: false,
    theme_color: "cyan",
    chat: true,
    inputs: {
      camera: false,
      mic: true,
    },
    outputs: {
      audio: true,
      video: false,
    },
    ws_url: "",
    token: "",
  },
};

const useAppConfig = (): AppConfig => {
  return defaultConfig;
};

type ConfigData = {
  config: AppConfig;
  setUserSettings: (settings: UserSettings) => void;
};

const ConfigContext = createContext<ConfigData | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const appConfig = useAppConfig();

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
    const newStorageSettings = await getSettingsFromStorage();
    if (!newStorageSettings) {
      return appConfig;
    }
    appConfig.settings = newStorageSettings;
    return { ...appConfig };
  }, [appConfig, getSettingsFromStorage]);

  const setUserSettings = useCallback(async (settings: UserSettings) => {
    await setStorageSettings(settings);
    _setConfig((prev) => ({
      ...prev,
      settings: settings,
    }));
  }, [setStorageSettings]);

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
