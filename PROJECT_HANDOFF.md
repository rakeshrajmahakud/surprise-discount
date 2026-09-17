# Surprise Discount Project Handoff

Last updated: 2026-09-15

This document is the working handoff for future developers and AI agents. Read it before changing the project so existing Shopify constraints and product decisions are preserved.

## Product Purpose

Surprise Discount is an embedded Shopify app that lets a merchant create discount offers and add a storefront theme app block. The storefront block displays a surprise message and lets a customer reveal a coupon with confetti before being redirected to Shopify's cart with the discount applied.

The app intentionally tracks aggregate coupon/redemption usage only. It does not identify customers or enforce a per-customer usage limit.

## Current Feature Status

### Built and working

- Embedded Shopify admin app built with React Router.
- Shopify admin authentication and Prisma session storage.
- Offer creation from the admin Offers page.
- Offer fields:
  - Name
  - Percentage or fixed discount type
  - Coupon code or automatic discount delivery
  - Discount value
  - Apply to all products, selected collections, or selected products
  - Start date and time
  - End date and time
  - Combine with other discounts
- Shopify discount creation is automatic when an offer is submitted. There is no optional checkbox anymore.
- Coupon offers show the generated code in the admin success message.
- Offers list in the admin app shows name, value, and end date. The Status column was removed from the visible list.
- Admin Analytics tab with:
  - Active offer count
  - Redemption count for the selected period
  - Discount amount
  - Influenced order value
  - Redemptions per day chart
  - Top offers chart
  - Per-offer redemption breakdown
- Shopify Discount Function for all-product and product-targeted offers.
- Theme app extension block at `extensions/surprise-discount-block`.
- Theme block settings:
  - Message text
  - Button text
  - Background color
  - Text color
  - Button color
  - Button text color
  - Button corner radius
- Discount mode, discount type/value, and coupon code are controlled by the latest offer in the admin dashboard and synced to a shop app JSON metafield. They are not theme block settings.
- Offer targeting (`all`, selected products, or selected collections) is also synced to that metafield. The block hides itself when the current product is outside the latest offer's target.
- Storefront interaction:
  1. Customer clicks the configured button.
  2. `canvas-confetti` is loaded from jsDelivr and fired.
  3. Automatic mode reveals a benefit message such as `You get 15% off this product`; Shopify applies the automatic discount when the cart is eligible.
  4. Coupon mode reveals the configured coupon code and sends the customer to `/discount/CODE?redirect=/cart` so Shopify applies the code.
- App-specific webhooks currently registered:
  - `app/uninstalled`
  - `app/scopes_update`

### Deliberately removed

- Total coupon uses field from the admin form.
- Status selector from the admin form.
- Status column from the offers table.
- Optional Shopify discount creation checkbox.
- Customer usage limit.
- Customer IDs in redemption records.
- Customer usage metafields.
- Customer usage API route.
- `orders/create` webhook.
- Protected customer scopes: `read_orders`, `read_customers`, and `write_customers`.

## Important Product Decisions

### Aggregate usage only

The product requirement is to track how many times a coupon is used overall, not which customer used it. Do not reintroduce customer IDs, buyer identity queries, customer metafields, or per-customer limits unless the product requirement changes.

### Protected customer data

The `orders/create` webhook was removed because Shopify treats its possible payload as protected customer data. The app is not approved for that data, and the app does not need customer-level tracking.

There is currently no active order webhook that populates the local `Redemption` or `DailyStat` tables. Shopify discount usage is handled by Shopify when a discount is created, but the local analytics tables require a future aggregate-safe ingestion strategy if dashboard redemption numbers must be populated.

### Offer status and usage limit

The Prisma model still contains `status` and `totalUsageLimit` for compatibility with the existing database and offer lifecycle code, but the current admin form does not expose either setting. New offers are created with:

- `status`: `active` or `scheduled`, derived from the start date.
- `totalUsageLimit`: `null`.

Do not remove these database fields casually without reviewing existing migrations and Shopify discount behavior.

## Architecture

### Admin app

- `app/routes/app._index.tsx`
  - Loads offers and analytics.
  - Creates offers.
  - Automatically calls Shopify discount creation.
  - Renders Offers and Analytics tabs.
