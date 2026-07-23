import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  DeviceEventEmitter,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import { AppColorTokens } from "@/constants/theme";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const makeVlibrasHtml = (colors: AppColorTokens) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html {
      width: 100%; height: 100%;
      background: ${colors.surface};
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #status {
      color: ${colors.text.secondary}; font-family: sans-serif; text-align: center;
      position: absolute; width: 100%; top: 40%; z-index: 9999;
    }
    
    /* Centraliza e escala o avatar para o tamanho da pequena janela */
    [vw] {
      left: 30% !important;
      top: 40% !important;
      transform: translate(-50%, -50%) !important;
    }
    
    .vpw-header, .vpw-close-btn, .vpw-settings-btn,
    .vw-plugin-top-wrapper { display: none !important; }
  </style>
</head>
<body>
  <p id="status">...</p>
  <div vw class="enabled">
    <div vw-access-button class="active"></div>
    <div vw-plugin-wrapper>
      <div class="vw-plugin-top-wrapper"></div>
    </div>
  </div>

  <script src="https://vlibras.gov.br/app/vlibras-plugin.js"></script>
  <script>
    // Suprime TOTALMENTE alertas e erros de console que poluem a tela
    (function() {
      window.alert = function() {};
      window.onerror = function() { return true; };
      console.error = function() {};
      console.warn = function() {};
    })();

    var widget = new window.VLibras.Widget('https://vlibras.gov.br/app');

    function openPlayer() {
      var accessBtn = document.querySelector('[vw-access-button]');
      var wrapper = document.querySelector('[vw-plugin-wrapper]');
      var vwEl = document.querySelector('[vw]');
      
      if (!accessBtn || !wrapper) return;

      accessBtn.classList.add('active');
      wrapper.classList.add('active');
      if (vwEl) vwEl.classList.add('active');
      accessBtn.style.setProperty('display', 'none', 'important');
      
      var waitPlugin = setInterval(function() {
        if (window.VLibras && window.VLibras.Plugin) {
          clearInterval(waitPlugin);
          if (!window.plugin) {
            window.plugin = new window.VLibras.Plugin({
              enableMoveWindow: false,
              enableWelcome: false,
              wrapper: wrapper,
              position: 'L',
              rootPath: 'https://vlibras.gov.br/app/',
              opacity: 1,
              avatar: 'icaro'
            });
          }
          
          var waitCanvas = setInterval(function() {
            var canvas = document.querySelector('canvas');
            if (canvas) {
              clearInterval(waitCanvas);
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
            }
          }, 300);
        }
      }, 300);
    }

    var checkReady = setInterval(function() {
      var accessBtn = document.querySelector('[vw-access-button]');
      if (accessBtn) {
        clearInterval(checkReady);
        document.getElementById('status').style.display = 'none';
        accessBtn.click();
        setTimeout(openPlayer, 300);
      }
    }, 300);

    function translateText(text) {
      try {
        if (window.plugin && window.plugin.player) {
          window.plugin.player.translate(text);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translating' }));
        } else {
          // Fallback: se o plugin não estiver 100%, tenta usar o disparador padrão do widget
          var el = document.getElementById('translate-source');
          if (el) {
             el.innerText = text;
             // Força um clique ou evento de tradução se possível
             var btn = document.querySelector('.vw-text-widget-button');
             if (btn) btn.click();
          }
        }
      } catch (e) {}
    }
  </script>
