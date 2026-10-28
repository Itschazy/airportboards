# Local flag artwork

Source: https://github.com/lipis/flag-icons — version **7.3.2**, MIT.
Original author: Panayiotis Lipiridis. Full license: [LICENSE](LICENSE).

These are the unmodified `flags/4x3/*.svg` files for the 234 non-empty ISO
codes present in AirportsBoard's airport catalogue. No npm runtime dependency,
third-party CDN, emoji font or external references are used by the application.
Only the up to nine flags visible on the exported card are requested locally.

Package: https://registry.npmjs.org/flag-icons/-/flag-icons-7.3.2.tgz
Package gitHead: `fe15c16e7463d0c66d6c5730e9d0e832438d98e1`.
Tarball SHA256: `9477c5252afe0e99dd2d4408b664c83e7c7c80785c7983751d5c7a020198a731`.

To update: download a pinned package archive without installing/executing it,
copy only the catalogue's `flags/4x3/{country.toLowerCase()}.svg` files and its
LICENSE, update these version/checksum fields, then run
`node --test tests/flight-map/map-flags.test.mjs`. The test rejects script,
foreignObject, image, text, event handlers and external href/src references.
Inspect the resulting PNG in Safari and Chromium before publishing.
