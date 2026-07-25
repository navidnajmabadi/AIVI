# AIVI landing page

A single-page landing page for AIVI by VIVISION: ready-made Claude workflows for Canadian service businesses. There is no framework or build step.

## Run locally

Open `index.html` in a browser. For the audit form to submit, serve the folder through a web server and connect `AUDIT_ENDPOINT` in `script.js` to a real endpoint.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, copy, workflow examples and audit form |
| `styles.css` | Visual system, responsive layout and form styles |
| `script.js` | Scroll reveals, audit flow, validation and submission |
| `logo.png` | VIVISION wordmark |

## Offer structure

The page leads with one specific promise: workflow packs for owner-led Canadian service businesses. It then explains:

1. The business bottleneck it addresses.
2. What a workflow takes in and produces.
3. What the customer receives: workflow files, example inputs and outputs, a setup guide and an approval checklist.
4. Which work requires human review before anything is sent, changed or published.

The workflow sections include video placeholders for future product recordings. Add recordings only when they show the actual current product.

## Before publishing

- Implement `/api/audit` or replace `AUDIT_ENDPOINT` with the production URL.
- Publish a real privacy policy and update the footer link from `#questions`.
- Confirm every claim about Claude plans, connectors, data handling and review steps against the live product.
- Confirm the Canadian statistics and source links remain current.
- Add real customer proof or a documented pilot result before buying traffic.
- Have a qualified reviewer confirm outreach and data-handling practices for your use case.

## Audit data

The audit sends its answers, name, business name and email only after the visitor submits the form and confirms the consent checkbox. It must not be treated as a place to collect client, employee or financial information.

The browser UI validates required fields. It does not replace server-side validation, consent logging, rate limiting or secure storage at the endpoint.
