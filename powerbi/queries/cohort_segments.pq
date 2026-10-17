// Requête nommée « cohort_segments » dans Power BI Desktop.
let
    Source = fnLocalCSV("e5", "cohort_segments.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"first_observed_month", type date},
        {"segment_code", type text},
        {"segment_label", type text},
        {"segment_priority", Int64.Type},
        {"customers", Int64.Type},
        {"repeat_customers", Int64.Type},
        {"delivered_orders", Int64.Type},
        {"item_sales_brl", Currency.Type},
        {"avg_recency_days", type number}
    }, "en-US")
in
    Typed
