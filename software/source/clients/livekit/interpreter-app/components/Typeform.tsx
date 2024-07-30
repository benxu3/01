import React from 'react';
import { WebView } from 'react-native-webview';

const TypeformEmbed = () => {
  const typeformUrl = "https://0ggfznkwh4j.typeform.com/to/fXVezM5w";

  return (
    <WebView
      source={{ uri: typeformUrl }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
};

export default TypeformEmbed;
