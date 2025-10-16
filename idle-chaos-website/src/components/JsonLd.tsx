import React from "react";

type Thing = Record<string, unknown>;

export default function JsonLd({ data }: { data: Thing | Thing[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
