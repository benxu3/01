import React, { ReactNode, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const titleHeight = 32;

type PlaygroundTileProps = {
  title?: string;
  children?: ReactNode;
  style?: object;
  childrenStyle?: object;
  padding?: boolean;
  backgroundColor?: string;
};

export type PlaygroundTab = {
  title: string;
  content: ReactNode;
};

export type PlaygroundTabbedTileProps = {
  tabs: PlaygroundTab[];
  initialTab?: number;
} & PlaygroundTileProps;

export const PlaygroundTile: React.FC<PlaygroundTileProps> = ({
  children,
  title,
  style,
  childrenStyle,
  padding = true,
  backgroundColor = 'transparent',
}) => {
  const contentPadding = padding ? 16 : 0;
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {title && (
        <View style={[styles.titleContainer, { height: titleHeight }]}>
          <Text style={styles.titleText}>{title.toUpperCase()}</Text>
        </View>
      )}
      <View
        style={[
          styles.childrenContainer,
          {
            height: title ? `${100 - (titleHeight / 5)}%` : '100%',
            padding: contentPadding,
          },
          childrenStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

export const PlaygroundTabbedTile: React.FC<PlaygroundTabbedTileProps> = ({
  tabs,
  initialTab = 0,
  style,
  childrenStyle,
  backgroundColor = 'transparent',
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (activeTab >= tabs.length) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <View style={[styles.tabContainer, { height: titleHeight }]}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.tabButton,
              index === activeTab && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab(index)}
          >
            <Text
              style={[
                styles.tabButtonText,
                index === activeTab && styles.activeTabButtonText,
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View
        style={[
          styles.tabContentContainer,
          { height: `${100 - (titleHeight / 5)}%` },
          childrenStyle,
        ]}
      >
        {tabs[activeTab].content}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  titleText: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#6b7280',
    letterSpacing: 1,
  },
  childrenContainer: {
    flex: 1,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#1f2937',
  },
  activeTabButton: {
    backgroundColor: '#111827',
  },
  tabButtonText: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  activeTabButtonText: {
    color: '#d1d5db',
  },
  tabContentContainer: {
    flex: 1,
    padding: 16,
  },
});
