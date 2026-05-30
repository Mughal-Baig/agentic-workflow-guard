# AWGuard Report Schemas

AWGuard publishes JSON Schema files for the outputs that are designed for automation.

| Output | Command | Schema |
| --- | --- | --- |
| Scan report | `awguard . --format json` | [`schemas/awguard.report.schema.json`](../schemas/awguard.report.schema.json) |
| Inventory | `awguard . --format inventory-json` | [`schemas/awguard.inventory.schema.json`](../schemas/awguard.inventory.schema.json) |
| Compare | `awguard --compare old.json new.json --format json` | [`schemas/awguard.comparison.schema.json`](../schemas/awguard.comparison.schema.json) |
| Baseline | `awguard . --write-baseline awguard.baseline.json` | [`schemas/awguard.baseline.schema.json`](../schemas/awguard.baseline.schema.json) |
| Badge | `awguard . --format badge` | [`schemas/awguard.badge.schema.json`](../schemas/awguard.badge.schema.json) |
| Config | `awguard.config.json` | [`schemas/awguard.config.schema.json`](../schemas/awguard.config.schema.json) |

The SARIF output uses the official SARIF 2.1.0 schema.

The comparison JSON includes both finding diffs and agentic surface diffs so dashboards can show when workflows, agent context files, or MCP configs are added or removed.
