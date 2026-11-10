## Summary

Describe the change and the problem it solves.

## Scope

- Affected modules/editions:
- Affected roles:
- Clinical/financial impact:
- Licensing impact:

## Documentation

- [ ] `CHANGELOG.md` has an entry for the release version
- [ ] README, capability docs, architecture, backup/upgrade guidance and relevant skills updated
- [ ] Version and schema references synchronized (`npm run check:docs`)
- [ ] Release notes drafted when this change will be released

## Verification

- [ ] `npm run check`
- [ ] `npm run build`
- [ ] `npm run build:monitor`
- [ ] Browser workflow tested with synthetic data
- [ ] Migration tested on an existing database where applicable
- [ ] Tenant-scope check reviewed
- [ ] Licence edition/activation tested where applicable
- [ ] Monitor remains read-only where applicable

## Clinical and data controls

- [ ] Sample/report release and disposal rules preserved
- [ ] No real patient data, secrets, database files or private keys included
- [ ] Audit evidence added/updated where required
- [ ] Report amendments remain append-only

## Licensing and commercial controls

- [ ] No private signing key or portal token added
- [ ] Edition/module lists remain synchronized with the licence portal
- [ ] Grace/read-only behavior remains correct
- [ ] No referral-commission UI or accrual reintroduced

## Screenshots / evidence

Use synthetic data only and redact identifiers.

## Risks and follow-up

List known limitations, rollout concerns or follow-up work.
