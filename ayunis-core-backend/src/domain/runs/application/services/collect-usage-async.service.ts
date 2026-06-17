// Re-export from the usage module, which is the new owner of this service.
// Retained here so existing importers under domain/runs/* do not need to
// change. Delete once all call sites migrate to the usage-module path.
export { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
