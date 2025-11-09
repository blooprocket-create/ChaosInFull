// Lightweight telemetry bridge so Phaser systems can report using window.__telemetry
// and forward to the app-wide telemetry dispatcher (PostHog/Sentry) listening on 'telemetry:event'.
// Safe to import multiple times.

/* eslint-disable */
(function initTelemetryBridge(){
  if (typeof window === 'undefined') return;
  if (!window.__telemetry) window.__telemetry = {};
  if (typeof window.__telemetry.emit === 'function' && window.__telemetry.__bridgeReady) return;
  window.__telemetry.emit = function(name, props){
    try {
      // Normalize: if called as emit('fishing', {...type:'cast'}) also emit more specific name
      const detail = { name: String(name), props: props || {} };
      window.dispatchEvent(new CustomEvent('telemetry:event', { detail }));
      // If payload includes a "type" field, emit secondary namespaced event e.g. fishing:cast
      if (props && props.type) {
        const nsName = `${name}:${props.type}`;
        window.dispatchEvent(new CustomEvent('telemetry:event', { detail: { name: nsName, props } }));
      }
    } catch (e) {
      try { console.debug('[telemetryBridge]', name, props); } catch {}
    }
  };
  window.__telemetry.__bridgeReady = true;
})();
