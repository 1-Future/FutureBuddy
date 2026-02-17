/**
 * JS bridge for the native TapServiceModule (Android only).
 * The grid overlay + voice recognition runs natively in the accessibility service.
 */
import { NativeModules, Platform } from 'react-native';

interface TapServiceInterface {
  showGrid(): Promise<boolean>;
  hideGrid(): Promise<boolean>;
  setGridConfig(gridRows: number, gridCols: number): Promise<boolean>;
  simulateTap(x: number, y: number): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  openAccessibilitySettings(): Promise<boolean>;
}

function getNativeModule(): TapServiceInterface | undefined {
  return NativeModules.TapServiceModule as TapServiceInterface | undefined;
}

const isAndroid = Platform.OS === 'android';

const stub: TapServiceInterface = {
  async showGrid() { return false; },
  async hideGrid() { return false; },
  async setGridConfig() { return false; },
  async simulateTap() { return false; },
  async isEnabled() { return false; },
  async openAccessibilitySettings() { return false; },
};

function createTapService(): TapServiceInterface {
  if (!isAndroid) return stub;

  const nativeModule = getNativeModule();
  if (!nativeModule) {
    console.warn('TapServiceModule not available — running in Expo Go?');
    return stub;
  }

  return {
    showGrid: () => nativeModule.showGrid(),
    hideGrid: () => nativeModule.hideGrid(),
    setGridConfig: (gr, gc) => nativeModule.setGridConfig(gr, gc),
    simulateTap: (x, y) => nativeModule.simulateTap(x, y),
    isEnabled: () => nativeModule.isEnabled(),
    openAccessibilitySettings: () => nativeModule.openAccessibilitySettings(),
  };
}

const TapService = createTapService();
export default TapService;
