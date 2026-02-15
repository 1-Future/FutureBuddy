import { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export interface XTermHandle {
  write(data: string): void;
  resize(cols: number, rows: number): void;
}

interface Props {
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  fontSize?: number;
}

const XTERM_HTML = (fontSize: number) => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; overflow:hidden; background:#0c0c0c; }
  #terminal { width:100%; height:100%; }
  .xterm { height:100%; }
</style>
</head>
<body>
<div id="terminal"></div>
<script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.11.0/lib/addon-web-links.min.js"></script>
<script>
(function() {
  var term = new Terminal({
    fontSize: ${fontSize},
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: '#0c0c0c',
      foreground: '#e2e8f0',
      cursor: '#e2e8f0',
      cursorAccent: '#0c0c0c',
      selectionBackground: 'rgba(255,255,255,0.2)',
      black: '#0c0c0c',
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      blue: '#3b82f6',
      magenta: '#a855f7',
      cyan: '#06b6d4',
      white: '#e2e8f0',
      brightBlack: '#6b7280',
      brightRed: '#f87171',
      brightGreen: '#4ade80',
      brightYellow: '#facc15',
      brightBlue: '#60a5fa',
      brightMagenta: '#c084fc',
      brightCyan: '#22d3ee',
      brightWhite: '#f8fafc',
    },
    cursorBlink: true,
    scrollback: 5000,
    allowProposedApi: true,
  });

  var fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon.WebLinksAddon());

  term.open(document.getElementById('terminal'));

  setTimeout(function() {
    fitAddon.fit();
    sendMsg('resize', { cols: term.cols, rows: term.rows });
  }, 100);

  term.onData(function(data) {
    sendMsg('data', { data: data });
  });

  var ro = new ResizeObserver(function() {
    try {
      fitAddon.fit();
      sendMsg('resize', { cols: term.cols, rows: term.rows });
    } catch(e) {}
  });
  ro.observe(document.getElementById('terminal'));

  window.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'write') term.write(msg.data);
      else if (msg.type === 'resize') { term.resize(msg.cols, msg.rows); fitAddon.fit(); }
      else if (msg.type === 'clear') term.clear();
    } catch(err) {}
  });

  document.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'write') term.write(msg.data);
      else if (msg.type === 'resize') { term.resize(msg.cols, msg.rows); fitAddon.fit(); }
      else if (msg.type === 'clear') term.clear();
    } catch(err) {}
  });

  function sendMsg(type, payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, ...payload }));
  }

  sendMsg('ready', {});
})();
</script>
</body>
</html>`;

export const XTermView = forwardRef<XTermHandle, Props>(function XTermView(
  { onData, onResize, fontSize = 13 },
  ref,
) {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    write(data: string) {
      webViewRef.current?.postMessage(
        JSON.stringify({ type: 'write', data }),
      );
    },
    resize(cols: number, rows: number) {
      webViewRef.current?.postMessage(
        JSON.stringify({ type: 'resize', cols, rows }),
      );
    },
  }));

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'data') {
          onData?.(msg.data);
        } else if (msg.type === 'resize') {
          onResize?.(msg.cols, msg.rows);
        }
      } catch {
        // ignore
      }
    },
    [onData, onResize],
  );

  return (
    <WebView
      ref={webViewRef}
      source={{ html: XTERM_HTML(fontSize) }}
      style={styles.webview}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleMessage}
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      textInteractionEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      cacheEnabled
      allowFileAccess={false}
    />
  );
});

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
});
