import db from "./db.server";

export function normalizeCouponCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getDiscountCodeForOfferName(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 60);
}

export async function recordOrderRedemption(shop: string, order: Record<string, unknown>) {
  if (!shop || !order || typeof order !== "object") return { recorded: 0 };

  const orderId = String(order.id ?? (order as Record<string, unknown>).order_id ?? (order as Record<string, unknown>).name ?? (order as Record<string, unknown>).token ?? "");
  if (!orderId) return { recorded: 0 };

  const orderValue = Number(order.total_price ?? order.subtotal_price ?? order.total ?? 0) || 0;
  const discountSet = (order.total_discounts_set ?? {}) as Record<string, unknown>;
  const discountAmount = Number(order.total_discounts ?? (discountSet.shop_money as Record<string, unknown> | undefined)?.amount ?? 0) || 0;
  const discountApplications = Array.isArray(order.discount_applications) ? order.discount_applications as Record<string, unknown>[] : [];
  const offers = await db.offer.findMany({ where: { shop } });

  if (!offers.length) return { recorded: 0 };

  let recorded = 0;

  for (const offer of offers) {
    const offerCode = normalizeCouponCode(getDiscountCodeForOfferName(offer.name));
    const matchesOfferCode = discountApplications.some((application: Record<string, unknown>) => {
      const applicationCode = typeof application.code === "string" ? application.code : "";
      return normalizeCouponCode(applicationCode) === offerCode;
    });
    const matchesOfferName = discountApplications.some((application: Record<string, unknown>) => {
      const applicationTitle = typeof application.title === "string" ? application.title : "";
      const applicationType = String(application.type ?? "").toLowerCase();
      return (applicationType === "automatic" && offer.discountMethod === "automatic" && normalizeCouponCode(applicationTitle) === normalizeCouponCode(offer.name)) || normalizeCouponCode(applicationTitle) === normalizeCouponCode(offer.name);
    });

    if (!matchesOfferCode && !matchesOfferName) continue;

    const rawCreatedAt = typeof order.processed_at === "string" ? order.processed_at : typeof order.created_at === "string" ? order.created_at : new Date().toISOString();
    const createdAt = new Date(rawCreatedAt);
    const rawDiscountAmount = Number(order.discount_amount ?? order.total_discounts ?? 0);
    const normalizedDiscountAmount = Number.isFinite(discountAmount) && discountAmount > 0
      ? discountAmount
      : Number.isFinite(rawDiscountAmount) && rawDiscountAmount > 0
        ? rawDiscountAmount
        : offer.discountType === "percentage"
          ? Math.max(0, orderValue * (offer.discountValue / 100))
          : Math.max(0, offer.discountValue);

    const existing = await db.redemption.findUnique({
      where: { offerId_orderId: { offerId: offer.id, orderId } },
      select: { id: true },
    });
    if (existing) continue;

    await db.redemption.create({
      data: {
        offerId: offer.id,
        orderId,
        discountAmount: normalizedDiscountAmount,
        orderValue,
        createdAt,
      },
    });

    const statDate = new Date(createdAt);
    statDate.setUTCHours(0, 0, 0, 0);
    await db.dailyStat.upsert({
      where: { shop_offerId_date: { shop, offerId: offer.id, date: statDate } },
      create: {
        shop,
        offerId: offer.id,
        date: statDate,
        redemptionCount: 1,
        discountAmount: normalizedDiscountAmount,
        orderValue,
      },
      update: {
        redemptionCount: { increment: 1 },
        discountAmount: { increment: normalizedDiscountAmount },
        orderValue: { increment: orderValue },
      },
    });

    recorded += 1;
  }

  return { recorded };
}

export async function analyticsOverview(shop: string, days = 30) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days + 1);
  since.setUTCHours(0, 0, 0, 0);

  const [activeOffers, offers, redemptions, grouped, dailyStats] = await Promise.all([
    db.offer.count({ where: { shop, status: "active" } }),
    db.offer.findMany({ where: { shop }, select: { id: true, name: true } }),
    db.redemption.findMany({ where: { createdAt: { gte: since }, offer: { shop } }, select: { offerId: true, discountAmount: true, orderValue: true, createdAt: true } }),
    db.redemption.groupBy({
      by: ["offerId"],
      where: { createdAt: { gte: since }, offer: { shop } },
      _count: { id: true },
      _sum: { discountAmount: true, orderValue: true },
    }),
    db.dailyStat.findMany({ where: { shop, date: { gte: since } } }),
  ]);
  const names = new Map(offers.map((offer) => [offer.id, offer.name]));
  const byDay = new Map<string, number>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + offset);
    byDay.set(date.toISOString().slice(0, 10), 0);
  }
  // Pre-aggregated data is used once the webhook has populated it. The raw-data
  // fallback keeps analytics useful for records created before this migration.
  const stats = dailyStats.length ? dailyStats : redemptions.map((redemption) => ({
    offerId: redemption.offerId,
    date: redemption.createdAt,
    redemptionCount: 1,
    discountAmount: redemption.discountAmount,
    orderValue: redemption.orderValue,
  }));
  for (const stat of stats) {
    const day = stat.date.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + stat.redemptionCount);
  }
  const statsByOffer = new Map<string, { redemptions: number; discountAmount: number; orderValue: number }>();
  for (const stat of stats) {
    const current = statsByOffer.get(stat.offerId) ?? { redemptions: 0, discountAmount: 0, orderValue: 0 };
    current.redemptions += stat.redemptionCount;
    current.discountAmount += stat.discountAmount;
    current.orderValue += stat.orderValue;
    statsByOffer.set(stat.offerId, current);
  }
  const breakdown = (dailyStats.length ? [...statsByOffer.entries()].map(([offerId, values]) => ({ offerId, _count: { id: values.redemptions }, _sum: values })) : grouped).map((row) => {
    return {
      offerId: row.offerId,
      name: names.get(row.offerId) ?? "Deleted offer",
      redemptions: row._count.id,
      discountAmount: row._sum.discountAmount ?? 0,
      orderValue: row._sum.orderValue ?? 0,
      avgOrderValue: row._count.id ? (row._sum.orderValue ?? 0) / row._count.id : 0,
    };
  }).sort((a, b) => b.redemptions - a.redemptions);
  return {
    range: `${days}d`,
    kpis: {
      activeOffers,
      redemptions: stats.reduce((sum, row) => sum + row.redemptionCount, 0),
      discountAmount: stats.reduce((sum, row) => sum + row.discountAmount, 0),
      orderValue: stats.reduce((sum, row) => sum + row.orderValue, 0),
    },
    dailyRedemptions: [...byDay].map(([date, count]) => ({ date, count })),
    topOffers: breakdown.slice(0, 5),
    breakdown,
  };
}
