// Requête nommée « delivery_satisfaction » dans Power BI Desktop.
let
    Source = fnLocalCSV("e4", "delivery_satisfaction.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"delivery_group", type text},
        {"delivered_orders", Int64.Type},
        {"scored_orders", Int64.Type},
        {"avg_review_score", type number},
        {"low_score_orders", Int64.Type},
        {"low_score_rate_pct", type number},
        {"avg_delivery_days_clean", type number}
    }, "en-US")
in
    Typed
