import { defineRouteConfig } from '@medusajs/admin-sdk'
import { ChartBar } from '@medusajs/icons'
import { Badge, Container, Heading, Text } from '@medusajs/ui'
import { useEffect, useState } from 'react'

type CatalogHealth = {
  totals: { all: number; active: number; draft: number; out_of_stock: number; low_stock: number }
  missing: { images: number }
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: 'danger' | 'warning' }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-ui-border-base p-4">
      <Text size="small" className="text-ui-fg-subtle">{label}</Text>
      <div className="flex items-center gap-2">
        <Text size="xlarge" weight="plus">{value}</Text>
        {tone && value > 0 ? <Badge color={tone === 'danger' ? 'red' : 'orange'}>{tone}</Badge> : null}
      </div>
    </div>
  )
}

const CatalogHealthPage = () => {
  const [data, setData] = useState<CatalogHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/admin/catalog-health', { credentials: 'include' })
      .then((res) => res.json())
      .then(setData)
      .catch(() => setError('Failed to load catalog health.'));
  }, []);

  return (
    <Container className="p-6">
      <Heading level="h1">Catalog Health</Heading>
      <Text className="text-ui-fg-subtle mt-2">
        Live snapshot of the product catalog: stock and image coverage.
      </Text>

      {error ? <Text className="text-ui-fg-error mt-4">{error}</Text> : null}

      {data ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Tile label="Total products" value={data.totals.all} />
          <Tile label="Active" value={data.totals.active} />
          <Tile label="Draft" value={data.totals.draft} />
          <Tile label="Out of stock" value={data.totals.out_of_stock} tone="danger" />
          <Tile label="Low stock (≤5)" value={data.totals.low_stock} tone="warning" />
          <Tile label="Missing images" value={data.missing.images} tone="warning" />
        </div>
      ) : !error ? (
        <Text className="text-ui-fg-subtle mt-4">Loading…</Text>
      ) : null}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: 'Catalog Health',
  icon: ChartBar,
})

export default CatalogHealthPage
