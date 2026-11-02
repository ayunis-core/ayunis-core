Core Connect Integration
Groups two independent Nest modules for the authenticated Ayunis Core Connect connection.

`auth/` exports the dedicated service authentication guard. `subscription-sync/` imports auth and applies normalized subscription access state. The parent folder has no Nest module; neither authentication nor subscription business rules are combined here. Provider API clients and mapping remain in the Connect service, and Core subscription rules remain in `iam/subscriptions`.
