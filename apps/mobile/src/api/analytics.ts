import * as SecureStore from 'expo-secure-store';
import { apiClient } from './client';

export type EventType =
  | 'read' | 'click' | 'bookmark' | 'share' | 'like'
  | 'login' | 'signup' | 'push_enable' | 'push_disable'
  | 'review' | 'tab_visit' | 'search' | 'filter_apply'
  | 'app_open' | 'login_prompt_seen';

export interface AnalyticsEvent {
  event_type: EventType;
  content_id?: string;
  tag?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

let _deviceId: string | null = null;

async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  try {
    let id = await SecureStore.getItemAsync('tf_device_id');
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await SecureStore.setItemAsync('tf_device_id', id);
    }
    _deviceId = id;
    return id;
  } catch {
    return 'unknown';
  }
}

export function trackEvent(events: AnalyticsEvent[]): void {
  getDeviceId().then((device_id) => {
    const payload = events.map((e) => ({ ...e, device_id }));
    apiClient.post('/events', payload).catch(() => {});
  });
}