</body>
</html>
`;

export const VLibrasController = {
  translate: (text: string) => {
    if (!text) return;
    DeviceEventEmitter.emit("VLIBRAS_TRANSLATE", text);
  },
  show: () => {
    DeviceEventEmitter.emit("VLIBRAS_SHOW");
  },
  // Oculta/reexibe o botão flutuante — usado quando um modal abre por cima,
  // pois o botão (bottom/right, zIndex alto) capturava toques do modal.
  setButtonHidden: (hidden: boolean) => {
    DeviceEventEmitter.emit("VLIBRAS_HIDE_BUTTON", hidden);
  },
};

export default function GlobalVLibras() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => makeVLibrasStyles(colors), [colors]);
  const vlibrasHtml = React.useMemo(() => makeVlibrasHtml(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [buttonHidden, setButtonHidden] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const pathname = usePathname();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Posição da janela (deslocamento a partir do canto inferior direito).
  // pan.x negativo move para a esquerda; pan.y negativo move para cima.
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  // Guarda o deslocamento acumulado entre gestos de arraste.
  const panOffset = useRef({ x: 0, y: 0 });

  // Limites de movimento para manter a janela dentro da tela.
  // Posição base: bottom 100, right 20, janela de 220x300.
  const WINDOW_W = 220;
  const WINDOW_H = 300;
  const BASE_RIGHT = 20;
  const BASE_BOTTOM = 100;
  const minX = -(screenWidth - WINDOW_W - BASE_RIGHT); // até a borda esquerda
  const maxX = BASE_RIGHT; // até a borda direita
  const minY = -(screenHeight - WINDOW_H - BASE_BOTTOM); // até o topo
  const maxY = BASE_BOTTOM; // até a borda inferior

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        pan.setOffset({ x: panOffset.current.x, y: panOffset.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_evt, gesture) => {
        const nextX = clamp(panOffset.current.x + gesture.dx, minX, maxX);
        const nextY = clamp(panOffset.current.y + gesture.dy, minY, maxY);
        pan.setValue({ x: nextX - panOffset.current.x, y: nextY - panOffset.current.y });
      },
      onPanResponderRelease: (_evt, gesture) => {
        panOffset.current = {
          x: clamp(panOffset.current.x + gesture.dx, minX, maxX),
          y: clamp(panOffset.current.y + gesture.dy, minY, maxY),
        };
        pan.flattenOffset();
      },
    })
  ).current;

  // Hides button on transcription to avoid redundancy
  const isTranscriptionScreen = pathname === "/transcription" || pathname === "/(tabs)/transcription";

  const handleTranslate = useCallback((text: string) => {
    if (!visible) {
      // Se não estiver visível, ignoramos a solicitação de tradução dos textos clicados
      return;
    }
    
    if (isReady && webViewRef.current) {
      const escaped = text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
      webViewRef.current.injectJavaScript(`translateText('${escaped}'); true;`);
    } else {
      setPendingText(text);
    }
  }, [visible, isReady]);

  const showWidget = () => {
    setVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideWidget = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  useEffect(() => {
    const subTranslate = DeviceEventEmitter.addListener("VLIBRAS_TRANSLATE", handleTranslate);
    const subShow = DeviceEventEmitter.addListener("VLIBRAS_SHOW", showWidget);
    const subHide = DeviceEventEmitter.addListener("VLIBRAS_HIDE_BUTTON", (hidden: boolean) =>
      setButtonHidden(hidden)
    );
    return () => {
      subTranslate.remove();
      subShow.remove();
      subHide.remove();
    };
  }, [handleTranslate]);

  useEffect(() => {
    if (visible && isReady && pendingText && webViewRef.current) {
      const escaped = pendingText.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
      webViewRef.current.injectJavaScript(`translateText('${escaped}'); true;`);
      setPendingText(null);
    }
  }, [visible, isReady, pendingText]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") setIsReady(true);
    } catch (e) {}
  };

  if (!visible) {
    if (isTranscriptionScreen || buttonHidden) return null;
    return (
      <View style={styles.container} pointerEvents="box-none">
        <TouchableOpacity style={styles.floatingBtn} onPress={showWidget} activeOpacity={0.8}>
          {/* Ícone escuro fixo por design: o fundo do botão é sempre ciano nos dois temas */}
          <MaterialIcons name="sign-language" size={28} color="#081018" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {visible && (
        <Animated.View
          style={[
            styles.window,
            {
              opacity: fadeAnim,
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
            },
          ]}
        >
          <View style={styles.windowHeader} {...panResponder.panHandlers}>
            <MaterialIcons name="drag-indicator" size={16} color={colors.text.secondary} />
            <MaterialIcons name="accessibility" size={14} color={colors.primary} />
            <Text style={styles.windowTitle}>Acessibilidade</Text>
            <TouchableOpacity onPress={hideWidget} style={styles.closeBtn}>
              <MaterialIcons name="close" size={18} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.webviewContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: vlibrasHtml }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={handleMessage}
              scrollEnabled={false}
            />
            {!isReady && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function makeVLibrasStyles(colors: AppColorTokens) {
  return StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  floatingBtn: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    zIndex: 9999,
  },
  window: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 220,
    height: 300,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.primary,
    elevation: 10,
  },
  windowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceAlt,
    gap: 6,
  },
  windowTitle: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: "bold",
    flex: 1,
  },
  closeBtn: {
    padding: 2,
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  });
}
