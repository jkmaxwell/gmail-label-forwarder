👉 **PERSONAL PROJECT -- NOT ASSOCIATED WITH OR ENDORSED BY MONARCH MONEY OR GOOGLE** 👈

# Gmail Label Forwarder

Auto-forward Gmail messages to **any** email address — including addresses
you don't own, like Monarch Money's `receipts@my.monarch.com`.

Gmail's built-in forwarding won't do this: it only forwards to addresses you
can click a verification link for, and only forwards *new* mail. Add-ons
like Email Studio can do it, but you have to grant a stranger's app full
access to your mailbox.

This is a ~60-line script that lives in **your own Google account** and
clicks "Forward" for you on a timer. Nobody else's servers, nobody else's
OAuth. It also works on old mail, not just new mail.

**No coding required.** If you can copy, paste, and click, you can set this
up in about 10 minutes.

## How it works (30 seconds)

1. You list what to forward (e.g. "receipts from Apple") as plain Gmail
   searches at the top of the script.
2. Every 10 minutes, the script finds matching mail, tags it with a label,
   forwards each message, then moves it to a "sent" label so it's never
   forwarded twice.

## Setup

### Step 1 — Create the script

1. Go to [script.google.com](https://script.google.com) and click
   **+ New project**. (Sign in with the Gmail account that receives the
   mail you want forwarded.)
2. You'll see an editor with a file called `Code.gs` containing a stub.
   Select all of it and delete it.
3. Copy the entire contents of [`Code.gs`](Code.gs) from this repo and
   paste it in.
4. Edit the lines at the top:
   - `DEST` — where mail should go (e.g. `receipts@my.monarch.com`)
   - `FROM` — your own email address (see Step 2)
   - `RULES` — one line per kind of email to forward. These are ordinary
     Gmail searches, the same thing you'd type in the Gmail search box.
     Example: `'from:no_reply@email.apple.com subject:"Your receipt from Apple"'`
5. Press **Cmd-S** (Mac) or **Ctrl-S** (Windows) to save. Name the project
   anything, e.g. "Forwarder".

### Step 2 — Make sure FROM is an address Gmail can send as

If `FROM` is just your normal Gmail address, you're done with this step.

If it's a different address of yours (a work alias, a custom domain), Gmail
must have it registered: Gmail → ⚙️ → **See all settings** → **Accounts** →
**"Send mail as"**. If it's not listed, click "Add another email address"
and follow the verification email.

### Step 3 — Authorize the script

1. In the script editor toolbar, use the function dropdown to select
   **`listAliases`**, then click **Run**.
2. Google will warn you the app is "unverified". That's expected — it's
   *your* script, created 2 minutes ago, and Google hasn't reviewed it.
   Click **Advanced → Go to (project name)** and allow it. You are granting
   access to your own account's script, not to any third party.
3. Check the log at the bottom: your `FROM` address must appear in the
   list. If it doesn't, redo Step 2.

### Step 4 — Dry run

Select **`testRules`** in the dropdown → **Run**. The log shows what each
rule matched — nothing is sent. Adjust `RULES` until it matches what you
expect (and nothing you don't).

### Step 5 — Turn it on

1. Select **`run`** in the dropdown → **Run** once. Check your Sent folder:
   the forwards should be there.
2. Click the ⏰ **Triggers** icon in the left sidebar → **+ Add Trigger**:
   - Function: `run`
   - Event source: **Time-driven**
   - Type: **Minutes timer**, every **10 minutes**
   - Save.

That's it. No "Deploy" button needed — that's for web apps; timed triggers
always run your latest saved code.

### Forwarding old mail

The script normally looks back 2 days (`LOOKBACK`). To forward months of
history: change `LOOKBACK` to e.g. `'newer_than:1y'`, run `run` manually a
few times until the log goes quiet, then change it back. Mind the daily
send limit (see Troubleshooting).

## If the forwards never arrive (read this before giving up)

Strict receivers — Monarch included — **silently discard** mail that fails
authentication. No bounce, no error. If your Sent folder shows the forwards
going out but the other side sees nothing:

**Using a plain `@gmail.com` address as `FROM`?** You're fine —
Google already authenticates those. The likely cause is the receiver's own
matching rules (e.g. Monarch only accepts mail from the email address on
your Monarch account — check Settings there).

**Using your own domain?** Your domain must publish SPF and DKIM, or every
forward fails authentication:

1. **SPF** — a TXT record on your domain:
   `v=spf1 include:_spf.google.com ~all`
   (Never create a *second* record starting with `v=spf1` — if one exists,
   add to its `include:` list instead.)
2. **DKIM** — [admin.google.com](https://admin.google.com) → Apps → Google
   Workspace → Gmail → **Authenticate email** → Generate new record → add
   the shown TXT record at `google._domainkey.yourdomain.com` in your DNS →
   click **Start authentication**. Without this, Google signs your mail as
   `...gappssmtp.com`, which fails the receiver's domain-alignment check
   even when SPF passes.
3. **Prove it worked**: send one fresh forward, open it in your Sent
   folder → ⋮ → **Show original**. The summary table must say
   `SPF: PASS` and `DKIM: 'PASS' with domain yourdomain.com`.

Check your DNS from a terminal:

```sh
dig +short TXT yourdomain.com
dig +short TXT google._domainkey.yourdomain.com
```

## Troubleshooting

- **Script runs but nothing forwards** — your `RULES` matched nothing
  (re-run `testRules`), or a label-name mismatch: run `listLabels` and make
  sure a filter isn't feeding a differently-named label. The script creates
  its own labels, so a typo quietly creates a second, empty one.
- **Mail goes out from the wrong address** — `FROM` isn't a registered
  send-as alias; the option is silently ignored. Redo Step 2, verify with
  `listAliases`.
- **Duplicates** — only happens if you manually re-label an
  already-processed thread; even then the script skips messages you sent,
  so it re-sends only the original.
- **Daily limit** — Google caps script-sent mail at ~100 recipients/day for
  free Gmail, ~1,500/day for Google Workspace. Backfilling hundreds of old
  threads can hit this; it resets daily.
- **Receiver-side matching** — services that attach receipts to
  transactions (Monarch, etc.) may discard receipts that match no
  transaction. Test with a receipt for a purchase that actually appears in
  the service.

## FAQ

**Is this safe?** The script runs under your own Google account, visible at
script.google.com, and its whole source is the one file you pasted. It
sends mail as you and moves labels; it can't do anything you didn't paste.

**Do I need Gmail filters?** No. `RULES` in the script replaces them (and
unlike filters, works on old mail and travels with this repo). But filters
work too: point any filter at the queue label (`LABEL_NAME`) and the script
will forward whatever the filter catches.

**Why not just use Gmail's forwarding?** It refuses addresses you can't
verify, like `receipts@my.monarch.com`, and never touches old mail.

## License

MIT
