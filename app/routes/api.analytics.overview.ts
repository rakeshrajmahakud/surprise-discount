import type { LoaderFunctionArgs } from "react-router";
import { analyticsOverview } from "../analytics.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const range = new URL(request.url).searchParams.get("range") ?? "30d";
  const match = /^(7|30|90)d$/.exec(range);
  const days = match ? Number.parseInt(match[1], 10) : 30;
  return Response.json(await analyticsOverview(session.shop, days));
}
