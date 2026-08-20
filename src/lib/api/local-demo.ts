import { request } from './client';

export type DemoResetResponse = {
  resetPurchaseQrCount: number;
};

/** 개발용 데모 데이터의 QR 사용 상태를 초기화한다. */
export function resetLocalDemo() {
  return request<DemoResetResponse>('/local/demo/reset', { method: 'POST' });
}
