import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

const QueryClientContext = createContext(null);

const serializeKey = (key) => {
  if (typeof key === 'string') {
    return key;
  }
  try {
    return JSON.stringify(key);
  } catch (error) {
    console.warn('[QueryClient] Failed to serialize query key:', error);
    return String(key);
  }
};

export class QueryClient {
  constructor() {
    this.cache = new Map();
  }

  getCacheEntry(queryKey) {
    const key = serializeKey(queryKey);
    return this.cache.get(key) || null;
  }

  setCacheEntry(queryKey, data) {
    const key = serializeKey(queryKey);
    this.cache.set(key, {
      data,
      updatedAt: Date.now()
    });
  }

  invalidateQueries(queryKey) {
    if (typeof queryKey === 'undefined') {
      this.cache.clear();
      return;
    }
    const key = serializeKey(queryKey);
    this.cache.delete(key);
  }
}

export function QueryClientProvider({ client, children }) {
  const value = useMemo(() => client, [client]);

  return (
    <QueryClientContext.Provider value={value}>
      {children}
    </QueryClientContext.Provider>
  );
}

export function useQueryClient() {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error('useQueryClient must be used within a QueryClientProvider');
  }
  return client;
}

export function useQuery({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 0
}) {
  const client = useQueryClient();
  const keyRef = useRef(serializeKey(queryKey));

  useEffect(() => {
    keyRef.current = serializeKey(queryKey);
  }, [queryKey]);

  const getCachedState = useCallback(() => {
    const entry = client.getCacheEntry(keyRef.current);
    if (!entry) {
      return {
        data: null,
        error: null,
        isLoading: enabled,
        isFetching: false
      };
    }

    const isStale = staleTime > 0
      ? Date.now() - entry.updatedAt > staleTime
      : true;

    return {
      data: entry.data,
      error: null,
      isLoading: enabled && isStale,
      isFetching: enabled && isStale
    };
  }, [client, enabled, staleTime]);

  const [state, setState] = useState(getCachedState);

  const executeFetch = useCallback(async (force = false) => {
    if (!enabled || typeof queryFn !== 'function') {
      return null;
    }

    const cached = client.getCacheEntry(keyRef.current);
    const isStale = force || !cached || (staleTime > 0 && Date.now() - cached.updatedAt > staleTime);

    if (!isStale && cached) {
      setState({
        data: cached.data,
        error: null,
        isLoading: false,
        isFetching: false
      });
      return cached.data;
    }

    setState((prev) => ({
      ...prev,
      isLoading: !cached,
      isFetching: true,
      error: null
    }));

    try {
      const data = await queryFn();
      client.setCacheEntry(keyRef.current, data);
      setState({
        data,
        error: null,
        isLoading: false,
        isFetching: false
      });
      return data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error,
        isLoading: false,
        isFetching: false
      }));
      throw error;
    }
  }, [client, enabled, queryFn, staleTime]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;
    executeFetch().catch(() => {
      if (!cancelled) {
        // errors are stored in state; swallow here
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, executeFetch]);

  const refetch = useCallback(() => executeFetch(true), [executeFetch]);

  return {
    ...state,
    refetch
  };
}

export function useMutation({
  mutationFn,
  onSuccess,
  onError,
  onSettled
}) {
  const [state, setState] = useState({
    data: null,
    error: null,
    isPending: false,
    isSuccess: false
  });

  const mutateAsync = useCallback(async (variables, options = {}) => {
    if (typeof mutationFn !== 'function') {
      throw new Error('mutationFn must be a function');
    }

    setState((prev) => ({
      ...prev,
      isPending: true,
      error: null,
      isSuccess: false
    }));

    try {
      const data = await mutationFn(variables);
      setState({
        data,
        error: null,
        isPending: false,
        isSuccess: true
      });

      const successHandler = options.onSuccess || onSuccess;
      if (successHandler) {
        successHandler(data, variables, undefined);
      }

      const settledHandler = options.onSettled || onSettled;
      if (settledHandler) {
        settledHandler(data, null, variables, undefined);
      }

      return data;
    } catch (error) {
      setState({
        data: null,
        error,
        isPending: false,
        isSuccess: false
      });

      const errorHandler = options.onError || onError;
      if (errorHandler) {
        errorHandler(error, variables, undefined);
      }

      const settledHandler = options.onSettled || onSettled;
      if (settledHandler) {
        settledHandler(undefined, error, variables, undefined);
      }

      throw error;
    }
  }, [mutationFn, onError, onSettled, onSuccess]);

  const mutate = useCallback((variables, options) => {
    mutateAsync(variables, options).catch(() => {
      // error already surfaced via state
    });
  }, [mutateAsync]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isPending: false,
      isSuccess: false
    });
  }, []);

  return {
    ...state,
    mutate,
    mutateAsync,
    reset
  };
}
