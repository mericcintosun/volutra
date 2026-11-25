# SECURITY: Volutra

Volutra is a browser-only measurement diary. It has no blockchain, no wallet, no account and no server store.

## Contract addresses and chain id

None. Volutra uses no blockchain, and the repo has no `contracts/` directory.

## Wallet permissions requested

None. No wallet code exists. A search for `eth_requestAccounts|personal_sign|eth_sign|wagmi|ethers|viem|connect\(` across `app`, `components` and `lib` returns zero matches, so no wallet popup or signature request is possible.

## Approvals and spenders

None. There are no tokens, approvals or spenders.

## Source and data handling

- Source: https://github.com/mericcintosun/volutra
- All analysis (spiral unwrap, FFT, logistic regression) runs in the visitor's browser tab.
- Readings stay in this browser's `localStorage`, under the Volutra keys: `volutra.local-tests.v1` (saved readings), `volutra.dose-clock.v1` (dose time overrides) and `volutra:last-spectrum:v1` (the last drawing's spectrum, used by "Compare with my last drawing"). Every read is checked with zod. "Clear this device" on `/activity` removes all three.
- No server stores data. The API routes (`/api/spirals`, `/api/spirals/[id]`, `/api/days`) are read-only and return seed diary or UCI 395 data. No route needs an API key, and the build holds no secret (see `.env.example`).
- The CSV export is built in the browser as a Blob download; no form posts anywhere.
- To report an issue, open a GitHub issue at https://github.com/mericcintosun/volutra/issues. Please leave out any personal health data.