- `app/offers.server.ts`
  - Defines `OfferInput`.
  - Creates Shopify Function discounts when configured and the offer is not collection-targeted.
  - Creates Shopify basic code discounts for collection-targeted offers or when the Function ID is unavailable.
- `app/analytics.server.ts`
  - Aggregates local `Redemption` and `DailyStat` records.
- `app/shopify.server.js`
  - Shopify app configuration, authentication, session storage, and API version.
- `app/routes/webhooks.app.uninstalled.jsx`
  - Deletes shop session data after uninstall.
- `app/routes/webhooks.app.scopes_update.jsx`
  - Handles scope update webhook logging.

### Shopify extensions

- `extensions/surprise-discount-function`
  - Shopify Discount Function.
  - Input query: `src/cart_lines_discounts_generate_run.graphql`.
  - Runtime: `src/cart_lines_discounts_generate_run.ts`.
  - Tests: `tests/usage-limit.test.ts`.
- `extensions/surprise-discount-block`
  - Theme app extension.
  - Manifest: `shopify.extension.toml`.
  - Block: `blocks/surprise-discount.liquid`.
  - Locale directory: `locales/en.default.json`.

### Database

Prisma uses SQLite for local development. Main models:

- `Session`: Shopify authentication sessions.
- `Offer`: merchant-created discount offers.
- `Redemption`: aggregate redemption records keyed by offer and order, without customer data.
- `DailyStat`: aggregate daily analytics rollups.

The customer tracking removal migration is:

`prisma/migrations/20260915043000_remove_customer_usage_tracking/migration.sql`

## Shopify Configuration

`shopify.app.toml` currently requests:

- `write_products`
- `write_discounts`
- `write_metaobjects`
- `write_metaobject_definitions`

It does not request protected customer scopes.

The theme extension manifest is intentionally minimal. Theme block targeting is defined in the Liquid block schema with `"target": "section"`; do not add `extensions.targeting` entries to the theme manifest.

## Development Commands

```bash
pnpm install
pnpm setup
pnpm dev
```

Useful checks:

```bash
pnpm typecheck
pnpm build
pnpm exec shopify app build
pnpm --dir extensions/surprise-discount-function test -- --run
```

`pnpm exec shopify app build` builds both the theme extension and the Discount Function and runs theme checks.

## Storefront Block Setup

After deploying the app and extension:

1. Open the Shopify Theme Editor.
2. Add the `Surprise discount` app block to a compatible section.
3. Enter the exact discount code generated from the offer name.
4. Configure the message, button label, colors, and radius.
5. Save and test from a storefront page.

The block does not automatically discover an offer or discount code from the admin database. The merchant currently copies the generated Shopify discount code into the block setting.

## Known Limitations and Next Work

1. **Offer-to-block selection is not built.** The latest created offer controls the storefront block, including its target products or collections. A future version could let the merchant select which existing offer powers the block.
2. **Local analytics ingestion is incomplete.** The protected `orders/create` webhook is intentionally disabled. A future implementation needs an approved, privacy-compliant aggregate event source if local dashboard redemption analytics are required.
3. **Collection-targeted offers use Shopify Basic discounts.** The Discount Function path currently handles all-product and product-targeted offers; collection-targeted offers use the native basic discount mutation.
4. **The block loads `canvas-confetti` from a CDN at click time.** If external scripts are not acceptable for production, bundle or host the library as a theme extension asset.
5. **No automated end-to-end storefront test exists yet.** Add one using a Shopify dev store or a browser test harness before changing the discount reveal flow.
6. **Offer editing and deletion are not implemented.** The admin currently creates and lists offers.

## Change Safety Rules for Future AI Work

- Read `AGENTS.md` before Shopify changes.
- Use Shopify's current API and theme app extension conventions; do not invent REST APIs when GraphQL or Shopify CLI configuration is available.
- Preserve the no-customer-data decision.
- Do not re-add `orders/create` without protected customer data approval and an explicit product requirement.
- Do not change the generated files under `build/` manually.
- After changing Prisma schema or migrations, run Prisma validation/migration checks and regenerate the client.
- After changing a Shopify extension, run `pnpm exec shopify app build`.
- After changing app TypeScript/React code, run `pnpm typecheck` and `pnpm build`.
