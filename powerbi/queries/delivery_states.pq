// Requête nommée « delivery_states » dans Power BI Desktop.
let
    Source = fnLocalCSV("e4", "delivery_states.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"customer_state", type text},
        {"delivered_orders", Int64.Type},
        {"dated_deliveries", Int64.Type},
        {"late_deliveries", Int64.Type},
        {"late_rate_pct", type number},
        {"suspicious_carrier_dates", Int64.Type},
        {"avg_delivery_days_clean", type number},
        {"scored_orders", Int64.Type},
        {"avg_review_score", type number}
    }, "en-US")
in
    Typed
