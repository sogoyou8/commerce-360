// Requête nommée « segments_summary » dans Power BI Desktop.
let
    Source = fnLocalCSV("e5", "segments_summary.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"segment_code", type text},
        {"segment_label", type text},
        {"segment_priority", Int64.Type},
        {"customers", Int64.Type},
        {"repeat_customers", Int64.Type},
        {"delivered_orders", Int64.Type},
        {"item_sales_brl", Currency.Type},
        {"avg_recency_days", type number},
        {"avg_frequency", type number},
        {"avg_monetary_brl", Currency.Type},
        {"customer_share_pct", type number},
        {"sales_share_pct", type number}
    }, "en-US")
in
    Typed
