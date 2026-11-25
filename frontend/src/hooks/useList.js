import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../api/client';
import { cleanParams } from '../utils/format';

/**
 * Mengambil data list (paginated DRF) dan otomatis refetch ketika
 * params berubah atau ketika ada event 'wms:data-changed'.
 */
export default function useList(endpoint, params = {}, enabled = true) {
  const [state, setState] = useState({ results: [], count: 0, loading: true, error: null });
  const key = JSON.stringify(cleanParams(params));

  const load = useCallback(async () => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await api.get(endpoint, { params: JSON.parse(key) });
      const results = Array.isArray(data) ? data : data.results;
      setState({ results, count: Array.isArray(data) ? data.length : data.count, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: errMsg(e) }));
    }
  }, [endpoint, key, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    window.addEventListener('wms:data-changed', load);
    return () => window.removeEventListener('wms:data-changed', load);
  }, [load]);

  return { ...state, reload: load };
}
