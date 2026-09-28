export const meta = () => [
  { title: "Privacy Policy | Surprise Discount" },
  {
    name: "description",
    content:
      "How Surprise Discount processes Shopify merchant, order analytics, and storefront data.",
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="privacy-page">
      <style>{`
        .privacy-page {
          box-sizing: border-box;
          min-height: 100vh;
          padding: 48px 24px 72px;
          background: #f5f6f2;
          color: #202722;
          font-family: inherit;
        }
        .privacy-page * { box-sizing: border-box; }
        .privacy-content { max-width: 820px; margin: 0 auto; }
        .privacy-kicker {
          margin: 0 0 12px;
          color: #a34718;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .privacy-page h1 {
          margin: 0;
          color: #18231d;
          font-size: 2.75rem;
          line-height: 1.08;
        }
        .privacy-updated { margin: 14px 0 32px; color: #5b665f; }
        .privacy-intro {
          margin: 0 0 36px;
          padding: 20px 22px;
          border-left: 4px solid #d65a21;
          background: #fff;
          font-size: 1.05rem;
          line-height: 1.7;
        }
        .privacy-section { margin: 32px 0; }
        .privacy-section h2 {
          margin: 0 0 10px;
          color: #202722;
          font-size: 1.25rem;
          line-height: 1.35;
        }
        .privacy-section p, .privacy-section li {
          color: #39443d;
          font-size: 1rem;
          line-height: 1.75;
        }
        .privacy-section p { margin: 0 0 12px; }
        .privacy-section ul { margin: 8px 0 0; padding-left: 22px; }
        .privacy-section li + li { margin-top: 8px; }
        .privacy-page a { color: #9b3f16; text-underline-offset: 3px; }
        .privacy-page a:focus-visible { outline: 3px solid #246b55; outline-offset: 3px; }
        .privacy-footer {
          margin-top: 44px;
          padding-top: 20px;
          border-top: 1px solid #d7ddd7;
          color: #5b665f;
          font-size: 0.9rem;
        }
        @media (max-width: 600px) {
          .privacy-page { padding: 32px 18px 48px; }
          .privacy-page h1 { font-size: 2.15rem; }
          .privacy-intro { padding: 17px 18px; }
        }
      `}</style>

      <article className="privacy-content">
        <p className="privacy-kicker">Surprise Discount</p>
        <h1>Privacy Policy</h1>
        <p className="privacy-updated">Last updated: September 28, 2026</p>

        <p className="privacy-intro">
          This policy explains what information Surprise Discount processes,
          why it is used, how long it is kept, and how to ask a privacy question.
          The app is for Shopify merchants; shoppers interact only with the
          discount block displayed by a merchant.
        </p>

        <section className="privacy-section">
          <h2>Information we process</h2>
          <ul>
            <li>
              <strong>Shop and admin account information.</strong> Shopify
              provides the shop domain and authentication/session information
              needed to operate the app. Depending on the Shopify session, this
              can include an admin user ID, name, email address, and locale.
              Session and access-token data is used to authenticate requests to
              Shopify.
            </li>
            <li>
              <strong>Offer and storefront settings.</strong> We store the
              offer name, discount type and value, discount code or method,
              dates, combination settings, and selected product or collection
              IDs. We also store the merchant's display text and appearance
              settings for the theme block. Discount configuration is sent to
              Shopify to create discounts and is synchronized to a shop
              metafield for the storefront block.
            </li>
            <li>
              <strong>Paid-order analytics.</strong> With the
              <code> read_orders </code> permission, Shopify sends paid-order
              webhook events. For matching discounts, the app stores the
              Shopify order ID, order value, discount amount, discount
              application code or title, and order date to calculate aggregate
              redemption reports. The app does not save the complete webhook
              payload or use it to build customer profiles.
            </li>
            <li>
              <strong>Operational logs.</strong> The app may log a shop domain
              and webhook topic when processing Shopify events, plus errors
              needed to operate the service. Hosting providers may keep their
              own service logs.
            </li>
          </ul>
          <p>
            The app currently requests the Shopify scopes
            <code> write_products</code>, <code>write_discounts</code>, and
            <code> read_orders</code>. They support product or collection
            targeting, discount creation, and paid-order analytics.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Shopper information and tracking</h2>
          <p>
            The storefront block does not ask shoppers for their name, email,
            phone number, address, or Shopify account details. It does not set
            its own tracking cookies or analytics pixels, and it does not send
            shopper interactions or browsing activity to Surprise Discount.
            Shopify and the merchant's theme may use their own cookies and
            services under their respective policies.
          </p>
          <p>
            Shopify's paid-order webhook can include fields beyond those used
            by the app. The app reads only the order identifier, totals,
            discount application details, and date described above; it does not
            store buyer names, contact details, or shipping addresses.
          </p>
        </section>

        <section className="privacy-section">
          <h2>How we use information</h2>
          <p>
            Information is used only to authenticate the merchant, create and
            manage the merchant's discounts, show the configured storefront
            block, provide redemption and discount analytics, maintain the
            service, and respond to support or privacy requests. We do not sell
            personal information or use it for cross-store advertising.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Who receives information</h2>
          <p>
            Shopify receives the information needed to authenticate the app,
            manage discounts and shop metafields, and deliver webhook events.
            App pages also load a stylesheet and font from Shopify's CDN, which
            receives ordinary browser connection information for those
            requests.
            App data is stored by the hosting and database services configured
            for the app. Those providers process data to operate the service and
            are subject to their own contractual and privacy terms. We do not
            share app data with advertising networks or sell it to data brokers.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Retention and deletion</h2>
          <p>
            Offer settings and redemption analytics are kept while the shop
            uses the app; the app does not currently run a time-based purge for
            these records while installed. When Shopify notifies the app that
            it has been uninstalled or sends a shop-redaction request, the app
            deletes the shop's stored offers, related redemption records, daily
            analytics, and authentication sessions. Hosting-provider logs may
            follow that provider's separate retention schedule.
          </p>
          <p>
            Shopify's customer data-request and customer-redaction webhooks are
            enabled. Surprise Discount does not maintain shopper profiles or
            direct shopper contact details. Redemption analytics do include
            Shopify order IDs, which may be associated with an order in the
            merchant's store.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Security and processing locations</h2>
          <p>
            Information is processed by Shopify and by the app's configured
            hosting and database providers. Their processing locations can
            depend on the regions in which those services are configured and
            operated, and may be outside your country. We use Shopify's
            authentication and access controls to limit app access to the
            connected store. No method of transmission or storage is completely
            secure.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Your requests and contact</h2>
          <p>
            Merchants can contact the app publisher with questions or requests
            to access, correct, or delete information held by the app. Shoppers
            should first contact the store that collected their order
            information; the merchant can coordinate an app-data request with
            the publisher. For an order-related request, include the shop domain
            and order ID so the relevant analytics record can be identified.
            Depending on your location, you may also have rights to object to or
            restrict processing, request a copy of your information, or complain
            to your privacy regulator. Use the contact details on the{" "}
            <a
              href="https://www.heseven.com/pages/contact-us"
              target="_blank"
              rel="noreferrer"
            >
              app publisher's contact page
            </a>
            .
          </p>
        </section>

        <section className="privacy-section">
          <h2>Changes to this policy</h2>
          <p>
            We may update this policy when the app's data practices or legal
            requirements change. The updated date at the top of this page shows
            when the latest version took effect.
          </p>
        </section>

        <footer className="privacy-footer">
          Surprise Discount · Privacy policy updated September 28, 2026
        </footer>
      </article>
    </main>
  );
}