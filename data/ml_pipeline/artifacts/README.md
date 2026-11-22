# Artifacts

Only shareable JSON, CSV, Markdown and PNG outputs belong here. Every artifact must carry a version and SHA-256 entry in a manifest. Raw XLSX files, PII, raw response vectors, fingerprints, secrets and pickle/joblib binaries are prohibited.

`f54_centroid_full1000_v1.json` is the versioned, aggregate-only F54 centroid model selected in the existing full-data inner grouped-CV report (`tau=10`). The separate `f54_centroid_full1000_v1.manifest.json` verifies its exact bytes. Both Python and Node validate the SHA-256 manifest, feature order, schema, dataset/version metadata and profile support before serving inference.

Notebook `11` creates a new bundle only when neither file exists, and otherwise verifies the existing version. Direct export uses exclusive creation and never overwrites an old or partial bundle. The model is for research on current-major retrieval, not validated career suitability. Nested OOF Hit@3 of the selection procedure is 0.291; the 0.8 KPI remains unmet. The 1,000-record fit has no new independent test. No RIASEC or Holland-60 crosswalk is enabled.
