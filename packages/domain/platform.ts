export type Platform = "web" | "desktop" | "ios" | "android";

export interface Device {
  id: string;
  userId: string;
  platform: Platform;
  name?: string;
  pushToken?: string;
  lastSeenAt: string;
  revokedAt?: string;
}

export function isDeviceActive(device: Device): boolean {
  return !device.revokedAt;
}
