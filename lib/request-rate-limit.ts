type Bucket = {
  count: number;
  resetAt: number;
};

type LimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function consumeRateLimit(
  request: Request,
  key: string,
  maxRequests: number,
  windowMs: number
): LimitResult {
  const now = Date.now();
  pruneExpired(now);

  const bucketKey = `${key}:${getClientIp(request)}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= maxRequests) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(bucketKey, existing);
  return { ok: true };
}
