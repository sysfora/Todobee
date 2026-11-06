<p align="center">
  <img src="./public/brand/bee-light.png" width="168" alt="Todobee bee" />
</p>

<h1 align="center">Todobee</h1>

<p align="center">
  The open-source project management app for teams on Google Workspace.<br />
</p>

<p align="center">
  <a href="https://github.com/Sysfora/Todobee.git"><img src="https://img.shields.io/badge/source-GitHub-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="AGPL-3.0" /></a>
  <a href="https://demo.todobee.com"><img src="https://img.shields.io/badge/live%20demo-demo.todobee.com-F5B400?style=flat-square" alt="Live demo" /></a>
</p>

<p align="center">
  <a href="https://demo.todobee.com"><strong>Try the live demo</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Sysfora/Todobee.git"><strong>View the source</strong></a>
  &nbsp;·&nbsp;
  <a href="#getting-started"><strong>Self-host</strong></a>
</p>

<p align="center">
  <img src="./public/brand/board.webp" width="920" alt="A Todobee project board with sections and task cards" />
</p>

<br />

## What it is

Todobee is a board for the work a team actually does: projects, sections, tasks, checklists, notes, and files. Sign-in is Google. The workspace content lives in the admin’s Google Drive. Todobee keeps accounts, roles, invites, and a short-lived cache so the board stays fast without reading Drive on every click.

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Clear boards</h3>
      Drag tasks between sections. Group a board by person, label, priority, or due date, and filter down to the work that matters right now.
    </td>
    <td width="50%" valign="top">
      <h3>All tasks in one place</h3>
      Checklists, notes, files, priorities, due dates, assignees, and colored labels sit on the card. The conversation stays next to the work.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Your Google Drive</h3>
      Projects, tasks, notes, and files are saved to a Todobee folder in the workspace admin’s Drive. You can take the workspace with you.
    </td>
    <td width="50%" valign="top">
      <h3>Focused team</h3>
      Admins see the whole workspace. Everyone else sees only the projects they belong to. Invites go out by email and are accepted with Google.
    </td>
  </tr>
</table>

## Plans

Priced per seat, billed once a year. Every plan starts at 10 seats. Premium and Pro stop at 150. Enterprise does not.

| | Premium | Pro | Enterprise |
| --- | --- | --- | --- |
| Per seat / month | $7.99 | $14.99 | $79.99 |
| Projects, boards, tasks | Unlimited | Unlimited | Unlimited |
| Notes, files, labels | Yes | Yes | Yes |
| Email notifications | | Yes | Yes |
| Dark mode | | Yes | Yes |
| Multiple admins | | | Yes |

## Getting started

You need Node.js, a PocketBase instance you already host, a Google OAuth client, and a Stripe account if you want paid plans.

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API listens on port 4000 during local development.

`.env.example` is the setup guide. It lists the Google scopes, the OAuth redirect URI, the Stripe webhook events, the yearly price amounts, SMTP, and the Drive sync interval. Fill that file in before you sign in.

| | |
| --- | --- |
| App | [http://localhost:3000](http://localhost:3000) |
| Local demo, no login | `npm run demo` → [http://localhost:5000](http://localhost:5000) |
| Hosted demo | [https://demo.todobee.com](https://demo.todobee.com) |

The demo uses the same interface with sample data in the browser. It does not send email or charge a card.

## Docker

One image runs the app and the demo.

```bash
docker compose up -d --build
```

| Port | What it serves |
| --- | --- |
| `3000` | Todobee. Point your domain here. |
| `5000` | The demo. Point `demo.todobee.com` here. |

Set `APP_URL` to the public `https` origin. PocketBase is not started by this container. It uses the `PB_URL` in `.env`.

## Layout

| Path | |
| --- | --- |
| `src/` | Next.js app: landing page, boards, settings |
| `server/` | API: Google sign-in, Drive sync, Stripe, invites |
| `demo/` | Same interface, sample data, no accounts |
| `public/brand/` | Bee, wordmark, and board image |
| `.env.example` | Every variable, with the permissions and events to configure |

##
<p align="center">
  Copyright © 2026 Sysfora Technologies Private Limited<br />
  Licensed under the <a href="./LICENSE">GNU Affero General Public License v3.0</a>.
</p>
