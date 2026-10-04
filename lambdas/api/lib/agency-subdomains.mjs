const RESERVED_AGENCY_SUBDOMAINS = new Set([
  "www", "app", "login", "auth", "api", "admin", "support", "static", "assets", "mail", "email"
]);

function cleanAgencySubdomain(value) {
  const subdomain = String(value || "").trim().toLowerCase();
  if (!subdomain) return "";
  if (subdomain.length > 63 || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
    throw new Error("Agency URL must use only lowercase letters, numbers, and hyphens, and cannot begin or end with a hyphen.");
  }
  if (RESERVED_AGENCY_SUBDOMAINS.has(subdomain)) {
    throw new Error(`The agency URL ${subdomain}.sonomarzi.com is reserved.`);
  }
  return subdomain;
}

async function ensureAgencySubdomainSchema(client) {
  await client.query(`ALTER TABLE suite_agencies ADD COLUMN IF NOT EXISTS subdomain TEXT`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS suite_agencies_subdomain_unique_idx ON suite_agencies (lower(subdomain)) WHERE subdomain IS NOT NULL AND subdomain <> ''`);
  await client.query(`
    UPDATE suite_agencies
       SET subdomain='demo'
     WHERE tenant_id='f15865be-cf46-41e0-9d60-7cd753437501'::uuid
       AND id='64624bcc-232d-4af5-bae6-a8e621cde447'::uuid
       AND (subdomain IS NULL OR subdomain='')
       AND NOT EXISTS (SELECT 1 FROM suite_agencies WHERE lower(subdomain)='demo')
  `);
}

export { cleanAgencySubdomain, ensureAgencySubdomainSchema };
