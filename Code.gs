// Gmail Label Forwarder
// Forwards matching Gmail messages to any address — built for sending
// receipts to Monarch Money (receipts@my.monarch.com), works for anything.
// No add-on, no third-party OAuth, no Gmail "verified forwarding address"
// restriction. Runs entirely inside your own Google account on a time
// trigger. Not associated with Monarch Money.
//
// Architecture: RULES (and/or Gmail filters) apply LABEL_NAME, which acts as
// the queue. forwardLabeled() drains the queue. Setup: see README.md

// ── Config ──────────────────────────────────────────────────────────────
const DEST = 'receipts@my.monarch.com'; // where to forward
const FROM = 'you@yourdomain.com';      // must be a verified send-as alias
                                        // (Gmail → Settings → Accounts → "Send mail as")
const LABEL_NAME = 'monarch/monarch-receipt-forward';      // the queue
const DONE_NAME = 'monarch/monarch-receipt-forward-sent';  // applied after
                                        // forwarding; both auto-created,
                                        // nested under a "monarch" parent
const BATCH_SIZE = 50;                  // threads per run; keeps runs fast and
                                        // under Gmail's daily send quota

// What to forward, as Gmail search queries. Edit freely; one entry per
// merchant keeps them readable. Leave empty to rely on Gmail filters only.
const RULES = [
  'from:no_reply@email.apple.com subject:"Your receipt from Apple"',
  // 'from:uber.com subject:"your trip receipt"',
  // 'from:amazon.com subject:"your order"',
];
const LOOKBACK = 'newer_than:2d';       // how far back applyRules() searches;
                                        // raise temporarily to backfill
// ────────────────────────────────────────────────────────────────────────

// Trigger this one: applies rules, then forwards the queue.
function run() {
  applyRules();
  forwardLabeled();
}

// Label anything matching RULES that hasn't been processed yet.
function applyRules() {
  if (!RULES.length) return;
  const label = GmailApp.getUserLabelByName(LABEL_NAME)
             || GmailApp.createLabel(LABEL_NAME);
  // Gmail search syntax writes label names with '/' and ' ' as '-'.
  const doneQ = DONE_NAME.replace(/[\/ ]/g, '-');
  const queueQ = LABEL_NAME.replace(/[\/ ]/g, '-');
  for (const rule of RULES) {
    const q = `${rule} ${LOOKBACK} -label:${doneQ} -label:${queueQ}`;
    for (const thread of GmailApp.search(q, 0, BATCH_SIZE)) {
      thread.addLabel(label);
    }
  }
}

// Forward every queued thread, then move it to the done label.
function forwardLabeled() {
  const label = GmailApp.getUserLabelByName(LABEL_NAME)
             || GmailApp.createLabel(LABEL_NAME);
  const done = GmailApp.getUserLabelByName(DONE_NAME)
            || GmailApp.createLabel(DONE_NAME);
  const mine = GmailApp.getAliases()
    .concat([Session.getActiveUser().getEmail()]);
  const threads = label.getThreads(0, BATCH_SIZE);
  for (const thread of threads) {
    for (const msg of thread.getMessages()) {
      const from = msg.getFrom();
      // Never forward my own messages — prevents Fwd: Fwd: loops when a
      // thread is re-labeled after its forwarded copies land in it.
      if (mine.some(a => from.indexOf(a) !== -1)) continue;
      msg.forward(DEST, { from: FROM });
    }
    thread.removeLabel(label);
    thread.addLabel(done);
  }
}

// ── Diagnostics ─────────────────────────────────────────────────────────

// Run once: FROM must appear in the log, or the { from: FROM } option is
// silently ignored and mail goes out as your primary address.
function listAliases() {
  Logger.log(GmailApp.getAliases());
}

// Run once: LABEL_NAME must appear verbatim in the log. Nested labels are
// full paths ("parent/child"). If forwardLabeled silently does nothing,
// the label name is wrong.
function listLabels() {
  GmailApp.getUserLabels().forEach(l => Logger.log(l.getName()));
}

// Dry run: logs what each RULES query matches without labeling or sending.
function testRules() {
  for (const rule of RULES) {
    const hits = GmailApp.search(`${rule} ${LOOKBACK}`, 0, 10);
    Logger.log(`${hits.length >= 10 ? '10+' : hits.length} hits: ${rule}`);
    hits.forEach(t => Logger.log(`  ${t.getFirstMessageSubject()}`));
  }
}
