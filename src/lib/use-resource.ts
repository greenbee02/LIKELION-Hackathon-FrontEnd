import { useCallback, useEffect, useState } from 'react';

import { failureCopy } from './api/errors';

/**
 * 한 번 불러오고 세 상태로 답하는 것.
 *
 * `cards-store` 와 `collections-store` 는 여러 화면이 같은 것을 봐야 해서 Provider 가 되었지만,
 * 대부분의 새 화면은 자기만 쓰는 목록 하나를 불러올 뿐이다. 그때마다 `useState` 셋과
 * `useEffect` 하나와 `alive` 플래그를 다시 적으면 여섯 화면이 여섯 번 같은 실수를 할 기회를
 * 갖는다 — 특히 **언마운트 뒤 `setState`** 는 매번 새로 틀리는 종류의 것이다.
 *
 * UI 가 아니므로 `src/components/ui/` 규칙에 걸리지 않는다. 화면이 아니라 화면의 배선이다.
 */

type Status = 'loading' | 'ready' | 'error';

export function useResource<T>(load: () => Promise<T>) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);

  /* `load` 는 대개 호출부에서 인라인으로 만들어져 매 렌더 새 함수다. 그것을 의존성에 넣으면
     무한히 다시 부르므로, 다시 부르는 시점은 `epoch` 하나가 정한다.
     `loading` 으로 되돌리는 일은 여기가 아니라 `reload()` 가 한다 — 이펙트 본문에서 곧장
     setState 를 부르면 렌더가 한 번 더 도는 것을 린트가 정확히 지적한다. 첫 로드는 초기값이
     이미 `loading` 이므로 손댈 것도 없다. */
  useEffect(() => {
    let alive = true;
    load()
      .then((value) => {
        if (!alive) return;
        setData(value);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (!alive) return;
        /* 우리 문장으로 옮긴 뒤에 담는다. `e.message` 를 그대로 두면 화면의 설명 줄에
           `HTTP 404` 가 적힌다 — 실패의 모양을 정하는 일은 `api/errors.ts` 의 것이다. */
        setError(failureCopy(e).note);
        setStatus('error');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch]);

  const reload = useCallback(() => {
    setStatus('loading');
    setEpoch((n) => n + 1);
  }, []);

  return { status, data, error, reload };
}
