import TapService from '../native/TapService';

/**
 * Dispatch a real tap at screen coordinates via the accessibility service.
 */
export async function simulateTap(x: number, y: number): Promise<boolean> {
  try {
    return await TapService.simulateTap(x, y);
  } catch {
    return false;
  }
}
