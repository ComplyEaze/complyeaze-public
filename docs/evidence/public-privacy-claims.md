# Evidence for indexed privacy and product-boundary claims

Checked 2026-09-30 against the public repositories named below; the ComplyEaze
Bridge rows were re-checked on 2026-10-14 against its released tag. Each row is a
claim now made on an indexed complyeaze.com page, with the wording it was
narrowed to and the source that supports it. If a source stops saying this, the
page wording must change.

| Page copy (packages/public-content/src/complyeaze.routes.json) | Source | What the source says |
| --- | --- | --- |
| Home: "Pack does not capture your GST password"; "Its public source lists no capture of credentials, OTPs, CAPTCHAs, cookies or session tokens" | github.com/lamemustafa/pack `README.md`, "V0 is intentionally narrow" (commit a4237865d84923b3933719114349aae1527b7fd7) | "no GST Portal credential, OTP, CAPTCHA, cookie, or session-token capture" |
| Home: "Pack ... uploads no GST documents"; Products/Pack: "no GST document upload" | same | "no GST document upload in the local-download workflow" |
| Products/Pack: "no extension analytics or telemetry"; "No ComplyEaze account" | same | "no extension analytics or telemetry"; "no ComplyEaze, Axal, or Pack login" |
| Home sample slip: "GST document uploaded: None" and "Pack saves the filed PDF to your computer and uploads no GST document"; "Password captured: No" | same Pack README | "no GST document upload in the local-download workflow"; "no GST Portal credential, OTP, CAPTCHA, cookie, or session-token capture" |
| Home: "Tools work on pasted rows inside the browser tab and need no file upload"; Products/Tools: "No account or file upload is required, and pasted rows are not intentionally sent to ComplyEaze" | github.com/lamemustafa/complyeaze-tools `README.md` and `docs/privacy-local-first.md` (commit 726ec6e7ddf9fda1c38f221be6c950fafc330876) | "Files are processed in your browser. No account or file upload is required."; "Tool files are not intentionally sent to ComplyEaze by these tools." |
| Products/ComplyEaze Bridge: status "Still being developed and not yet code-signed; posting is off by default in the extension" (also drawn on the home card) | github.com/ComplyEaze/bridge `README.md` at the released tag `mcp-v0.5.1` (commit e3296c2d097f918eb20961624d8b06e7345d1056), lines 43, 104 and 397-398 | "Not yet code-signed; your computer may warn you before opening it."; "Posting is off by default in the extension."; "Bridge is still being developed. A release may contain errors, so try it on test data first and keep current backups." |
| Products/ComplyEaze Bridge: "Local connection only: it talks to the Tally gateway on a loopback address and cannot be pointed at a remote Tally host. It cannot tell whether that local port is forwarded to another machine. Your AI provider sees what the assistant reads, just as it sees the rest of the conversation. You can shorten party names or drop narration, not both; neither hides amounts, GSTIN or PAN, so a shortened name can still be identified. Posting has known limits, listed in the README; one is that ComplyEaze Bridge cannot undo a posted voucher. If you installed an earlier version, check the posting setting: an earlier default may still be saved as on." (also on the home card) | github.com/ComplyEaze/bridge `README.md` at the released tag `mcp-v0.5.1` (commit e3296c2d097f918eb20961624d8b06e7345d1056), lines 87-90, 92-94, 97-100, 104-106, 110-119 and 346-349, and the section "Before you turn on posting" (line 280 on), which sets out each limit at line 288 | "Local connection only. It talks to Tally's own XML gateway on a loopback address, so it cannot be pointed at a remote Tally host. It cannot tell whether that local port is forwarded to another machine; do not forward one across the internet."; "Your AI provider sees what the assistant reads, just as it sees the rest of the conversation, including company, party and ledger names, amounts, dates, narrations, references, GSTINs and, when it reads ledger details, PAN"; "The setting takes one value, not both: shorten party and ledger names and bank account numbers to their first two and last two characters (four or fewer become “…”), or drop narrations. Neither hides amounts, company names, PAN, GSTIN" (lines 97-100); "Neither hides amounts, company names, PAN, GSTIN, IFSC, MSME or Udyam registration numbers, contact details or references, and a shortened name can still be identified, not least from the GSTIN or PAN sent beside it" (lines 346-349); "If you installed an earlier version, check the setting: an earlier default may still be saved as on."; "Four known limits remain: ComplyEaze Bridge cannot undo a posted voucher (you correct it in Tally)", followed by the other three. The README lists more that the provider can receive, so the card does not present what is sent as a complete list; of what neither choice hides, the card names amounts, GSTIN and PAN, and the README also names company names, IFSC, MSME or Udyam registration numbers, contact details and references. |
| Products/Pack: "Public beta"; Pack description: filed GSTR-3B and GSTR-1 returns and the GSTR-2B statement | Pack `README.md`, "Status": the Store-published package is the `v0.5.0` beta, publication maintainer-observed; GSTR-2B "auto-drafted statements"; Chrome Web Store listing description "Beta: Save filed GSTR-1 and GSTR-3B returns and auto-drafted GSTR-2B statements locally" | Store package is a beta; 2B is a statement, its live gate "not fully closed" |
| Home and Products: ComplyEaze Bridge role ("TallyPrime connector for Claude Desktop"), job ("Connects Claude Desktop to the TallyPrime running on your own computer ... prepares Journal, Payment, Receipt and Contra vouchers as a file. If you turn posting on in the extension, it posts them one at a time, after you approve each one.") and proof ("Open source under Apache-2.0. Tool calls leave receipts in a log on your computer.") | github.com/ComplyEaze/bridge `README.md` at the released tag `mcp-v0.5.1` (commit e3296c2d097f918eb20961624d8b06e7345d1056), lines 1, 7-8, 10-11, 17-18, 20-21, 120 and 128 | "TallyPrime MCP server for Claude Desktop"; "It connects Claude Desktop to the TallyPrime running on your own computer"; "You can ask about the trial balance, outstanding receivables and payables with ageing, ledger movement and vouchers"; "it prepares Journal, Payment, Receipt and Contra vouchers as an import file that you review and import into TallyPrime yourself."; "If you turn posting on in the extension, it posts vouchers one at a time, after you approve each one."; "Tool calls leave receipts in a log on your computer"; "Open source under Apache-2.0." |
| Products/ComplyEaze Bridge: evidence link "Read how ComplyEaze Bridge handles your books, and its source" | github.com/ComplyEaze/bridge `README.md` at the released tag `mcp-v0.5.1` (commit e3296c2d097f918eb20961624d8b06e7345d1056), the section "How it handles your books" (line 85 on) | The section the card's boundary sentences are taken from, on the repository page at the released tag. |
| /privacy/: "Visiting this website" | `.github/workflows/pages-deploy.yml` (GitHub Pages deploy of `apps/complyeaze/dist`); response headers 2026-09-30 (served by Cloudflare, Cloudflare bot-detection script injected); layout has no analytics code | request metadata and security signals are processed by GitHub Pages and Cloudflare |
| Home and Products: Pack, Tools, ComplyEaze Bridge and this website are open source under Apache 2.0 | GitHub license API for each repository | `Apache-2.0` for pack, complyeaze-tools, bridge |

