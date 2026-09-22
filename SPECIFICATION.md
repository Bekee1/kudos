# Kudos — Final Product Specification

## Product summary

Kudos is a small team-culture workspace for recognizing colleagues publicly and consistently. The dashboard makes appreciation easy to send, easy to discover, and safe to moderate.

## User stories

### Team member

- As a team member, I can search a colleague directory and select the person I want to recognize.
- As a team member, I can write and submit a short appreciation message.
- As a team member, I can see submitted appreciation in the public recent-kudos feed.
- As a team member, I can see a dashboard summary of total kudos, kudos sent this week, and the number of people recognized.
- As a team member, I can report a kudos that appears inappropriate so it is removed from the public feed while it is reviewed.

### Administrator

- As an administrator, I can open a moderation queue for reported kudos.
- As an administrator, I can filter the queue by Needs Review, Approved, Removed, or all records.
- As an administrator, I can approve a reported kudo and return it to the public feed.
- As an administrator, I can remove a reported kudo so it stays hidden.
- As an administrator, I can permanently delete an inappropriate kudo.

## Moderation workflow

1. New kudos are created as `approved` and are immediately visible.
2. A report changes the kudo to `needs_review` and sets `is_visible` to `false`.
3. The administrator reviews the report in the moderation queue.
4. Approving a kudo sets `status` to `approved` and `is_visible` to `true`.
5. Removing a kudo sets `status` to `removed` and `is_visible` to `false`.
6. Permanent deletion removes the record from the database.

The current scaffold exposes the administrator moderation view directly for the workspace demo. Production authentication and role enforcement can be added without changing the data or API contract.

## Data model

### `colleagues`

| Field | Type | Rules |
| --- | --- | --- |
| `id` | serial integer | Primary key |
| `name` | text | Required |
| `role` | text | Required |
| `initials` | text | Required |
| `is_admin` | boolean | Required, defaults to `false` |

### `kudos`

| Field | Type | Rules |
| --- | --- | --- |
| `id` | serial integer | Primary key |
| `sender_name` | text | Required, defaults to `You` |
| `recipient_id` | integer | Required foreign key to `colleagues.id` |
| `message` | text | Required, maximum 280 characters |
| `status` | text | `needs_review`, `approved`, or `removed`; defaults to `approved` |
| `is_visible` | boolean | Required, **defaults to `true`** |
| `report_reason` | text nullable | Optional moderation context |
| `created_at` | timestamp | Required, defaults to now |
| `moderated_at` | timestamp nullable | Set when an administrator decides |

## Visibility rules

- The public feed only returns kudos where `status = 'approved'` and `is_visible = true`.
- Reported kudos are hidden immediately by setting `is_visible = false`.
- Removed kudos remain in the moderation queue but never appear in the public feed.
- Admin moderation responses include hidden records so administrators can review the full state.

## API surface

- `GET /api/colleagues?search=` — searchable colleague directory.
- `GET /api/kudos` — public visible recent-kudos feed.
- `POST /api/kudos` — submit appreciation.
- `POST /api/kudos/:id/report` — report and hide a kudo.
- `GET /api/dashboard/summary` — dashboard metrics.
- `GET /api/admin/kudos?status=` — moderation queue.
- `PATCH /api/admin/kudos/:id/moderation` — approve or remove a kudo.
- `DELETE /api/admin/kudos/:id` — permanently delete a kudo.

## Interface design

The interface uses a warm editorial team-culture treatment: a quiet paper background, coral appreciation actions, soft color-coded metric cards, compact navigation, and serif quotation styling for messages. The main dashboard prioritizes the send flow and the recent feed. The administrator view reuses the same shell while making moderation state and actions clear.

Every primary flow includes loading, empty, success, and error states. The layout collapses from the desktop sidebar and metric row into a mobile top bar, stacked metrics, and full-width forms and moderation actions.