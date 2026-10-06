import {
  LocationClient,
  SearchPlaceIndexForTextCommand
} from "@aws-sdk/client-location";

import {
  response,
  resolveWorkspaceMembership,
  loadRoleAbilityMap,
  roleHasAbility
} from "./core.mjs";

const locationClient = new LocationClient({ region: process.env.AWS_REGION });
const PLACE_INDEX = process.env.PERMIT_PLACE_INDEX || "sonomarzi-permits-places";

function clean(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

export async function permitsApi(client, auth, body) {
  const action = clean(body?.action, 50);
  if (action !== "geocode") {
    return response(400, { success: false, error: "Unsupported permits operation." });
  }

  const tenantId = clean(body?.tenant_id, 100);
  const agencyId = clean(body?.agency_id, 100);
  if (!tenantId || !agencyId) {
    return response(400, { success: false, error: "Agency workspace is required." });
  }

  const workspaceAuth = await resolveWorkspaceMembership(client, auth, tenantId, agencyId);
  if (workspaceAuth.error) return workspaceAuth.error;

  if (!workspaceAuth.admin) {
    const abilityMap = await loadRoleAbilityMap(
      client,
      workspaceAuth.tenantId,
      workspaceAuth.agencyId,
      workspaceAuth.roleIds
    );
    const allowed = ["permits_view","permits_create","permits_edit","permits_admin"]
      .some(ability => roleHasAbility(abilityMap, workspaceAuth.roleIds, ability));
    if (!allowed) {
      return response(403, {
        success: false,
        error: "You do not have permission to geocode permit locations."
      });
    }
  }

  const address = clean(body?.address);
  const city = clean(body?.city, 100);
  const state = clean(body?.state, 50);
  const zip = clean(body?.zip, 20);
  if (!address) {
    return response(400, { success: false, error: "Street address is required." });
  }

  const text = [address, city, state, zip].filter(Boolean).join(", ");
  const result = await locationClient.send(new SearchPlaceIndexForTextCommand({
    IndexName: PLACE_INDEX,
    Text: text,
    MaxResults: 5,
    FilterCountries: ["USA"]
  }));

  const matches = (result.Results || []).map(item => {
    const place = item.Place || {};
    const point = place.Geometry?.Point || [];
    if (point.length < 2 || !Number.isFinite(Number(point[0])) || !Number.isFinite(Number(point[1]))) return null;
    return {
      longitude: Number(point[0]),
      latitude: Number(point[1]),
      label: clean(place.Label, 300),
      municipality: clean(place.Municipality, 100),
      region: clean(place.Region, 100),
      postal_code: clean(place.PostalCode, 30),
      country: clean(place.Country, 10)
    };
  }).filter(Boolean);

  if (!matches.length) {
    return response(404, { success: false, error: "No geocoding match was found for this address." });
  }

  return response(200, {
    success: true,
    query: text,
    match: matches[0],
    alternatives: matches.slice(1)
  });
}
