# Naricitas Medusa Backend — TODO

Central tracking file for the Naricitas → Medusa migration and all backend/admin
feature work. `naricitas-manager` and `naricitas-web`'s D1 admin layer are being
**fully deprecated** — new ops/admin functionality belongs here (custom API
routes under `src/api/admin/**` + UI routes under `src/admin/routes/**`), not
in the Manager/D1 stack. See `naricitas-manager/TODO.md` for the (frozen,
no-new-work) legacy backlog it's replacing.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Migration phases (status)

- [x] Phase 1 — Catalog Health dashboard in Medusa Admin.
- [x] Phase 2 — Support Tasks module in Medusa Admin.
- [x] Phase 3 — Reviews module with moderation in Medusa Admin.
- [x] Phase 4 — Subscriptions backend (module, create-subscription workflow,
      renewal workflow + cron jobs, admin API/UI, store customer routes).
- [x] Phase 4b — Storefront subscribe-and-save flow in `naricitas-web` (chat
      tool, checkout bridge, overlay UI).
- [ ] Phase 5 — Admin users/roles, audit log (not yet started; scope TBD from
      `naricitas-manager`'s command-center/ownership features).

## Immediate outstanding work

### Subscriptions (Phase 4 gaps)
- [x] **Dunning / failed-renewal handling.** `SubscriptionStatus.FAILED` is
      defined but never set anywhere. If a renewal's off-session Stripe charge
      fails, `create-subscription-orders.ts` just logs and moves on —
      `next_order_date` never advances, so the subscription silently stops
      being retried forever with no status change and no customer
      notification. Needs: catch the payment failure in
      `create-subscription-order` workflow, mark the subscription `failed`,
      and (ideally) notify the customer + retry/grace-period logic.
- [x] **Customer-facing view/cancel flow in naricitas-web.** Backend routes
      exist (`GET`/`POST /store/customers/me/subscriptions[/id]`) but require
      a native Medusa customer JWT — naricitas-web has no customer login
      (guest checkout + D1 session→`medusa_customer_id` bridge only). No chat
      tool or bridging API route exists for this yet (unlike `list_my_orders`
      / `get_order_status` for regular orders).
- [x] **Admin cancel/expire action.** The Medusa Admin subscriptions UI
      (`src/admin/routes/subscriptions/**`) is read-only (list + detail only);
      support staff can't manually cancel or expire a subscription from the
      dashboard.
- [ ] **End-to-end test of the full subscribe flow**: chat → subscribe widget
      → Stripe off-session setup → first order → cron-triggered renewal
      charge, using a real Stripe test-mode card.

### Stripe (carried over from the payment-provider fix)
- [ ] **Live test-mode purchase through the storefront.** Region + provider +
      webhook + env vars are all confirmed via Admin API, but no actual
      end-to-end checkout has been run through the deployed storefront with a
      test card (4242 4242 4242 4242).

## Backlog (not yet scoped in detail)

- [ ] Phase 5: admin users/roles.
- [ ] Phase 5: audit log.
- [ ] Decommission `naricitas-manager` and `naricitas-web`'s D1 admin API
      (`functions/admin/api/**`) once all of the above land — includes
      cleaning up the leftover unused `admin_settings` table in prod D1 (see
      `/memories/repo/medusa-migration.md` in-session notes for detail).
