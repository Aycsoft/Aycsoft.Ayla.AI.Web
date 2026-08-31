# Ayla Web architecture

## Responsibility boundary

`Aycsoft.Ayla.AI.Web` is the browser client. It owns interaction, rendering, task state, resumable history, file workspaces and user-facing recovery. It does not own model credentials, enterprise authorization or durable binary storage.

| Layer | Responsibility |
| --- | --- |
| Vue Web client | Modes, composer, attachments, SSE rendering, reasoning timeline, artifacts, previews, history and profile |
| Trusted AI API | Authentication, model routing, safety, orchestration, usage accounting and durable records |
| Media service | Image and video generation jobs, reference media and output retrieval |
| File service | Uploads, generated files, signed access, previews and downloads |
| Enterprise integration | SSO, permission-bound read-only tools and Portal route contracts |

## Request lifecycle

1. The user selects a mode and adds text or attachments.
2. The client creates or reuses the current conversation and posts a normalized request.
3. The API emits SSE events for planning, tools, sources, content, assets, usage and completion.
4. The client updates one execution trace rather than duplicating transient and persisted events.
5. Generated assets are persisted by the service and restored from conversation history after refresh.
6. A model or dependency failure becomes a recoverable message state; it must not crash the workspace.

## Security properties

- Provider keys and internal signing keys never enter browser environment variables.
- Enterprise tools evaluate the authenticated user and business permissions on the server.
- External accounts can use general AI, uploads and generation without gaining enterprise data access.
- HTML previews use a sandboxed workspace and must not inherit trusted application capabilities.
- Attachments and generated assets use server-issued identifiers and authorized download routes.

## Deployment topology

The Docker Desktop topology exposes the Web client on `5176`, the AI API on `5088`, and the media service on `8200`. Containers communicate through a private Docker network, while the Web host proxies `/api` to the API so browsers can use a same-origin contract.
