---
name: lead-compliance
description: Compliance check for anything that finds, contacts or markets to people - lead sourcing, outbound email/SMS/calls, lead forms, social-media prospecting, skip tracing, list imports. Covers TCPA, CAN-SPAM, platform ToS / no-scraping, consent capture, do-not-contact, and mortgage/insurance marketing rules. Use when designing or reviewing a lead feature, before turning on auto-send, or when asked "can we pull leads from X / text these people". Gives a verdict and the compliant way to get the same result.
---

# Lead Compliance

Risk-tolerant on business, compliance-absolute on client work. A compliance miss can cost a client their license, their sending domain or their ad account. Always answer with the compliant route to the same outcome, not just "no".

Not legal advice: for anything novel or high-dollar, the company's compliance officer or counsel signs off. Mortgage work runs under the lender's compliance; insurance under the carrier/IMO's.

## 1. Sourcing - where the lead comes from
- **Allowed**: public records (county appraisal/deed files, Secretary of State officer files), official APIs (Google Places, Yelp Fusion, licensed MLS/RESO feeds, property-data APIs), opt-in forms, purchased lists with documented consent, the client's own CRM.
- **Not allowed**: scraping with detection evasion or proxy rotation; automated collection from Facebook/LinkedIn groups or member lists (ToS bans it, and the accounts tied to the business get banned). Compliant route: lead ads, an owned page or group people join, staff logging people they meet by hand.
- **MLS data**: only within the IDX/VOW license terms (display rules, no resale, attribution). Contacting a listing agent to pitch co-marketing is fine; using IDX data to market to sellers may not be - check the license.
- **Skip tracing**: permissible purpose under the vendor terms (GLBA/DPPA). Results go in the CRM flagged "not consented" until the person opts in.

## 2. Contact - how we reach them
- **Email (CAN-SPAM)**: accurate From and subject; physical postal address; working unsubscribe honoured within 10 business days (do it instantly); suppression list honoured across every sender; commercial email identified as such. Use a separate sending domain/subdomain for cold outreach so the main domain's reputation is protected. Never send a client's mail through your own sending account.
- **SMS and calls (TCPA)**: autodialed/AI/prerecorded calls and marketing texts need **prior express written consent** (signed or checkbox, names the seller, not a condition of purchase). Quiet hours 8am-9pm recipient local time; STOP/HELP keywords; honour opt-outs immediately; scrub the National DNC and internal DNC; 10DLC brand + campaign registration for business texting. Cold texting a skip-traced number = no.
- **Consent capture (forms)**: checkbox not pre-checked, exact disclosure text stored with timestamp, IP hash, page URL and the version of the wording. Keep the proof as long as the lead is contacted plus the limitations period.
- **AI voice/agents**: disclose it is automated where state law requires; same TCPA consent as prerecorded calls.

## 3. Industry overlays
- **Mortgage**: NMLS ID on every ad; Equal Housing logo/statement; no rate/terms trigger terms without the full Reg Z disclosure; RESPA Section 8 - no payment or thing of value for referrals (realtor co-marketing must be split at fair value); fair lending - no targeting or exclusion by protected class, including proxies like zip-code lists that track race.
- **Insurance**: licensed agent name and state license numbers; carrier approval for ads; no guaranteed-return wording on life/annuity products.
- **Healthcare**: no PHI in marketing tools, pixels or logs.

## 4. Output
Verdict: GO / GO WITH CHANGES / NO. Then the list of changes (file:line when reviewing code), the compliant alternative for anything blocked, and what the client's compliance contact should sign off. Record any new client-specific rule in that project's memory file.
