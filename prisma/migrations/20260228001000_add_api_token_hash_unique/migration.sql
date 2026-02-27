WITH ranked AS (
  SELECT
    id,
    "tokenHash",
    ROW_NUMBER() OVER (
      PARTITION BY "tokenHash"
      ORDER BY "createdAt" DESC, id DESC
    ) AS row_num
  FROM "ApiToken"
)
DELETE FROM "ApiToken" t
USING ranked r
WHERE t.id = r.id
  AND r.row_num > 1;

CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");
