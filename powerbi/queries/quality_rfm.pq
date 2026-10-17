// Requête nommée « quality_rfm » dans Power BI Desktop.
let
    Source = fnLocalCSV("e5", "quality_summary.csv"),
    Typed = Table.TransformColumnTypes(Source, {
        {"customers", Int64.Type},
        {"repeat_customers", Int64.Type},
        {"single_order_customers", Int64.Type},
        {"delivered_orders", Int64.Type},
        {"item_sales_brl", Currency.Type},
        {"min_recency_days", Int64.Type},
        {"max_recency_days", Int64.Type},
        {"invalid_monetary_customers", Int64.Type},
        {"invalid_recency_customers", Int64.Type},
        {"invalid_frequency_customers", Int64.Type}
    }, "en-US")
in
    Typed