## Wording deliberately removed

- "your GST password never reaches us", "Sent to ComplyEaze: Nothing", "sends nothing to ComplyEaze", "Nothing is uploaded", "no telemetry" and
  "nothing saved on our side" were absolute. The Tools source itself notes that
  its static host receives normal web request metadata and that Cloudflare
  security checks may process browser signals, so those phrasings could not be
  proven and were narrowed to what each source states.
- The ComplyEaze Bridge card does not say it "connects only to Tally on the same
  computer" without saying, in the same field, that the assistant's reads reach
  its AI provider. "Local connection only" is the README's own heading for the
  Tally connection, and the AI-provider sentence follows it.
- On 2026-10-07 the ComplyEaze Bridge card dropped "preview" (twice), the bare
  product short name, and "prepare vouchers that you approve before anything
  posts". The released README no longer calls the package a preview, and a
  prepared voucher file posts nothing by itself; the card now uses the README's
  own sentences.
- On 2026-10-14 the ComplyEaze Bridge card dropped "Posting has three known
  limits" and "You can mask party names or drop narration; amounts are always
  sent". The README at `mcp-v0.5.1` lists four posting limits, so the card no
  longer gives a count. It now says the setting shortens names, that neither
  choice hides amounts, GSTIN or PAN, and that a shortened name can still be
  identified. The README at that tag still names `mcp-v0.5.0` as the current
  release (line 30); GitHub lists `mcp-v0.5.1` as the latest release.

## Other notes

- security@complyeaze.com is the private security channel, named by the owner on 2026-09-30 (SECURITY.md and the /contact/ "Sensitive report" card).
- The word "free" was removed from the site on 2026-09-30 at the owner's direction, because none of the Pack, Tools or ComplyEaze Bridge READMEs state a price.
- /contact/ and /privacy/ name contact@complyeaze.com, the address the owner gave on 2026-09-30. The "leave those details out of a first email" line is a safety default added by the assistant for the owner to confirm.
- "Install Pack" links to the Chrome Web Store listing, which loads and is titled
  "ComplyEaze Pack: GST Return Downloader" (checked 2026-09-30).
- The hosted Tools site (tools.complyeaze.com) returned HTTP 525 on 2026-09-30; the Tools status and gateway page say so.
