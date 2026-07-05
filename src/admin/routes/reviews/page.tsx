import { defineRouteConfig } from '@medusajs/admin-sdk'
import { Star } from '@medusajs/icons'
import { Badge, Button, Container, Heading, Text, Textarea } from '@medusajs/ui'
import { useEffect, useState } from 'react'

type Review = {
  id: string
  product_id: string
  product_title?: string | null
  rating: number
  title?: string | null
  body?: string | null
  reviewer_name?: string | null
  moderation_status: string
  report_count: number
  reply_body?: string | null
}

const STATUS_COLOR: Record<string, 'grey' | 'orange' | 'red' | 'green'> = {
  published: 'green',
  pending: 'grey',
  flagged: 'orange',
  hidden: 'red',
}

const ReviewsPage = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    fetch('/admin/reviews?limit=200', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function moderate(id: string, moderation_status: string) {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, moderation_status } : r)));
    await fetch(`/admin/reviews/${id}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moderation_status }),
    });
  }

  async function sendReply(id: string) {
    const reply_body = replyDrafts[id];
    if (!reply_body?.trim()) return;
    await fetch(`/admin/reviews/${id}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply_body }),
    });
    load();
  }

  return (
    <Container className="p-6">
      <Heading level="h1">Reviews</Heading>
      <Text className="text-ui-fg-subtle mt-2">Moderate customer reviews and reply publicly.</Text>

      {loading ? <Text className="text-ui-fg-subtle mt-4">Loading…</Text> : null}

      {!loading ? (
        <div className="mt-4 flex flex-col gap-3">
          {reviews.length === 0 ? (
            <Text className="text-ui-fg-subtle">No reviews yet.</Text>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-ui-border-base p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Text weight="plus">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                    <Badge color={STATUS_COLOR[review.moderation_status] || 'grey'}>{review.moderation_status}</Badge>
                    {review.report_count > 0 ? <Badge color="red">{review.report_count} report(s)</Badge> : null}
                  </div>
                  <Text size="small" className="text-ui-fg-subtle">{review.product_title || review.product_id}</Text>
                </div>
                {review.title ? <Text weight="plus" className="mt-2">{review.title}</Text> : null}
                {review.body ? <Text className="mt-1">{review.body}</Text> : null}
                <Text size="small" className="text-ui-fg-subtle mt-1">— {review.reviewer_name || 'Anonymous'}</Text>

                {review.reply_body ? (
                  <div className="mt-2 rounded-md bg-ui-bg-subtle p-3">
                    <Text size="small" weight="plus">Our reply</Text>
                    <Text size="small">{review.reply_body}</Text>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <Textarea
                      rows={1}
                      placeholder="Reply publicly…"
                      value={replyDrafts[review.id] || ''}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                    />
                    <Button size="small" onClick={() => sendReply(review.id)}>Reply</Button>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  {review.moderation_status !== 'published' ? (
                    <Button size="small" variant="secondary" onClick={() => moderate(review.id, 'published')}>Publish</Button>
                  ) : null}
                  {review.moderation_status !== 'hidden' ? (
                    <Button size="small" variant="secondary" onClick={() => moderate(review.id, 'hidden')}>Hide</Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: 'Reviews',
  icon: Star,
})

export default ReviewsPage
