const SITE_URL = "https://www.seahorseaquariumsupply.com";

const localBusiness = {
  "@context": "https://schema.org",
  "@type": ["PetStore", "LocalBusiness"],
  "@id": `${SITE_URL}/#business`,
  name: "Woody's Seahorse Aquarium & Supply",
  alternateName: "Seahorse Aquarium Supply",
  description:
    "Pacific Northwest's premier saltwater fish and coral specialist since 1996. Live fish, WYSIWYG corals, invertebrates, aquarium supplies, maintenance, and installations.",
  url: SITE_URL,
  logo: `${SITE_URL}/images/LogoFullNameOnly.png`,
  image: `${SITE_URL}/images/LogoFullNameOnly.png`,
  telephone: "+1-503-283-4788",
  email: "info@seahorseaquariumsupply.com",
  priceRange: "$$",
  foundingDate: "1996",
  address: {
    "@type": "PostalAddress",
    streetAddress: "106 NE Russet St",
    addressLocality: "Portland",
    addressRegion: "OR",
    postalCode: "97211",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 45.5779,
    longitude: -122.6651,
  },
  areaServed: {
    "@type": "State",
    name: "Oregon",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "12:00",
      closes: "19:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Sunday",
      opens: "12:00",
      closes: "18:00",
    },
  ],
  sameAs: [
    "https://www.facebook.com/SeahorseAquariumSupply",
    "https://www.instagram.com/seahorseaquariumsupply",
    "https://www.tiktok.com/@seahorseaquariumsupply",
  ],
  hasMap:
    "https://www.google.com/maps/place/?q=place_id:ChIJD0GFAfemlVQT_wCyRbJs2w",
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Woody's Seahorse Aquarium & Supply",
  publisher: { "@id": `${SITE_URL}/#business` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [localBusiness, website],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
