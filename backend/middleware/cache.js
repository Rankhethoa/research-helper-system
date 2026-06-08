const store = new Map();

/*
  Express middleware that caches responses keyed on the full request body.
  Only caches 200 responses. Cache is in-memory and resets on server restart.
 */

export function cacheMiddleware(req, res, next) {
  const key = JSON.stringify(req.body);

  if (store.has(key)) {
    return res.json(store.get(key));
  }

  // Intercept res.json so the cache is payloaded before it's sent
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (res.statusCode === 200) store.set(key, payload);
    return originalJson(payload);
  };

  next();
}

// Direct cache access — useful for routes that build the key themselves
export const cache = {
  get:    (key)         => store.get(key),
  set:    (key, value)  => store.set(key, value),
  has:    (key)         => store.has(key),
  delete: (key)         => store.delete(key),
  clear:  ()            => store.clear(),
};