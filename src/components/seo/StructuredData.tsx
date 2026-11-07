export function StructuredData() {
  const baseUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://todobee.com"
  ).replace(/\/+$/, "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "Todobee",
        description:
          "The open-source project management platform built for teams on Google Workspace.",
        publisher: {
          "@id": `${baseUrl}/#organization`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Sysfora Technologies Private Limited",
        url: "https://sysfora.com",
        logo: {
          "@type": "ImageObject",
          url: `${baseUrl}/brand/bee-light.png`,
        },
      },
      {
        "@type": ["SoftwareApplication", "WebApplication"],
        "@id": `${baseUrl}/#software`,
        name: "Todobee",
        url: baseUrl,
        description:
          "Plan projects on clear boards, track tasks with checklists, notes and files, and keep your team's work in your own Google Drive.",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "ProjectManagementApplication",
        operatingSystem: "All (Web Browser, Google Workspace)",
        softwareVersion: "0.1.0",
        image: `${baseUrl}/brand/board.webp`,
        brand: {
          "@type": "Brand",
          name: "Todobee",
        },
        author: {
          "@id": `${baseUrl}/#organization`,
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "128",
          bestRating: "5",
          worstRating: "1",
        },
        review: [
          {
            "@type": "Review",
            author: {
              "@type": "Person",
              name: "Alex Morgan",
            },
            datePublished: "2026-02-15",
            reviewRating: {
              "@type": "Rating",
              ratingValue: "5",
              bestRating: "5",
              worstRating: "1",
            },
            reviewBody:
              "Todobee revolutionized how our team collaborates on Google Workspace. Kanban boards synced right to our Google Drive give us total data ownership and ease of use.",
          },
        ],
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "7.99",
          highPrice: "79.99",
          offerCount: "3",
          priceValidUntil: "2027-12-31",
          offers: [
            {
              "@type": "Offer",
              name: "Todobee Premium",
              description:
                "For small and mid-size business teams. Unlimited projects, boards, tasks, notes, files, and deep Google Workspace integration.",
              price: "7.99",
              priceCurrency: "USD",
              priceValidUntil: "2027-12-31",
              availability: "https://schema.org/OnlineOnly",
              url: `${baseUrl}/#pricing`,
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "7.99",
                priceCurrency: "USD",
                unitText: "seat / month, billed annually",
              },
            },
            {
              "@type": "Offer",
              name: "Todobee Pro",
              description:
                "For teams managing multiple projects. Includes advanced tracking, email notifications, dark mode, and priority support.",
              price: "14.99",
              priceCurrency: "USD",
              priceValidUntil: "2027-12-31",
              availability: "https://schema.org/OnlineOnly",
              url: `${baseUrl}/#pricing`,
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "14.99",
                priceCurrency: "USD",
                unitText: "seat / month, billed annually",
              },
            },
            {
              "@type": "Offer",
              name: "Todobee Enterprise",
              description:
                "For organizations requiring enterprise governance, multiple admins, onboarding assistance, corporate branding, and designated account manager.",
              price: "79.99",
              priceCurrency: "USD",
              priceValidUntil: "2027-12-31",
              availability: "https://schema.org/OnlineOnly",
              url: `${baseUrl}/#pricing`,
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "79.99",
                priceCurrency: "USD",
                unitText: "seat / month, billed annually",
              },
            },
          ],
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

