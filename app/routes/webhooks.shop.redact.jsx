import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  await db.dailyStat.deleteMany({ where: { shop } });
  await db.offer.deleteMany({ where: { shop } });
  await db.session.deleteMany({ where: { shop } });

  console.log(`Received ${topic} webhook for ${shop}; shop data was deleted.`);
  return new Response();
};