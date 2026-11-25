import { useEffect, useState } from 'react';
import api from '../api/client';

/** Data pendukung untuk dropdown form: aset, zona, dan user pada warehouse terpilih. */
export default function useLookups(warehouseId) {
  const [data, setData] = useState({ assets: [], zones: [], users: [], categories: [] });

  const load = () => {
    if (!warehouseId) return;
    Promise.all([
      api.get('/assets/', { params: { warehouse: warehouseId, page_size: 500, ordering: 'name' } }),
      api.get('/zones/', { params: { warehouse: warehouseId, page_size: 200 } }),
      api.get('/users/', { params: { page_size: 200, is_active: true } }),
      api.get('/asset-categories/', { params: { page_size: 200 } }),
    ])
      .then(([a, z, u, c]) =>
        setData({ assets: a.data.results, zones: z.data.results, users: u.data.results, categories: c.data.results })
      )
      .catch(() => {});
  };

  useEffect(load, [warehouseId]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...data, reloadLookups: load };
}
